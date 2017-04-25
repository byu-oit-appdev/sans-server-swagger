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

exports.array = function(value) {
    return Array.isArray(value);
};

exports.dateObject = function(value) {
    return typeof value === 'object' && value instanceof Date && !isNaN(value);
};

exports.nonNullObject = function(value) {
    return value && typeof value === 'object' && value.constructor.name === 'Object';
};

exports.number = function(value) {
    return typeof value === 'number' && !isNaN(value);
};