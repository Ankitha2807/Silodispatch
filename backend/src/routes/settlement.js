const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const CashLedger = require('../models/CashLedger');
const Payment = require('../models/Payment');
const Batch = require('../models/Batch');
const Order = require('../models/Order');
const DriverAction = require('../models/DriverAction');
const SettlementRequest = require('../models/SettlementRequest');

const router = express.Router();

// GET /api/settlement/debug/actions - Debug all driver actions
router.get('/debug/actions', authMiddleware, async (req, res) => {
  try {
    const allActions = await DriverAction.find({})
      .populate('driverId', 'name email')
      .populate('orderId', 'address paymentType amount')
      .sort({ timestamp: -1 })
      .limit(20);
    
    const actionSummary = {
      total: allActions.length,
      byDriver: {},
      byType: {}
    };
    
    allActions.forEach(action => {
      const driverId = action.driverId?._id || action.driverId;
      const driverName = action.driverId?.name || 'Unknown';
      
      if (!actionSummary.byDriver[driverId]) {
        actionSummary.byDriver[driverId] = {
          name: driverName,
          actions: []
        };
      }
      actionSummary.byDriver[driverId].actions.push({
        type: action.actionType,
        timestamp: action.timestamp,
        success: action.success
      });
      
      if (!actionSummary.byType[action.actionType]) {
        actionSummary.byType[action.actionType] = 0;
      }
      actionSummary.byType[action.actionType]++;
    });
    
    res.json({
      recentActions: allActions.map(a => ({
        id: a._id,
        driverId: a.driverId?._id || a.driverId,
        driverName: a.driverId?.name || 'Unknown',
        actionType: a.actionType,
        timestamp: a.timestamp,
        success: a.success,
        orderAddress: a.orderId?.address || 'No order'
      })),
      summary: actionSummary
    });
  } catch (err) {
    console.error('Debug actions error:', err);
    res.status(500).json({ message: 'Failed to debug actions', error: err.message });
  }
});

