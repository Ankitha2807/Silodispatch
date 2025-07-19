import React, { useState, useEffect } from 'react';

function AssignedDeliveries({ user }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBatches = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/batches/all', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch batches');
        // Filter batches assigned to this driver
        const myBatches = data.filter(batch => batch.assignedDriverId && batch.assignedDriverId._id === user?.id);
        setBatches(myBatches);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    if (user) fetchBatches();
  }, [user]);

  if (!user) return <div className="alert alert-danger">User not found. Please log in again.</div>;

  return (
    <div>
      <h4>Assigned Deliveries</h4>
      {loading ? <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div> :
        error ? <div className="alert alert-danger">{error}</div> : (
        batches.length === 0 ? <div className="alert alert-info">No assigned deliveries.</div> : (
          <table className="table table-bordered table-striped">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Order Address</th>
                <th>Pincode</th>
                <th>Weight (kg)</th>
                <th>Payment Type</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                batch.orders.map(order => (
                  <tr key={order._id}>
                    <td>{batch._id}</td>
                    <td>{order.address}</td>
                    <td>{order.pincode}</td>
                    <td>{order.weight}</td>
                    <td>{order.paymentType}</td>
                    <td>{order.amount || '-'}</td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        )
      )}
    </div>
  );
}

export default AssignedDeliveries; 