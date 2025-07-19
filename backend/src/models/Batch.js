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
  }
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema); 