import React, { useEffect, useState } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function SupervisorReports() {
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/summary/trends', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch trends');
        setTrends(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchTrends();
  }, []);

  // Prepare chart data
  let orderLineData = null, revenueLineData = null, paymentTypeData = null;
  if (trends) {
    // Orders line chart
    orderLineData = {
      labels: trends.ordersTrend.map(row => row._id),
      datasets: [
        {
          label: 'Orders',
          data: trends.ordersTrend.map(row => row.count),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
          tension: 0.3
        }
      ]
    };
    // Revenue line chart
    revenueLineData = {
      labels: trends.revenueTrend.map(row => row._id),
      datasets: [
        {
          label: 'Revenue',
          data: trends.revenueTrend.map(row => row.total),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          fill: true,
          tension: 0.3
        }
      ]
    };
    // Payment type doughnut chart
    paymentTypeData = {
      labels: trends.paymentTypeBreakdown.map(row => row._id),
      datasets: [
        {
          label: 'Total',
          data: trends.paymentTypeBreakdown.map(row => row.total),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',
            'rgba(54, 162, 235, 0.6)',
            'rgba(255, 206, 86, 0.6)',
            'rgba(75, 192, 192, 0.6)',
            'rgba(153, 102, 255, 0.6)',
            'rgba(255, 159, 64, 0.6)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  return (
    <div>
      <h2>Reports & Analytics</h2>
      <div className="card p-3 mb-4">
        {loading ? (
          <div className="text-center my-3"><div className="spinner-border" role="status"><span className="visually-hidden">Loading...</span></div></div>
        ) : error ? (
          <div className="alert alert-danger">{error}</div>
        ) : trends ? (
          <>
            <h5>Order Volume (Last 30 Days)</h5>
            <div style={{ maxWidth: 700 }} className="mb-4">
              <Line data={orderLineData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
            <h5>Revenue (Last 30 Days)</h5>
            <div style={{ maxWidth: 700 }} className="mb-4">
              <Line data={revenueLineData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
            <h5>Payment Type Breakdown (Last 30 Days)</h5>
            <div style={{ maxWidth: 400 }} className="mb-4">
              <Doughnut data={paymentTypeData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            </div>
            <h6 className="mt-4">Raw Data</h6>
            <table className="table table-bordered table-sm mb-4">
              <thead><tr><th>Date</th><th>Orders</th></tr></thead>
              <tbody>
                {trends.ordersTrend.map(row => (
                  <tr key={row._id}><td>{row._id}</td><td>{row.count}</td></tr>
                ))}
              </tbody>
            </table>
            <table className="table table-bordered table-sm mb-4">
              <thead><tr><th>Date</th><th>Revenue</th></tr></thead>
              <tbody>
                {trends.revenueTrend.map(row => (
                  <tr key={row._id}><td>{row._id}</td><td>₹{row.total}</td></tr>
                ))}
              </tbody>
            </table>
            <table className="table table-bordered table-sm">
              <thead><tr><th>Type</th><th>Count</th><th>Total</th></tr></thead>
              <tbody>
                {trends.paymentTypeBreakdown.map(row => (
                  <tr key={row._id}><td>{row._id}</td><td>{row.count}</td><td>₹{row.total}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        ) : <p>No data available.</p>}
      </div>
    </div>
  );
}

export default SupervisorReports; 