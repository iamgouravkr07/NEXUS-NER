import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

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
  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}

export default App;