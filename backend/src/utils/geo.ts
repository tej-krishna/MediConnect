export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Great-circle distance between two points, in meters. The backend otherwise only does distance
 * via Mongo's native `$geoNear`/`2dsphere` (see provider.service.ts's searchPublicProviders) —
 * that's for "find things near this one point," not "how far apart are these two specific points
 * right now," which is what the home-visit check-in needs. Same formula as the frontend's own
 * frontend/src/utils/geo.ts, ported so both sides agree on what "30 meters" means.
 */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
