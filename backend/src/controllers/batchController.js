const Order = require('../models/Order');
const Batch = require('../models/Batch');
const { kMeansCluster, getGeocode } = require('../utils/clustering');

// Haversine formula to calculate distance between two lat/lon points
function haversine(lat1, lon1, lat2, lon2) {
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
}

// TODO: Replace with real geocoding (for now, mock lat/lon by pincode hash)
function mockGeocode(pincode) {
  // Simple deterministic mock: convert pincode to lat/lon
  const base = parseInt(pincode, 10) || 0;
  return [19 + (base % 10) * 0.1, 72 + (base % 10) * 0.1];
}

// Cluster orders by proximity and constraints using K-Means
async function generateBatches() {
  const orders = await Order.find({ status: 'PENDING' });
  if (orders.length === 0) return [];
  // Estimate k (number of clusters) based on constraints
  const maxOrdersPerBatch = 30;
  const maxWeightPerBatch = 25;
  const k = Math.ceil(orders.length / maxOrdersPerBatch);

  // Geocode all unique pincodes
  const uniquePincodes = [...new Set(orders.map(o => o.pincode))];
  const pincodeCoords = {};
  for (const pincode of uniquePincodes) {
    pincodeCoords[pincode] = await getGeocode(pincode);
  }

  // Attach coordinates to each order
  const ordersWithCoords = orders.map(order => ({
    ...order.toObject(),
    coords: pincodeCoords[order.pincode]
  }));

  // K-Means clustering using real coordinates
  const clusters = kMeansCluster(ordersWithCoords, k);

  // For each cluster, split further if needed to respect weight/order constraints
  const batches = [];
  for (const cluster of clusters) {
    let currentBatch = [];
    let currentWeight = 0;
    for (const order of cluster) {
      if (
        currentBatch.length >= maxOrdersPerBatch ||
        currentWeight + order.weight > maxWeightPerBatch
      ) {
        batches.push([...currentBatch]);
        currentBatch = [];
        currentWeight = 0;
      }
      currentBatch.push(order);
      currentWeight += order.weight;
    }
    if (currentBatch.length) batches.push(currentBatch);
  }
  // Save batches to DB
  const batchDocs = [];
  for (const batchOrders of batches) {
    const totalWeight = batchOrders.reduce((sum, o) => sum + o.weight, 0);
    const batch = await Batch.create({
      orders: batchOrders.map((o) => o._id),
      totalWeight,
    });
    // Mark orders as ASSIGNED
    await Order.updateMany(
      { _id: { $in: batchOrders.map((o) => o._id) } },
      { $set: { status: 'ASSIGNED' } }
    );
    batchDocs.push(batch);
  }
  return batchDocs;
}

// Check if all orders in a batch are delivered and mark batch as completed
async function checkAndUpdateBatchStatus(batchId) {
  try {
    const batch = await Batch.findById(batchId).populate('orders');
    if (!batch) return null;

    // Check if all orders in the batch are delivered
    const allDelivered = batch.orders.every(order => order.status === 'DELIVERED');
    
    if (allDelivered && batch.status !== 'COMPLETED') {
      // Update batch status to completed
      const updatedBatch = await Batch.findByIdAndUpdate(
        batchId,
        {
          status: 'COMPLETED',
          completedAt: new Date(),
          completionNotes: `All ${batch.orders.length} orders delivered successfully`
        },
        { new: true }
      );
      
      console.log(`✅ Batch ${batchId} marked as COMPLETED - All orders delivered`);
      return updatedBatch;
    }
    
    return batch;
  } catch (error) {
    console.error('Error checking batch status:', error);
    return null;
  }
}

// Get batch statistics
async function getBatchStats() {
  try {
    const stats = await Batch.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalWeight: { $sum: '$totalWeight' }
        }
      }
    ]);
    
    const formattedStats = {
      pending: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalWeight: 0
    };
    
    stats.forEach(stat => {
      switch (stat._id) {
        case 'PENDING':
          formattedStats.pending = stat.count;
          break;
        case 'IN_PROGRESS':
          formattedStats.inProgress = stat.count;
          break;
        case 'COMPLETED':
          formattedStats.completed = stat.count;
          break;
        case 'CANCELLED':
          formattedStats.cancelled = stat.count;
          break;
      }
      formattedStats.totalWeight += stat.totalWeight || 0;
    });
    
    return formattedStats;
  } catch (error) {
    console.error('Error getting batch stats:', error);
    return null;
  }
}

module.exports = { 
  generateBatches, 
  checkAndUpdateBatchStatus, 
  getBatchStats 
}; 