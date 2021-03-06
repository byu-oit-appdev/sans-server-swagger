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
const fs                = require('fs');
const jsonRefs          = require('json-schema-ref-parser');
const yaml              = require('js-yaml');

/**
 * Load the swagger file and resolve all references.
 * @param {string} swaggerFilePath
 * @returns {Promise<Object>}
 */
module.exports = function(swaggerFilePath) {
    const content = fs.readFileSync(swaggerFilePath, 'utf8');
    const swagger = /\.json$/.test(swaggerFilePath)
        ? JSON.parse(content)
        : yaml.load(content);
    return jsonRefs
        .dereference(swagger, { dereference: { onErrorThrow: false } })
        .then(schema => {
            return {
                content: content,
                swagger: schema
            }
        });
};