const mongoose = require('mongoose');

const cashLedgerSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amountHeld: { type: Number, default: 0 },
  settledHistory: [
    {
      amount: Number,
      timestamp: Date
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('CashLedger', cashLedgerSchema); 