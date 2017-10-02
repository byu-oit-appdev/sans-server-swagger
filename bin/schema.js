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
const path          = require('path');
const Typed         = require('fully-typed');

module.exports = Typed({
    type: Object,
    properties: {
        controllers: {
            type: String,
            required: true,
            transform: p => path.resolve(process.cwd(), p)
        },
        endpoint: {
            type: String,
            default: '/swagger'
        },
        exception: {
            type: Function,
            default: function(err, req, res, next) {
                res.reset().status(err.statusCode).body('Need to get better body here');
                next();
            }
        },
        development: {
            type: Boolean,
            default: false
        },
        ignoreBasePath: {
            type: Boolean,
            default: false
        },
        mockQueryParameter: {
            type: String,
            default: 'mock',
            minLength: 1
        },
        swagger: [
            {
                type: String,
                required: true,
                pattern: /\.(?:json|yaml)$/i,
                transform: p => path.resolve(process.cwd(), p)
            },
            {
                type: Object,
                allowNull: false,
                required: true
            }
        ]
    }
});