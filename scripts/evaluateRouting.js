// scripts/evaluateRouting.js

const { kMeansCluster, mockGeocode } = require('../backend/src/utils/clustering');
const haversine = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Mock depot location (e.g., Mumbai)
const DEPOT = { lat: 19.0760, lon: 72.8777 };

// Generate mock orders (or load from DB)
function generateMockOrders(n) {
  const orders = [];
  for (let i = 0; i < n; i++) {
    const pincode = (400000 + Math.floor(Math.random() * 100)).toString();
    const [lat, lon] = mockGeocode('', pincode);
    orders.push({
      id: i + 1,
      address: `Address ${i + 1}`,
      pincode,
      weight: 1 + Math.random() * 4,
      coords: [lat, lon],
    });
  }
  return orders;
}

// Naïve: Each order delivered separately (depot → order → depot)
function naiveTotalDistance(orders) {
  let total = 0;
  for (const o of orders) {
    total += 2 * haversine(DEPOT.lat, DEPOT.lon, o.coords[0], o.coords[1]);
  }
  return total;
}

// Clustered: Group orders, deliver each batch in one trip (depot → all orders → depot)
function clusteredTotalDistance(orders, k) {
  const clusters = kMeansCluster(orders, k);
  let total = 0;
  for (const cluster of clusters) {
    let route = [DEPOT, ...cluster.map(o => ({ lat: o.coords[0], lon: o.coords[1] })), DEPOT];
    for (let i = 0; i < route.length - 1; i++) {
      total += haversine(route[i].lat, route[i].lon, route[i + 1].lat, route[i + 1].lon);
    }
  }
  return total;
}

async function main() {
  const NUM_ORDERS = 50;
  const orders = generateMockOrders(NUM_ORDERS);

  // Naïve
  const naiveKm = naiveTotalDistance(orders);

  // Clustered (k = orders/10 for demo, or use your real logic)
  const k = Math.ceil(NUM_ORDERS / 10);
  const clusteredKm = clusteredTotalDistance(orders, k);

  const saved = naiveKm - clusteredKm;
  const percent = ((saved / naiveKm) * 100).toFixed(2);

  console.log(`Naïve one-by-one delivery: ${naiveKm.toFixed(2)} km`);
  console.log(`Clustered (batched) delivery: ${clusteredKm.toFixed(2)} km`);
  console.log(`Total km saved: ${saved.toFixed(2)} km (${percent}%)`);
}

main();