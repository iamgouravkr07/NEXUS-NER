import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
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
    <AuthProvider>
      <LanguageProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Control Tower Dashboard Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Home />} />
              <Route path="/control" element={<Home />} />
              <Route path="/incidents" element={<Incidents />} />
              <Route path="/vehicles" element={<Vehicles />} />
              <Route path="/routes" element={<RoutePlanner />} />
              <Route path="/road-risk" element={<RoadRisk />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/field-report" element={<FieldReport />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;