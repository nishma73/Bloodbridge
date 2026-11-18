const DonorProfile = require('../models/DonorProfile');
const {
  getCompatibleDonorGroups,
  isBloodCompatible,
  MEDICAL_DISCLAIMER,
} = require('../utils/bloodCompatibility');
const { calculateDistanceKm } = require('../utils/geo');

/**
 * Checks general donor eligibility based on donation intervals and medical declarations.
 * Standard whole blood donation interval: minimum 56 days (8 weeks) between donations.
 * @param {Object} donor
 * @returns {{ isEligible: boolean, reason: string }}
 */
const evaluateDonorEligibility = (donor) => {
  if (donor.eligibility && donor.eligibility.isEligible === false) {
    return {
      isEligible: false,
      reason: donor.eligibility.notes || 'Donor flagged as temporarily or permanently ineligible.',
    };
  }

  if (donor.age < 18 || donor.age > 70) {
    return {
      isEligible: false,
      reason: `Age ${donor.age} falls outside the eligible donor range (18-70 years).`,
    };
  }

  if (donor.lastDonationDate) {
    const lastDate = new Date(donor.lastDonationDate);
    const now = new Date();
    const daysSinceLast = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
    const minDaysInterval = 56; // 8 weeks standard

    if (daysSinceLast < minDaysInterval) {
      return {
        isEligible: false,
        reason: `Donated ${daysSinceLast} days ago. Mandatory recovery interval is ${minDaysInterval} days.`,
      };
    }
  }

  return {
    isEligible: true,
    reason: 'Meets preliminary operational eligibility criteria.',
  };
};

/**
 * Finds and ranks matching blood donors for a blood request.
 * Prioritizes:
 * 1. Compatible blood groups (ABO & Rh red-cell matrix)
 * 2. Same city / geographical proximity
 * 3. Available donors
 * 4. Verified and eligible donors
 * 
 * @param {Object} criteria
 * @param {string} criteria.bloodGroup - The recipient's blood group
 * @param {string} [criteria.city] - Target city
 * @param {number} [criteria.latitude] - Request latitude
 * @param {number} [criteria.longitude] - Request longitude
 * @param {number} [criteria.radiusKm=25] - Search radius
 * @param {boolean} [criteria.availableOnly=true] - Filter only available donors
 * @param {boolean} [criteria.verifiedOnly=false] - Filter only verified donors
 * @param {string} [criteria.search=''] - Keyword search (name/city/phone)
 * @returns {Promise<{ matches: Array, totalFound: number, criteria: Object, disclaimer: string }>}
 */
const findMatchingDonors = async ({
  bloodGroup,
  city = '',
  latitude = null,
  longitude = null,
  radiusKm = 25,
  availableOnly = false,
  verifiedOnly = false,
  search = '',
}) => {
  const compatibleGroups = getCompatibleDonorGroups(bloodGroup);

  // Base MongoDB query
  const query = {
    bloodGroup: { $in: compatibleGroups },
  };

  if (availableOnly) {
    query.available = true;
  }

  if (verifiedOnly) {
    query.verified = true;
  }

  // Populate donor profiles and active user status
  let donors = await DonorProfile.find(query).populate('user', 'email isReported isActive');

  // Filter out deactivated or reported users
  donors = donors.filter((d) => d.user && d.user.isActive && !d.user.isReported);

  // Evaluate eligibility, distance, and scoring
  const evaluatedDonors = donors.map((doc) => {
    const donor = doc.toObject();
    const eligibilityCheck = evaluateDonorEligibility(donor);
    const dist = calculateDistanceKm(latitude, longitude, donor.latitude, donor.longitude);

    const isSameCity =
      Boolean(city) &&
      Boolean(donor.city) &&
      donor.city.trim().toLowerCase().includes(city.trim().toLowerCase());

    const isExactGroup = donor.bloodGroup === bloodGroup;

    // Matching score computation
    let score = 0;
    if (isExactGroup) score += 100; // Exact match bonus
    else if (donor.bloodGroup === 'O-') score += 85; // Universal donor
    else score += 70; // Other compatible group

    if (isSameCity) score += 50; // Same city bonus
    if (donor.available) score += 40; // Availability bonus
    if (donor.verified) score += 20; // Verified donor bonus
    if (eligibilityCheck.isEligible) score += 30; // Eligible bonus

    if (dist !== null) {
      // Deduct score gently for distance
      score -= Math.min(dist * 0.5, 30);
    }

    return {
      ...donor,
      uid: donor.user._id.toString(),
      distanceKm: dist,
      isSameCity,
      isExactBloodGroup: isExactGroup,
      preliminaryEligibility: eligibilityCheck,
      matchScore: Math.round(score),
    };
  });

  // Apply radius filter if coordinates provided
  let filtered = evaluatedDonors;
  if (latitude !== null && longitude !== null && radiusKm > 0) {
    filtered = filtered.filter(
      (d) => d.distanceKm === null || d.distanceKm <= radiusKm
    );
  }

  // Text search filter if provided
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (d) =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.city || '').toLowerCase().includes(q) ||
        (d.bloodGroup || '').toLowerCase().includes(q)
    );
  }

  // Multi-tier sort:
  // 1. Availability (available first if availableOnly is false)
  // 2. Compatible match score descending
  // 3. Distance ascending
  filtered.sort((a, b) => {
    if (a.available !== b.available) {
      return a.available ? -1 : 1;
    }
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
  });

  return {
    disclaimer: MEDICAL_DISCLAIMER,
    requestedBloodGroup: bloodGroup,
    compatibleDonorGroups: compatibleGroups,
    totalFound: filtered.length,
    matches: filtered,
  };
};

module.exports = {
  findMatchingDonors,
  evaluateDonorEligibility,
};