// GET /api/settlement/driver/:driverId - Get comprehensive settlement for a driver
router.get('/driver/:driverId', authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate, batchId } = req.query;
    
    console.log('Settlement request for driver:', driverId, 'with filters:', { startDate, endDate, batchId });
    console.log('Driver ID type:', typeof driverId, 'Value:', driverId);
    
    // Build date filter for different models
    const actionDateFilter = {};
    const cashDateFilter = {};
    const paymentDateFilter = {};
    
    if (startDate || endDate) {
      if (startDate) {
        actionDateFilter.timestamp = { $gte: new Date(startDate) };
        cashDateFilter.collectedAt = { $gte: new Date(startDate) };
        paymentDateFilter.timestamp = { $gte: new Date(startDate) };
      }
      if (endDate) {
        if (actionDateFilter.timestamp) actionDateFilter.timestamp.$lte = new Date(endDate);
        else actionDateFilter.timestamp = { $lte: new Date(endDate) };
        
        if (cashDateFilter.collectedAt) cashDateFilter.collectedAt.$lte = new Date(endDate);
        else cashDateFilter.collectedAt = { $lte: new Date(endDate) };
        
        if (paymentDateFilter.timestamp) paymentDateFilter.timestamp.$lte = new Date(endDate);
        else paymentDateFilter.timestamp = { $lte: new Date(endDate) };
      }
    }
    
    console.log('Action date filter:', actionDateFilter);
    console.log('Cash date filter:', cashDateFilter);
    console.log('Payment date filter:', paymentDateFilter);
    console.log('Start date:', startDate, 'End date:', endDate);
    
    // Build batch filter
    const batchFilter = {};
    if (batchId) {
      batchFilter.batchId = batchId;
    }
    
    // First, let's check what actions exist for this driver
    const allActions = await DriverAction.find({}).populate('driverId', 'name email');
    console.log('All actions in system:', allActions.length);
    console.log('Sample actions:', allActions.slice(0, 3).map(a => ({
      actionId: a._id,
      driverId: a.driverId,
      driverIdType: typeof a.driverId,
      actionType: a.actionType,
      timestamp: a.timestamp
    })));
    
    // Get all driver actions for the period - try both string and ObjectId formats
    const actions = await DriverAction.find({
      $or: [
        { driverId: driverId },
        { driverId: driverId.toString() }
      ],
      ...actionDateFilter,
      ...batchFilter
    }).populate('orderId').populate('batchId').populate('driverId', 'name email').sort({ timestamp: -1 });
    
    console.log('Found actions for driver:', actions.length);
    console.log('Actions details:', actions.map(a => ({
      actionId: a._id,
      driverId: a.driverId,
      actionType: a.actionType,
      timestamp: a.timestamp,
      success: a.success
    })));
    
    // Get cash ledger entries
    const cashEntries = await CashLedger.find({
      $or: [
        { driverId: driverId },
        { driverId: driverId.toString() }
      ],
      settled: false,
      ...cashDateFilter
    }).populate('orderId');
    
    console.log('Found cash entries:', cashEntries.length);
    console.log('Cash entries details:', cashEntries.map(entry => ({
      entryId: entry._id,
      driverId: entry.driverId,
      orderId: entry.orderId?._id,
      amount: entry.amount,
      collectedAt: entry.collectedAt,
      settled: entry.settled
    })));
    
    // Also check all cash entries for this driver without date filter
    const allCashEntries = await CashLedger.find({
      $or: [
        { driverId: driverId },
        { driverId: driverId.toString() }
      ]
    });
    console.log('All cash entries for driver (no date filter):', allCashEntries.length);
    console.log('All cash entries details:', allCashEntries.map(entry => ({
      entryId: entry._id,
      driverId: entry.driverId,
      amount: entry.amount,
      collectedAt: entry.collectedAt,
      settled: entry.settled
    })));
    
    // Get payment records
    const paymentOrderIds = actions.map(a => a.orderId).filter(id => id);
    const payments = await Payment.find({
      orderId: { $in: paymentOrderIds },
      status: 'CONFIRMED',
      ...paymentDateFilter
    }).populate('orderId');
    
    console.log('Found payments:', payments.length);
    
    // Calculate totals
    const cashCollected = cashEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const upiCollected = payments.filter(p => p.method === 'UPI').reduce((sum, p) => sum + p.amount, 0);
    const totalCollected = cashCollected + upiCollected;
    
    // Get delivery statistics
    const deliveredOrders = actions.filter(a => a.actionType === 'MARKED_DELIVERED' && a.success);
    const totalDeliveries = deliveredOrders.length;
    
    // Get action summary
    const actionSummary = {
      otpSent: actions.filter(a => a.actionType === 'OTP_SENT' && a.success).length,
      otpVerified: actions.filter(a => a.actionType === 'OTP_VERIFIED' && a.success).length,
      cashCollected: actions.filter(a => a.actionType === 'CASH_COLLECTED' && a.success).length,
      upiCollected: actions.filter(a => a.actionType === 'UPI_COLLECTED' && a.success).length,
      delivered: totalDeliveries,
      navigationStarted: actions.filter(a => a.actionType === 'NAVIGATION_STARTED' && a.success).length
    };
    
    const result = {
      driverId,
      period: { startDate, endDate },
      summary: {
        totalCollected,
        cashCollected,
        upiCollected,
        totalDeliveries,
        actionSummary
      },
      cashEntries,
      payments,
      actions: actions.slice(0, 50), // Limit to recent 50 actions
      totalActions: actions.length
    };
    
    console.log('Settlement result:', result);
    res.json(result);
  } catch (err) {
    console.error('Settlement error:', err);
    res.status(500).json({ message: 'Failed to fetch settlement summary', error: err.message });
  }
});

