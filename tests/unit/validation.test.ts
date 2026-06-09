import { describe, it, expect } from 'vitest';
import { validateEmail, validatePhone, validateZipCode } from '@/lib/validation';

describe('Email Validation', () => {
  it('should validate correct email addresses', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    expect(validateEmail('first+last@example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(validateEmail('invalid.email')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  it('should handle edge cases', () => {
    expect(validateEmail('a@b.c')).toBe(true);
    expect(validateEmail('test@localhost')).toBe(false);
  });
});

describe('Phone Validation', () => {
  it('should validate correct phone numbers', () => {
    expect(validatePhone('(555) 123-4567')).toBe(true);
    expect(validatePhone('555-123-4567')).toBe(true);
    expect(validatePhone('5551234567')).toBe(true);
  });

  it('should reject invalid phone numbers', () => {
    expect(validatePhone('123')).toBe(false);
    expect(validatePhone('abc-def-ghij')).toBe(false);
    expect(validatePhone('')).toBe(false);
  });
});

describe('Zip Code Validation', () => {
  it('should validate correct zip codes', () => {
    expect(validateZipCode('12345')).toBe(true);
    expect(validateZipCode('12345-6789')).toBe(true);
  });

  it('should reject invalid zip codes', () => {
    expect(validateZipCode('1234')).toBe(false);
    expect(validateZipCode('abcde')).toBe(false);
    expect(validateZipCode('')).toBe(false);
  });
});
