# NEXUS-NER: AI-Powered Logistics & Accessibility Intelligence Platform
### North Eastern Region (NER) — Smart India Hackathon (SIH) 2026
**Problem Statement ID:** 26002 | **Domain:** Smart Logistics, Disaster Management & Infrastructure Resilience

---

## 1. Executive Summary & Problem Context

The North Eastern Region (NER) of India spans eight states characterized by rugged topography, seismically active terrain, extreme seasonal monsoon precipitation, and critical transport bottlenecks (e.g., the Siliguri Corridor). Landslides, flash floods, road damage, and sudden weather shifts routinely sever arterial national highways, stranding essential convoys, medical relief, and daily civil logistics.

**NEXUS-NER** is an operational resilience platform engineered specifically for the challenges of the North Eastern Region. It provides:
1. **Authoritative Deterministic Routing & Risk Core:** Real-time corridor monitoring, GeoJSON spatial risk calculation, obstacle clearance detection, and dynamic multi-criteria rerouting with PostGIS spatial indexing.
2. **Advisory Predictive Machine Learning:** A frozen, high-recall Random Forest model (`disruption_rf_v1.joblib`, 730-day temporal feature engine) that assesses disruption risk before blockages occur, accompanied by live SHAP TreeExplainer feature attributions for human-in-the-loop decision-making.
3. **Live & Offline-Resilient Weather Subsystem:** Integration with the Open-Meteo precipitation/wind API with sub-hourly localized caching and deterministic offline fallbacks.
4. **Zero-Connectivity Field Synchronization:** Conflict-free batch synchronization allowing field officers and drivers to log GPS breadcrumbs and incident reports in offline areas, synchronizing automatically upon signal recovery.
5. **Role-Based Access Control (RBAC):** Military-grade cryptographic access control (Argon2id password hashing, signed JWT tokens, strict privilege separation across four operational roles).

---

## 2. Architecture & Operational Flow

```
                                    +----------------------------------------+
                                    |     NEXUS-NER Web & Mobile Client      |
                                    | (React 18 + TS + Tailwind + Capacitor) |
                                    +-------------------+--------------------+
                                                        |
                                            HTTPS / WSS / JWT
                                                        |
                                                        v
+----------------------------------------------------------------------------------------------------+
|                                    NEXUS-NER Backend (FastAPI)                                     |
|                                                                                                    |
|  +---------------------------+   +-------------------------------+   +--------------------------+  |
|  |   Deterministic Core      |   |    Predictive ML Engine       |   |    Weather Subsystem     |  |
|  | - Haversine proximity     |   | - Random Forest (200 trees)   |   | - Open-Meteo live API    |  |
|  | - Corridor risk scoring   |   | - Operational threshold 0.55  |   | - 15-min in-memory cache |  |
|  | - Dynamic rerouting (A*)  |   | - SHAP additive explanations  |   | - Offline mock fallback  |  |
|  +-------------+-------------+   +---------------+---------------+   +------------+-------------+  |
|                |                                 |                                |                |
|                +---------------------------------+--------------------------------+                |
|                                                  |                                                 |
|                                                  v                                                 |
|                              +---------------------------------------+                             |
|                              |      Unified Risk & Alert Engine      |                             |
|                              | - Authoritative: Deterministic Ground |                             |
|                              | - Advisory: Predictive Disruption ML  |                             |
|                              | - Auto-alert generation & deduplication|                            |
|                              +-------------------+-------------------+                             |
+--------------------------------------------------|-------------------------------------------------+
                                                   |
                                    SQLAlchemy 2.0 / GeoAlchemy2
                                                   |
                                                   v
                               +---------------------------------------+
                               |     PostgreSQL 15 + PostGIS 3.3       |
                               |  Trips, Vehicles, Incidents, Roads,   |
                               |  Alerts, Weather, Audit Sync Events   |
                               +---------------------------------------+
```

