// ---------------------------------------------------------------------------
// Donor matching engine (preliminary).
// Combines blood-group compatibility with availability, verification and a
// geographic radius. The final transfusion decision always belongs to the
// hospital's qualified professionals.
// ---------------------------------------------------------------------------
import { compatibleDonorGroups } from './blood'
import { distanceKm } from './geo'

/**
 * @param {Array} donors      donor profiles
 * @param {Object} request    blood request (needs bloodGroup + lat/lng)
 * @param {Object} [options]  { radiusKm, availableOnly, verifiedOnly, includeAll }
 * @returns {Array} donors annotated with `distanceKm`, sorted nearest-first
 */
export function matchDonors(donors, request, options = {}) {
  const {
    radiusKm = request?.radiusKm ?? null,
    availableOnly = true,
    verifiedOnly = true,
    includeAll = false,
  } = options

  const allowed = compatibleDonorGroups(request?.bloodGroup)

  return donors
    .filter((d) => includeAll || allowed.includes(d.bloodGroup))
    .map((d) => ({
      ...d,
      distanceKm: distanceKm(
        request?.latitude,
        request?.longitude,
        d.latitude,
        d.longitude,
      ),
    }))
    .filter((d) => {
      if (!includeAll) {
        if (availableOnly && !d.available) return false
        if (verifiedOnly && !d.verified) return false
      }
      if (radiusKm != null && d.distanceKm != null && d.distanceKm > radiusKm) return false
      return true
    })
    .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
}

/** Count of compatible donors for a request (ignores availability/verification). */
export function compatibleDonorCount(donors, request) {
  const allowed = compatibleDonorGroups(request?.bloodGroup)
  return donors.filter((d) => allowed.includes(d.bloodGroup)).length
}
