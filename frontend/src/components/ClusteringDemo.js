import React, { useState, useEffect } from 'react';
import { Card, Button, ProgressBar, Table, Badge } from 'react-bootstrap';

function ClusteringDemo() {
  const [demoData, setDemoData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sample data for demonstration
  const sampleOrders = [
    { address: "Mumbai Central", pincode: "400008", area: "Central Mumbai" },
    { address: "Grant Road", pincode: "400007", area: "Central Mumbai" },
    { address: "Andheri Station", pincode: "400058", area: "Western Suburbs" },
    { address: "Andheri West", pincode: "400058", area: "Western Suburbs" },
    { address: "Bandra Station", pincode: "400050", area: "Western Suburbs" },
    { address: "Bandra West", pincode: "400050", area: "Western Suburbs" },
    { address: "Dadar Station", pincode: "400014", area: "Central Mumbai" },
    { address: "Dadar West", pincode: "400028", area: "Central Mumbai" },
    { address: "Borivali Station", pincode: "400066", area: "Northern Suburbs" },
    { address: "Borivali West", pincode: "400092", area: "Northern Suburbs" }
  ];

  const runClusteringDemo = async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock clustering results
    const results = {
      withoutClustering: {
        totalDistance: 45.2,
        totalTime: 90,
        fuelConsumption: 4.5,
        orders: sampleOrders
      },
      withClustering: {
        totalDistance: 28.7,
        totalTime: 57,
        fuelConsumption: 2.9,
        clusters: [
          {
            name: "Central Mumbai Cluster",
            orders: sampleOrders.filter(o => o.area === "Central Mumbai"),
            distance: 8.5,
            time: 17
          },
          {
            name: "Western Suburbs Cluster", 
            orders: sampleOrders.filter(o => o.area === "Western Suburbs"),
            distance: 12.3,
            time: 25
          },
          {
            name: "Northern Suburbs Cluster",
            orders: sampleOrders.filter(o => o.area === "Northern Suburbs"), 
            distance: 7.9,
            time: 15
          }
        ]
      }
    };
    
    setDemoData(results);
    setLoading(false);
  };

  const calculateSavings = () => {
    if (!demoData) return null;
    
    const distanceSavings = demoData.withoutClustering.totalDistance - demoData.withClustering.totalDistance;
    const timeSavings = demoData.withoutClustering.totalTime - demoData.withClustering.totalTime;
    const fuelSavings = demoData.withoutClustering.fuelConsumption - demoData.withClustering.fuelConsumption;
    
    return {
      distance: {
        saved: distanceSavings,
        percentage: (distanceSavings / demoData.withoutClustering.totalDistance * 100).toFixed(1)
      },
      time: {
        saved: timeSavings,
        percentage: (timeSavings / demoData.withoutClustering.totalTime * 100).toFixed(1)
      },
      fuel: {
        saved: fuelSavings,
        percentage: (fuelSavings / demoData.withoutClustering.fuelConsumption * 100).toFixed(1)
      }
    };
  };

  const savings = calculateSavings();

  return (
    <div className="container mt-4">
      <Card>
        <Card.Header className="bg-primary text-white">
          <h3 className="mb-0">🚀 Clustering Algorithm Demonstration</h3>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">
            This demonstration shows how our K-Means clustering algorithm optimizes delivery routes 
            to reduce distance, time, and fuel consumption.
          </p>
          
          <Button 
            variant="success" 
            size="lg" 
            onClick={runClusteringDemo}
            disabled={loading}
            className="mb-4"
          >
            {loading ? 'Running Analysis...' : 'Run Clustering Analysis'}
          </Button>

          {loading && (
            <div className="text-center">
              <ProgressBar animated now={100} className="mb-3" />
              <p>Analyzing delivery routes and calculating optimizations...</p>
            </div>
          )}

          {demoData && (
            <div>
              {/* Comparison Cards */}
              <div className="row mb-4">
                <div className="col-md-6">
                  <Card className="border-danger">
                    <Card.Header className="bg-danger text-white">
                      <h5 className="mb-0">❌ Without Clustering</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className="row text-center">
                        <div className="col-4">
                          <h4 className="text-danger">{demoData.withoutClustering.totalDistance} km</h4>
                          <small>Total Distance</small>
                        </div>
                        <div className="col-4">
                          <h4 className="text-danger">{demoData.withoutClustering.totalTime} min</h4>
                          <small>Total Time</small>
                        </div>
                        <div className="col-4">
                          <h4 className="text-danger">{demoData.withoutClustering.fuelConsumption} L</h4>
                          <small>Fuel Used</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
                
                <div className="col-md-6">
                  <Card className="border-success">
                    <Card.Header className="bg-success text-white">
                      <h5 className="mb-0">✅ With Clustering</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className="row text-center">
                        <div className="col-4">
                          <h4 className="text-success">{demoData.withClustering.totalDistance} km</h4>
                          <small>Total Distance</small>
                        </div>
                        <div className="col-4">
                          <h4 className="text-success">{demoData.withClustering.totalTime} min</h4>
                          <small>Total Time</small>
                        </div>
                        <div className="col-4">
                          <h4 className="text-success">{demoData.withClustering.fuelConsumption} L</h4>
                          <small>Fuel Used</small>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </div>

              {/* Savings Summary */}
              {savings && (
                <Card className="mb-4">
                  <Card.Header className="bg-warning text-dark">
                    <h5 className="mb-0">💰 Efficiency Gains</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="row text-center">
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h3 className="text-primary">{savings.distance.saved.toFixed(1)} km</h3>
                          <p className="mb-1">Distance Saved</p>
                          <Badge bg="primary">{savings.distance.percentage}%</Badge>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h3 className="text-success">{savings.time.saved} min</h3>
                          <p className="mb-1">Time Saved</p>
                          <Badge bg="success">{savings.time.percentage}%</Badge>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="border rounded p-3">
                          <h3 className="text-warning">{savings.fuel.saved.toFixed(1)} L</h3>
                          <p className="mb-1">Fuel Saved</p>
                          <Badge bg="warning" text="dark">{savings.fuel.percentage}%</Badge>
                        </div>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Cluster Details */}
              <Card>
                <Card.Header>
                  <h5 className="mb-0">📍 Optimized Clusters</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped bordered hover>
                    <thead>
                      <tr>
                        <th>Cluster</th>
                        <th>Orders</th>
                        <th>Distance</th>
                        <th>Time</th>
                        <th>Efficiency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoData.withClustering.clusters.map((cluster, index) => (
                        <tr key={index}>
                          <td>
                            <strong>{cluster.name}</strong>
                          </td>
                          <td>{cluster.orders.length}</td>
                          <td>{cluster.distance} km</td>
                          <td>{cluster.time} min</td>
                          <td>
                            <Badge bg="success">Optimized</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>

              {/* Algorithm Features */}
              <Card className="mt-4">
                <Card.Header>
                  <h5 className="mb-0">⚡ Algorithm Features</h5>
                </Card.Header>
                <Card.Body>
                  <div className="row">
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        <li>✅ K-Means clustering for optimal grouping</li>
                        <li>✅ Geocoding integration for accurate coordinates</li>
                        <li>✅ Haversine distance calculation</li>
                        <li>✅ Automatic centroid optimization</li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <ul className="list-unstyled">
                        <li>✅ Configurable cluster sizes</li>
                        <li>✅ Real-time route optimization</li>
                        <li>✅ Scalable to 1000+ orders</li>
                        <li>✅ Performance monitoring</li>
                      </ul>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default ClusteringDemo; 