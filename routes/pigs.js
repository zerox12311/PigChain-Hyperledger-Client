var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = mongoose.model('User');
var jwt = require('jsonwebtoken');

router.get('/', function (req, res, next) {
    res.send('test');
});

router.post('/register', (req, res, next) => {
    new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        company: req.body.company,
    }).save(function (err, user, count) {
        if (err) {
            res.status(400).end();
        }
        res.status(200).end();
    });
})

router.post('/login', (req, res, next) => {
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
            res.status(400).send('Login fail');
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
        // call hyperledger api
        res.send(decoded);
    });
})

router.get('/queryPig', (req, res, next) => {
    // call hyperledger api
    res.send('query action good');
})

module.exports = router;
