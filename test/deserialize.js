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

    describe('binary', () => {
        let v;

        before(() => v = deserialize.binary('0110100001100101011011000110110001101111'));

        it('creates a buffer', () => {
            expect(v).to.be.instanceOf(Buffer);
        });

        it('value is valid', () => {
            expect(v.toString('utf8')).to.equal('hello');
        });

        it('invalid value throws error', () => {
            expect(() => deserialize.binary('01')).to.throw(Error);
        });

    });

    describe('byte', () => {

        let v;

        before(() => v = deserialize.byte('aGVsbG8='));

        it('creates a buffer', () => {
            expect(v).to.be.instanceOf(Buffer);
        });

        it('value is valid', () => {
            expect(v.toString('utf8')).to.equal('hello');
        });

        it('invalid value throws error', () => {
            expect(() => deserialize.byte('!')).to.throw(Error);
        });

    });

    describe('date', () => {

        it('valid', () => {
            const d1 = deserialize.date('2000-01-01');
            const d2 = new Date('2000-01-01T00:00:00.000Z');
            expect(+d1).to.equal(+d2);
        });

        it('invalid value throws error', () => {
            expect(() => deserialize.date('abc')).to.throw(Error);
        });

    });

    describe('date-time', () => {

        it('valid', () => {
            const d1 = deserialize.dateTime('2000-01-01T00:00:00.000Z');
            const d2 = new Date('2000-01-01T00:00:00.000Z');
            expect(+d1).to.equal(+d2);
        });

        it('invalid value throws error', () => {
            expect(() => deserialize.dateTime('abc')).to.throw(Error);
        });

    });

});