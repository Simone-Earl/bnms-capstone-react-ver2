// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ChildrenProfiles from './pages/ChildrenProfiles';
import UserProfile from './pages/UserProfile';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel'; // 🔥 NEW IMPORT
import WeighInEntry from './pages/WeighInEntry';
import GrowthCharts from './pages/GrowthCharts';
import Referrals from './pages/Referrals';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (currentUser) return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
          
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profiles" element={<ProtectedRoute><ChildrenProfiles /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          
          {/* 🔥 NEW ADMIN ROUTE */}
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          
          <Route path="/weigh-in" element={<ProtectedRoute><WeighInEntry /></ProtectedRoute>} />
          <Route path="/growth-charts" element={<ProtectedRoute><GrowthCharts /></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><div className="p-8">Reports Page</div></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;