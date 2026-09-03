import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";

import Home from "./pages/Home";
import Incidents from "./pages/Incidents";
import Vehicles from "./pages/Vehicles";
import RoutePlanner from "./pages/RoutePlanner";
import RoadRisk from "./pages/RoadRisk";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import FieldReport from "./pages/FieldReport";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/control" element={<Home />} />
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/routes" element={<RoutePlanner />} />
          <Route path="/road-risk" element={<RoadRisk />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/field-report" element={<FieldReport />} />

          <Route path="/" element={<Navigate to="/control" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;