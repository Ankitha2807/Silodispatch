const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const CashLedger = require('../models/CashLedger');

const router = express.Router();

// POST /api/settlement/:driverId (settle COD payments)
router.post('/:driverId', authMiddleware, async (req, res) => {
  // TODO: Only allow SUPERVISOR
  // Find ledger, log settlement, reset amountHeld
  try {
    const ledger = await CashLedger.findOne({ driverId: req.params.driverId });
    if (!ledger) return res.status(404).json({ message: 'Ledger not found' });
    ledger.settledHistory.push({ amount: ledger.amountHeld, timestamp: new Date() });
    ledger.amountHeld = 0;
    await ledger.save();
    res.json({ message: 'Settlement complete', ledger });
  } catch (err) {
    res.status(500).json({ message: 'Settlement error', error: err.message });
  }
});

module.exports = router; 