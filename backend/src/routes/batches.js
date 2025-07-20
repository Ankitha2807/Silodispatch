const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const Batch = require('../models/Batch');
const Order = require('../models/Order');
const { generateBatches } = require('../controllers/batchController');
const mongoose = require('mongoose');

const router = express.Router();

// POST /api/batches/generate (generate batches from orders)
router.post('/generate', authMiddleware, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    const batches = await generateBatches();
    res.json({ message: 'Batches generated', batches });
  } catch (err) {
    console.error('Batch generation error:', err);
    res.status(500).json({ message: 'Batch generation error', error: err.message });
  }
});

// GET /api/batches/today (get today's batches)
router.get('/today', authMiddleware, async (req, res) => {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    // Find batches created today
    const batches = await Batch.find({ createdAt: { $gte: start, $lte: end } })
      .populate('orders')
      .populate('assignedDriverId');
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch today\'s batches', error: err.message });
  }
});

// GET /api/batches/all (get all batches)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    console.log('[DEBUG] req.user:', req.user);
    console.log('[DEBUG] req.user.id:', req.user.id, 'type:', typeof req.user.id);
    let batches;
    let driverObjectId;
    try {
      driverObjectId = require('mongoose').Types.ObjectId(req.user.id);
      console.log('[DEBUG] driverObjectId:', driverObjectId, 'type:', typeof driverObjectId);
    } catch (e) {
      console.log('[DEBUG] Error converting req.user.id to ObjectId:', e);
      driverObjectId = req.user.id;
    }
    // Print all batches' assignedDriverId for debugging
    const allBatches = await Batch.find();
    console.log('[DEBUG] All batches assignedDriverId:');
    allBatches.forEach(b => {
      console.log(`  Batch ${b._id}: assignedDriverId =`, b.assignedDriverId, 'type:', typeof b.assignedDriverId, b.assignedDriverId && b.assignedDriverId.toString());
    });
    if (req.user.role === 'DRIVER') {
      batches = await Batch.find({ assignedDriverId: driverObjectId }).populate('orders');
      console.log('[DEBUG] DRIVER batches query:', { assignedDriverId: driverObjectId });
    } else if (req.user.role === 'SUPERVISOR' || req.user.role === 'ADMIN') {
      batches = await Batch.find().populate('orders');
      console.log('[DEBUG] SUPERVISOR/ADMIN batches query: all');
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    console.log('[DEBUG] batches.length:', batches.length);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/batches/with-coords
router.get('/with-coords', authMiddleware, async (req, res) => {
  try {
    const batches = await Batch.find().populate('orders');
    const result = batches.map(batch => ({
      batch_id: batch._id,
      orders: batch.orders.filter(o => o.lat !== undefined && o.lng !== undefined).map(order => ({
        order_id: order._id,
        lat: order.lat,
        lng: order.lng,
        weight: order.weight,
        pincode: order.pincode
      }))
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch batches with coords', error: err.message });
  }
});

// GET /api/batches/assigned - get all batches assigned to the logged-in driver
router.get('/assigned', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const batches = await Batch.find({
      assignedDriverId: userId
    }).populate('orders');
    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch assigned batches', error: err.message });
  }
});

// GET /api/batches/:id/details
router.get('/:id/details', authMiddleware, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('orders')
      .populate('assignedDriverId');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch batch details', error: err.message });
  }
});

// PATCH /api/batches/:id/assign (assign driver to batch)
router.patch('/:id/assign', authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.body;
    const batch = await Batch.findById(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    batch.assignedDriverId = driverId;
    await batch.save();
    // Update all orders in the batch to status: 'ASSIGNED'
    await Order.updateMany({ _id: { $in: batch.orders } }, { $set: { status: 'ASSIGNED' } });
    res.json({ message: 'Driver assigned to batch' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign driver', error: err.message });
  }
});

// GET /api/batches/:id (get batch details)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id).populate('orders').populate('assignedDriverId');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch batch details', error: err.message });
  }
});

// Danger: Only for development/testing!
router.delete('/all', authMiddleware, async (req, res) => {
  try {
    await Batch.deleteMany({});
    await Order.deleteMany({});
    res.json({ message: 'All batches and orders deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete batches/orders', error: err.message });
  }
});

module.exports = router; 