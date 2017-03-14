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
const normalize         = require('./normalize');

/**
 * Deserialize request parameters.
 * @param {object} req
 * @param {object[]} parameters
 */
exports.request = function(req, parameters) {
    parameters.forEach(param => {
        const name = param.name;
        const hasDefault = param.hasOwnProperty('default');
        switch (param.in) {
            case 'body':
                // TODO: check if body has been set - empty string setting should not use default
                if (typeof req.body === 'undefined' && hasDefault) {
                    req.body = typeof param.default === 'object'
                        ? JSON.parse(JSON.stringify(param.default))
                        : param.default;
                } else if (typeof req.body === 'string' && param.schema && typeof param.schema === 'object') {
                    const type = normalize.schemaType(param.schema);
                    if (type === 'array' || type === 'object') {
                        req.body = JSON.parse(req.body);
                    } else {
                        req.body = exports.byType(req.body, param.schema);
                    }
                }
                break;
            case 'formData':
                // TODO
                break;
            case 'header':
                if (!req.headers.hasOwnProperty(name) && hasDefault) req.headers[name] = param.default;
                if (req.headers.hasOwnProperty(name)) req.headers[name] = exports.byType(req.headers[name], param);
                break;
            case 'path':
                if (!req.params.hasOwnProperty(name) && hasDefault) req.params[name] = param.default;
                if (req.params.hasOwnProperty(name)) req.params[name] = exports.byType(req.params[name], param);
                break;
            case 'query':
                if (!req.query.hasOwnProperty(name) && hasDefault) req.query[name] = param.default;
                if (req.query.hasOwnProperty(name)) req.query[name] = exports.byType(req.query[name], param);
                break;
        }
    });
};

/**
 * Deserialize a string by type.
 * @param {string} value
 * @param {object} schema
 * @returns {*}
 */
exports.byType = function(value, schema) {
    const type = normalize.schemaType(schema);
    switch (type) {
        case 'array': return exports.array(value, schema);
        case 'boolean': return exports.boolean(value);
        case 'file': return value; // TODO implement file deserialization
        case 'integer': return exports.integer(value, schema);
        case 'number': return exports.number(value, schema);
        //case 'object': return exports.object(value, schema);
        case 'string':
            switch (schema.format) {
                case 'binary': return exports.binary(value, schema);
                case 'byte': return exports.byte(value, schema);
                case 'date': return exports.date(value, schema);
                case 'date-time': return exports.dateTime(value, schema);
                default: return exports.string(value, schema);
            }
    }
};




exports.array = function(value, schema) {
    const format = schema.hasOwnProperty('collectionFormat') ? schema.collectionFormat : 'csv';
    const delimiter = format === 'csv' ? ','
        : format === 'ssv' ? ' '
        : format === 'tsv' ? '\t'
        : format === 'pipes' ? '|' : ',';
    value = value.split(delimiter);
    if (!schema.items) return value;
    return value.map(item => {
        return exports.byType(item, schema.items);
    });
};

exports.binary = function(value) {
    const ar = [];
    for (let i = 0; i < value.length; i += 8) {
        ar.push(parseInt(value.substr(i, 8), 2));
    }
    return new Buffer(ar, 'binary');
};

exports.boolean = function(value) {
    return !(value === 'false' || value === 'null' || value === '0' || value === '');
};

exports.byte = function(value) {
    return new Buffer(value, 'base64');
};

exports.date = function(value) {
    const match = normalize.rxDate.exec(value);
    if (!match) return value;
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    return new Date(year, month, day, 0, 0, 0, 0);
};

exports.dateTime = function(value) {
    const match = normalize.rxTime.exec(value);
    if (!match) return value;
    const year = +match[1];
    const month = +match[2] - 1;
    const day = +match[3];
    const hour = +match[4];
    const minute = +match[5];
    const second = +match[6];
    const millisecond = +match[7] || 0;
    return new Date(year, month, day, hour, minute, second, millisecond);
};

exports.integer = function(value) {
    const int = parseInt(value);
    return isNaN(int) ? value : int;
};

exports.number = function(value) {
    const num = parseFloat(value);
    return isNaN(value) ? value : num;
};

/*exports.object = function(value, schema) {
    try {
        value = JSON.parse(value);
    } catch (e) {
        value = null;
    }
    if (!schema.schema || !value || typeof value !== 'object') return value;
    Object.keys(value).forEach(key => {
        value[key] = exports.byType(value[key], schema.schema);
    });
    return value;
};*/

exports.string = function(value) {
    return value;
};