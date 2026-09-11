// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import RootLayout from '@/layouts/RootLayout';
import SimulationDashboard from '@/pages/SimulationDashboard';
import AuthPage from '@/pages/AuthPage';
import { ThemeProvider } from './components/ThemeProvider';

// Simple protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = !!localStorage.getItem('token');
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="drdo-theme">
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<Navigate to="/auth" replace />} />
          <Route path="/signup" element={<Navigate to="/auth" replace />} />

          {/* Protected Routes */}
          <Route element={<RootLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <SimulationDashboard />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}