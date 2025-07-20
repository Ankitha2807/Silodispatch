import React, { useEffect, useState } from 'react';

function SupervisorDrivers() {
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

  // Helper: count batches assigned to a driver
  const getBatchCount = (driverId) =>
    batches.filter(b => b.assignedDriverId && b.assignedDriverId._id === driverId).length;

  return (
    <div>
      <h2>All Drivers</h2>
      {loading ? (
        <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : (
        <div className="card p-3 mb-4">
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
                  <td>
                    {
                      batches.filter(b => {
                        // Support both string and object for assignedDriverId
                        if (!b.assignedDriverId) return false;
                        if (typeof b.assignedDriverId === 'string') {
                          return b.assignedDriverId === driver._id;
                        }
                        if (typeof b.assignedDriverId === 'object' && b.assignedDriverId._id) {
                          return b.assignedDriverId._id === driver._id;
                        }
                        return false;
                      }).length
                    }
                  </td>
                  {/* <td>TODO: Cash-in-Hand</td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SupervisorDrivers; 