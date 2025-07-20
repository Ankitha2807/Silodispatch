const mongoose = require('mongoose');
const Batch = require('../src/models/Batch');
const Order = require('../src/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/silodispatch', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function initBatchStatus() {
  try {
    console.log('🔄 Initializing batch status fields...');
    
    // Find all batches that don't have a status field
    const batchesWithoutStatus = await Batch.find({ status: { $exists: false } });
    console.log(`Found ${batchesWithoutStatus.length} batches without status field`);
    
    if (batchesWithoutStatus.length > 0) {
      // Update all batches to have PENDING status
      const result = await Batch.updateMany(
        { status: { $exists: false } },
        { $set: { status: 'PENDING' } }
      );
      console.log(`✅ Updated ${result.modifiedCount} batches with PENDING status`);
    }
    
    // Check for batches that might need status updates based on their orders
    const allBatches = await Batch.find().populate('orders');
    let completedCount = 0;
    
    for (const batch of allBatches) {
      // Check if all orders in the batch are delivered
      const allDelivered = batch.orders.every(order => order.status === 'DELIVERED');
      
      if (allDelivered && batch.status !== 'COMPLETED') {
        await Batch.findByIdAndUpdate(batch._id, {
          status: 'COMPLETED',
          completedAt: new Date(),
          completionNotes: 'Auto-marked as completed - all orders delivered'
        });
        completedCount++;
        console.log(`✅ Batch ${batch._id} marked as COMPLETED`);
      }
    }
    
    console.log(`✅ Auto-completed ${completedCount} batches`);
    
    // Show final statistics
    const stats = await Batch.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n📊 Batch Status Summary:');
    stats.forEach(stat => {
      console.log(`   ${stat._id || 'NO_STATUS'}: ${stat.count}`);
    });
    
    console.log('\n🎉 Batch status initialization completed!');
    
  } catch (error) {
    console.error('❌ Error initializing batch status:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
initBatchStatus(); 