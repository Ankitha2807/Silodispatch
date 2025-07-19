import React, { useState, useEffect } from 'react';

function DriverAssignment() {
  const [batches, setBatches] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Fetch all batches
  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches/all', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch batches');
      setBatches(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // Fetch drivers
  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/users?role=DRIVER', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch drivers');
      setDrivers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchDrivers();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch(`/api/batches/${selectedBatch}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ driverId: selectedDriver })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Assignment failed');
      setMessage('Driver assigned successfully!');
      fetchBatches();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h4>Driver Assignment</h4>
      <form onSubmit={handleAssign} className="row g-3 align-items-end">
        <div className="col-md-5">
          <label className="form-label">Batch</label>
          <select className="form-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} required>
            <option value="">Select Batch</option>
            {batches.map(batch => (
              <option key={batch._id} value={batch._id}>
                {batch._id} (Orders: {batch.orders.length})
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-5">
          <label className="form-label">Driver</label>
          <select className="form-select" value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} required>
            <option value="">Select Driver</option>
            {drivers.map(driver => (
              <option key={driver._id} value={driver._id}>{driver.name} ({driver.email})</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>Assign</button>
        </div>
      </form>
      {message && <div className="alert alert-success mt-3">{message}</div>}
      {error && <div className="alert alert-danger mt-3">{error}</div>}
    </div>
  );
}

export default DriverAssignment; 