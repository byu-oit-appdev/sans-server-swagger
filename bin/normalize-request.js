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
const copy              = require('./copy');

const rxInteger = /^\d+$/;
const rxNumber = /^\d+(?:\.\d+)?$/;

/**
 * Normalize and deserialize the request parameters.
 * @param {SansServer} server
 * @param {Request} req
 * @param {Object} parameters
 */
module.exports = function (server, req, parameters) {
    parameters.forEach(param => {
        const name = param.name;
        const hasDefault = param.hasOwnProperty('default');

        switch (param.in) {
            case 'body':
                const bodyHasDefault = param.schema && param.schema.hasOwnProperty('default');
                const bodyType = typeof req.body;
                if (bodyType === 'undefined' && bodyHasDefault) {
                    req.body = copy(param.schema.default);
                    server.log('req-params', 'Using default value for parameter ' + name);
                }
                if (bodyType !== 'object') req.body = deserializeParameter(server, name, req.body, param.schema);
                break;

            case 'formData':
                if (!req.body && hasDefault) {
                    req.body = {};
                    req.body[name] = [{ headers: {}, content: copy(param.default) }];
                    server.log('req-params', 'Using default value for parameter ' + name);
                }
                if (req.body && typeof req.body === 'object' && req.body.hasOwnProperty(name)) {
                    if (Array.isArray(req.body[name])) {
                        let value = req.body[name];
                        const type = schemaType(param);
                        if (!type) server.log('req-params', 'Indeterminate schema type for parameter ' + name, param);

                        if (type === 'array' && param.collectionFormat === 'multi') {
                            value = value.map((item, index) => {
                                const useDefault = !item.content && hasDefault;
                                const content = useDefault ? copy(param.default) : item.content;
                                if (useDefault) server.log('req-params', 'Using default value for parameter ' + name + ' at index ' + index);
                                return {
                                    headers: item.headers,
                                    content: deserializeParameter(server, name, content, param.items)
                                };
                            });

                        } else {
                            const item = value.pop();
                            const useDefault = !item.content && hasDefault;
                            const content = useDefault ? copy(param.default) : item.content;
                            if (useDefault) server.log('req-params', 'Using default value for parameter ' + name);
                            value = {
                                headers: item.headers,
                                content: deserializeParameter(server, name, content, param)
                            };
                        }

                        req.body[name] = value;

                    } else {
                        delete req.body[name];
                        server.log('req-params', 'Form data parameter ignored due to invalid form data format for parameter ' + name);
                    }
                }
                break;

            case 'header':
                if (!req.headers && hasDefault) {
                    req.headers = {};
                    req.headers[name] = copy(param.default);
                    server.log('req-params', 'Using default value for parameter ' + name);
                }
                if (req.headers && typeof req.headers === 'object') {
                    if (!req.headers.hasOwnProperty(name) && hasDefault) {
                        req.headers[name] = copy(param.default);
                        server.log('req-params', 'Using default value for parameter ' + name);
                    }
                    if (req.headers.hasOwnProperty(name)) req.headers[name] = deserializeParameter(server, name, req.headers[name], param);
                }
                break;

            case 'path':
                if (req.params && typeof req.params === 'object' && req.params.hasOwnProperty(name)) {
                    req.params[name] = deserializeParameter(server, name, req.params[name], param);
                }
                break;

            case 'query':
                if (!req.query && hasDefault) {
                    req.query = {};
                    req.query[name] = copy(param.default);
                    server.log('req-params', 'Using default value for parameter ' + name);
                }
                if (req.query) {
                    if (!req.query.hasOwnProperty(name) && hasDefault) {
                        req.query[name] = copy(param.default);
                        server.log('req-params', 'Using default value for parameter ' + name);
                    }
                    if (req.query.hasOwnProperty(name)) {
                        const type = schemaType(param);
                        if (!type) server.log('req-params', 'Indeterminate schema type for parameter ' + name, param);

                        let value = req.query[name];

                        if (type === 'array' && param.collectionFormat === 'multi') {
                            if (!Array.isArray(value)) value = [value];
                            req.query[name] = value.map(item => deserializeParameter(server, name, item, param.items));

                        } else {
                            if (Array.isArray(value)) value = value.pop();
                            req.query[name] = deserializeParameter(server, name, value, param);
                        }
                    }
                }
                break;
        }
    });
};


/**
 * Deserialize a single parameter.
 * @param {SansServer} server
 * @param {string} name
 * @param {*} value
 * @param {*} schema
 * @returns {*}
 */
function deserializeParameter(server, name, value, schema) {
    if (!schema) return value;

    const type = schemaType(schema);
    if (!type) server.log('req-params', 'Indeterminate schema type for parameter ' + name, schema);

    if (type === 'array') {
        const format = schema.hasOwnProperty('collectionFormat') ? schema.collectionFormat : 'csv';
        const delimiter = format === 'csv' ? ','
            : format === 'ssv' ? ' '
                : format === 'tsv' ? '\t'
                    : format === 'pipes' ? '|' : ',';
        value = value.split(delimiter);
        if (!schema.items) return value;
        return value.map(item => {
            return deserializeParameter(server, 'items for ' + name, item, schema.items);
        });

    } else if (type === 'boolean') {
        return !(value === 'false' || value === 'null' || value === '0' || value === '');

    } else if (type === 'integer' && rxInteger.test(value)) {
        return parseInt(value);

    } else if (type === 'number' && rxNumber.test(value)) {
        return parseFloat(value);

    } else {
        return value;
    }
}

/**
 * Detect the schema type.
 * @param {Object} schema
 * @returns {string,undefined}
 */
function schemaType(schema) {
    let type;
    if (schema.hasOwnProperty('type')) {
        type = schema.type;
    } else if (schema.hasOwnProperty('properties') || schema.hasOwnProperty('allOf') || schema.hasOwnProperty('additionalProperties')) {
        type = 'object';
    } else if (schema.hasOwnProperty('items')) {
        type = 'array';
    }

    switch (type) {
        case 'array':
        case 'boolean':
        case 'file':
        case 'integer':
        case 'number':
        case 'object':
        case 'string':
            return type;
    }
}