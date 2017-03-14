/**
 *  @license
 *    Copyright 2016 Brigham Young University
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
const bodyParser        = require('./body-parser');
const checkSwagger      = require('./check-swagger');
const deserialize       = require('./deserialize');
const fs                = require('fs');
const jsonRefs          = require('json-refs');
const normalize         = require('./normalize');
const path              = require('path');
const schema            = require('./schema');
const validate          = require('./validate');
const yaml              = require('js-yaml');

const acceptedMethods = { get: true, post: true, put: true, delete: true, options: true, head: true, patch: true };

module.exports = function (configuration) {
    const config = schema.normalize(configuration);
    const router = config.router;
    let ready = false;

    // produce the swagger object
    const swagger = /\.json$/.test(config.swagger)
        ? require(config.swagger)
        : yaml.load(fs.readFileSync(config.swagger, 'utf8'));

    // make sure that there is a basePath that starts with slash
    if (!swagger.hasOwnProperty('basePath')) swagger.basePath = '/';
    swagger.basePath = '/' + swagger.basePath.replace(/^\//, '').replace(/\/$/, '');
    const rxBasepath = new RegExp('^\\' + swagger.basePath + '(?:\\/|\\?|$)');

    // resolve swagger json references and process swagger object
    const promise = jsonRefs.resolveRefs(swagger)
        .then(data => {
            const swagger = data.resolved;
            const swagggerErrors = checkSwagger(swagger);
            const swaggerString = JSON.stringify(swagger);

            // normalize required properties
            transitionRequiredToProperties(swagger);

            // set global controller
            const globalController = swagger.hasOwnProperty('x-controller') ?
                loadController(config.controllers, swagger['x-controller'], config.development) :
                null;

            // if there is a swagger endpoint then define that path
            if (config.endpoint) {
                router.get(config.ignoreBasePath ? config.endpoint : swagger.basePath + config.endpoint, (req, res) => {
                    res.send(200, swaggerString, { 'Content-Type': 'application/json' });
                });
            }

            // check if the swagger consumes form input
            const bodyParserMiddleware = bodyParser(swagger.consumes);

            if (swagger.hasOwnProperty('paths')) {
                Object.keys(swagger.paths)
                    .forEach(path => {
                        const pathSchema = swagger.paths[path];
                        const pathController = pathSchema.hasOwnProperty('x-controller') ?
                            loadController(config.controllers, pathSchema['x-controller'], config.development) :
                            globalController;
                        const fullPath = config.ignoreBasePath ? path : swagger.basePath + path;

                        Object.keys(pathSchema)
                            .forEach(method => {
                                if (!acceptedMethods[method]) return;
                                const pathErrors = [];
                                const methodSchema = pathSchema[method];

                                if (config.development) {
                                    if (!methodSchema.hasOwnProperty('parameters')) methodSchema.parameters = [];
                                    const hasMockQueryParam = methodSchema.parameters
                                        .filter(p => p.name === 'mock' && p.in === 'query')[0] !== undefined;
                                    if (!hasMockQueryParam) {
                                        methodSchema.parameters.push({
                                            name: 'mock',
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
                                            const err = validate.byType(p.default, p, 0);
                                            if (err) pathErrors.push('Default value does not pass validation for parameter: ' + p.name);
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

                                // define the route
                                router[method](fullPath, bodyParserMiddleware, function(req, res) {
                                    const server = this;
                                    let validateResponse = true;

                                    // deserialize the request parameters
                                    if (hasForm) deserialize.formParser(req, methodSchema.parameters);
                                    if (Array.isArray(methodSchema.parameters)) deserialize.request(req, methodSchema.parameters);

                                    // validate the request
                                    const err = validate.request(req, methodSchema);
                                    if (err) {
                                        validateResponse = false;
                                        res.status(400);
                                        return res.send(err);
                                    }

                                    // add a hook to validate the response before send
                                    res.hook(function(state) {
                                        if (validateResponse && !(state.body instanceof Error)) {
                                            const responseDefinition = methodSchema.responses &&
                                                methodSchema.responses[state.statusCode];

                                            const err = !responseDefinition
                                                ? 'Invalid swagger response code: ' + state.statusCode
                                                : responseDefinition.schema ? validate.response(state.body, responseDefinition.schema, 24) : null;

                                            // if there is an error then update the resonse message
                                            if (err) {
                                                server.log('swagger-error', err);
                                                res.error = Error(err);
                                                this.status(500, true);
                                            }
                                        }
                                    });

                                    // add a build method to the request object
                                    res.build = function(code) {
                                        // TODO: eventually add swagger response here

                                        if (!methodSchema.responses.hasOwnProperty(code)) {
                                            throw Error('Invalid response code for path: ' + method.toUpperCase() + ' ' + fullPath);
                                        }
                                        const responseSchema = methodSchema.responses[code];
                                        const type = normalize.schemaType(responseSchema);
                                        server.log('swagger-build', 'Not yet fully implemented.');

                                        if (type === 'object') {
                                            return {};
                                        } else if (type === 'array') {
                                            return {};
                                        } else {
                                            return '';
                                        }
                                    };

                                    // if it should be mocked
                                    if (req.query.hasOwnProperty('mock') || (!handler && config.development)) {
                                        req.query.mock = req.query.mock || Object.keys(methodSchema.responses)[0] || undefined;
                                        if (!req.query.mock) delete req.query.mock;

                                        const mockCode = parseInt(req.query.mock) || null;
                                        res.status(mockCode || 500);

                                        const responseSchema = methodSchema.responses && methodSchema.responses[mockCode];

                                        // check for a mock property on the operation ID
                                        if (handler && typeof handler.mock === 'function') {
                                            server.log('mock', 'Executing mock from code.');
                                            req.swagger = JSON.parse(swaggerString);
                                            executeController(server, handler.mock, req, res);

                                        // schema-less response mocking
                                        } else if (!responseSchema.hasOwnProperty('schema')) {
                                            server.log('mock', 'Executing mock without for schema-less response. Body set to empty.');
                                            res.send(mockCode, '');

                                        // check for mock example
                                        } else {
                                            server.log('mock', 'Executing mock from example.');
                                            const examples = responseSchema && methodSchema.responses[mockCode].examples;
                                            const accept = req.headers.hasOwnProperty('Accept')
                                                ? req.headers.Accept
                                                : Array.isArray(swagger.produces) && swagger.produces.length > 0
                                                    ? swagger.produces[0]
                                                    : examples && Object.keys(examples)[0];

                                            const match = findMatchingExample(examples, accept);
                                            if (match) {
                                                res.send(examples[match]);
                                            } else {
                                                server.log('mock', 'example not implemented');
                                                validateResponse = false;
                                                res.sendStatus(501);
                                            }
                                        }

                                    // if there is a controller then run it
                                    } else if (handler) {
                                        req.swagger = JSON.parse(swaggerString);
                                        executeController(server, handler, req, res);

                                    } else {
                                        validateResponse = false;
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

            ready = true;
        });

    // if the promise doesn't resolve then the server can start but wont respond to requests
    promise.catch(err => {
        console.error(err.stack);
    });

    // return the middleware function - this essentially makes sure the router is ready before processing router middleware
    return function swaggerRouter(req, res, next) {
        const server = this;

        function execute() {
            router.call(server, req, res, next);
        }

        // if the path does not match the base path then exit middleware
        if (!config.ignoreBasePath && !rxBasepath.test(req.path)) {
            this.log('path', 'The request path does not fall within the basePath: ' + req.url);
            execute();

        } else {
            ready ? execute() : promise.then(() => execute());
        }
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

/**
 * Look through swagger examples and find a match based on the accept content type
 * @param {object} examples
 * @param {string} accept
 * @returns {*}
 */
function findMatchingExample(examples, accept) {
    const keys = examples ? Object.keys(examples) : [];
    if (keys.length === 0) return undefined;
    if (accept === '*') return keys[0];

    const parts = accept.split('/');
    const match = keys.filter(k => {
        const ar = k.split('/');
        return (parts[0] === '*' || parts[0] === ar[0]) && (parts[1] === '*' || parts[1] === ar[1]);
    });
    return match[0];
}

/**
 * Move required array parameters into object properties recursively.
 * @param schema
 */
function transitionRequiredToProperties(schema) {
    if (Array.isArray(schema)) {
        schema.forEach(item => transitionRequiredToProperties(item));
    } else if (schema && typeof schema === 'object') {
        if (Array.isArray(schema.required) && schema.properties && typeof schema.properties === 'object') {
            schema.required.forEach(key => {
                if (schema.properties.hasOwnProperty(key) && schema.properties[key] && typeof schema.properties[key] === 'object') {
                    schema.properties[key].required = true;
                }
            });
        }
        Object.keys(schema).forEach(key => transitionRequiredToProperties(schema[key]));
    }
}