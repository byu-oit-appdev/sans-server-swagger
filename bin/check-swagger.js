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

module.exports = function(swagger) {
    const errors = [];

    const refErrors = findRefs([], swagger, 'root');
    if (refErrors.length > 0) errors.push('One or more $ref could not be resolved:\n    ' + refErrors.join('\n    '));

    return errors;
};

function findRefs(errors, obj, chain) {
    if (Array.isArray(obj)) {
        obj.forEach((o, i) => {
            findRefs(errors, o, chain + '/' + i);
        });
    } else if (obj && typeof obj === 'object') {
        if (obj.hasOwnProperty('$ref')) errors.push(chain + '/$ref');
        Object.keys(obj).forEach(k => {
            findRefs(errors, obj[k], chain + '/' + k);
        });
    }
    return errors;
}