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
const deserialize       = require('../bin/deserialize');
const expect            = require('chai').expect;

describe('deserialize', () => {

    describe('can deserialize an array', () => {

        it('from default (csv)', () => {
            const str = '1,2,3';
            const schema = {
                items: { type: 'number' }
            };
            expect(deserialize.array(str, schema)).to.deep.equal([1, 2, 3]);
        });

        it('from csv', () => {
            const str = '1,2,3';
            const schema = {
                items: { type: 'number' },
                collectionFormat: 'csv'
            };
            expect(deserialize.array(str, schema)).to.deep.equal([1, 2, 3]);
        });

        it('from ssv', () => {
            const str = '1 2 3';
            const schema = {
                items: { type: 'number' },
                collectionFormat: 'ssv'
            };
            expect(deserialize.array(str, schema)).to.deep.equal([1, 2, 3]);
        });

        it('from tsv', () => {
            const str = '1\t2\t3';
            const schema = {
                items: { type: 'number' },
                collectionFormat: 'tsv'
            };
            expect(deserialize.array(str, schema)).to.deep.equal([1, 2, 3]);
        });

        it('from pipes (|)', () => {
            const str = '1|2|3';
            const schema = {
                items: { type: 'number' },
                collectionFormat: 'pipes'
            };
            expect(deserialize.array(str, schema)).to.deep.equal([1, 2, 3]);
        });

    });

    describe('can deserialize binary', () => {
        let v;

        before(() => v = deserialize.binary('0110100001100101011011000110110001101111'));

        it('creates a buffer', () => {
            expect(v).to.be.instanceOf(Buffer);
        });

        it('value is valid', () => {
            expect(v.toString('utf8')).to.equal('hello');
        });

    });

    describe('can deserialize boolean', () => {

        it('"true" is true', () => {
            expect(deserialize.boolean('true')).to.be.true;
        });

        it('"false" is false', () => {
            expect(deserialize.boolean('false')).to.be.false;
        });

        it('"1" is true', () => {
            expect(deserialize.boolean('1')).to.be.true;
        });

        it('"0" is false', () => {
            expect(deserialize.boolean('0')).to.be.false;
        });

        it('"null" is false', () => {
            expect(deserialize.boolean('null')).to.be.false;
        });

        it('"" is false', () => {
            expect(deserialize.boolean('')).to.be.false;
        });

        it('non empty string is true', () => {
            expect(deserialize.boolean('abc')).to.be.true;
        });

    });

    describe('can deserialize byte', () => {

        let v;

        before(() => v = deserialize.byte('aGVsbG8='));

        it('creates a buffer', () => {
            expect(v).to.be.instanceOf(Buffer);
        });

        it('value is valid', () => {
            expect(v.toString('utf8')).to.equal('hello');
        });

    });

    it('can deserialize a date', () => {
        const d1 = deserialize.date('2000-01-01');
        const d2 = new Date(2000, 0, 1);
        expect(+d1).to.equal(+d2);
    });

    it('can deserialize a date-time', () => {
        const d1 = deserialize.dateTime('2000-01-01T15:05:18.123Z');
        const d2 = new Date(2000, 0, 1, 15, 5, 18, 123);
        expect(+d1).to.equal(+d2);
    });

    it('can deserialize an integer', () => {
        expect(deserialize.integer('15')).to.equal(15);
    });

    it('can deserialize a number', () => {
        expect(deserialize.number('15.1')).to.equal(15.1);
    });

    it('can deserialize a string', () => {
        expect(deserialize.string('foo')).to.equal('foo');
    });

    describe('request', () => {
        const req = {};

        beforeEach(() => {
            req.body = '';
            req.headers = {};
            req.params = {};
            req.query = {};
        });

        describe('body', () => {
            const params = [];

            beforeEach(() => {
                params[0] = {
                    in: 'body',
                    schema: { type: 'string' }
                };
            });

            it('can be a boolean', () => {
                params[0].schema.type = 'boolean';
                req.body = 'false';
                deserialize.request(req, params);
                expect(req.body).to.be.false;
            });

            it('can be an integer', () => {
                params[0].schema.type = 'integer';
                req.body = '1234';
                deserialize.request(req, params);
                expect(req.body).to.equal(1234);
            });

            it('can be a number', () => {
                params[0].schema.type = 'number';
                req.body = '12.34';
                deserialize.request(req, params);
                expect(req.body).to.equal(12.34);
            });

            it('can be a string', () => {
                params[0].schema.type = 'string';
                req.body = 'hello';
                deserialize.request(req, params);
                expect(req.body).to.equal('hello');
            });

            describe('string formats', () => {

                it('binary', () => {
                    params[0].schema.format = 'binary';
                    req.body = '0110100001100101011011000110110001101111';
                    deserialize.request(req, params);
                    expect(req.body.toString('utf8')).to.equal('hello');
                });

                it('byte', () => {
                    params[0].schema.format = 'byte';
                    req.body = 'aGVsbG8=';
                    deserialize.request(req, params);
                    expect(req.body.toString('utf8')).to.equal('hello');
                });

                it('date', () => {
                    const d = new Date(2000, 0, 1);
                    params[0].schema.format = 'date';
                    req.body = '2000-01-01';
                    deserialize.request(req, params);
                    expect(+req.body).to.equal(+d);
                });

                it('date-time', () => {
                    const d = new Date(2000, 0, 1, 15, 5, 18, 123);
                    params[0].schema.format = 'date-time';
                    req.body = '2000-01-01T15:05:18.123Z';
                    deserialize.request(req, params);
                    expect(+req.body).to.equal(+d);
                });

            });

        });

        runParamTests('header', req, 'headers');
        runParamTests('path', req, 'params');
        runParamTests('query', req, 'query');

    });

});

