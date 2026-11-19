import test from 'node:test';
import assert from 'node:assert/strict';
import { validateIndianPhoneNumber, cleanPhoneDigits, formatIndianPhoneNumber } from './validation.js';

test('Phone Validation - Rejects empty phone number', () => {
  const res = validateIndianPhoneNumber('');
  assert.equal(res.isValid, false);
  assert.equal(res.error, 'Phone number is required.');
});

test('Phone Validation - Rejects phone with alphabets or symbols', () => {
  const res = validateIndianPhoneNumber('98765abcde');
  assert.equal(res.isValid, false);
  assert.match(res.error, /only contain numeric digits/i);
});

test('Phone Validation - Rejects phone with fewer than 10 digits', () => {
  const res = validateIndianPhoneNumber('987654');
  assert.equal(res.isValid, false);
  assert.match(res.error, /incomplete/i);
  assert.match(res.error, /all 10 digits/i);
});

test('Phone Validation - Rejects phone with more than 10 digits', () => {
  const res = validateIndianPhoneNumber('9876543210123');
  assert.equal(res.isValid, false);
  assert.match(res.error, /cannot exceed 10 digits/i);
});

test('Phone Validation - Rejects phone not starting with 6, 7, 8, or 9', () => {
  const res = validateIndianPhoneNumber('5555555555');
  assert.equal(res.isValid, false);
  assert.match(res.error, /start with 6, 7, 8, or 9/i);
});

test('Phone Validation - Accepts valid 10-digit Indian phone number', () => {
  const res = validateIndianPhoneNumber('9876543210');
  assert.equal(res.isValid, true);
  assert.equal(res.error, '');
  assert.equal(res.digits, '9876543210');
  assert.equal(res.formatted, '+91 9876543210');
});

test('Phone Validation - Accepts valid 10-digit phone with existing +91 prefix', () => {
  const res = validateIndianPhoneNumber('+91 9876543210');
  assert.equal(res.isValid, true);
  assert.equal(res.error, '');
  assert.equal(res.digits, '9876543210');
  assert.equal(res.formatted, '+91 9876543210');
});

test('Phone Validation - Clean digits helper extracts up to 10 digits', () => {
  assert.equal(cleanPhoneDigits('+91 98765 43210'), '9876543210');
  assert.equal(cleanPhoneDigits('98765abc43210'), '9876543210');
  assert.equal(cleanPhoneDigits(''), '');
});

test('Phone Validation - Format Indian phone number helper', () => {
  assert.equal(formatIndianPhoneNumber('9876543210'), '+91 9876543210');
  assert.equal(formatIndianPhoneNumber('+91 9876543210'), '+91 9876543210');
  assert.equal(formatIndianPhoneNumber(''), '');
});
