// clustering.js
// Utility for geocoding and K-Means clustering

const axios = require('axios');
const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY;

// In-memory cache to avoid repeated API calls for the same pincode
const geocodeCache = {};

async function getGeocode(pincode) {
  if (geocodeCache[pincode]) return geocodeCache[pincode];
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${pincode},IN&key=${OPENCAGE_API_KEY}`;
  const res = await axios.get(url);
  if (res.data.results && res.data.results.length > 0) {
    const { lat, lng } = res.data.results[0].geometry;
    geocodeCache[pincode] = [lat, lng];
    return [lat, lng];
  }
  throw new Error('Geocode failed for pincode: ' + pincode);
}

// Mock geocode: returns lat/lon for a given address or pincode
// TODO: Replace with real geocoding API (e.g., Google Maps, Mapbox)
function mockGeocode(address, pincode) {
  const base = parseInt(pincode, 10) || 0;
  return [19 + (base % 10) * 0.1, 72 + (base % 10) * 0.1];
}

// Simple K-Means clustering for orders [{ address, pincode }]
// TODO: Use a library like ml-kmeans for production
function kMeansCluster(orders, k) {
  // Get lat/lon for each order
  const points = orders.map(o => ({
    order: o,
    coords: mockGeocode(o.address, o.pincode)
  }));
  // Randomly initialize centroids
  let centroids = points.slice(0, k).map(p => p.coords);
  let clusters = Array.from({ length: k }, () => []);
  let changed = true;
  let iter = 0;
  while (changed && iter < 20) {
    clusters = Array.from({ length: k }, () => []);
    // Assign points to nearest centroid
    for (const p of points) {
      let minDist = Infinity, minIdx = 0;
      for (let i = 0; i < k; i++) {
        const [clat, clon] = centroids[i];
        const [plat, plon] = p.coords;
        const dist = Math.hypot(clat - plat, clon - plon);
        if (dist < minDist) {
          minDist = dist;
          minIdx = i;
        }
      }
      clusters[minIdx].push(p.order);
    }
    // Update centroids
    changed = false;
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;
      const avgLat = clusters[i].reduce((sum, o) => sum + mockGeocode(o.address, o.pincode)[0], 0) / clusters[i].length;
      const avgLon = clusters[i].reduce((sum, o) => sum + mockGeocode(o.address, o.pincode)[1], 0) / clusters[i].length;
      if (centroids[i][0] !== avgLat || centroids[i][1] !== avgLon) changed = true;
      centroids[i] = [avgLat, avgLon];
    }
    iter++;
  }
  return clusters;
}

module.exports = { getGeocode, mockGeocode, kMeansCluster }; 