import React, { useEffect, useState } from 'react';

function DriverInfoPanel() {
  const [drivers, setDrivers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Fetch all drivers
        const resDrivers = await fetch('/api/users?role=DRIVER', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const driversData = await resDrivers.json();
        if (!resDrivers.ok) throw new Error(driversData.message || 'Failed to fetch drivers');
        setDrivers(driversData);
        // Fetch all batches
        const resBatches = await fetch('/api/batches/all', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const batchesData = await resBatches.json();
        if (!resBatches.ok) throw new Error(batchesData.message || 'Failed to fetch batches');
        setBatches(batchesData);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading) return <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  // Helper: count batches assigned to a driver
  const getBatchCount = (driverId) =>
    batches.filter(b => b.assignedDriverId && b.assignedDriverId._id === driverId).length;

  return (
    <div className="mb-4">
      <h4>Driver Info</h4>
      <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '0.25rem' }}>
        <table className="table table-bordered table-striped mb-0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
                              <th>Batches Assigned</th>
              {/* <th>Cash-in-Hand</th> */}
            </tr>
          </thead>
          <tbody>
            {drivers.map(driver => (
              <tr key={driver._id}>
                <td>{driver.name}</td>
                <td>{driver.email}</td>
                <td>{getBatchCount(driver._id)}</td>
                {/* <td>TODO: Cash-in-Hand</td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DriverInfoPanel; 