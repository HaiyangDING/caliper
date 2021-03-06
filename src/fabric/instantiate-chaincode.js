/**
 * Modifications Copyright 2017 HUAWEI
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// This is an end-to-end test that focuses on exercising all parts of the fabric APIs
// in a happy-path scenario
'use strict';

var utils = require('fabric-client/lib/utils.js');
var logger = utils.getLogger('E2E instantiate-chaincode');

var tape = require('tape');
var _test = require('tape-promise');
var test = _test(tape);

var e2eUtils = require('./e2eUtils.js');
var Client   = require('fabric-client')

module.exports.run = function (config_path) {
    Client.addConfigFile(config_path);
    var fabricSettings = Client.getConfigSetting('fabric');
    var policy         = fabricSettings['endorsement-policy'];
    var chaincodes     = fabricSettings.chaincodes;
    var ORGS           = fabricSettings.network;
    if(typeof chaincodes === 'undefined' || chaincodes.length === 0) {
        return Promise.resolve();
    }

    return new Promise(function(resolve, reject) {
        test('\n\n***** instantiate chaincode *****\n\n', (t) => {
            var org;
            for(let v in ORGS) {
                if(v.indexOf('org') === 0) {
                    org = v;
                    break;
                }
            }
            if(typeof org === 'undefined') {
                t.fail('Failed to instantiate chaincodes: could not found org in config file')
                t.end();
                reject(new Error('Fabric: Instantiate channel failed'));
            }
            else {
                chaincodes.reduce(function(prev, chaincode){
                    return prev.then(() => {
                        return e2eUtils.instantiateChaincode(org, chaincode, policy, false, t).then(() => {
                            t.pass('Instantiated chaincode ' + chaincode.id + ' successfully ');
                            t.comment('Sleep 5s...');
                            return sleep(5000);
                        });
                    });
                }, Promise.resolve())
                .then(() => {
                    t.pass('Instantiated all chaincodes successfully');
                    t.end();
                    return resolve();
                })
                .catch((err) => {
                    t.pass('Failed to instantiate chaincodes, ' + (err.stack?err.stack:err));
                    t.end();
                    return reject(new Error('Fabric: Create channel failed'));
                });
            }
        });
    });
};

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
