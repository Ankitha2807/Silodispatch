const mongoose = require('mongoose');

const settlementRequestSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { 
    type: String, 
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], 
    default: 'PENDING' 
  },
  requestedAmount: { type: Number, required: true },
  cashAmount: { type: Number, default: 0 },
  upiAmount: { type: Number, default: 0 },
  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  notes: { type: String },
  cashEntries: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CashLedger' }],
  payments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }]
}, { timestamps: true });

// Indexes for efficient queries
settlementRequestSchema.index({ driverId: 1, status: 1 });
settlementRequestSchema.index({ status: 1, requestedAt: -1 });

module.exports = mongoose.model('SettlementRequest', settlementRequestSchema); 