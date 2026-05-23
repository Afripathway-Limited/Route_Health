/** Haversine distance between two lat/lng points — returns km */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** True if two coverage circles overlap */
export function circlesOverlap(
  lat1: number, lng1: number, r1: number,
  lat2: number, lng2: number, r2: number,
): boolean {
  return haversineKm(lat1, lng1, lat2, lng2) <= r1 + r2;
}