### Core Design Philosophy: Deterministic Authority + Advisory ML
- **Deterministic Core is Authoritative:** Physical road closures, verified field incident reports, and geometric obstacles strictly dictate corridor blockage, detour calculations, and critical risk flags.
- **Predictive ML is Advisory:** Machine learning models predict the *probability of future disruption* from temporal, meteorological, and infrastructure signals. Predictions guide preventive rerouting and trigger advisory alerts, but never unilaterally override verified ground facts.

---

## 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.11+), Starlette, Uvicorn, Pydantic v2 |
| **Database & GIS** | PostgreSQL 15+, PostGIS, SQLAlchemy 2.0, GeoAlchemy2, psycopg2 |
| **Machine Learning** | Scikit-learn, Random Forest (200 estimators), SHAP (TreeExplainer), Joblib, NumPy, Pandas |
| **Authentication** | Passlib (Argon2id hashing), PyJWT (HS256 tokens), OAuth2 Bearer |
| **Frontend Web** | React 18, TypeScript, Vite, TailwindCSS, Recharts, Lucide Icons, Leaflet |
| **Mobile Runtime** | Capacitor 8 (Android target), Offline SQLite, Geolocation, Network Detection |
| **External APIs** | Open-Meteo Weather API (non-commercial tier compliant, offline fallback built-in) |

---

## 4. Role-Based Access Control (RBAC) Matrix

NEXUS-NER enforces four distinct operational personas:

| Capability / Endpoint | `ADMIN` | `CONTROL_OPERATOR` | `FIELD_OFFICER` | `DRIVER` |
| :--- | :---: | :---: | :---: | :---: |
| View Control Tower & Analytics (`GET /analytics/summary`) | Yes | Yes | Yes | Yes |
| View Corridors & Road Risk (`GET /risk/`, `GET /roads/`) | Yes | Yes | Yes | Yes |
| Trigger Dynamic Reroute (`POST /trips/{id}/reroute`) | Yes | Yes | No | No |
| Update Road Status (`PATCH /roads/{id}/status`) | Yes | Yes | No | No |
| Verify / Reject Incidents (`PATCH /incidents/{id}/status`) | Yes | Yes | No | No |
| Report New Incident (`POST /incidents/`) | Yes | Yes | Yes | No |
| Submit Vehicle GPS Telemetry (`POST /vehicles/{id}/location`) | Yes | Yes | Yes | Yes (Assigned) |
| Acknowledge / Resolve Alerts (`PATCH /alerts/{id}/status`) | Yes | Yes | No | No |
| Manage User Accounts (`POST /auth/users`) | Yes | No | No | No |

---

## 5. Local Setup & Quickstart Guide

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 18.x or higher, npm 9.x+
- **Docker & Docker Compose:** Required for PostGIS database (optional for offline mock mode)
- **Git:** 2.30+

### Step 1: Clone Repository & Setup Environment
```bash
git clone https://github.com/iamgouravkr07/NEXUS-NER.git
cd NEXUS-NER

# Create environment file from template
cp .env.example .env
```

### Step 2: Launch PostGIS Database (Docker)
```bash
docker-compose up -d db
```
*Note: If running PostgreSQL locally without Docker, ensure PostGIS extension is enabled (`CREATE EXTENSION postgis;`) on database `nexus_ner` listening on port `5433` (or update `DATABASE_URL` in `.env`).*

### Step 3: Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Seed initial database entities (vehicles, corridors, demonstration users)
python scripts/seed_vehicles.py
python scripts/seed_trips.py

# Launch FastAPI development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
The interactive Swagger API documentation will be available at: `http://localhost:8000/docs`.

### Step 4: Frontend Setup
```bash
cd ../frontend

# Install frontend dependencies
npm install

# Start Vite development server
npm run dev
```
The web dashboard will be available at: `http://localhost:5173`.

---

## 6. Demonstration Credentials

Default bootstrap accounts created automatically on first startup:

