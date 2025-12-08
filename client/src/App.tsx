import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Resorts from './pages/Resorts';
import Assets from './pages/Assets';
import Expenses from './pages/Expenses';
import Maintenance from './pages/Maintenance';
import Revenue from './pages/Revenue';
import Spareparts from './pages/Spareparts';
import Notifications from './pages/Notifications';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/resorts"
        element={
          <ProtectedRoute>
            <Resorts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assets"
        element={
          <ProtectedRoute>
            <Assets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/maintenance"
        element={
          <ProtectedRoute>
            <Maintenance />
          </ProtectedRoute>
        }
      />
      <Route
        path="/revenue"
        element={
          <ProtectedRoute>
            <Revenue />
          </ProtectedRoute>
        }
      />
      <Route
        path="/spareparts"
        element={
          <ProtectedRoute>
            <Spareparts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