// GET /api/settlement/:driverId/:batchId - Get settlement summary for a driver and batch
router.get('/:driverId/:batchId', authMiddleware, async (req, res) => {
  try {
    const { driverId, batchId } = req.params;
    
    // Find the batch and its orders
    const batch = await Batch.findById(batchId).populate('orders');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    
    // Filter orders assigned to this driver (if needed)
    if (!batch.assignedDriverId || batch.assignedDriverId.toString() !== driverId) {
      return res.status(400).json({ message: 'Batch not assigned to this driver' });
    }
    
    // Get all driver actions for this batch
    const actions = await DriverAction.find({
      driverId,
      batchId,
      orderId: { $in: batch.orders.map(o => o._id) }
    }).populate('orderId').sort({ timestamp: -1 });
    
    // Get cash ledger entries for this batch
    const cashEntries = await CashLedger.find({
      driverId,
      orderId: { $in: batch.orders.map(o => o._id) },
      settled: false
    }).populate('orderId');
    
    // Get payment records for this batch
    const payments = await Payment.find({
      orderId: { $in: batch.orders.map(o => o._id) },
      status: 'CONFIRMED'
    }).populate('orderId');
    
    // Calculate totals
    const cashCollected = cashEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const upiCollected = payments.filter(p => p.method === 'UPI').reduce((sum, p) => sum + p.amount, 0);
    const totalCollected = cashCollected + upiCollected;
    
    // Get delivery statistics
    const deliveredOrders = actions.filter(a => a.actionType === 'MARKED_DELIVERED' && a.success);
    const totalDeliveries = deliveredOrders.length;
    
    // Get action summary
    const actionSummary = {
      otpSent: actions.filter(a => a.actionType === 'OTP_SENT' && a.success).length,
      otpVerified: actions.filter(a => a.actionType === 'OTP_VERIFIED' && a.success).length,
      cashCollected: actions.filter(a => a.actionType === 'CASH_COLLECTED' && a.success).length,
      upiCollected: actions.filter(a => a.actionType === 'UPI_COLLECTED' && a.success).length,
      delivered: totalDeliveries,
      navigationStarted: actions.filter(a => a.actionType === 'NAVIGATION_STARTED' && a.success).length
    };
    
    res.json({
      batchId,
      driverId,
      batchInfo: {
        totalOrders: batch.orders.length,
        totalWeight: batch.orders.reduce((sum, o) => sum + (o.weight || 0), 0)
      },
      summary: {
        totalCollected,
        cashCollected,
        upiCollected,
        totalDeliveries,
        actionSummary
      },
      cashEntries,
      payments,
      actions
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch settlement summary', error: err.message });
  }
});

// POST /api/settlement/:driverId/:batchId - Mark settlement as completed
router.post('/:driverId/:batchId', authMiddleware, async (req, res) => {
  try {
    const { driverId, batchId } = req.params;
    
    // Find the batch and its orders
    const batch = await Batch.findById(batchId).populate('orders');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    
    if (!batch.assignedDriverId || batch.assignedDriverId.toString() !== driverId) {
      return res.status(400).json({ message: 'Batch not assigned to this driver' });
    }
    
    // Get all cash entries for these orders
    const orderIds = batch.orders.map(o => o._id);
    const cashEntries = await CashLedger.find({
      driverId,
      orderId: { $in: orderIds },
      settled: false
    });
    
    // Mark all cash entries as settled
    await CashLedger.updateMany(
      { _id: { $in: cashEntries.map(e => e._id) } },
      { 
        $set: { 
          settled: true, 
          settledAt: new Date(),
          settledBy: req.user.id
        } 
      }
    );
    
    // Mark all payments as settled
    await Payment.updateMany(
      { orderId: { $in: orderIds }, status: 'CONFIRMED' },
      { 
        $set: { 
          status: 'SETTLED', 
          settledAt: new Date() 
        } 
      }
    );
    
    res.json({ 
      message: 'Settlement completed', 
      settledCashEntries: cashEntries.length,
      totalAmount: cashEntries.reduce((sum, e) => sum + e.amount, 0)
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to complete settlement', error: err.message });
  }
});

// POST /api/settlement/driver/:driverId/complete - Complete settlement for a driver
router.post('/driver/:driverId/complete', authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { startDate, endDate } = req.query;
    
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.collectedAt = {};
      if (startDate) dateFilter.collectedAt.$gte = new Date(startDate);
      if (endDate) dateFilter.collectedAt.$lte = new Date(endDate);
    }
    
    // Get all unsettled cash entries for the driver
    const cashEntries = await CashLedger.find({
      driverId,
      settled: false,
      ...dateFilter
    });
    
    // Mark all cash entries as settled
    await CashLedger.updateMany(
      { _id: { $in: cashEntries.map(e => e._id) } },
      { 
        $set: { 
          settled: true, 
          settledAt: new Date(),
          settledBy: req.user.id
        } 
      }
    );
    
    const totalAmount = cashEntries.reduce((sum, e) => sum + e.amount, 0);
    
    res.json({ 
      message: 'Driver settlement completed', 
      settledEntries: cashEntries.length,
      totalAmount
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to complete driver settlement', error: err.message });
  }
});

// GET /api/settlement/all-drivers - Get settlements for all drivers (supervisor view)
router.get('/all-drivers', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter for different models
    const actionDateFilter = {};
    const cashDateFilter = {};
    const paymentDateFilter = {};
    
    if (startDate || endDate) {
      if (startDate) {
        actionDateFilter.timestamp = { $gte: new Date(startDate) };
        cashDateFilter.collectedAt = { $gte: new Date(startDate) };
        paymentDateFilter.timestamp = { $gte: new Date(startDate) };
      }
      if (endDate) {
        if (actionDateFilter.timestamp) actionDateFilter.timestamp.$lte = new Date(endDate);
        else actionDateFilter.timestamp = { $lte: new Date(endDate) };
        
        if (cashDateFilter.collectedAt) cashDateFilter.collectedAt.$lte = new Date(endDate);
        else cashDateFilter.collectedAt = { $lte: new Date(endDate) };
        
        if (paymentDateFilter.timestamp) paymentDateFilter.timestamp.$lte = new Date(endDate);
        else paymentDateFilter.timestamp = { $lte: new Date(endDate) };
      }
    }
    
    // Get all driver actions for the period
    const actions = await DriverAction.find(actionDateFilter)
      .populate('driverId', 'name email phone')
      .populate('orderId')
      .populate('batchId')
      .sort({ timestamp: -1 });
    
    // Get all cash ledger entries
    const cashEntries = await CashLedger.find(cashDateFilter).populate('driverId', 'name email phone').populate('orderId');
    
    // Get all payment records
    const payments = await Payment.find(paymentDateFilter).populate('orderId');
    
    // Group by driver
    const driverSettlements = {};
    
    // Process actions
    console.log('Processing actions:', actions.length);
    console.log('Sample action types:', actions.slice(0, 5).map(a => a.actionType));
    
    actions.forEach(action => {
      const driverId = action.driverId._id;
      if (!driverSettlements[driverId]) {
        driverSettlements[driverId] = {
          driver: action.driverId,
          actions: [],
          cashEntries: [],
          payments: [],
          summary: {
            totalCollected: 0,
            cashCollected: 0,
            upiCollected: 0,
            totalDeliveries: 0,
            actionSummary: {
              otpSent: 0,
              otpVerified: 0,
              cashCollected: 0,
              upiCollected: 0,
              delivered: 0,
              navigationStarted: 0
            }
          }
        };
      }
      driverSettlements[driverId].actions.push(action);
      
      // Update action summary
      if (action.success) {
        // Map action types to summary fields
        const actionTypeMap = {
          'OTP_SENT': 'otpSent',
          'OTP_VERIFIED': 'otpVerified', 
          'CASH_COLLECTED': 'cashCollected',
          'UPI_COLLECTED': 'upiCollected',
          'MARKED_DELIVERED': 'delivered',
          'NAVIGATION_STARTED': 'navigationStarted'
        };
        
        const summaryField = actionTypeMap[action.actionType];
        if (summaryField) {
          driverSettlements[driverId].summary.actionSummary[summaryField]++;
          console.log(`Updated ${summaryField} for driver ${driverId}, action: ${action.actionType}`);
        } else {
          console.log(`Unknown action type: ${action.actionType} for driver ${driverId}`);
        }
        
        if (action.actionType === 'MARKED_DELIVERED') {
          driverSettlements[driverId].summary.totalDeliveries++;
        }
      }
    });
    
    // Process cash entries
    cashEntries.forEach(entry => {
      const driverId = entry.driverId._id;
      if (!driverSettlements[driverId]) {
        driverSettlements[driverId] = {
          driver: entry.driverId,
          actions: [],
          cashEntries: [],
          payments: [],
          summary: {
            totalCollected: 0,
            cashCollected: 0,
            upiCollected: 0,
            totalDeliveries: 0,
            actionSummary: {
              otpSent: 0,
              otpVerified: 0,
              cashCollected: 0,
              upiCollected: 0,
              delivered: 0,
              navigationStarted: 0
            }
          }
        };
      }
      driverSettlements[driverId].cashEntries.push(entry);
      driverSettlements[driverId].summary.cashCollected += entry.amount;
      driverSettlements[driverId].summary.totalCollected += entry.amount;
    });
    
    // Process payments
    payments.forEach(payment => {
      const driverId = payment.orderId?.deliveredBy;
      if (driverId) {
        if (!driverSettlements[driverId]) {
          driverSettlements[driverId] = {
            driver: { _id: driverId, name: 'Unknown Driver' },
            actions: [],
            cashEntries: [],
            payments: [],
            summary: {
              totalCollected: 0,
              cashCollected: 0,
              upiCollected: 0,
              totalDeliveries: 0,
              actionSummary: {
                otpSent: 0,
                otpVerified: 0,
                cashCollected: 0,
                upiCollected: 0,
                delivered: 0,
                navigationStarted: 0
              }
            }
          };
        }
        driverSettlements[driverId].payments.push(payment);
        if (payment.method === 'UPI') {
          driverSettlements[driverId].summary.upiCollected += payment.amount;
          driverSettlements[driverId].summary.totalCollected += payment.amount;
        }
      }
    });
    
    const result = Object.values(driverSettlements);
    
    res.json({
      period: { startDate, endDate },
      drivers: result,
      totalDrivers: result.length
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all driver settlements', error: err.message });
  }
});

// POST /api/settlement/request - Driver requests settlement
router.post('/request', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, batchId, notes } = req.body;
    const driverId = req.user.id;
    
    // Build date filter for different models
    const actionDateFilter = {};
    const cashDateFilter = {};
    const paymentDateFilter = {};
    
    if (startDate || endDate) {
      if (startDate) {
        actionDateFilter.timestamp = { $gte: new Date(startDate) };
        cashDateFilter.collectedAt = { $gte: new Date(startDate) };
        paymentDateFilter.timestamp = { $gte: new Date(startDate) };
      }
      if (endDate) {
        if (actionDateFilter.timestamp) actionDateFilter.timestamp.$lte = new Date(endDate);
        else actionDateFilter.timestamp = { $lte: new Date(endDate) };
        
        if (cashDateFilter.collectedAt) cashDateFilter.collectedAt.$lte = new Date(endDate);
        else cashDateFilter.collectedAt = { $lte: new Date(endDate) };
        
        if (paymentDateFilter.timestamp) paymentDateFilter.timestamp.$lte = new Date(endDate);
        else paymentDateFilter.timestamp = { $lte: new Date(endDate) };
      }
    }
    
    // Get driver actions for the period
    const actions = await DriverAction.find({
      driverId,
      ...actionDateFilter
    }).populate('orderId');
    
    // Get cash ledger entries
    const cashEntries = await CashLedger.find({
      driverId,
      settled: false,
      ...cashDateFilter
    }).populate('orderId');
    
    // Get payment records
    const paymentOrderIds = actions.map(a => a.orderId).filter(id => id);
    const payments = await Payment.find({
      orderId: { $in: paymentOrderIds },
      status: 'CONFIRMED',
      ...paymentDateFilter
    }).populate('orderId');
    
    // Calculate totals
    const cashAmount = cashEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const upiAmount = payments.filter(p => p.method === 'UPI').reduce((sum, p) => sum + p.amount, 0);
    const requestedAmount = cashAmount + upiAmount;
    
    // Check if there's already a pending request
    const existingRequest = await SettlementRequest.findOne({
      driverId,
      status: 'PENDING'
    });
    
    if (existingRequest) {
      return res.status(400).json({ 
        message: 'You already have a pending settlement request. Please wait for supervisor approval.' 
      });
    }
    
    // Create settlement request
    const settlementRequest = new SettlementRequest({
      driverId,
      batchId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      requestedAmount,
      cashAmount,
      upiAmount,
      notes,
      cashEntries: cashEntries.map(e => e._id),
      payments: payments.map(p => p._id)
    });
    
    await settlementRequest.save();
    
    res.json({
      message: 'Settlement request submitted successfully',
      request: settlementRequest,
      summary: {
        totalAmount: requestedAmount,
        cashAmount,
        upiAmount,
        cashEntries: cashEntries.length,
        payments: payments.length
      }
    });
  } catch (err) {
    console.error('Settlement request error:', err);
    res.status(500).json({ message: 'Failed to submit settlement request', error: err.message });
  }
});