function runParamTests(inValue, req, property) {

    describe(inValue, () => {
        const params = [];

        beforeEach(() => {
            params[0] = {
                name: 'myParam',
                in: inValue,
                type: 'string'
            };
        });

        it('can be an array', () => {
            params[0].type = 'array';
            params[0].items = { type: 'number' };
            req[property].myParam = '1,2,3';
            deserialize.request(req, params);
            expect(req[property].myParam).to.deep.equal([1,2,3]);
        });

        it('can be a boolean', () => {
            params[0].type = 'boolean';
            req[property].myParam = 'false';
            deserialize.request(req, params);
            expect(req[property].myParam).to.be.false;
        });

        it('can be an integer', () => {
            params[0].type = 'integer';
            req[property].myParam = '1234';
            deserialize.request(req, params);
            expect(req[property].myParam).to.equal(1234);
        });

        it('can be a number', () => {
            params[0].type = 'number';
            req[property].myParam = '12.34';
            deserialize.request(req, params);
            expect(req[property].myParam).to.equal(12.34);
        });

        it('can be a string', () => {
            params[0].type = 'string';
            req[property].myParam = 'hello';
            deserialize.request(req, params);
            expect(req[property].myParam).to.equal('hello');
        });

        describe('string formats', () => {

            beforeEach(() => {
                params[0].type = 'string';
            });

            it('binary', () => {
                params[0].format = 'binary';
                req[property].myParam = '0110100001100101011011000110110001101111';
                deserialize.request(req, params);
                expect(req[property].myParam.toString('utf8')).to.equal('hello');
            });

            it('byte', () => {
                params[0].format = 'byte';
                req[property].myParam = 'aGVsbG8=';
                deserialize.request(req, params);
                expect(req[property].myParam.toString('utf8')).to.equal('hello');
            });

            it('date', () => {
                const d = new Date(2000, 0, 1);
                params[0].format = 'date';
                req[property].myParam = '2000-01-01';
                deserialize.request(req, params);
                expect(+req[property].myParam).to.equal(+d);
            });

            it('date-time', () => {
                const d = new Date(2000, 0, 1, 15, 5, 18, 123);
                params[0].format = 'date-time';
                req[property].myParam = '2000-01-01T15:05:18.123Z';
                deserialize.request(req, params);
                expect(+req[property].myParam).to.equal(+d);
            });

        });

    });
}