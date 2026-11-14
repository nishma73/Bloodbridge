// ---------------------------------------------------------------------------
// Geo helpers for location-based donor search (Haversine distance)
// ---------------------------------------------------------------------------

/**
 * Great-circle distance between two coordinates in kilometres.
 */
export function distanceKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some((v) => v === null || v === undefined || Number.isNaN(Number(v)))) {
    return null
  }
  const toRad = (deg) => (Number(deg) * Math.PI) / 180
  const R = 6371 // earth radius km
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10
}

/** Human friendly distance, e.g. "4.2 km". */
export function formatDistance(km) {
  if (km === null || km === undefined) return '—'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km} km`
}
