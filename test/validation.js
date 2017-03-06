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

describe('validation', () => {
    let api;

    const validCtrl = JSON.stringify([{
        id: 123,
        name: 'Fido',
        tag: 'Dog'
    }]);

    const validExample = JSON.stringify([{
        id: 123,
        name: 'Sparky',
        tag: 'Dog'
    }]);

    const invalid = JSON.stringify([{
        id: '123',
        name: 'Fido',
        tag: 'Dog'
    }]);

    before(() => {
        const server = Server();

        const middleware = Swagger({
            controllers: path.resolve(__dirname, './controllers'),
            development: true,
            ignoreBasePath: false,
            router: Router({ paramFormat: 'handlebar' }),
            swagger: path.resolve(__dirname, './swagger/validation.yaml')
        });

        server.use(middleware);
        api = server;
    });

    describe('valid response', () => {

        afterEach(() => console.log('\n'));

        it('controller', () => {
            return api.request('/v1/valid-response')
                .then(res => {
                    expect(res.body).to.equal(validCtrl);
                });
        });

        it('mock example', () => {
            return api.request('/v1/valid-response?mock')
                .then(res => {
                    expect(res.body).to.equal(validExample);
                });
        });

    });

    describe('valid response mocked', () => {

        afterEach(() => console.log('\n'));

        it('controller', () => {
            return api.request('/v1/valid-response-mocked')
                .then(res => {
                    expect(res.body).to.equal(validCtrl);
                });
        });

        it('mock implementation precedes example', () => {
            return api.request('/v1/valid-response-mocked?mock')
                .then(res => {
                    expect(res.body).to.equal(validCtrl);
                });
        });

    });

    describe('invalid response', () => {

        afterEach(() => console.log('\n'));

        it('controller', () => {
            return api.request('/v1/invalid-response')
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

        it('mocked example', () => {
            return api.request('/v1/invalid-response?mock')
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

    });

    describe('invalid response mocked', () => {

        afterEach(() => console.log('\n'));

        it('controller', () => {
            return api.request('/v1/invalid-response-mocked')
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

        it('mocked implementation', () => {
            return api.request('/v1/invalid-response-mocked?mock')
                .then(res => {
                    expect(res.statusCode).to.equal(500);
                });
        });

    });

    describe('input validation', () => {

        afterEach(() => console.log('\n'));

        it('valid with required body', () => {
            return api.request({ method: 'POST', path: '/v1/input-validation', body: { id: 123, name: 'Fido', tag: 'Dog' } })
                .then(res => {
                    expect(res.statusCode).to.equal(200);
                });
        });

        it('invalid with missing body', () => {
            return api.request({ method: 'POST', path: '/v1/input-validation' })
                .then(res => {
                    expect(res.statusCode).to.equal(400);
                });
        });

        it('invalid with invalid body', () => {
            return api.request({ method: 'POST', path: '/v1/input-validation', body: { id: '123', name: 'Fido', tag: 'Dog' } })
                .then(res => {
                    expect(res.statusCode).to.equal(400);
                });
        });

        it('mode matches enum', () => {
            return api.request({ method: 'POST', path: '/v1/input-validation?mode=one', body: { id: 123, name: 'Fido', tag: 'Dog' } })
                .then(res => {
                    expect(res.statusCode).to.equal(200);
                });
        });

        it('mode does not match enum', () => {
            return api.request({ method: 'POST', path: '/v1/input-validation?mode=foo', body: { id: 123, name: 'Fido', tag: 'Dog' } })
                .then(res => {
                    expect(res.statusCode).to.equal(400);
                });
        });

    });

});