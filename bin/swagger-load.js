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
const jsonRefs          = require('json-refs');
const yaml              = require('js-yaml');

/**
 * Load the swagger file and resolve all references.
 * @param {string, object} swaggerFilePath
 * @returns {Promise<Object>}
 */
module.exports = function(swaggerFilePath) {
    const swagger = typeof swaggerFilePath === 'string'
        ? /\.json$/.test(swaggerFilePath) ? require(swaggerFilePath) : yaml.load(fs.readFileSync(swaggerFilePath, 'utf8'))
        : swaggerFilePath;
    return jsonRefs.resolveRefs(swagger, { resolveCirculars: true, location: swaggerFilePath }).then(data => data.resolved);
};