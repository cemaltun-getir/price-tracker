const { calculateDiscount, validateUser } = require('../businessLogic');

describe('Business Logic', () => {
  describe('calculateDiscount', () => {
    test('returns 0 for invalid amount', () => {
      expect(calculateDiscount(-10)).toBe(0);
    });

    test('returns correct discount for amount over 100', () => {
      expect(calculateDiscount(150)).toBeCloseTo(15);
    });

    test('returns correct discount for amount under 100', () => {
      expect(calculateDiscount(50)).toBe(0);
    });
  });

  describe('validateUser', () => {
    test('returns false for invalid user object', () => {
      expect(validateUser(null)).toBe(false);
      expect(validateUser({})).toBe(false);
    });

    test('returns true for valid user object', () => {
      const user = { id: 1, name: 'Alice', email: 'alice@example.com' };
      expect(validateUser(user)).toBe(true);
    });
  });
});
