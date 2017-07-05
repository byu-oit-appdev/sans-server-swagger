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
const methods = { get: true, post: true, put: true, delete: true, options: true, head: true, patch: true };

module.exports = function(swagger) {
    const errors = [];

    // check for unresolved $ref errors
    const refErrors = findRefs([], swagger, 'root', new WeakMap());
    if (refErrors.length > 0) errors.push('One or more $ref could not be resolved:\n    ' + refErrors.join('\n    '));

    // check that if any parameters are in formData that consumes allows application/x-www-form-urlencoded or multipart/form-data
    const formParamsAllowed = (swagger.consumes || [])
            .filter(str => str === 'application/x-www-form-urlencoded' || str === 'multipart/form-data')
            .length > 0;
    if (!formParamsAllowed && swagger.paths) {
        const pathsWithFormParams = [];
        Object.keys(swagger.paths).forEach(path => {
            Object.keys(swagger.paths[path]).filter(method => methods[method]).forEach(method => {
                const o = swagger.paths[path][method];
                const params = (o && typeof o === 'object' && typeof o.parameters === 'object' && o.parameters) || [];
                if (params.filter(p => p.in === 'formData').length > 0) pathsWithFormParams.push(method.toUpperCase() + ' ' + path);
            });
        });
        if (pathsWithFormParams.length > 0) {
            errors.push('One or more paths allow formData parameters so the swagger definition must consume ' +
                'application/x-www-form-urlencoded and/or multipart/form-data. Paths with errors:\n    ' +
                pathsWithFormParams.join('\n    '));
        }
    }

    return errors;
};

function findRefs(errors, obj, chain, map) {
    if (map.has(obj)) {
        return errors;
    } else if (Array.isArray(obj)) {
        map.set(obj, true);
        obj.forEach((o, i) => {
            findRefs(errors, o, chain + '/' + i, map);
        });
    } else if (obj && typeof obj === 'object') {
        map.set(obj, true);
        if (obj.hasOwnProperty('$ref')) errors.push(chain + '/$ref');
        Object.keys(obj).forEach(k => {
            findRefs(errors, obj[k], chain + '/' + k, map);
        });
    }
    return errors;
}