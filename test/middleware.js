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

    const helloPath = {
        '/': {
            get: {
                responses: {
                    '200': {
                        schema: {
                            type: 'string'
                        },
                        examples: {
                            'text/plain': 'hello'
                        }
                    }
                }
            }
        }
    };

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

    describe('base path', () => {

        it('no base path with ignored base path', () => {
            const server = makeServer({
                ignoreBasePath: true,
                swagger: {
                    paths: helloPath
                }
            });
            return server.request({ method: 'GET', path: '/' })
                .then(res => expect(res.body).to.equal('hello'));
        });

        it('no base path with used base path', () => {
            const server = makeServer({
                ignoreBasePath: false,
                swagger: {
                    paths: helloPath
                }
            });
            return server.request({ method: 'GET', path: '/' })
                .then(res => expect(res.body).to.equal('hello'));
        });

        it('has base path with ignored base path', () => {
            const server = makeServer({
                ignoreBasePath: true,
                swagger: {
                    basePath: '/api',
                    paths: helloPath
                }
            });
            return server.request({ method: 'GET', path: '/' })
                .then(res => expect(res.body).to.equal('hello'));
        });

        it('has path with used base path', () => {
            const server = makeServer({
                ignoreBasePath: false,
                swagger: {
                    basePath: '/api',
                    paths: helloPath
                }
            });
            return server.request({ method: 'GET', path: '/api/' })
                .then(res => expect(res.body).to.equal('hello'));
        });

    });

    describe('definitions', () => {

        it('none provided', () => {
            const server = makeServer({
                swagger: {
                    paths: helloPath
                }
            });
            return server.request({ method: 'GET', path: '/' });
        });

        it('null provided', () => {
            const server = makeServer({
                swagger: {
                    paths: helloPath,
                    definitions: null
                }
            });
            return server.request({ method: 'GET', path: '/' });
        });

    });

    describe('endpoint', () => {

        it('default', () => {
            const server = makeServer({
                swagger: {
                    paths: helloPath
                }
            });
            return server.request({ method: 'GET', path: '/swagger' })
                .then(res => {
                    const body = JSON.parse(res.body);
                    expect(body).to.deep.equal({ basePath: '/', paths: helloPath });
                });
        });

        it('enabled', () => {
            const server = makeServer({
                endpoint: 'abc',
                swagger: {
                    paths: helloPath
                }
            });
            return server.request({ method: 'GET', path: '/abc' })
                .then(res => {
                    const body = JSON.parse(res.body);
                    expect(body).to.deep.equal({ basePath: '/', paths: helloPath });
                });
        });

        it('disabled', () => {
            const server = makeServer({
                endpoint: '',
                swagger: {
                    paths: helloPath,
                    definitions: null
                }
            });
            return server.request({ method: 'GET', path: '/' })
                .then(res => expect(res.body).to.equal('hello'));
        });

    });

    describe('paths', () => {

        it('no defined paths', () => {
            const server = makeServer({
                swagger: {}
            });
            return server.request({ method: 'GET', path: '/' })
                .then(res => expect(res.statusCode).to.equal(404));
        });

    });

    describe('controllers', () => {

        it('method controller', () => {
            const paths = JSON.parse(JSON.stringify(helloPath));
            paths['/'].get['x-controller'] = 'foo';
            expect(() => makeServer({ swagger: { paths: paths } })).not.to.throw(Error);
        });

        it('invalid controller', () => {
            const server = makeServer({ development: false, swagger: { 'x-controller': 'foo' } });
            return server.request('/')
                .then(res => expect(res.statusCode).to.equal(404));
        });

    });

    describe('input parameters', () => {
        let paths;

        beforeEach(() => {
            paths = JSON.parse(JSON.stringify(helloPath));
        });

        it('form data', () => {
            paths['/'].get.parameters = [{
                name: 'foo',
                in: 'formData',
                type: 'string'
            }];
            const server = makeServer({ paths: paths });
            return server
                .request({
                    path: '/',
                    body: {
                        foo: [{
                            headers: {},
                            content: 'abc'
                        }]
                    }
                });
        });

    });

});

function makeServer(config) {
    const server = Server();
    const configuration = Object.assign({
        controllers: './controllers',
        development: true,
        ignoreBasePath: false,
        router: Router({ paramFormat: 'handlebar' })
    }, config);
    const middleware = Swagger(configuration);
    server.use(middleware);
    return server;
}