const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const CashLedger = require('../models/CashLedger');
const { Parser } = require('json2csv');

const router = express.Router();

// GET /api/finance/export (export cash ledger)
router.get('/export', authMiddleware, async (req, res) => {
  // TODO: Only allow SUPERVISOR
  // Export as CSV or JSON
  try {
    const ledgers = await CashLedger.find();
    if (req.query.format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(ledgers.map(l => l.toObject()));
      res.header('Content-Type', 'text/csv');
      res.attachment('cash_ledger.csv');
      return res.send(csv);
    }
    res.json(ledgers);
  } catch (err) {
    res.status(500).json({ message: 'Export error', error: err.message });
  }
});

// Get all COD pending payments
router.get('/cod-pending', async (req, res) => {
  try {
    console.log('GET /api/finance/cod-pending called');
    const codPending = await require('../models/Payment').find({ method: 'COD', status: 'PENDING' }).populate('orderId');
    res.json(codPending);
  } catch (err) {
    console.error('Error in /cod-pending:', err.message, err.stack);
    res.status(500).json({ message: 'Failed to fetch COD pending payments', error: err.message });
  }
});

module.exports = router; 