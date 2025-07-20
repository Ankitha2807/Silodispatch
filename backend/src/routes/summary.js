const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const Batch = require('../models/Batch');
const Payment = require('../models/Payment');
const User = require('../models/User');

const router = express.Router();

// GET /api/summary
router.get('/', authMiddleware, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    // Pending orders
    const pendingOrders = await Order.countDocuments({ status: 'PENDING' });
    // Active drivers (drivers with at least one batch assigned)
    const allBatches = await Batch.find({ assignedDriverId: { $ne: null } });
    const activeDriverIds = [...new Set(allBatches.map(b => b.assignedDriverId?.toString()).filter(Boolean))];
    const activeDrivers = activeDriverIds.length;
    // Total revenue (sum of all confirmed payments)
    const payments = await Payment.aggregate([
      { $match: { status: 'CONFIRMED' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = payments[0]?.total || 0;
    // COD pending (sum of all COD payments with status PENDING)
    const cod = await Payment.aggregate([
      { $match: { status: 'PENDING', method: 'COD' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const codPending = cod[0]?.total || 0;

    // Yesterday's range
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);
    const yesterdayEnd = new Date();
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Orders created yesterday
    const yesterdayOrders = await Order.countDocuments({
      createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd }
    });

    // Revenue yesterday
    const yesterdayPayments = await Payment.aggregate([
      { $match: { status: 'CONFIRMED', createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const yesterdayRevenue = yesterdayPayments[0]?.total || 0;

    // Example targets (replace with DB/config fetch if needed)
    const orderTarget = 100; // daily order target
    const revenueTarget = 50000; // daily revenue target

    res.json({
      pendingOrders,
      activeDrivers,
      totalRevenue,
      codPending,
      yesterdayOrders,
      yesterdayRevenue,
      orderTarget,
      revenueTarget
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
  }
});

// GET /api/summary/trends
router.get('/trends', authMiddleware, requireRole('SUPERVISOR'), async (req, res) => {
  try {
    const days = 30;
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);

    // Orders per day
    const ordersTrend = await Order.aggregate([
      { $match: { createdAt: { $gte: start, $lte: now } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Revenue per day (confirmed payments)
    const revenueTrend = await Payment.aggregate([
      { $match: { status: 'CONFIRMED', createdAt: { $gte: start, $lte: now } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        total: { $sum: "$amount" }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Payment type breakdown (last 30 days)
    const paymentTypeBreakdown = await Payment.aggregate([
      { $match: { createdAt: { $gte: start, $lte: now } } },
      { $group: {
        _id: "$method",
        total: { $sum: "$amount" },
        count: { $sum: 1 }
      }}
    ]);

    res.json({
      ordersTrend,
      revenueTrend,
      paymentTypeBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch trends', error: err.message });
  }
});

module.exports = router; 