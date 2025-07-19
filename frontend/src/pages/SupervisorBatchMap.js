import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default icon issue
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow });
L.Marker.prototype.options.icon = DefaultIcon;

const COLORS = [
  'red', 'blue', 'green', 'orange', 'purple', 'brown', 'pink', 'yellow', 'cyan', 'magenta',
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

function MapController({ selectedBatchOrders }) {
  const map = useMap();
  useEffect(() => {
    if (selectedBatchOrders && selectedBatchOrders.length > 0) {
      const bounds = L.latLngBounds(selectedBatchOrders.map(o => [o.lat, o.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [selectedBatchOrders, map]);
  return null;
}

function SupervisorBatchMap() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/batches/with-coords', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch batch map data');
        setBatches(data);
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  // Find map center (average of all points)
  let center = [20.5937, 78.9629]; // Default: India
  const allPoints = batches.flatMap(b => b.orders);
  if (allPoints.length > 0) {
    const avgLat = allPoints.reduce((sum, o) => sum + o.lat, 0) / allPoints.length;
    const avgLng = allPoints.reduce((sum, o) => sum + o.lng, 0) / allPoints.length;
    center = [avgLat, avgLng];
  }

  // Filter batches for selected batch
  const displayedBatches = selectedBatch
    ? batches.filter(b => b.batch_id === selectedBatch)
    : batches;

  // Info for selected batch
  const selectedBatchObj = batches.find(b => b.batch_id === selectedBatch);
  const selectedBatchOrders = selectedBatchObj ? selectedBatchObj.orders : [];
  const totalWeight = selectedBatchOrders.reduce((sum, o) => sum + (o.weight || 0), 0);
  const pincodes = [...new Set(selectedBatchOrders.map(o => o.pincode))];

  return (
    <div>
      <h2>Batch Map Visualization</h2>
      {loading && <div>Loading map...</div>}
      {error && <div className="text-danger">{error}</div>}
      {!loading && !error && (
        <>
          <MapContainer center={center} zoom={6} style={{ height: '70vh', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {selectedBatch && (
              <MapController selectedBatchOrders={selectedBatchOrders} />
            )}
            {displayedBatches.map((batch, i) => (
              batch.orders.map(order => (
                <Marker
                  key={order.order_id}
                  position={[order.lat, order.lng]}
                  pathOptions={{ color: COLORS[i % COLORS.length] }}
                  icon={L.icon({
                    iconUrl,
                    shadowUrl: iconShadow,
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    iconSize: [25, 41],
                    className: '',
                  })}
                >
                  <Popup>
                    <div>
                      <b>Batch:</b> {batch.batch_id}<br/>
                      <b>Order:</b> {order.order_id}<br/>
                      <b>Pincode:</b> {order.pincode}<br/>
                      <b>Weight:</b> {order.weight} kg
                    </div>
                  </Popup>
                </Marker>
              ))
            ))}
          </MapContainer>
          <div style={{ marginTop: 16 }}>
            <b>Legend:</b>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap' }}>
              {batches.map((batch, i) => (
                <li
                  key={batch.batch_id}
                  style={{
                    marginRight: 16,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontWeight: selectedBatch === batch.batch_id ? 'bold' : 'normal',
                    textDecoration: selectedBatch === batch.batch_id ? 'underline' : 'none',
                    opacity: selectedBatch && selectedBatch !== batch.batch_id ? 0.5 : 1
                  }}
                  onClick={() => setSelectedBatch(selectedBatch === batch.batch_id ? null : batch.batch_id)}
                  title={selectedBatch === batch.batch_id ? 'Show all batches' : 'Show only this batch'}
                >
                  <span style={{ display: 'inline-block', width: 16, height: 16, background: COLORS[i % COLORS.length], marginRight: 6, borderRadius: 3 }}></span>
                  Batch {batch.batch_id}
                </li>
              ))}
            </ul>
            {selectedBatch && (
              <div style={{ marginTop: 8 }}>
                <button className="btn btn-sm btn-secondary" onClick={() => setSelectedBatch(null)}>
                  Show All Batches
                </button>
                <div className="card mt-3 p-3" style={{ maxWidth: 400 }}>
                  <h5>Batch Info</h5>
                  <div><b>Batch ID:</b> {selectedBatch}</div>
                  <div><b>Orders:</b> {selectedBatchOrders.length}</div>
                  <div><b>Total Weight:</b> {totalWeight} kg</div>
                  <div><b>Pincodes:</b> {pincodes.join(', ')}</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default SupervisorBatchMap; 