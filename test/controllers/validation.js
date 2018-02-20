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
const valid = [
    {
        id: 123,
        name: 'Fido',
        tag: 'Dog'
    }
];

const invalid = [
    {
        id: '123',
        name: 'Fido',
        tag: 'Dog'
    }
];

exports.validResponseExample = (req, res) => res.send(valid);
exports.validResponseMocked = (req, res) => res.send(valid);
exports.validResponseMocked.mock = (req, res) => res.send(valid);
exports.invalidResponse = (req, res) => res.send(invalid);
exports.invalidResponseMocked = (req, res) => res.send(invalid);
exports.invalidResponseMocked.mock = (req, res) => res.send(invalid);

exports.invalidResponseCode = (req, res) => {
    res.status(500).send({ code: 500, message: 'Oops' });
};

exports.defaultResponse = (req, res) => {
    res.status(500).send({ code: 500, message: 'Oops' });
};

exports.inputValidation = (req, res) => res.send('');