import React, { useEffect, useState, useCallback } from 'react';

function SupervisorOrders() {
  const [orders, setOrders] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [codPending, setCodPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersRes, deliveredRes, pendingRes, codRes] = await Promise.all([
        fetch('/api/orders', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/orders/delivered', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/orders/pending', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch('/api/finance/cod-pending', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      const ordersData = await ordersRes.json();
      const deliveredData = await deliveredRes.json();
      const pendingData = await pendingRes.json();
      const codData = await codRes.json();
      if (!ordersRes.ok) throw new Error(ordersData.message || 'Failed to fetch orders');
      if (!deliveredRes.ok) throw new Error(deliveredData.message || 'Failed to fetch delivered orders');
      if (!pendingRes.ok) throw new Error(pendingData.message || 'Failed to fetch pending orders');
      if (!codRes.ok) throw new Error(codData.message || 'Failed to fetch COD pending payments');
      setOrders(ordersData);
      setDeliveredOrders(deliveredData);
      setPendingOrders(pendingData);
      setCodPending(codData);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
      fetchAll();
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
        <>
        <div className="card p-3 mb-4">
          <h4>Delivered Orders</h4>
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
              {deliveredOrders.map(order => (
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
        <div className="card p-3 mb-4">
          <h4>Pending Orders</h4>
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
              {pendingOrders.map(order => (
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
        <div className="card p-3 mb-4">
          <h4>COD Pending Payments</h4>
          <table className="table table-bordered table-striped mb-0">
            <thead>
              <tr>
                <th>Payment ID</th>
                <th>Order ID</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {codPending.map(payment => (
                <tr key={payment._id}>
                  <td>{payment._id.slice(-5).toUpperCase()}</td>
                  <td>{payment.orderId ? payment.orderId._id.slice(-5).toUpperCase() : '-'}</td>
                  <td>{payment.amount}</td>
                  <td>{payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

export default SupervisorOrders; 