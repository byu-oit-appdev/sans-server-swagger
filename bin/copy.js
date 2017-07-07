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

module.exports = function(obj) {
    const map = new WeakMap();
    return copy(obj, map);
};

/**
 * Perform a deep copy of an object.
 * @param {Object} obj
 * @param {WeakMap} [map]
 * @returns {*}
 */
function copy(obj, map) {
    if (map.has(obj)) {
        return obj;
    } else if (Array.isArray(obj)) {
        const result = [];
        obj.forEach(item => {
            result.push(copy(item, map));
        });
        return result;
    } else if (typeof obj === 'object' && obj) {
        const result = {};
        Object.keys(obj).forEach(key => {
            result[key] = copy(obj[key], map);
        });
        return result;
    } else {
        return obj;
    }
}