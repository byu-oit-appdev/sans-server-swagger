/**
 *  @license
 *    Copyright 2017 Brigham Young University
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 **/
'use strict';
const acceptedMethods   = require('./accept-methods');
const checkSwagger      = require('./check-swagger');
const deserialize       = require('./deserialize');
const Enforcer          = require('swagger-enforcer');
const normalizeRequest  = require('./normalize-request');
const path              = require('path');
const schema            = require('./schema');
const swaggerLoad       = require('./swagger-load');
const validate          = require('./validate');

module.exports = function (configuration) {
    const config = schema.normalize(configuration);
    const mockQP = config.mockQueryParameter;
    const router = config.router;

    // resolve swagger json references and process swagger object
    const promise = swaggerLoad(config.swagger)
        .then(swagger => {

            // make sure that there is a basePath that starts with slash
            if (!swagger.hasOwnProperty('basePath')) swagger.basePath = '/';
            swagger.basePath = '/' + swagger.basePath.replace(/^\//, '').replace(/\/$/, '');
            const rxBasepath = new RegExp('^' + (swagger.basePath === '/' ? '' : '\\' + swagger.basePath) + '(?:\\/|\\?|$)');

            const swagggerErrors = checkSwagger(swagger);
            const swaggerString = JSON.stringify(swagger);
            if (!swagger.definitions) swagger.definitions = {};

            // set global controller
            const globalController = swagger.hasOwnProperty('x-controller') ?
                loadController(config.controllers, swagger['x-controller'], config.development) :
                null;

            // if there is to be a swagger endpoint then define that path
            if (config.endpoint) {
                router.get(config.ignoreBasePath ? config.endpoint : swagger.basePath.replace(/\/$/, '') + config.endpoint, (req, res) => {
                    res.send(200, swaggerString, { 'Content-Type': 'application/json' });
                });
            }

            if (swagger.hasOwnProperty('paths')) {
                Object.keys(swagger.paths)
                    .forEach(path => {
                        const pathSchema = swagger.paths[path];
                        const pathController = pathSchema.hasOwnProperty('x-controller') ?
                            loadController(config.controllers, pathSchema['x-controller'], config.development) :
                            globalController;
                        const fullPath = config.ignoreBasePath ? path : swagger.basePath.replace(/\/$/, '') + path;

                        Object.keys(pathSchema)
                            .forEach(method => {
                                if (!acceptedMethods[method]) return;
                                const pathErrors = [];
                                const methodSchema = pathSchema[method];

                                // if in development mode and there is no "mock" query parameter then create it to allow for valid mocking
                                if (config.development) {
                                    if (!methodSchema.hasOwnProperty('parameters')) methodSchema.parameters = [];
                                    const hasMockQueryParam = methodSchema.parameters
                                        .filter(p => p.name === mockQP && p.in === 'query')[0] !== undefined;
                                    if (!hasMockQueryParam) {
                                        methodSchema.parameters.push({
                                            name: mockQP,
                                            in: 'query',
                                            description: 'Produces a mocked response.',
                                            required: false,
                                            type: 'string'
                                        });
                                    }
                                }

                                // set method controller
                                const controller = methodSchema.hasOwnProperty('x-controller') ?
                                    loadController(config.controllers, methodSchema['x-controller'], config.development) :
                                    pathController;

                                // set the method to call
                                const handler = methodSchema.hasOwnProperty('operationId') && controller && typeof controller[methodSchema.operationId] === 'function'
                                    ? controller[methodSchema.operationId]
                                    : null;

                                // validate parameter data
                                let hasBody = false;
                                let hasForm = false;
                                if (Array.isArray(methodSchema.parameters)) {
                                    methodSchema.parameters.forEach(p => {
                                        if (p.in === 'body') hasBody = true;
                                        if (p.in === 'formData') hasForm = true;

                                        // validate default parameter values
                                        if (p.hasOwnProperty('default')) {
                                            Enforcer(p, swagger.definitions, { enforce: true, useDefaults: true })
                                                .errors()
                                                .forEach(err => pathErrors.push(err.message));
                                        }
                                    });
                                }

                                // validate that parameters do not use both mutually exclusive body and formData
                                if (hasBody && hasForm) pathErrors.push('Cannot have both body and formData parameters.');

                                // report any path errors
                                if (pathErrors.length > 0) {
                                    swagggerErrors.push('Path has one or more errors: ' +
                                        method.toUpperCase() + ' ' +
                                        path + '\n    ' + pathErrors.join('\n    '));
                                }

                                // define the request and response validator functions
                                const validateRequest = validate.request(methodSchema, swagger.definitions);
                                const validateResponse = validate.response(methodSchema, swagger.definitions);

                                //////////////////////////////
                                //                          //
                                //      DEFINE THE ROUTE    //
                                //                          //
                                //////////////////////////////
                                router[method](fullPath, function(req, res) {
                                    const server = this;
                                    let responseNeedsValidation = true;

                                    // deserialize the request parameters
                                    if (Array.isArray(methodSchema.parameters)) normalizeRequest(server, req, methodSchema.parameters);

                                    // validate the request
                                    const err = validateRequest(req);
                                    if (err) {
                                        responseNeedsValidation = false;
                                        server.log('request-error', 'Invalid request.');
                                        res.status(400);
                                        return res.send(err);
                                    }

                                    // add the deserialize object to the request
                                    req.deserialize = deserialize;

                                    // add a hook to validate the response before send
                                    res.hook(function(state) {
                                        if (responseNeedsValidation && !(state.body instanceof Error)) {
                                            const err = validateResponse.validate(state.statusCode, state.body);
                                            if (err) {
                                                server.log('response-error', 'Invalid response.');
                                                this.body(Error(err));
                                            }
                                        }
                                    });

                                    // add a build method to the request object
                                    res.enforce = validateResponse.enforce;

                                    // if it should be mocked
                                    if (req.query.hasOwnProperty(mockQP) || (!handler && config.development)) {
                                        req.query[mockQP] = req.query[mockQP] || Object.keys(methodSchema.responses)[0] || undefined;
                                        if (!req.query[mockQP]) delete req.query[mockQP];

                                        const mockCode = parseInt(req.query[mockQP]) || null;
                                        res.status(mockCode || 500);

                                        const responseSchema = methodSchema.responses && methodSchema.responses[mockCode];

                                        // check for a mock property on the operation ID
                                        if (handler && typeof handler.mock === 'function') {
                                            server.log('mock', 'Executing mock from code.');
                                            req.swagger = JSON.parse(swaggerString);
                                            executeController(server, handler.mock, req, res);

                                        // schema-less response mocking
                                        } else if (!responseSchema.hasOwnProperty('schema')) {
                                            server.log('mock', 'Executing mock for schema-less response. Body set to empty.');
                                            res.send(mockCode, '');

                                        // check for mock example
                                        } else {
                                            server.log('mock', 'Executing mock from example.');
                                            const examples = responseSchema && methodSchema.responses[mockCode].examples;
                                            const accept = req.headers.hasOwnProperty('accept')
                                                ? req.headers.accept
                                                : Array.isArray(swagger.produces) && swagger.produces.length > 0
                                                    ? swagger.produces[0]
                                                    : examples && Object.keys(examples)[0];

                                            const match = findMatchingExample(examples, accept);
                                            if (match) {
                                                res.send(examples[match]);
                                            } else {
                                                server.log('mock', 'example not implemented');
                                                responseNeedsValidation = false;
                                                res.sendStatus(501);
                                            }
                                        }

                                    // if there is a controller then run it
                                    } else if (handler) {
                                        req.swagger = JSON.parse(swaggerString);
                                        executeController(server, handler, req, res);

                                    } else {
                                        responseNeedsValidation = false;
                                        res.sendStatus(501);
                                    }
                                });
                            });
                    });
            }

            // if there are swagger errors then exit the process
            if (swagggerErrors.length > 0) {
                console.error('One or more errors found in the swagger document:\n  ' + swagggerErrors.join('\n  '));
            }

            return rxBasepath;
        });

    // if the promise doesn't resolve then the server can start but wont respond to requests
    /*promise.catch(err => {
        console.error(err.stack);
    });*/

    // return the middleware function - this essentially makes sure the router is ready before processing router middleware
    return function swaggerRouter(req, res, next) {
        const server = this;
        promise.then(
            rxBasepath => {
                // log an message if not within the base path
                if (!config.ignoreBasePath && !rxBasepath.test(req.path)) {
                    server.log('path', 'The request path does not fall within the basePath: ' + req.url);
                }

                // execute the router
                router.call(server, req, res, next);
            },
            err => {
                server.log('error', err.message, err);
                next();
            }
        );
    };
};

/**
 * Safely execute a controller.
 * @param server
 * @param controller
 * @param req
 * @param res
 */
function executeController(server, controller, req, res) {
    try {
        controller.call(server, req, res);
    } catch (err) {
        res.send(err);
    }
}

/**
 * Look through swagger examples and find a match based on the accept content type
 * @param {object} examples
 * @param {string} accept
 * @returns {*}
 */
function findMatchingExample(examples, accept) {
    const keys = examples ? Object.keys(examples) : [];
    const typesLength = keys.length;

    // quick result
    if (typesLength === 0) return undefined;
    if (accept === '*') return keys[0];

    // determine what types and subtypes are supported by examples
    const types = keys.map(key => {
        const ar = key.split('/');
        return {
            type: ar[0] || '*',
            subtype: ar[1] || '*'
        }
    });

    // find all the types that the client accepts
    const accepts = accept.split(/,\s*/);
    const length = accepts.length;
    for (let i = 0; i < length; i++) {

        // remove variable from type and separate type and subtype
        const item = accepts[i].split(';')[0];
        const parts = item.split('/');
        const a = {
            type: parts[0] || '*',
            subtype: parts[1] || '*'
        };

        // look for a match between types and accepts
        for (let j = 0; j < typesLength; j++) {
            const t = types[j];
            if ((t.type === '*' || a.type === '*' || a.type === t.type) &&
                (t.subtype === '*' || a.subtype === '*' || a.subtype === t.subtype)) return keys[j];
        }
    }

    return undefined;
}

/**
 * Attempt to load a node module as a controller.
 * @param {string} controllersDirectory
 * @param {string} controller
 * @param {boolean} development
 * @returns {*}
 */
function loadController(controllersDirectory, controller, development) {
    const filePath = path.resolve(controllersDirectory, controller);
    try {
        return require(filePath);
    } catch (e) {
        if (e.code === 'MODULE_NOT_FOUND' && e.message.indexOf("Cannot find module '" + filePath + "'") === 0 && development) {
            console.error('Cannot find controller: ' + filePath);
            return null;
        } else {
            throw e;
        }
    }
}