| Role | Username | Password |
| :--- | :--- | :--- |
| **System Administrator** | `admin` | `Admin@Nexus2026` |
| **Control Room Operator** | `operator` | `Operator@Nexus2026` |
| **Field Inspection Officer** | `field_officer` | `Field@Nexus2026` |
| **Convoy Driver** | `driver` | `Driver@Nexus2026` |

---

## 7. Key API Reference

### Operational Analytics
- `GET /analytics/summary?days=7`: Live aggregated operational metrics (fleet utilization, route safety, road accessibility, 7-day incident trend, delivery times, and regional performance across NER states).

### Machine Learning & Predictive Risk
- `POST /ml/predict-disruption`: Execute real-time Random Forest inference with SHAP feature attributions on corridor parameters.
- `GET /ml/model-info`: Inspect active model metadata, SHA-256 fingerprint, operational threshold (`0.55`), and dataset provenance.
- `GET /ml/metadata`: Feature schema, bounds, and training evaluation metrics (Recall: `0.902`, Precision: `0.872`, F1: `0.887`).
- `POST /ml/risk-assessment`: Corridor predictive risk combined with real-time weather and deterministic ground conditions.

### Dynamic Routing & Fleet Telemetry
- `POST /routes/calculate`: Calculate multi-criteria obstacle-avoidance route between NER coordinates.
- `POST /trips/{id}/reroute`: Compute and persist emergency dynamic reroute avoiding verified blockages.
- `PATCH /vehicles/{id}/location`: Submit live GPS coordinates, speed, and heading.

### Incident Management & Road Control
- `GET /incidents/`: List all reported and verified incidents.
- `POST /incidents/`: Submit new field incident with GeoJSON location.
- `PATCH /incidents/{id}/status`: Verify or reject incident (`ADMIN` or `CONTROL_OPERATOR`). Verifying automatically escalates road risk to 95% and marks the corridor `blocked`.
- `PATCH /roads/{id}/status`: Manually set corridor status (`open`, `restricted`, `under_repair`, `blocked`).

---

## 8. Verification & Test Execution

NEXUS-NER includes a comprehensive automated test suite covering unit tests, integration tests, ML fidelity, RBAC, weather, and mobile sync:

```bash
# 1. Run Backend Unit & Integration Tests (185 test cases)
python -m unittest discover -s tests -p "test_*.py"

# 2. Run Analytics Endpoint Unit Tests
python -m unittest tests.test_analytics

# 3. Run Frontend ML & Integration Verification Checks
cd frontend
npx tsx src/tests/ml_verification.ts

# 4. Execute Frontend Production Build
npm run build

# 5. Sync Capacitor Android Mobile Assets
npx cap sync android
```

---

## 9. Mobile Deployment (Capacitor Android)

NEXUS-NER includes a native Android wrapper supporting offline operation and hardware geolocation:

```bash
cd frontend

# Build production assets
npm run build

# Synchronize with Android platform
npx cap sync android

# Open project in Android Studio
npx cap open android
```

---

## 10. Security & Production Deployment Guidelines

1. **CORS Configuration:** In production, specify exact trusted frontend domains in `CORS_ORIGINS` (never use wildcard `*` when `allow_credentials=True`).
2. **Secret Keys:** Generate a cryptographically secure 256-bit key for `JWT_SECRET_KEY` using `openssl rand -hex 32`.
3. **Database Credentials:** Supply `DATABASE_URL` via managed cloud secrets (AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault). Never check passwords into Git.
4. **Offline Resilience:** The application is architected to operate smoothly during total internet blackouts; local SQLite storage buffers telemetric events until a cellular/satellite link is re-established.

---

## 11. SIH 2026 Submission Deliverables

- **Repository:** NEXUS-NER
- **Branch:** `pre-repository-cleanup`
- **Verified Commit:** `0786c753f1a2224c234d7c1aeee87720ad20a4a6`
- **ML Model Fingerprint (SHA-256):** `E2C021F4D11B67833419F00531DF0DC8532B2F96CC6717FB7D9FF33AF3C45C78`
- **Dataset Provenance:** 730-day temporal feature matrix (`dataset_prototype-v1.0.csv`)
