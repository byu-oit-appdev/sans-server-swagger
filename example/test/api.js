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
const byuApi            = require('../../index');

describe('api', () => {

    const config = {
        controllers: './controllers',
        development: true,
        swagger: './swagger.json'
    };

    let api;

    before(() => {
        api = byuApi(config);
    });

    afterEach(() => console.log('\n'));

    it('GET /v1/pets?mode=empty', () => {
        return api.request({ method: 'GET', path: '/v1/pets?mode=empty' })
            .then(res => {
                expect(res.body).to.equal('[]');
            });
    });

    it('GET /v1/pets?mode=valid', () => {
        return api.request({ method: 'GET', path: '/v1/pets?mode=valid' })
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

    it('GET /v1/pets?mode=invalid', () => {
        return api.request({ method: 'GET', path: '/v1/pets?mode=invalid' })
            .then(res => {
                expect(res.statusCode).to.equal(500);
            });
    });

    it('response[0] mock from example GET /v1/pets?mock', () => {
        return api.request({ method: 'GET', path: '/v1/pets', query: { mock: '' } })
            .then(res => {
                const example = JSON.stringify([
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
                ]);
                expect(res.body).to.equal(example);
            });
    });

    it('POST missing required body', () => {
        return api.request({ method: 'POST', path: '/v1/pets/' })
            .then(res => {
                console.log(res.body);
                expect(res.body).to.have.string('Missing required body');
                expect(res.statusCode).to.equal(400);
            });
    });

    it('POST invalid body missing required properties', () => {
        return api.request({ method: 'POST', path: '/v1/pets/', body: {} })
            .then(res => {
                console.log(res.body);
                expect(res.body).to.have.string('missing required properties');
                expect(res.statusCode).to.equal(400);
            });
    });

    it('POST invalid body invalid property value', () => {
        return api.request({ method: 'POST', path: '/v1/pets/', body: { id: '123', name: 'Mittens' } })
            .then(res => {
                console.log(res.body);
                expect(res.body).to.have.string('Error in property');
                expect(res.statusCode).to.equal(400);
            });
    });

    it('401 mock from example POST /v1/pets?mock=401', () => {
        return api.request({ method: 'POST', path: '/v1/pets', query: { mock: '401' }, body: { id: 123, name: 'Mittens' } })
            .then(res => {
                const example = JSON.stringify({
                    "code": 401,
                    "message": "Unauthorized. You must authenticate before posting."
                });
                expect(res.body).to.equal(example);
            });
    });

    it('501 for missing implementation POST /v1/pets', () => {
        const configuration = Object.assign({}, config, { development: false });
        const api = byuApi(configuration);
        return api.request({ method: 'POST', path: '/v1/pets', body: { id: 123, name: 'Mittens' } })
            .then(res => {
                expect(res.statusCode).to.equal(501);
            });
    });

    it('501 for 403 mock missing example POST /v1/pets?mock=403', () => {
        return api.request({ method: 'POST', path: '/v1/pets?mock=403', body: { id: 123, name: 'Mittens' } })
            .then(res => {
                expect(res.statusCode).to.equal(501);
            });
    });

    it('mock via function for GET /v1/pets/8?mock', () => {
        return api.request({ method: 'GET', path: '/v1/pets/8?mock' })
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
        return api.request({ method: 'GET', path: '/v1/pets/8', query: { mock: '404' } })
            .then(res => {
                expect(res.body).to.equal('Pet not found: 8');
            });
    });

    it('404 for bad path', () => {
        return api.request({ method: 'GET', path: '/' })
            .then(res => {
                expect(res.statusCode).to.equal(404);
            });
    });

    it('405 for bad method', () => {
        return api.request({ method: 'PUT', path: '/v1/pets' })
            .then(res => {
                expect(res.statusCode).to.equal(405);
            });
    });

    it('500 for bad response', () => {
        return api.request({ method: 'GET', path: '/v1/pets/123' })
            .then(res => {
                expect(res.statusCode).to.equal(500);
            });
    });

});