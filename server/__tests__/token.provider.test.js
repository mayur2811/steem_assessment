const jwt = require('jsonwebtoken');
const config = require('../config/config');

describe('JWT Configuration', () => {
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

  test('token.provider module exports generateToken function', () => {
    const tokenProvider = require('../providers/token.provider');
    expect(tokenProvider.generateToken).toBeDefined();
    expect(typeof tokenProvider.generateToken).toBe('function');
  });

  test('generateToken produces a valid JWT with expiration', () => {
    const { generateToken } = require('../providers/token.provider');
    const token = generateToken({ user: 'test' });
    const secretKey = config.secretKey || 'test-secret';

    const decoded = jwt.verify(token, secretKey, { algorithms: ['HS256'] });
    expect(decoded.user).toBe('test');
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});
