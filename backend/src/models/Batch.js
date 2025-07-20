const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  orders: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Order',
    required: true
  }],
  assignedDriverId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User'
  },
  totalWeight: { 
    type: Number, 
    required: true 
  },
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'PENDING'
  },
  completedAt: {
    type: Date
  },
  completionNotes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema); 