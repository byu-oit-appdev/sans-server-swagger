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

const rxInteger = /^\d+$/;
const rxNumber = /^\d+(?:\.\d+)?$/;

exports.requestParameters = function (req, parameters) {
    parameters.forEach(param => {
        const name = param.name;
        const hasDefault = param.hasOwnProperty('default');

        switch (param.in) {
            case 'body':
                const bodyHasDefault = param.schema && param.schema.hasOwnProperty('default');
                if (typeof req.body === 'undefined' && bodyHasDefault) {
                    req.body = typeof param.schema.default === 'object'
                        ? JSON.parse(JSON.stringify(param.schema.default))
                        : param.schema.default;
                }
                req.body = deserializeParameter(req.body, param.schema, false);
                break;

            case 'formData':
                if (!req.body && hasDefault) {
                    req.body = {};
                    req.body[name] = [{ headers: {}, content: param.default }];
                }
                if (req.body && typeof req.body === 'object' && req.body.hasOwnProperty(name)) {
                    if (Array.isArray(req.body[name])) {
                        let value = req.body[name];
                        const schemaType = exports.schemaType(param);

                        if (schemaType === 'array' && param.collectionFormat === 'multi') {
                            value = value.map(item => {
                                const content = !item.content && hasDefault ? param.default : item.content;
                                return {
                                    headers: item.headers,
                                    content: deserializeParameter(content, param.items, true)
                                };
                            });

                        } else {
                            const item = value.pop();
                            const content = !item.content && hasDefault ? param.default : item.content;
                            value = {
                                headers: item.headers,
                                content: deserializeParameter(content, param, true)
                            };
                        }

                        req.body[name] = value;

                    } else {
                        delete req.body[name];
                    }
                }
                break;

            case 'header':
                if (!req.headers && hasDefault) {
                    req.headers = {};
                    req.headers[name] = param.default;
                }
                if (req.headers && typeof req.headers === 'object') {
                    if (!req.headers.hasOwnProperty(name) && hasDefault) req.headers[name] = param.default;
                    if (req.headers.hasOwnProperty(name)) req.headers[name] = deserializeParameter(req.headers[name], param, false);
                }
                break;

            case 'path':
                if (req.params && typeof req.params === 'object' && req.params.hasOwnProperty(name)) {
                    req.params[name] = deserializeParameter(req.params[name], param, false);
                }
                break;

            case 'query':
                if (!req.query && hasDefault) {
                    req.query = {};
                    req.query[name] = param.default;
                }
                if (req.query) {
                    if (!req.query.hasOwnProperty(name) && hasDefault) req.query[name] = param.default;
                    if (req.query.hasOwnProperty(name)) {
                        const schemaType = exports.schemaType(param);
                        let value = req.query[name];

                        if (schemaType === 'array' && param.collectionFormat === 'multi') {
                            if (!Array.isArray(value)) value = [value];
                            req.query[name] = value.map(item => deserializeParameter(item, param.items, true));

                        } else {
                            if (Array.isArray(value)) value = value.pop();
                            req.query[name] = deserializeParameter(value, param, true);
                        }
                    }
                }
                break;
        }
    });
};

exports.schemaType = function(schema) {
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
        default:
            return 'string';
    }
};



function deserializeParameter(value, schema) {
    if (!schema) return value;

    const type = exports.schemaType(schema);
    if (type === 'array') {
        const format = schema.hasOwnProperty('collectionFormat') ? schema.collectionFormat : 'csv';
        const delimiter = format === 'csv' ? ','
            : format === 'ssv' ? ' '
                : format === 'tsv' ? '\t'
                    : format === 'pipes' ? '|' : ',';
        value = value.split(delimiter);
        if (!schema.items) return value;
        return value.map(item => {
            return deserializeParameter(item, schema.items);
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