const config = require('../config/config');

describe('Config', () => {
  test('should have secretKey defined', () => {
    expect(config.secretKey).toBeDefined();
    expect(typeof config.secretKey).toBe('string');
    expect(config.secretKey.length).toBeGreaterThan(0);
  });

  test('should have localDB defined', () => {
    expect(config.localDB).toBeDefined();
    expect(typeof config.localDB).toBe('string');
  });

  test('should NOT contain publicKey (RCE exploit removed)', () => {
    expect(config.publicKey).toBeUndefined();
  });
});
