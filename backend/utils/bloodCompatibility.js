/**
 * BloodBridge - ABO & Rh Red-Cell Compatibility System
 * 
 * MEDICAL DISCLAIMER:
 * This algorithm implements standard preliminary red blood cell (packed RBC) ABO and Rh(D) compatibility rules.
 * It is solely an operational matching and coordination tool.
 * IT DOES NOT CONSTITUTE MEDICAL CLEARANCE OR AN ASSURANCE OF TRANSFUSION SAFETY.
 * 
 * Transfusion medicine limitations:
 * 1. Minor blood group antigens (e.g., Kell, Duffy, Kidd, MNS) are not screened by this system.
 * 2. Irregular or atypical antibodies (such as Anti-D in Rh-negative patients or alloantibodies from past pregnancies/transfusions) are not evaluated.
 * 3. Clinical crossmatching (major crossmatch between donor red cells and recipient serum) and strict pre-transfusion antibody screening tests performed by accredited blood banks remain legally and medically mandatory prior to any blood transfusion.
 */

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Donor Packed Red Blood Cells (RBC) -> Compatible Recipient Groups
const RBC_DONOR_TO_RECIPIENT_MAP = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal RBC donor
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'], // Can only give RBCs to AB+
};

// Recipient Group -> Eligible Donor Groups (Inverted Map)
const RBC_RECIPIENT_TO_DONOR_MAP = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], // Universal RBC recipient
};

/**
 * Returns an array of compatible donor blood groups for a given recipient blood group.
 * @param {string} recipientGroup
 * @returns {string[]}
 */
const getCompatibleDonorGroups = (recipientGroup) => {
  if (!recipientGroup) return [];
  const normalized = recipientGroup.trim().toUpperCase();
  return RBC_RECIPIENT_TO_DONOR_MAP[normalized] || [];
};

/**
 * Returns an array of recipient blood groups that can receive from a given donor blood group.
 * @param {string} donorGroup
 * @returns {string[]}
 */
const getCanDonateTo = (donorGroup) => {
  if (!donorGroup) return [];
  const normalized = donorGroup.trim().toUpperCase();
  return RBC_DONOR_TO_RECIPIENT_MAP[normalized] || [];
};

/**
 * Checks whether a specific donor blood group is red-cell compatible with a recipient blood group.
 * @param {string} donorGroup
 * @param {string} recipientGroup
 * @returns {boolean}
 */
const isBloodCompatible = (donorGroup, recipientGroup) => {
  if (!donorGroup || !recipientGroup) return false;
  const dNorm = donorGroup.trim().toUpperCase();
  const rNorm = recipientGroup.trim().toUpperCase();
  const compatibleRecipients = RBC_DONOR_TO_RECIPIENT_MAP[dNorm] || [];
  return compatibleRecipients.includes(rNorm);
};

const MEDICAL_DISCLAIMER = 
  'Preliminary matching is based on standard ABO/Rh(D) red blood cell compatibility. ' +
  'Final transfusion compatibility and safety must always be confirmed by certified hospital laboratory ' +
  'blood grouping, antibody screening, and major/minor crossmatching.';

module.exports = {
  BLOOD_GROUPS,
  RBC_DONOR_TO_RECIPIENT_MAP,
  RBC_RECIPIENT_TO_DONOR_MAP,
  getCompatibleDonorGroups,
  getCanDonateTo,
  isBloodCompatible,
  MEDICAL_DISCLAIMER,
};
