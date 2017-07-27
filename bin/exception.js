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
module.exports = Exception;

/**
 * Create a swagger response instance.
 * @param {Number} code
 * @param {String} [message]
 * @returns {Exception}
 * @constructor
 */
function Exception(code, message) {
    const factory = Object.create(Exception.prototype);
    factory.code = code;
    factory.message = message;
    factory.stack = factory.toString();
    return factory;
}

Exception.prototype = Object.create(Error.prototype);
Exception.prototype.name = Exception;
Exception.prototype.constructor = Exception;

Exception.prototype.toJSON = function() {
    return JSON.stringify({ code: this.code, message: this.message });
};

Exception.prototype.toString = function() {
    return 'Exception [' + this.code + ']: ' + this.message;
};