const jwt = require('jsonwebtoken');

const secretKey = require('../config/config').secretKey;

jwt.sign({ foo: 'bar' }, secretKey, { algorithm: 'HS256' }, function (err, token) {
  if (err) console.error('JWT sign error:', err.message);
  else console.log(token);
});
