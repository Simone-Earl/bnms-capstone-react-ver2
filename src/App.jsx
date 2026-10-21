// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import ChildrenProfiles from './pages/ChildrenProfiles';

// Route Guard: Prevents access to URLs without logging in
const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  return children;
};

// Route Guard: Prevents logged-in users from seeing the login page
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
          
          <Route path="/weigh-in" element={<ProtectedRoute><div className="p-8">Weigh-in Page</div></ProtectedRoute>} />
          <Route path="/growth-charts" element={<ProtectedRoute><div className="p-8">Growth Charts Page</div></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><div className="p-8">Referrals Page</div></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><div className="p-8">Reports Page</div></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;