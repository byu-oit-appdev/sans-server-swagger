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

// an implemented example for a path
exports.listPets = function(req, res) {
    if (req.query.tag === 'dog') {
        res.send([
            {
                id: 123,
                name: 'Fido',
                tag: 'Dog'
            }
        ]);
    } else {
        res.send([]);
    }
};

/*
 Because this controller has not been implemented yet it's mock will be used
 when in development or when there is a mock query parameter.
  */
/*
exports.createPets = function(req, res) {

};
*/

// until this implementation is complete we can have it call the custom mock
exports.showPetById = function(req, res) {
    if (req.query.invalidBody) {
        res.send({
            id: req.params.petId,
            name: 1234,
            tag: 'Dog'
        });
    } else {
        exports.showPetById.mock(req, res);     // call the mock
    }
};

// a custom mock for this implementation
exports.showPetById.mock = function(req, res) {
    switch (req.query.mock) {
        case '200':
            res.send({
                id: req.params.petId,
                name: "Sparky",
                tag: "Dog"
            });
            break;
        case '404':
            res.send('Pet not found: ' + req.params.petId);
            break;
        default:
            res.status(400).send('Invalid mock request');
    }
};