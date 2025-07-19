const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Batch = require('../src/models/Batch');
const Order = require('../src/models/Order');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_db_name';

async function exportBatches() {
  await mongoose.connect(MONGO_URI);
  const batches = await Batch.find().populate('orders');
  const rows = [['batch_id','order_id','lat','lng','weight','pincode']];
  for (const batch of batches) {
    for (const order of batch.orders) {
      if (order.lat !== undefined && order.lng !== undefined) {
        rows.push([
          batch._id,
          order._id,
          order.lat,
          order.lng,
          order.weight,
          order.pincode
        ]);
      }
    }
  }
  const csv = rows.map(r => r.join(',')).join('\n');
  fs.writeFileSync(path.join(__dirname, '../batches_map_export.csv'), csv);
  console.log('Exported to batches_map_export.csv');
  await mongoose.disconnect();
}

exportBatches().catch(err => {
  console.error('Export error:', err);
  process.exit(1);
}); 