// GET /api/settlement/requests - Get all settlement requests (supervisor view)
router.get('/requests', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    
    const filter = {};
    if (status) filter.status = status;
    
    const requests = await SettlementRequest.find(filter)
      .populate('driverId', 'name email phone')
      .populate('approvedBy', 'name email')
      .populate('cashEntries')
      .populate('payments')
      .sort({ requestedAt: -1 });
    
    res.json({
      requests,
      summary: {
        pending: requests.filter(r => r.status === 'PENDING').length,
        approved: requests.filter(r => r.status === 'APPROVED').length,
        completed: requests.filter(r => r.status === 'COMPLETED').length,
        total: requests.length
      }
    });
  } catch (err) {
    console.error('Get settlement requests error:', err);
    res.status(500).json({ message: 'Failed to fetch settlement requests', error: err.message });
  }
});

// GET /api/settlement/requests/driver/:driverId - Get driver's settlement requests
router.get('/requests/driver/:driverId', authMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    const requests = await SettlementRequest.find({ driverId })
      .populate('approvedBy', 'name email')
      .populate('cashEntries')
      .populate('payments')
      .sort({ requestedAt: -1 });
    
    res.json({ requests });
  } catch (err) {
    console.error('Get driver settlement requests error:', err);
    res.status(500).json({ message: 'Failed to fetch driver settlement requests', error: err.message });
  }
});

