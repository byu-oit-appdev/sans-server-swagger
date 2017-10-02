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
const copy              = require('./copy');
const deserialize       = require('./deserialize');
const Enforcer          = require('swagger-enforcer');
const Exception         = require('./exception');
const normalizeRequest  = require('./normalize-request');
const path              = require('path');
const Router            = require('sans-server-router');
const schema            = require('./schema');
const swaggerLoad       = require('./swagger-load');
const validate          = require('./validate');

module.exports = function (configuration) {
    const config = schema.normalize(configuration);
    const map = new WeakMap();
    const mockQP = config.mockQueryParameter;
    const router = Router({ paramFormat: 'handlebar' });

    // produce a wrapper around the exception logic
    function exceptionRunner(log, err, req, res, next) {
        try {
            log('Running exception handler: ', err.message);
            config.exception(err, req, res, next);
        } catch (err) {
            next(err);
        }
    }

    // resolve swagger json references and process swagger object
    const promise = swaggerLoad(config.swagger)
        .then(loaded => {
            const swagger = loaded.swagger;

            // make sure that there is a basePath that starts with slash
            if (!swagger.hasOwnProperty('basePath')) swagger.basePath = '/';
            swagger.basePath = '/' + swagger.basePath.replace(/^\//, '').replace(/\/$/, '');
            const rxBasepath = new RegExp('^' + (swagger.basePath === '/' ? '' : '\\' + swagger.basePath) + '(?:\\/|\\?|$)');

            const swaggerErrors = checkSwagger(swagger);
            if (!swagger.definitions) swagger.definitions = {};

            // set global controller
            const globalController = swagger.hasOwnProperty('x-controller') ?
                loadController(config.controllers, swagger['x-controller'], config.development) :
                null;

            // if there is to be a swagger endpoint that gets the swagger then define that path
            if (config.endpoint) {
                router.get(config.ignoreBasePath ? config.endpoint : swagger.basePath.replace(/\/$/, '') + config.endpoint, (req, res) => {
                    res.send(200, loaded.content, { 'Content-Type': 'application/json' });
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
                                const handlerKey = methodSchema.hasOwnProperty('x-operation-id') ? 'x-operation-id' : 'operationId';
                                const handler = methodSchema.hasOwnProperty(handlerKey) && controller && typeof controller[methodSchema[handlerKey]] === 'function'
                                    ? controller[methodSchema[handlerKey]]
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
                                                .errors(p.default)
                                                .forEach(err => pathErrors.push(err.message));
                                        }
                                    });
                                }

                                // validate that parameters do not use both mutually exclusive body and formData
                                if (hasBody && hasForm) pathErrors.push('Cannot have both body and formData parameters.');

                                // report any path errors
                                if (pathErrors.length > 0) {
                                    swaggerErrors.push('Path has one or more errors: ' +
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
                                router[method](fullPath, function(req, res, next) {
                                    const log = map.get(req);

                                    req.hook('response', function sansServerSwagger(req, res, n) {
                                        const code = res.statusCode;

                                        if (!validateResponse.hasResponseStatus(code)) {
                                            const err = Error('Response code not defined: ' + code);
                                            err.statusCode = 500;
                                            return exceptionRunner(log, err, req, res, next);

                                        } else {
                                            log('Validating response');
                                            const errorMessage = validateResponse.validate(code, state.body);
                                            log(errorMessage ? 'Response validated' : 'Response invalid');
                                            if (errorMessage) {
                                                const err = Error(errorMessage);
                                                err.statusCode = 500;
                                                return exceptionRunner(log, err, req, res, next);
                                            }
                                        }

                                        n();
                                    });

                                    // deserialize the request parameters
                                    if (Array.isArray(methodSchema.parameters)) normalizeRequest(log, req, methodSchema.parameters);

                                    // validate the request
                                    const err = validateRequest(req);
                                    if (err) {
                                        log('request invalid');
                                        err.statusCode = 400;
                                        return exceptionRunner(log, err, req, res, next);
                                    }

                                    // add the deserialize object to the request
                                    req.deserialize = deserialize;

                                    // add a build method to the request object
                                    res.enforce = validateResponse.enforce;         // TODO: deprecated - remove for 1.x

                                    // add swagger object to the request
                                    const swaggerCopy = copy(swagger);
                                    req.swagger = {
                                        root: swaggerCopy,
                                        rel: swaggerCopy.paths[path][method]
                                    };

                                    // add swagger object to the response
                                    res.swagger = {
                                        enforce: validateResponse.enforce,
                                        example: function(code, type) {
                                            const match = findMatchingExample(req, code, type);
                                            return match.type ? copy(methodSchema.responses[code].examples[match.type]) : undefined;
                                        }
                                    };

                                    // if it should be mocked
                                    if (req.query.hasOwnProperty(mockQP) || (!handler && config.development)) {
                                        req.query[mockQP] = req.query[mockQP] || Object.keys(methodSchema.responses)[0] || undefined;
                                        if (!req.query[mockQP]) delete req.query[mockQP];

                                        const mockCode = parseInt(req.query[mockQP]) || null;
                                        res.status(mockCode || 500);

                                        const responseSchema = methodSchema.responses && methodSchema.responses[mockCode];

                                        // check for a mock property on the operation ID
                                        if (handler && typeof handler.mock === 'function') {
                                            log('Executing mock from code.');
                                            executeController(handler.mock, req, res, next);

                                        // schema-less response mocking
                                        } else if (!responseSchema.hasOwnProperty('schema')) {
                                            log('Executing mock for schema-less response. Body set to empty.');
                                            res.send(mockCode, '');

                                        // check for mock example
                                        } else {
                                            log('Executing mock from example.');
                                            const match = findMatchingExample(req, mockCode);
                                            if (match.type) {
                                                res.send(methodSchema.responses[mockCode].examples[match.type]);
                                            } else {
                                                const err = Error('Mock example not implemented');
                                                err.statusCode = 501;
                                                return exceptionRunner(log, err, req, res, next);
                                            }
                                        }

                                    // if there is a controller then run it
                                    } else if (handler) {
                                        log('controller', 'Executing controller');
                                        executeController(handler, req, res, next);

                                    } else {
                                        const err = Error('Not Implemented');
                                        err.statusCode = 501;
                                        return exceptionRunner(log, err, req, res, next);
                                    }
                                });
                            });
                    });
            }

            // if there are swagger errors then exit the process
            if (swaggerErrors.length > 0) {
                console.error('One or more errors found in the swagger document:\n  ' + swaggerErrors.join('\n  '));
            }

            return rxBasepath;
        });

    // if the promise doesn't resolve then the server can start but wont respond to requests
    /*promise.catch(err => {
        console.error(err.stack);
    });*/

    // return the middleware function - this essentially makes sure the router is ready before processing router middleware
    return function swaggerRouter(req, res, next) {
        const log = req.logger('sans-server', 'swagger');
        map.set(req, log);
        promise.then(
            rxBasepath => {
                // log an message if not within the base path
                if (!config.ignoreBasePath && !rxBasepath.test(req.path)) {
                    log('The request path does not fall within the basePath: ' + req.url);
                }

                // execute the router
                router(req, res, next);
            },
            next
        );
    };
};

