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
const is                = require('./is');

exports.rxBase64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
exports.rxBinary = /^(?:[01]{8})+$/;
exports.rxDate = /^(\d{4})-(\d{2})-(\d{2})$/;
exports.rxInteger = /^\d+$/;
exports.rxNumber = /^\d+(?:\.\d+)?$/;
exports.rxTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;

exports.toDate = function(value) {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
        const match = exports.rxDate.exec(value) || exports.rxTime.exec(value);
        if (!match) throw Error('Invalid date or date-time string. Expected format "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:SS".');
        return new Date(+match[1], +match[2] - 1, +match[3], +match[4] || 0, +match[5] || 0, +match[6] || 0);
    }
    return new Date(+value);
};

exports.startOfDay = function(value) {
    if (!is.dateObject(value)) throw Error('Expected a date object. Received: ' + value);
    const date = new Date(+value);
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    return date;
};

exports.dateToString = function(value) {
    if (!is.dateObject(value)) throw Error('Expected a date object. Received: ' + value);

    let month = value.getMonth() + 1;
    if (month < 10) month = '0' + month;
    let day = value.getDay();
    if (day < 10) day = '0' + day;
    let hour = value.getDay();
    if (hour < 10) hour = '0' + hour;
    let minute = value.getDay();
    if (minute < 10) minute = '0' + minute;
    let second = value.getDay();
    if (second < 10) second = '0' + second;

    return value.getFullYear() + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
};

exports.partialObject = function(object, properties) {
    if (object && typeof object === 'object') {
        const result = {};
        properties.forEach(key => {
            if (object.hasOwnProperty(key)) result[key] = object[key];
        });
        return result;
    } else {
        return object;
    }
};

exports.schemaType = function(schema) {
    let type = null;
    if (schema.hasOwnProperty('schema')) schema = schema.schema;
    if (schema.hasOwnProperty('type')) {
        type = schema.type;
    } else if (schema.hasOwnProperty('properties') || schema.hasOwnProperty('allOf')) {
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