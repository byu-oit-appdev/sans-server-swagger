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

exports.CtrlDevMockImpl = function(req, res) {
    res.send({ name: 'CtrlDevMockImpl Implemented' });
};
exports.CtrlDevMockImpl.mock = function(req, res) {
    res.send({ name: 'CtrlDevMockImpl Mock Implemented' });
};


exports.CtrlDevMock_Impl = function(req, res) {
    res.send({ name: 'CtrlDevMock_Impl Implemented' });
};


exports.CtrlDev_MockImpl = function(req, res) {
    res.send({ name: 'CtrlDev_MockImpl Implemented' });
};
exports.CtrlDev_MockImpl.mock = function(req, res) {
    res.send({ name: 'CtrlDev_MockImpl Mock Implemented' });
};


exports.CtrlDev_Mock_Impl = function(req, res) {
    res.send({ name: 'CtrlDev_Mock_Impl Implemented' });
};


exports.Ctrl_DevMockImpl = function(req, res) {
    res.send({ name: 'Ctrl_DevMockImpl Implemented' });
};
exports.Ctrl_DevMockImpl.mock = function(req, res) {
    res.send({ name: 'Ctrl_DevMockImpl Mock Implemented' });
};


exports.Ctrl_DevMock_Impl = function(req, res) {
    res.send({ name: 'Ctrl_DevMock_Impl Implemented' });
};


exports.Ctrl_Dev_MockImpl = function(req, res) {
    res.send({ name: 'Ctrl_Dev_MockImpl Implemented' });
};
exports.Ctrl_Dev_MockImpl.mock = function(req, res) {
    res.send({ name: 'Ctrl_Dev_MockImpl Mock Implemented' });
};


exports.Ctrl_Dev_Mock_Impl = function(req, res) {
    res.send({ name: 'Ctrl_Dev_Mock_Impl Implemented' });
};