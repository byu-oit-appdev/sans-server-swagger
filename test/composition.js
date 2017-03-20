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
            swagger: path.resolve(__dirname, './swagger/composition.yaml')
        });

        server.use(middleware);
        api = server;
    });

    describe('get dog', () => {

        it('valid', () => {
            return api.request({ method: 'GET', path: '/v1/dog' })
                .then(res => {
                    expect(res.statusCode).to.equal(200);
                });
        });

        it('missing pack size', () => {
            return api.request({ method: 'GET', path: '/v1/dog', headers: { accept: 'application/invalid-packSize' } })
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

        it('missing pet type', () => {
            return api.request({ method: 'GET', path: '/v1/dog', headers: { accept: 'application/invalid-petType' } })
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

        it('missing name', () => {
            return api.request({ method: 'GET', path: '/v1/dog', headers: { accept: 'application/invalid-name1' } })
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

        it('invalid name', () => {
            return api.request({ method: 'GET', path: '/v1/dog', headers: { accept: 'application/invalid-name2' } })
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

    });

    describe('get pet', () => {

        it('dog', () => {
            return api.request({ method: 'GET', path: '/v1/pet', headers: { accept: 'application/json-dog' } })
                .then(res => {
                    expect(res.statusCode).to.equal(200);
                });
        });

        it('cat', () => {
            return api.request({ method: 'GET', path: '/v1/pet', headers: { accept: 'application/json-cat' } })
                .then(res => {
                    expect(res.statusCode).to.equal(200);
                });
        });

    });

    describe('animal', () => {

        it('dog', () => {
            return api.request({ method: 'GET', path: '/v1/animal' })
                .then(res => {
                    expect(res.statusCode).to.equal(200);
                });
        });

        it('legs', () => {
            return api.request({ method: 'GET', path: '/v1/animal', headers: { accept: 'application/json-wrong' } })
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

    });

});