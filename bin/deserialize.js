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
 * Get a buffer from a binary string.
 * @param {string} value
 * @returns {Buffer}
 */
exports.binary = function(value) {
    if (typeof value !== 'string' || !Enforcer.is.binary(value)) throw Error('Unable to deserialize as binary a non-binary string value: ' + value);
    const ar = [];
    const length = value.length;
    for (let i = 0; i < length; i += 8) ar.push(parseInt(value.substr(i, 8), 2));
    return new Buffer(ar, 'binary');
};

/**
 * Get a buffer from a byte string.
 * @param {string} value
 * @returns {Buffer}
 */
exports.byte = function(value) {
    if (typeof value !== 'string' || !Enforcer.is.byte(value)) throw Error('Unable to deserialize as byte a non-byte string value: ' + value);
    return new Buffer(value, 'base64');
};

/**
 * Get a Date object from a date string.
 * @param {string} value
 * @returns {Date}
 */
exports.date = function(value) {
    if (typeof value !== 'string' || !Enforcer.is.date(value)) throw Error('Unable to deserialize as date a non-date string value: ' + value);
    return new Date(value + 'T00:00:00.000Z');
};

/**
 * Get a Date object from a date-time string.
 * @param {string} value
 * @returns {Date}
 */
exports.dateTime = function(value) {
    if (typeof value !== 'string' || !Enforcer.is.dateTime(value)) throw Error('Unable to deserialize as date-time a non-date-time string value: ' + value);
    return new Date(value);
};

/**
 * Get a buffer from a byte string.
 * @alias {#byte}
 * @type {Function}
 * @param {string} value
 * @returns {Buffer}
 */
exports.file = exports.byte;