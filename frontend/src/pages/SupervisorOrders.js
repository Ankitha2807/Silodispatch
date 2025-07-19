import React, { useEffect, useState } from 'react';

function SupervisorOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch orders');
      setOrders(data);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL batches and orders? This cannot be undone.')) return;
    setDeleteMsg('');
    setError('');
    try {
      const res = await fetch('/api/batches/all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete batches/orders');
      setDeleteMsg('All batches and orders deleted.');
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>All Orders</h2>
      <button className="btn btn-danger mb-3" onClick={handleDeleteAll} disabled={loading}>
        Delete ALL Batches & Orders
      </button>
      {deleteMsg && <div className="alert alert-success">{deleteMsg}</div>}
      {loading ? (
        <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="card p-3 mb-4">
          <table className="table table-bordered table-striped mb-0">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Address</th>
                <th>Pincode</th>
                <th>Phone</th>
                <th>Weight (kg)</th>
                <th>Amount</th>
                <th>Payment Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td>{order._id.slice(-5).toUpperCase()}</td>
                  <td>{order.customerName}</td>
                  <td>{order.address}</td>
                  <td>{order.pincode}</td>
                  <td>{order.customerPhone}</td>
                  <td>{order.weight}</td>
                  <td>{order.amount || '-'}</td>
                  <td>{order.paymentType}</td>
                  <td>{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SupervisorOrders; 