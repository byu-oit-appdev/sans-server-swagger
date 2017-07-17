/**
 *  @license
 *    Copyright 2017 Brigham Young University
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
const copy      = require('../bin/copy');
const expect    = require('chai').expect;

describe('copy', () => {

    it('primitive', () => {
        expect(copy('abc')).to.equal('abc');
    });

    describe('array', () => {

        it('of primitives', () => {
            const original = [1, 2, true, 'abc'];
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
        });

        it('of array', () => {
            const original = [[], ['a'], [1, 2], [[[[true]]]]];
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
        });

        it('of object', () => {
            const original = [{}, { a: 1 }];
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
            expect(value[0]).not.to.equal(original[0]);
            expect(value[1]).not.to.equal(original[1]);
        });

        it('cyclic', () => {
            const original = [];
            original.push(original);
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
            expect(value[0]).to.equal(value);
        });

    });

    describe('object', () => {

        it('of primitives', () => {
            const original = { a: 1, b: 'hello' };
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
        });

        it('of array', () => {
            const original = { a: [1, 2] };
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
        });

        it('of object', () => {
            const original = { a: {}, b: { c: 'c' } };
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
            expect(value.a).not.to.equal(original.a);
        });

        it('cyclic', () => {
            const original = {};
            original.a = original;
            const value = copy(original);
            expect(value).to.deep.equal(original);
            expect(value).not.to.equal(original);
            expect(value.a).to.equal(value);
        });

    });

});