const mongoose = require('mongoose');
const Batch = require('../src/models/Batch');
const Order = require('../src/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/silodispatch', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixBatchCompletion() {
  try {
    console.log('🔧 Fixing batch completion status...');
    
    // Get all batches with their orders
    const allBatches = await Batch.find().populate('orders');
    console.log(`📊 Found ${allBatches.length} batches to check`);
    
    let fixedCount = 0;
    
    for (const batch of allBatches) {
      if (batch.orders && batch.orders.length > 0) {
        // Check if all orders in this batch are delivered
        const allDelivered = batch.orders.every(order => order.status === 'DELIVERED');
        
        if (allDelivered && batch.status !== 'COMPLETED') {
          console.log(`✅ Fixing batch ${batch._id}: All orders delivered, marking as COMPLETED`);
          
          // Update batch to completed status
          await Batch.findByIdAndUpdate(batch._id, {
            status: 'COMPLETED',
            completedAt: new Date(),
            completionNotes: 'Auto-completed: All orders delivered'
          });
          
          fixedCount++;
        }
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} batches to COMPLETED status`);
    
    // Show final status distribution
    const finalBatches = await Batch.find();
    const statusCounts = {};
    finalBatches.forEach(batch => {
      const status = batch.status || 'NO_STATUS';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    console.log('\n📈 Final Batch Status Distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    // Test the completed batches API
    const completedBatches = await Batch.find({ status: 'COMPLETED' })
      .populate('orders')
      .populate('assignedDriverId')
      .sort({ completedAt: -1 });
    
    console.log(`\n🏆 Completed batches available via API: ${completedBatches.length}`);
    
    if (completedBatches.length > 0) {
      console.log('\n📋 Sample completed batch:');
      const sample = completedBatches[0];
      console.log(`   ID: ${sample._id}`);
      console.log(`   Orders: ${sample.orders.length}`);
      console.log(`   Completed at: ${sample.completedAt}`);
      console.log(`   Driver: ${sample.assignedDriverId ? 'Assigned' : 'Unassigned'}`);
    }
    
  } catch (error) {
    console.error('❌ Error fixing batch completion:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the fix
fixBatchCompletion(); 