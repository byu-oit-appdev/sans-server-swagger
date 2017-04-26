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
const normalize         = require('../bin/normalize');

describe('normalize', () => {

    describe('request parameters', () => {

        describe('body', () => {

            it('can use default', () => {
                const parameters = [
                    {
                        name: 'body',
                        in: 'body',
                        schema: { type: 'string', default: 'hello' }
                    }
                ];
                const req = {};
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ body: 'hello' });
            });

            it('deserializes value', () => {
                const parameters = [
                    {
                        name: 'body',
                        in: 'body',
                        schema: { type: 'number' }
                    }
                ];
                const req = { body: '123' };
                normalize.requestParameters(req, parameters);
                expect(req.body).to.equal(123);
            });

        });

        describe('form data', () => {

            it('can use default', () => {
                const parameters = [
                    {
                        name: 'foo',
                        in: 'formData',
                        type: 'string',
                        default: 'hello',
                        allowEmptyValue: true
                    }
                ];
                const req = {};
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ body: { foo: { headers: {}, content: 'hello' } } });
            });

            it('can deserialize', () => {
                const parameters = [
                    {
                        name: 'foo',
                        in: 'formData',
                        type: 'number'
                    }
                ];
                const req = {
                    body: {
                        foo: [
                            { headers: {}, content: '123' }
                        ]
                    }
                };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ body: { foo: { headers: {}, content: 123 } } });
            });

            it('can deserialize multi', () => {
                const parameters = [
                    {
                        name: 'foo',
                        in: 'formData',
                        type: 'array',
                        collectionFormat: 'multi',
                        items: { type: 'number' }
                    }
                ];
                const req = {
                    body: {
                        foo: [
                            { headers: {}, content: '123' },
                            { headers: {}, content: '456' }
                        ]
                    }
                };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ body: { foo: [{ headers: {}, content: 123 }, { headers: {}, content: 456 }] } });
            });

            it('invalid format', () => {
                const parameters = [
                    {
                        name: 'foo',
                        in: 'formData',
                        type: 'string'
                    }
                ];
                const req = {
                    body: {
                        foo: 'abc'
                    }
                };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ body: {} });
            });

        });

        describe('header', () => {

            it('can use default', () => {
                const parameters = [
                    {
                        name: 'x-foo',
                        in: 'header',
                        type: 'string',
                        default: 'abc'
                    }
                ];
                const req = {};
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ headers: { 'x-foo': 'abc' } });
            });

            it('can use default 2', () => {
                const parameters = [
                    {
                        name: 'x-foo',
                        in: 'header',
                        type: 'string',
                        default: 'abc'
                    }
                ];
                const req = { headers: {} };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ headers: { 'x-foo': 'abc' } });
            });

            it('can deserialize array', () => {
                const parameters = [
                    {
                        name: 'x-foo',
                        in: 'header',
                        type: 'array',
                        collectionFormat: 'ssv',
                        items: { type: 'number' }
                    }
                ];
                const req = { headers: { 'x-foo': '1 2 3' } };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ headers: { 'x-foo': [1, 2, 3] } });
            });

            it('can deserialize boolean', () => {
                const parameters = [
                    {
                        name: 'x-foo',
                        in: 'header',
                        type: 'boolean'
                    }
                ];
                const req = { headers: { 'x-foo': '' } };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ headers: { 'x-foo': false } });
            });

            it('can deserialize number', () => {
                const parameters = [
                    {
                        name: 'x-foo',
                        in: 'header',
                        type: 'number'
                    }
                ];
                const req = { headers: { 'x-foo': '123.4' } };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ headers: { 'x-foo': 123.4 } });
            });

            it('can deserialize integer', () => {
                const parameters = [
                    {
                        name: 'x-foo',
                        in: 'header',
                        type: 'integer'
                    }
                ];
                const req = { headers: { 'x-foo': '123' } };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ headers: { 'x-foo': 123 } });
            });

        });

        describe('path', () => {

            it('can deserialize', () => {
                const parameters = [
                    {
                        name: 'foo',
                        in: 'path',
                        type: 'number'
                    }
                ];
                const req = { params: { foo: '123' } };
                normalize.requestParameters(req, parameters);
                expect(req).to.deep.equal({ params: { foo: 123 } });
            });

        });

        describe.only('query', () => {

        });

        /*describe('array collection', () => {

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

            it('no items definition', () => {
                const str = '1,2,3';
                const schema = {
                    collectionFormat: 'dne'
                };
                expect(deserialize.array(str, schema)).to.deep.equal(['1', '2', '3']);
            });

        });*/

    });

});