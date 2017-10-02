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
const expect            = require('chai').expect;
const path              = require('path');
const Router            = require('sans-server-router');
const Swagger           = require('../index');
const Server            = require('sans-server');

describe('composition', () => {
    let api;

    before(() => {
        const server = Server();

        const middleware = Swagger({
            controllers: path.resolve(__dirname, './controllers'),
            development: true,
            router: Router({ paramFormat: 'handlebar' }),
            swagger: path.resolve(__dirname, './swagger/circular.json')
        });

        server.use(middleware);
        api = server;
    });

    describe('recursive object', () => {

        it.only('mock not implemented', () => {
            return api.request({ method: 'GET', path: '/v1/recObj' })
                .then(res => {
                    expect(res.statusCode).to.equal(501);
                });
        });

    });

});