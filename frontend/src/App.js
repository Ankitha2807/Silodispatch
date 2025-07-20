import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, Navigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Badge, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBell, faClipboardList, faTruck, faChartBar, faHome, faUserCircle, faMapMarkerAlt } from '@fortawesome/free-solid-svg-icons';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import SupervisorDashboard from './pages/SupervisorDashboard';
import DriverDashboard from './pages/DriverDashboard';
import SupervisorOrders from './pages/SupervisorOrders';
import SupervisorDrivers from './pages/SupervisorDrivers';
import SupervisorSettlements from './pages/SupervisorSettlements';
import SupervisorSettlementRequests from './pages/SupervisorSettlementRequests';
import DriverSettlement from './pages/DriverSettlement';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

function AppNavbar({ user, isLoggedIn, handleLogout }) {
  const location = useLocation();
  return (
    <Navbar bg="white" expand="lg" className="shadow-sm mb-4" style={{ minHeight: 64 }}>
      <Container fluid>
        <Navbar.Brand as={Link} to="/" className="d-flex align-items-center gap-2">
          <FontAwesomeIcon icon={faClipboardList} className="text-primary" size="lg" />
          <span className="fw-bold text-primary">SiloDispatch</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar-nav" />
        <Navbar.Collapse id="main-navbar-nav">
          <Nav className="me-auto">
            {isLoggedIn && user?.role === 'SUPERVISOR' && (
              <>
                <Nav.Link as={Link} to="/supervisor" active={location.pathname === '/supervisor'}>
                  <FontAwesomeIcon icon={faHome} className="me-1" /> Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/supervisor/orders" active={location.pathname === '/supervisor/orders'}>
                  <FontAwesomeIcon icon={faClipboardList} className="me-1" /> Orders
                </Nav.Link>
                <Nav.Link as={Link} to="/supervisor/drivers" active={location.pathname === '/supervisor/drivers'}>
                  <FontAwesomeIcon icon={faTruck} className="me-1" /> Drivers
                </Nav.Link>
                <Nav.Link as={Link} to="/supervisor/settlements" active={location.pathname === '/supervisor/settlements'}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" /> Settlements
                </Nav.Link>
                <Nav.Link as={Link} to="/supervisor/settlement-requests" active={location.pathname === '/supervisor/settlement-requests'}>
                  <FontAwesomeIcon icon={faBell} className="me-1" /> Settlement Requests
                </Nav.Link>
              </>
            )}
            {isLoggedIn && user?.role === 'DRIVER' && (
              <>
                <Nav.Link as={Link} to="/driver" active={location.pathname === '/driver'}>
                  <FontAwesomeIcon icon={faHome} className="me-1" /> Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to={`/driver/settlement/${user.id}`} active={location.pathname.includes('/driver/settlement')}>
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="me-1" /> My Settlements
                </Nav.Link>
              </>
            )}
          </Nav>
          <Nav className="align-items-center gap-3">
            {isLoggedIn && (
              <Dropdown align="end">
                <Dropdown.Toggle variant="light" className="d-flex align-items-center border-0 shadow-none">
                  <FontAwesomeIcon icon={faUserCircle} size="2x" className="text-primary me-2" />
                  <span className="fw-semibold text-dark">{user?.name || 'User'}</span>
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item disabled>{user?.email}</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
            {!isLoggedIn && <Nav.Link as={Link} to="/login">Login</Nav.Link>}
            {!isLoggedIn && <Nav.Link as={Link} to="/register">Register</Nav.Link>}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

function App() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isLoggedIn = !!localStorage.getItem('token');
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };
  return (
    <Router>
      <AppNavbar user={user} isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
      <div className="container">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/supervisor" element={<ProtectedRoute role="SUPERVISOR"><SupervisorDashboard user={user} /></ProtectedRoute>} />
          <Route path="/driver" element={<ProtectedRoute role="DRIVER"><DriverDashboard user={user} /></ProtectedRoute>} />
          <Route path="/supervisor/orders" element={<ProtectedRoute role="SUPERVISOR"><SupervisorOrders /></ProtectedRoute>} />
          <Route path="/supervisor/drivers" element={<ProtectedRoute role="SUPERVISOR"><SupervisorDrivers /></ProtectedRoute>} />
          <Route path="/supervisor/settlements" element={<ProtectedRoute role="SUPERVISOR"><SupervisorSettlements /></ProtectedRoute>} />
          <Route path="/supervisor/settlement-requests" element={<ProtectedRoute role="SUPERVISOR"><SupervisorSettlementRequests /></ProtectedRoute>} />
          <Route path="/supervisor/driver-settlement/:driverId" element={<ProtectedRoute role="SUPERVISOR"><DriverSettlement /></ProtectedRoute>} />
          <Route path="/driver/settlement/:driverId" element={<ProtectedRoute role="DRIVER"><DriverSettlement /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
