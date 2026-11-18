const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BLOOD_GROUPS,
  getCompatibleDonorGroups,
  getCanDonateTo,
  isBloodCompatible,
} = require('../utils/bloodCompatibility');

test('Blood Compatibility - All 8 standard blood groups are supported', () => {
  assert.equal(BLOOD_GROUPS.length, 8);
  assert.deepEqual(BLOOD_GROUPS, ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);
});

test('Blood Compatibility - O- is universal red blood cell donor', () => {
  const oNegRecipients = getCanDonateTo('O-');
  assert.equal(oNegRecipients.length, 8);
  BLOOD_GROUPS.forEach((group) => {
    assert.equal(isBloodCompatible('O-', group), true, `O- should be compatible with ${group}`);
  });
});

test('Blood Compatibility - AB+ is universal red blood cell recipient', () => {
  const abPosCompatibleDonors = getCompatibleDonorGroups('AB+');
  assert.equal(abPosCompatibleDonors.length, 8);
  BLOOD_GROUPS.forEach((group) => {
    assert.equal(isBloodCompatible(group, 'AB+'), true, `${group} should be compatible for AB+`);
  });
});

test('Blood Compatibility - Incompatible donations are correctly rejected', () => {
  // A+ cannot donate red cells to O-
  assert.equal(isBloodCompatible('A+', 'O-'), false);
  // B+ cannot donate to A+
  assert.equal(isBloodCompatible('B+', 'A+'), false);
  // AB+ cannot donate to anyone except AB+
  assert.deepEqual(getCanDonateTo('AB+'), ['AB+']);
});
