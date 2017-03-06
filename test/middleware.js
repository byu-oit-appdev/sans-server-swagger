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

describe('middleware', () => {

    before(() => {
    });

    afterEach(() => console.log('\n'));

    it('can pass through', () => {
        const server = Server();
        const middleware = Swagger({
            controllers: path.resolve(__dirname, './controllers'),
            development: true,
            ignoreBasePath: true,
            router: Router({ paramFormat: 'handlebar' }),
            swagger: path.resolve(__dirname, './swagger/mocks.yaml')
        });
        server.use(middleware);

        server.use(function secondary(req, res) {
            res.send('secondary');
        });

        return server.request('/not-a-path')
            .then(res => {
                expect(res.body).to.equal('secondary');
            });
    });

});