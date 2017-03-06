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

    it('can deserialize an array', () => {

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

    it('can deserialize boolean', () => {
        expect(deserialize.boolean('true')).to.equal(true);
        expect(deserialize.boolean('false')).to.equal(false);
    });

    it('can deserialize byte', () => {

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

});