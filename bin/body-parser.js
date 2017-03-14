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

const rxJSON = /^application\/.*json$/i;
const rxUrlEncoded = /^application\/x-www-form-urlencoded$/i;
const rxMultipart = /^multipart\/form-data$/i;

module.exports = function(consumes) {
    if (!Array.isArray(consumes)) consumes = [];
    const json = consumes.filter(s => rxJSON.test(s)).length > 0;
    const urlEncoded = consumes.filter(s => rxUrlEncoded.test(s)).length > 0;
    const multipart = consumes.filter(s => rxMultipart.test(s)).length > 0;

    return function bodyParser(req, res, next) {
        const server = this;
        if (typeof req.body === 'string') {
            if (json && rxJSON.test(req.headers)) return parseJSON.call(this, req, res, next);
            if (urlEncoded && rxUrlEncoded.test(req.headers)) return parseUrlEncoded.call(this, req, res, next);
            if (multipart && rxMultipart.test(req.headers)) return parseMultipart.call(this, req, res, next);
        }
        next();
    };
};

function parseJSON(req, res, next) {
    this.log('Parsing JSON.');
    try {
        req.body = JSON.parse(req.body);
        next();
    } catch (err) {
        next(err);
    }
}

function parseUrlEncoded(req, res, next) {
    this.log('Parsing URL encoded form.');
    const body = {};
    req.body.split('&').forEach(pair => {
        const parts = pair.split('=');
        const key = decodeURIComponent(parts[0].replace(/\+/g, ' '));
        body[key] = parts[1] ? decodeURIComponent(parts[1].replace(/\+/g, ' ')) : '';
    });
    req.body = body;
}

function parseMultipart(req, res, next) {
    this.log('Multipart form parsing not yet implemented.');
    res.sendStatus(501);
}