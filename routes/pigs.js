var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var jwt = require('jsonwebtoken');

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('mychannel');
var peer = fabric_client.newPeer('grpc://localhost:7051');
channel.addPeer(peer);

//
var member_user = null;
var store_path = path.join(__dirname, '../hfc-key-store');
console.log('Store path:' + store_path);
var tx_id = null;


router.get('/', function (req, res, next) {
    res.send('test');
});

router.post('/register', (req, res, next) => {
    const name = req.body.name;
    if (!name) {
        res.status(400).end('Please input name');
    }
    const email = req.body.email;
    if (!email) {
        res.status(400).end('Please input email');
    }
    const password = req.body.password;
    if (!password) {
        res.status(400).end('Please input password');
    }
    const company = req.body.company;
    if (!company) {
        res.status(400).end('Please input company');
    }
    new User({
        name,
        email,
        password,
        company
    }).save(function (err, user, count) {
        if (err) {
            res.status(400).end();
        }
        res.status(200).end();
    });
})

router.post('/login', (req, res, next) => {
    const email = req.body.email;
    if (!email) {
        res.status(400).end('Please input email');
    }
    const password = req.body.password;
    if (!password) {
        res.status(400).end('Please input password');
    }
    User.findOne({ email: req.body.email }, (err, data) => {
        if (err) {
            res.send(err);
        }
        if (data.password === req.body.password) {
            var token = jwt.sign({
                name: data.name,
                company: data.company
            }, 'secret', { expiresIn: '1d' });
            res.send({ token });
        } else {
            res.status(400).end('Login fail');
        }

    })
})

router.post('/addAction', (req, res, next) => {
    let token = req.get("authorization");
    console.log(token);
    if (!token) {
        res.status(401).end();
    }
    jwt.verify(token, 'secret', function (err, decoded) {
        console.log(err);
        if (err) {
            res.status(401).end();
        }
        console.log(decoded);
        const pigId = req.body.pigId;
        if (!pigId) {
            res.status(400).end('Please input pig id');
        }
        const actionName = req.body.actionName;
        if (!actionName) {
            res.status(400).end('Please input action name');
        }
        const company = decoded.company;
        const date = new Date().toISOString().slice(0, 10);
        // call hyperledger api


        // call hyperledger api
        Fabric_Client.newDefaultKeyValueStore({
            path: store_path
        }).then((state_store) => {
            // assign the store to the fabric client
            fabric_client.setStateStore(state_store);
            var crypto_suite = Fabric_Client.newCryptoSuite();
            // use the same location for the state store (where the users' certificate are kept)
            // and the crypto store (where the users' keys are kept)
            var crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
            crypto_suite.setCryptoKeyStore(crypto_store);
            fabric_client.setCryptoSuite(crypto_suite);

            // get the enrolled user from persistence, this user will sign all requests
            return fabric_client.getUserContext('user1', true);
        }).then((user_from_store) => {
            if (user_from_store && user_from_store.isEnrolled()) {
                console.log('Successfully loaded user1 from persistence');
                member_user = user_from_store;
            } else {
                throw new Error('Failed to get user1.... run registerUser.js');
            }

            // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
            // queryAllCars chaincode function - requires no arguments , ex: args: [''],
            const request = {
                //targets : --- letting this default to the peers assigned to the channel
                chaincodeId: 'pigchain',
                fcn: 'recordPig',
                args: [pigId.toString(), company, actionName, date]
            };
            console.log(pigId, company, actionName, date);

            // send the query proposal to the peer
            return channel.queryByChaincode(request);
        }).then((query_responses) => {
            console.log("Query has completed, checking results");
            // query_responses could have more than one  results if there multiple peers were used as targets
            if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    console.error("error from query = ", query_responses[0]);
                    res.status(400).end(query_responses[0]);
                } else {
                    console.log("Response is ", query_responses[0].toString());
                    res.send(query_responses[0].toString());
                }
            } else {
                res.send("No payloads were returned from query")
                console.log("No payloads were returned from query");
            }
        }).catch((err) => {
            res.status(400).end(err);
            console.error('Failed to query successfully :: ' + err);
        });
    });
})

router.get('/queryPig', async (req, res, next) => {
    const pigId = req.query.pigId;
    if (!pigId) {
        res.status(400).send('Please input pig id');
    }

    // call hyperledger api
    Fabric_Client.newDefaultKeyValueStore({
        path: store_path
    }).then((state_store) => {
        // assign the store to the fabric client
        fabric_client.setStateStore(state_store);
        var crypto_suite = Fabric_Client.newCryptoSuite();
        // use the same location for the state store (where the users' certificate are kept)
        // and the crypto store (where the users' keys are kept)
        var crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
        crypto_suite.setCryptoKeyStore(crypto_store);
        fabric_client.setCryptoSuite(crypto_suite);

        // get the enrolled user from persistence, this user will sign all requests
        return fabric_client.getUserContext('user1', true);
    }).then((user_from_store) => {
        if (user_from_store && user_from_store.isEnrolled()) {
            console.log('Successfully loaded user1 from persistence');
            member_user = user_from_store;
        } else {
            throw new Error('Failed to get user1.... run registerUser.js');
        }

        // queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
        // queryAllCars chaincode function - requires no arguments , ex: args: [''],
        const request = {
            //targets : --- letting this default to the peers assigned to the channel
            chaincodeId: 'pigchain',
            fcn: 'queryPigHistory',
            args: [pigId.toString()]
        };

        // send the query proposal to the peer
        return channel.queryByChaincode(request);
    }).then((query_responses) => {
        console.log("Query has completed, checking results");
        // query_responses could have more than one  results if there multiple peers were used as targets
        if (query_responses && query_responses.length == 1) {
            if (query_responses[0] instanceof Error) {
                console.error("error from query = ", query_responses[0]);
                res.status(400).end(query_responses[0]);
            } else {
                console.log("Response is ", query_responses[0].toString());
                res.send(query_responses[0].toString());
            }
        } else {
            res.send("No payloads were returned from query")
            console.log("No payloads were returned from query");
        }
    }).catch((err) => {
        res.status(400).end(err);
        console.error('Failed to query successfully :: ' + err);
    });
})

module.exports = router;
