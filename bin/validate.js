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
const Enforcer          = require('swagger-enforcer');

/**
 * Build a request validator function.
 * @param {Object} schema The method schema.
 * @param {Object} definitions The definitions object.
 * @returns {Function}
 */
exports.request = function(schema, definitions) {
    const enforcers = {
        body: {},
        formData: {},
        header: {},
        path: {},
        query: {}
    };
    const acceptsParameters = Array.isArray(schema.parameters);

    // build an enforcer for each possible input
    if (acceptsParameters) {
        schema.parameters.forEach(param => {
            const options = { useDefaults: true, enforce: true };
            const name = param.name;
            switch (param.in) {
                case 'body':
                    enforcers.body[name] = Enforcer(param.schema, definitions, options);
                    break;

                case 'formData':
                case 'header':
                case 'path':
                case 'query':
                    enforcers[param.in][name] = Enforcer(param, definitions, options);
                    break;
            }
        });
    }

    return function(req) {
        const errors = [];
        const queryParams = {};

        // validate that inputs match schema
        if (acceptsParameters) {
            schema.parameters.forEach(param => {
                const name = param.name;
                const store = (function(key) {
                    switch (key) {
                        case 'body':
                            const o = {};
                            if (typeof req.body !== 'undefined') o[name] = req.body;
                            return o;
                        case 'formData':
                            return req.body;
                            break;
                        case 'header': return req.headers;
                        case 'path': return req.params;
                        case 'query':
                            queryParams[name] = true;
                            return req.query;
                    }
                })(param.in);
                if (param.in === 'path') param.required = true;

                // check if required and not present
                if (param.required && (!store || !store.hasOwnProperty(name))) {
                    errors.push('Missing required ' + (param.in === 'body' ? 'body payload.' : param.in + ' parameter: ' + name));
                    return;
                }

                // get the value and validate it
                if (store.hasOwnProperty(name)) {
                    const value = store[name];
                    enforcers[param.in][name].errors(value).forEach(err => {
                        errors.push('Error in ' + param.in + (param.in === 'body' ? '' : ' for parameter: ' + name) + '. ' + err.message);
                    });
                }
            });
        }

        // validate that all query parameters are allowed
        Object.keys(req.query)
            .forEach(key => {
                if (!queryParams[key]) errors.push('Use of query parameter not allowed: ' + key);
            });

        if (errors.length > 0) return 'Request did not meet swagger requirements:\n  ' + errors.join('\n  ');
    };
};

/**
 * Build a response validator function.
 * @param {Object} schema The method schema.
 * @param {Object} definitions The definitions object.
 * @returns {Function}
 */
exports.response = function(schema, definitions) {
    const enforcers = {};

    if (schema.responses) {
        const keys = Object.keys(schema.responses);
        const length = keys.length;
        for (let i = 0; i < length; i++) {
            const key = keys[i];
            const resSchema = schema.responses[key].schema;
            if (resSchema) {
                enforcers[key] = {
                    enforce: Enforcer(resSchema, definitions, { useDefaults: true }),
                    validate: Enforcer(resSchema, definitions, { useDefaults: true, enforce: true })
                };
            } else {
                enforcers[key] = null;
            }
        }
    }

    return {
        enforce: function(code, initial) {
            let response_to_enforce = code;
            if (!enforcers.hasOwnProperty(code)) {
                if (!enforcers.hasOwnProperty('default')) throw Error('Invalid swagger response code: ' + code);
                response_to_enforce = 'default';
            }
            if (!enforcers[response_to_enforce]) throw Error('No schema to enforce.');
            return arguments.length > 1 ? enforcers[response_to_enforce].enforce.enforce(initial) : enforcers[response_to_enforce].enforce.enforce();
        },

        hasResponseStatus: function(code) {
            return objectHasOneOf(enforcers, arguments, 0);
        },

        validate: function(code, value) {
            if (!this.hasResponseStatus(code)) return 'Invalid swagger response code: ' + code;

            if (enforcers[code]) {
                const errors = enforcers[code]
                    .validate
                    .errors(value);
                if (errors.length > 0) return 'Response did not meet swagger requirements:\n  ' + errors.join('\n  ');
            } else if (!enforcers.hasOwnProperty(code) && enforcers['default']) {
                const errors = enforcers['default']
                    .validate
                    .errors(value);
                if (errors.length > 0) return 'Response did not meet swagger requirements:\n  ' + errors.join('\n  ');
            }
        }
    }
};

function objectHasOneOf(obj, keys, index) {
    if (obj.hasOwnProperty(keys[index])) return true;
    if (obj.hasOwnProperty('default')) return true;
    return keys.length > index + 1 ? objectHasOneOf(obj, keys, index + 1) : false;
}