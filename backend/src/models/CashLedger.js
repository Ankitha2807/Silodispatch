const mongoose = require('mongoose');

const cashLedgerSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  collectedAt: { type: Date, default: Date.now },
  settled: { type: Boolean, default: false },
  settledAt: { type: Date },
  settledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: { type: String }
}, { timestamps: true });

// Index for efficient queries
cashLedgerSchema.index({ driverId: 1, settled: 1 });
cashLedgerSchema.index({ orderId: 1 });

module.exports = mongoose.model('CashLedger', cashLedgerSchema); 