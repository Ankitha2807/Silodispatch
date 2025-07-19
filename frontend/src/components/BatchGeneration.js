import React, { useState, useEffect } from 'react';

function BatchGeneration() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    setError('');
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
    setLoading(false);
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/batches/generate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Batch generation failed');
      setMessage('Batches generated!');
      fetchBatches();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <h4>Batch Generation</h4>
      <button onClick={handleGenerate} disabled={loading}>Generate Batches</button>
      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}
      <h5>All Batches</h5>
      {loading ? <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div> : (
        <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.25rem' }}>
          <table className="table table-bordered table-striped mb-0">
            <thead>
              <tr>
                <th>Batch ID</th>
                <th>Orders</th>
                <th>Total Weight (kg)</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(batch => (
                <tr key={batch._id}>
                  <td>{batch._id}</td>
                  <td>{batch.orders.length}</td>
                  <td>{batch.totalWeight}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BatchGeneration; 