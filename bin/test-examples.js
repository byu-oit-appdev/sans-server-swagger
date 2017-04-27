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
const acceptedMethods   = require('./accept-methods');
const Enforcer          = require('swagger-enforcer');
const path              = require('path');
const swaggerLoad       = require('./swagger-load');

module.exports = function(swaggerFilePath, callback, done) {
    const fullPath = path.resolve(process.cwd(), swaggerFilePath);
    const promise = swaggerLoad(fullPath)
        .then(swagger => {
            if (!swagger.hasOwnProperty('paths')) return;

            // paths
            Object.keys(swagger.paths)
                .forEach(function(path) {
                    const pathSchema = swagger.paths[path];

                    // methods
                    Object.keys(pathSchema)
                        .filter(key => acceptedMethods[key])
                        .forEach(method => {
                            const methodSchema = pathSchema[method];
                            if (!methodSchema.hasOwnProperty('responses')) return;

                            // responses
                            Object.keys(methodSchema.responses)
                                .forEach(response => {
                                    const responseSchema = methodSchema.responses[response];
                                    if (!responseSchema.hasOwnProperty('examples') || !responseSchema.hasOwnProperty('schema')) return;

                                    // get enforcer
                                    const enforcer = Enforcer(responseSchema.schema, swagger.definitions || {}, { enforce: true, useDefaults: true });

                                    // examples
                                    Object.keys(responseSchema.examples)
                                        .forEach(mimeType => {
                                            callback(method.toUpperCase() + ' ' + path + ' ' + mimeType, function() {
                                                const example = responseSchema.examples[mimeType];
                                                enforcer.validate(example);
                                            });
                                        });
                                });
                        });
                });
        });

    // resolve async in appropriate paradigm
    if (typeof done !== 'function') return promise;
    promise.then(() => done(), err => done(err));
};