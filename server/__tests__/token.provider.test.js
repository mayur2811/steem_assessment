const jwt = require('jsonwebtoken');
const config = require('../config/config');

describe('Token Provider', () => {
  test('should sign JWT with HS256 algorithm and string secret', (done) => {
    const secretKey = config.secretKey || 'test-secret';
    jwt.sign({ foo: 'bar' }, secretKey, { algorithm: 'HS256' }, (err, token) => {
      expect(err).toBeNull();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify the token can be decoded
      const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
      expect(decoded.foo).toBe('bar');
      done();
    });
  });

  test('should fail with RS256 and string secret (the old bug)', () => {
    const secretKey = 'simple-string-secret';
    expect(() => {
      jwt.sign({ foo: 'bar' }, secretKey, { algorithm: 'RS256' });
    }).toThrow();
  });
});
