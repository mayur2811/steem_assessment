const { isKeyMissing } = require('../providers/helper');

describe('Helper: isKeyMissing', () => {
  test('should return false when all required keys are present', () => {
    const obj = { name: 'John', age: 30, email: 'john@test.com' };
    expect(isKeyMissing(obj, ['name', 'age'])).toBe(false);
  });

  test('should return the name of the first missing key', () => {
    const obj = { name: 'John' };
    expect(isKeyMissing(obj, ['name', 'age'])).toBe('age');
  });

  test('should return false for empty required keys', () => {
    const obj = { name: 'John' };
    expect(isKeyMissing(obj, [])).toBe(false);
  });

  test('should detect falsy values as missing', () => {
    const obj = { name: '', email: 'test@test.com' };
    expect(isKeyMissing(obj, ['name', 'email'])).toBe('name');
  });
});
