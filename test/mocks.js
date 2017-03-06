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

describe('mocks', () => {
    tests('controller development mock implemented');
    tests('controller development mock -implemented');
    tests('controller development -mock implemented');
    tests('controller development -mock -implemented');
    tests('controller -development mock implemented');
    tests('controller -development mock -implemented');
    tests('controller -development -mock implemented');
    tests('controller -development -mock -implemented');
    tests('-controller development mock implemented');
    tests('-controller development mock -implemented');
    tests('-controller development -mock implemented');
    tests('-controller development -mock -implemented');
    tests('-controller -development mock implemented');
    tests('-controller -development mock -implemented');
    tests('-controller -development -mock implemented');
    tests('-controller -development -mock -implemented');

    it('can mock schema-less response', () => {
        const api = Server();

        const middleware = Swagger({
            controllers: path.resolve(__dirname, './controllers'),
            development: true,
            ignoreBasePath: false,
            router: Router({ paramFormat: 'handlebar' }),
            swagger: path.resolve(__dirname, './swagger/mocks.yaml')
        });
        api.use(middleware);

        return api.request({ method: 'GET', path: '/v1/schemaless' })
            .then(res => {
                expect(res.statusCode).to.equal(204);
                expect(res.body).to.equal('');
            });
    });
});

function tests(name) {

    describe(name, () => {
        let api;
        let hasCtrl = false;
        let devMode = false;
        let hasMock = false;
        let hasImpl = false;
        const ar = name.split(' ');
        const shortName = ar
            .map(v => {
                const prefix = /^-/.test(v) ? '_' : '';
                switch (v.replace(/^-/, '')) {
                    case 'controller':
                        hasCtrl = !prefix;
                        return prefix + 'Ctrl';
                    case 'development':
                        devMode = !prefix;
                        return prefix + 'Dev';
                    case 'mock':
                        hasMock = !prefix;
                        return prefix + 'Mock';
                    case 'implemented':
                        hasImpl = !prefix;
                        return prefix + 'Impl';
                }
            })
            .join('');

        before(() => {
            const server = Server();

            const middleware = Swagger({
                controllers: path.resolve(__dirname, './controllers'),
                development: devMode,
                ignoreBasePath: false,
                router: Router({ paramFormat: 'handlebar' }),
                swagger: path.resolve(__dirname, './swagger/mocks.yaml')
            });

            server.use(middleware);
            api = server;
        });

        afterEach(() => console.log('\n'));

        it('auto mock', () => {
            return api.request({ method: 'GET', path: '/v1/' + shortName })
                .then(res => {
                    if (hasCtrl) {
                        const value = JSON.stringify({name: shortName + ' Implemented'});
                        expect(res.body).to.equal(value);
                    } else if (devMode) {
                       const value = JSON.stringify({ name: shortName + '200JSON' });
                        expect(res.body).to.equal(value);
                    } else {
                        expect(res.statusCode).to.equal(501);
                    }
                });
        });

        it('query mock', () => {
            return api.request({ method: 'GET', path: '/v1/' + shortName + '?mock' })
                .then(res => {
                    if (hasMock || devMode) {
                        if (hasImpl && hasCtrl) {
                            const value = JSON.stringify({ name: shortName + ' Mock Implemented' });
                            expect(res.body).to.equal(value);
                        } else {
                            const value = JSON.stringify({ name: shortName + '200JSON' });
                            expect(res.body).to.equal(value);
                        }
                    } else {
                        expect(res.statusCode).to.equal(400);
                    }
                });
        });

        it('query mock 200', () => {
            return api.request({ method: 'GET', path: '/v1/' + shortName + '?mock=200' })
                .then(res => {
                    if (hasMock || devMode) {
                        if (hasImpl && hasCtrl) {
                            const value = JSON.stringify({ name: shortName + ' Mock Implemented' });
                            expect(res.body).to.equal(value);
                        } else {
                            const value = JSON.stringify({ name: shortName + '200JSON' });
                            expect(res.body).to.equal(value);
                        }
                    } else {
                        expect(res.statusCode).to.equal(400);
                    }
                });
        });

        it('query mock 201', () => {
            return api.request({ method: 'GET', path: '/v1/' + shortName + '?mock=201' })
                .then(res => {
                    if (hasMock || devMode) {
                        if (hasImpl && hasCtrl) {
                            const value = JSON.stringify({ name: shortName + ' Mock Implemented' });
                            expect(res.body).to.equal(value);
                        } else {
                            const value = JSON.stringify({ name: shortName + '201JSON' });
                            expect(res.body).to.equal(value);
                        }
                    } else {
                        expect(res.statusCode).to.equal(400);
                    }
                });
        });

        it('query mock 200 application/foo', () => {
            return api.request({ method: 'GET', path: '/v1/' + shortName + '?mock=200', headers: { accept: 'application/foo' } })
                .then(res => {
                    if (hasMock || devMode) {
                        if (hasImpl && hasCtrl) {
                            const value = JSON.stringify({ name: shortName + ' Mock Implemented' });
                            expect(res.body).to.equal(value);
                        } else {
                            const value = JSON.stringify({ name: shortName + '200Foo' });
                            expect(res.body).to.equal(value);
                        }
                    } else {
                        expect(res.statusCode).to.equal(400);
                    }
                });
        });

    });
}