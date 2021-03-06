/**
* Copyright 2017 HUAWEI. All Rights Reserved.
*
* SPDX-License-Identifier: Apache-2.0
*
* @file, definition of the Fabric class, which implements the caliper's NBI for hyperledger fabric
*/


'use strict'

var util             = require('./util.js');
var e2eUtils         = require('./e2eUtils.js');
var impl_create      = require('./create-channel.js');
var impl_join        = require('./join-channel.js');
var impl_install     = require('./install-chaincode.js');
var impl_instantiate = require('./instantiate-chaincode.js');

var Fabric = class {
    constructor(config_path) {
        this.configPath = config_path;
    }

    gettype() {
        return 'fabric';
    }

    init() {
        util.init(this.configPath);
        e2eUtils.init(this.configPath);
        // todo: now only one channel is supported, and all peers will join that channel, should extend this later
        return impl_create.run(this.configPath).then(() => {
            return impl_join.run(this.configPath);
        })
        .catch((err) => {
            console.log('fabric.init() failed, ' + (err.stack ? err.stack : err));
            return Promise.reject(err);
        });
    }

    installSmartContract() {
        // todo: now all chaincodes are installed and instantiated in all peers, should extend this later
        return impl_install.run(this.configPath).then(() => {
            return impl_instantiate.run(this.configPath);
        })
        .catch((err) => {
            console.log('fabric.installSmartContract() failed, ' + (err.stack ? err.stack : err));
            return Promise.reject(err);
        });
    }

    getContext() {
        util.init(this.configPath);
        e2eUtils.init(this.configPath);

        // find a random org as client's org
        var ORGS = require(this.configPath).fabric.network;
        var name = [];
        for(let v in ORGS) {
            if(v.indexOf('org') === 0) {
                name[name.length] = v;
            }
        }
        if(name.length === 0) {
            return Promise.reject(new Error('Failed to find org in config file'));
        }
        var id = Math.floor(Math.random() * name.length);
        return e2eUtils.getcontext(name[id]);
    }

    releaseContext(context) {
        return e2eUtils.releasecontext(context).then(() => {
            return sleep(1000);
        });
    }

    invokeSmartContract(context, contractID, contractVer, args, timeout) {
        var simpleArgs = [];
        for(let i in args) {
            let arg = args[i];
            for(let key in arg) {
                simpleArgs.push(arg[key]);
            }
        }
        return e2eUtils.invokebycontext(context, contractID, contractVer, simpleArgs, timeout);
    }

    queryState(context, contractID, contractVer, key) {
        return e2eUtils.querybycontext(context, contractID, contractVer, key);
    }

    getDefaultTxStats(stats, results) {
        var minDelayC2E = 100000, maxDelayC2E = 0, sumDelayC2E = 0; // time from created to endorsed
        var minDelayE2O = 100000, maxDelayE2O = 0, sumDelayE2O = 0; // time from endorsed to ordered
        var minDelayO2V = 100000, maxDelayO2V = 0, sumDelayO2V = 0; // time from ordered to recorded
        var hasValue = true;
        for(let i = 0 ; i < results.length ; i++) {
            let stat = results[i];
            if(!stat.hasOwnProperty('time_endorse')) {
                hasValue = false;
                break;
            }
            if(stat.status === 'success') {
                let delayC2E = stat['time_endorse'] - stat['time_create'];
                let delayE2O = stat['time_order'] - stat['time_endorse'];
                let delayO2V = stat['time_valid'] - stat['time_order'];

                if(delayC2E < minDelayC2E) {
                    minDelayC2E = delayC2E;
                }
                if(delayC2E > maxDelayC2E) {
                    maxDelayC2E = delayC2E;
                }
                sumDelayC2E += delayC2E;

                if(delayE2O < minDelayE2O) {
                    minDelayE2O = delayE2O;
                }
                if(delayE2O > maxDelayE2O) {
                    maxDelayE2O = delayE2O;
                }
                sumDelayE2O += delayE2O;

                if(delayO2V < minDelayO2V) {
                    minDelayO2V = delayO2V;
                }
                if(delayO2V > maxDelayO2V) {
                    maxDelayO2V = delayO2V;
                }
                sumDelayO2V += delayO2V;
            }
        }

        if(hasValue) {
            stats['delayC2E'] = {'min': minDelayC2E, 'max': maxDelayC2E, 'sum': sumDelayC2E};
            stats['delayE2O'] = {'min': minDelayE2O, 'max': maxDelayE2O, 'sum': sumDelayE2O};
            stats['delayO2V'] = {'min': minDelayO2V, 'max': maxDelayO2V, 'sum': sumDelayO2V};
        }
    }
}
module.exports = Fabric;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}