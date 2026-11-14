// ---------------------------------------------------------------------------
// Blood group compatibility
// ---------------------------------------------------------------------------
// IMPORTANT: This is a *preliminary* matching aid only. Real transfusion
// decisions must always be confirmed by qualified hospital professionals
// through proper blood grouping, antibody screening and crossmatching.

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// donor -> recipients the donor can give to (red-cell compatibility)
export const CAN_DONATE_TO = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
}

/**
 * Donor groups that can safely donate to a patient with `recipientGroup`.
 * This is the list the matching engine uses when a hospital requests blood.
 * @param {string} recipientGroup
 * @returns {string[]}
 */
export function compatibleDonorGroups(recipientGroup) {
  return BLOOD_GROUPS.filter((donor) =>
    (CAN_DONATE_TO[donor] || []).includes(recipientGroup),
  )
}

/**
 * Whether a specific donor group is compatible with a recipient group.
 */
export function isCompatible(donorGroup, recipientGroup) {
  return (CAN_DONATE_TO[donorGroup] || []).includes(recipientGroup)
}

/** Short human label, e.g. "O- (universal donor)". */
export function bloodGroupLabel(group) {
  if (group === 'O-') return 'O- · universal donor'
  if (group === 'AB+') return 'AB+ · universal recipient'
  return group
}
