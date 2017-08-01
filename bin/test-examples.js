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
const Typed             = require('fully-typed');

const schema = Typed({
    type: Object,
    properties: {
        flatten: {
            type: Boolean,
            default: false
        }
    }
});

module.exports = testSwaggerResponseExamples;

function testSwaggerResponseExamples(swaggerFilePath) {
    return testSwaggerResponseExamples.getTests(swaggerFilePath, { flatten: true })
        .then(tests => {
            let pass = 0;
            let fail = 0;
            tests.forEach(test => {
                try {
                    test.test();
                    pass++;
                    console.log('\u001b[92m\u2713 ' + test.description + '\u001b[39m');
                } catch (err) {
                    fail++;
                    console.log('\u001b[91m\u2717 ' + test.description + '\n    ' + err.message + '\u001b[39m');
                }
            });
            return {
                fail: fail,
                pass: pass,
                percentage: pass / (pass + fail),
                total: pass + fail
            }
        });
}

testSwaggerResponseExamples.withMocha = function(description, swaggerFilePath, autoRun) {
    if (typeof run !== 'function') throw Error('You must run mocha with the --delay flag to test the swagger response examples.');
    if (arguments.length < 3) autoRun = true;

    return testSwaggerResponseExamples.getTests(swaggerFilePath)
        .then(tests => {
            describe(description, () => {

                Object.keys(tests).forEach(path => {
                    describe(path, () => {

                        Object.keys(tests[path]).forEach(method => {
                            describe(method, () => {

                                Object.keys(tests[path][method]).forEach(mimeType => {
                                    it(mimeType, tests[path][method][mimeType]);
                                });

                            });
                        });

                    });
                });

            });

            if (autoRun) run();
        });
};

testSwaggerResponseExamples.withTape = function(tape, swaggerFilePath) {
    return testSwaggerResponseExamples.getTests(swaggerFilePath, { flatten: true })
        .then(tests => {
            tests.forEach(test => {
                try {
                    test.test();
                    tape.pass(test.description);
                } catch (err) {
                    tape.error(err)
                }
            });
        });
};


testSwaggerResponseExamples.getTests = function(swaggerFilePath, options) {
    const config = schema.normalize(options || {});
    const fullPath = path.resolve(process.cwd(), swaggerFilePath);
    const tests = {};

    return swaggerLoad(fullPath)
        .then(swagger => {
            swagger = swagger.swagger;
            if (!swagger.hasOwnProperty('paths')) return;

            // paths
            Object.keys(swagger.paths)
                .forEach(function(path) {
                    const pathSchema = swagger.paths[path];
                    tests[path] = {};

                    // methods
                    Object.keys(pathSchema)
                        .filter(key => acceptedMethods[key])
                        .forEach(method => {
                            const methodSchema = pathSchema[method];
                            if (!methodSchema.hasOwnProperty('responses')) return;
                            tests[path][method] = {};

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
                                            tests[path][method][mimeType] = function() {
                                                const example = responseSchema.examples[mimeType];
                                                enforcer.validate(example);
                                            };
                                        });
                                });
                        });
                });
        })
        .then(() => {
            if (!config.flatten) return tests;

            const flat = [];
            Object.keys(tests).forEach(path => {
                Object.keys(tests[path]).forEach(method => {
                    Object.keys(tests[path][method]).forEach(mimeType => {
                        flat.push({
                            description: method.toUpperCase() + ' ' + path + ' ' + mimeType,
                            test: tests[path][method][mimeType]
                        });
                    });
                });
            });
            return flat;
        });
};