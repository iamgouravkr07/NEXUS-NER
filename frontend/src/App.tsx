import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import { syncWorker } from "./offline/syncWorker";
import { networkService } from "./services/network";

import Home from "./pages/Home";
import Incidents from "./pages/Incidents";
import Vehicles from "./pages/Vehicles";
import RoutePlanner from "./pages/RoutePlanner";
import RoadRisk from "./pages/RoadRisk";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import FieldReport from "./pages/FieldReport";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import PublicReport from "./pages/PublicReport";
import MyReports from "./pages/MyReports";

function App() {
  useEffect(() => {
    // Initialize network status listener
    networkService.init();

    // Start background sync polling every 30s
    syncWorker.startPeriodicSync(30000);

    return () => {
      syncWorker.stopPeriodicSync();
    };
  }, []);
  return (
    <ThemeProvider>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<Login />} />

            {/* Access Denied Route */}
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Main Application Layout */}
            <Route element={<Layout />}>
              {/* Public Routes accessible without login */}
              <Route path="/" element={<Home />} />
              <Route path="/road-risk" element={<RoadRisk />} />

              {/* Public Citizen Reporting Routes (Protected for authenticated PUBLIC role) */}
              <Route
                path="/report-problem"
                element={
                  <ProtectedRoute allowedRoles={["PUBLIC"]}>
                    <PublicReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/public-report"
                element={
                  <ProtectedRoute allowedRoles={["PUBLIC"]}>
                    <PublicReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-reports"
                element={
                  <ProtectedRoute allowedRoles={["PUBLIC"]}>
                    <MyReports />
                  </ProtectedRoute>
                }
              />

              {/* Control Tower & Driver Mission (Operational Route) */}
              <Route
                path="/control"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR", "DRIVER"]}>
                    <Home />
                  </ProtectedRoute>
                }
              />

              {/* Operational Incident Management */}
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER"]}>
                    <Incidents />
                  </ProtectedRoute>
                }
              />

              {/* Fleet Vehicles */}
              <Route
                path="/vehicles"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER"]}>
                    <Vehicles />
                  </ProtectedRoute>
                }
              />

              {/* Route Planning & P0 Deep-Link */}
              <Route
                path="/routes"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR"]}>
                    <RoutePlanner />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/route-planner"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR"]}>
                    <RoutePlanner />
                  </ProtectedRoute>
                }
              />

              {/* Alerts */}
              <Route
                path="/alerts"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER", "DRIVER"]}>
                    <Alerts />
                  </ProtectedRoute>
                }
              />

              {/* Analytics */}
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR"]}>
                    <Analytics />
                  </ProtectedRoute>
                }
              />

              {/* Field Report */}
              <Route
                path="/field-report"
                element={
                  <ProtectedRoute allowedRoles={["ADMIN", "CONTROL_OPERATOR", "FIELD_OFFICER"]}>
                    <FieldReport />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  </ThemeProvider>
);
}

export default App;