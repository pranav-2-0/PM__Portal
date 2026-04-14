import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import { DataUpload } from "./pages/DataUpload";
import People from "./pages/People";
import PMManagement from "./pages/PMManagement";
import Alignment from "./pages/Alignment";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

import Layout from "./layouts/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/upload"
            element={
              <ProtectedRoute requiredRoles={["Admin", "Super Admin"]}>
                <Layout>
                  <DataUpload />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/people"
            element={
              <ProtectedRoute>
                <Layout>
                  <People />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <Layout>
                  <People defaultTab="employees" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/bench"
            element={
              <ProtectedRoute>
                <Layout>
                  <People defaultTab="bench" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/new-joiners"
            element={
              <ProtectedRoute>
                <Layout>
                  <People defaultTab="new-joiners" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/separations"
            element={
              <ProtectedRoute>
                <Layout>
                  <People defaultTab="separations" />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/pm-management"
            element={
              <ProtectedRoute requiredRoles={['Admin', 'Super Admin', 'Employee']}>
                <Layout>
                  <PMManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alignment"
            element={
              <ProtectedRoute>
                <Layout>
                  <Alignment />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRoles={['Admin', 'Super Admin']}>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;