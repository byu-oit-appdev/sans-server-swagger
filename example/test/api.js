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
const Router            = require('sans-server-router');
const Server            = require('sans-server');
const Swagger           = require('../../index');

Swagger.testSwaggerResponseExamples.withMocha('swagger response examples', './swagger.yaml');

describe('api', () => {
    let server;
    const config = {
        controllers: './controllers',
        development: true,
        router: Router({ paramFormat: 'handlebar' }),
        swagger: './swagger.yaml'
    };

    before(() => {
        server = Server();
        const swaggerMiddleware = Swagger(config);
        server.use(swaggerMiddleware);
    });

    afterEach(() => console.log('\n'));

    it('examples are valid', () => {
        return Swagger.testSwaggerResponseExamples('./swagger.yaml')
            .then(results => expect(results.percentage).to.equal(1));
    });

    it('Implementation test for GET /v1/pets?tag=mouse', () => {
        return server.request({ method: 'GET', path: '/v1/pets?tag=mouse' })
            .then(res => {
                expect(res.body).to.equal('[]');
            });
    });

    it('Implementation test for GET /v1/pets?tag=dog', () => {
        return server.request({ method: 'GET', path: '/v1/pets?tag=dog' })
            .then(res => {
                const value = JSON.stringify([
                    {
                        id: 123,
                        name: 'Fido',
                        tag: 'Dog'
                    }
                ]);
                expect(res.body).to.equal(value);
            });
    });

    it('Invalid query parameter', () => {
        return server.request({ method: 'GET', path: '/v1/pets?invalid' })
            .then(res => {
                expect(res.statusCode).to.equal(400);
            });
    });

    it('Mock implemented endpoint GET /v1/pets?mock', () => {
        return server.request({ method: 'GET', path: '/v1/pets', query: { mock: '' } })
            .then(res => {
                /*const example = JSON.stringify([
                    {
                        "id": 123,
                        "name": "Sparky",
                        "tag": "Dog"
                    },
                    {
                        "id": 456,
                        "name": "Ghost",
                        "tag": "Cat"
                    },
                    {
                        "id": 789,
                        "name": "Goldy",
                        "tag": "Fish"
                    }
                ]);*/
                expect(res.statusCode).to.equal(500);
            });
    });

    it('POST missing required body', () => {
        return server.request({ method: 'POST', path: '/v1/pets/' })
            .then(res => {
                console.log(res.body);
                expect(res.body).to.have.string('Missing required body');
                expect(res.statusCode).to.equal(400);
            });
    });

    it('POST invalid body missing required properties', () => {
        return server.request({ method: 'POST', path: '/v1/pets/', body: {} })
            .then(res => {
                console.log(res.body);
                expect(res.body).to.have.string('Missing required property');
                expect(res.statusCode).to.equal(400);
            });
    });

    it('POST invalid body invalid property value', () => {
        return server.request({ method: 'POST', path: '/v1/pets/', body: { id: '123', name: 'Mittens' } })
            .then(res => {
                console.log(res.body);
                expect(res.body).to.have.string('Error in body');
                expect(res.statusCode).to.equal(400);
            });
    });

    it('401 mock from example POST /v1/pets?mock=401', () => {
        return server.request({ method: 'POST', path: '/v1/pets', query: { mock: '401' }, body: { id: 123, name: 'Mittens' } })
            .then(res => {
                const example = JSON.stringify({
                    "code": 401,
                    "message": "Unauthorized. You must authenticate before posting."
                });
                expect(res.body).to.equal(example);
            });
    });

    it('501 for missing implementation POST /v1/pets', () => {
        const configuration = Object.assign({}, config, {
            development: false,
            router: Router({ paramFormat: 'handlebar' })
        });

        const api = Server();
        const swaggerMiddleware = Swagger(configuration);
        api.use(swaggerMiddleware);

        return api.request({ method: 'POST', path: '/v1/pets', body: { id: 123, name: 'Mittens' } })
            .then(res => {
                expect(res.statusCode).to.equal(501);
            });
    });

    it('501 for 403 mock missing example POST /v1/pets?mock=403', () => {
        return server.request({ method: 'POST', path: '/v1/pets?mock=403', body: { id: 123, name: 'Mittens' } })
            .then(res => {
                expect(res.statusCode).to.equal(501);
            });
    });

    it('mock via function for GET /v1/pets/8?mock', () => {
        return server.request({ method: 'GET', path: '/v1/pets/8?mock' })
            .then(res => {
                const mock = JSON.stringify({
                    id: 8,
                    name: "Sparky",
                    tag: "Dog"
                });
                expect(res.body).to.equal(mock);
            });
    });

    it('mock via function for GET /v1/pets/8?mock=404', () => {
        return server.request({ method: 'GET', path: '/v1/pets/8', query: { mock: '404' } })
            .then(res => {
                expect(res.body).to.equal('Pet not found: 8');
            });
    });

    it('404 for bad path', () => {
        return server.request({ method: 'GET', path: '/' })
            .then(res => {
                expect(res.statusCode).to.equal(404);
            });
    });

    it('500 for bad response code', () => {
        return server.request({ method: 'GET', path: '/v1/pets/123' })
            .then(res => {
                expect(res.statusCode).to.equal(500);
            });
    });

    it('500 for invalid response body', () => {
        return server.request({ method: 'GET', path: '/v1/pets/123', query: { invalidBody: true } })
            .then(res => {
                expect(res.statusCode).to.equal(500);
            });
    });

});