/**
 * Safely execute a controller.
 * @param controller
 * @param req
 * @param res
 * @param next
 */
function executeController(controller, req, res, next) {
    try {
        const promise = controller.call(req, res, next);
        if (promise && typeof promise.catch === 'function') {
            promise.catch(function(err) {
                res.status(500).send(err);
            });
        }
    } catch (err) {
        next(err);
    }
}

/**
 * Look through swagger examples and find a match based on the accept content type
 * @param {object} req
 * @param {string|number} [code]
 * @param {string} [type]
 * @returns {{ code: number, type: string|undefined }}
 */
function findMatchingExample(req, code, type) {
    const swagger = req.swagger.root;
    const responses = req.swagger.rel.responses;

    // if no responses then exit
    const responseKeys = responses && typeof responses === 'object' ? Object.keys(responses) : [];
    if (responseKeys.length === 0) return { code: 501, type: undefined };

    // get first code if not provided
    if (arguments.length < 1) code = responseKeys[0];

    // validate that responses exist
    const responseSchema = responses[code];
    if (!responseSchema) return { code: 501, type: undefined };

    const examples = responses[code].examples;
    const accept = type ?
        type :
        req.headers.hasOwnProperty('accept')
            ? req.headers.accept
            : Array.isArray(swagger.produces) && swagger.produces.length > 0
                ? swagger.produces[0]
                : examples && Object.keys(examples)[0];

    // check if there are examples
    const keys = examples ? Object.keys(examples) : [];
    const typesLength = keys.length;
    if (typesLength === 0) return { code: 501, type: undefined };

    // if anything is accepted then return first example
    if (accept === '*') return { code: code, type: keys[0] };

    // determine what types and subtypes are supported by examples
    const types = keys.map(key => {
        const ar = key.split('/');
        return { type: ar[0] || '*', subtype: ar[1] || '*' };
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
                (t.subtype === '*' || a.subtype === '*' || a.subtype === t.subtype)) return { code: code, type: keys[j] };
        }
    }

    return { code: 406, type: undefined };
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