// POST /api/settlement/requests/:requestId/approve - Approve settlement request (supervisor)
router.post('/requests/:requestId/approve', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    
    const request = await SettlementRequest.findById(requestId)
      .populate('driverId', 'name email')
      .populate('cashEntries')
      .populate('payments');
    
    if (!request) {
      return res.status(404).json({ message: 'Settlement request not found' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Settlement request is not pending' });
    }
    
    // Mark cash entries as settled
    if (request.cashEntries.length > 0) {
      await CashLedger.updateMany(
        { _id: { $in: request.cashEntries.map(e => e._id) } },
        { 
          $set: { 
            settled: true, 
            settledAt: new Date(),
            settledBy: req.user.id
          } 
        }
      );
    }
    
    // Mark payments as settled
    if (request.payments.length > 0) {
      await Payment.updateMany(
        { _id: { $in: request.payments.map(p => p._id) } },
        { 
          $set: { 
            status: 'SETTLED', 
            settledAt: new Date() 
          } 
        }
      );
    }
    
    // Update request status
    request.status = 'COMPLETED';
    request.approvedAt = new Date();
    request.approvedBy = req.user.id;
    request.completedAt = new Date();
    if (notes) request.notes = notes;
    
    await request.save();
    
    res.json({
      message: 'Settlement request approved and completed',
      request,
      summary: {
        totalAmount: request.requestedAmount,
        cashAmount: request.cashAmount,
        upiAmount: request.upiAmount,
        cashEntries: request.cashEntries.length,
        payments: request.payments.length
      }
    });
  } catch (err) {
    console.error('Approve settlement request error:', err);
    res.status(500).json({ message: 'Failed to approve settlement request', error: err.message });
  }
});

// POST /api/settlement/requests/:requestId/reject - Reject settlement request (supervisor)
router.post('/requests/:requestId/reject', authMiddleware, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { notes } = req.body;
    
    const request = await SettlementRequest.findById(requestId)
      .populate('driverId', 'name email');
    
    if (!request) {
      return res.status(404).json({ message: 'Settlement request not found' });
    }
    
    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Settlement request is not pending' });
    }
    
    // Update request status
    request.status = 'REJECTED';
    request.approvedAt = new Date();
    request.approvedBy = req.user.id;
    if (notes) request.notes = notes;
    
    await request.save();
    
    res.json({
      message: 'Settlement request rejected',
      request
    });
  } catch (err) {
    console.error('Reject settlement request error:', err);
    res.status(500).json({ message: 'Failed to reject settlement request', error: err.message });
  }
});

module.exports = router; 