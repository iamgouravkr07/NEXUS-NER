import json
import logging
import re
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple

import requests

from app import config
from app.schemas.nlp_incident import (
    IncidentTypeEnum,
    SeverityEnum,
    ExtractionStatusEnum,
    IncidentExtractionData,
    IncidentExtractionResponse,
)

logger = logging.getLogger("nexus_ner.nlp")


class ExtractionError(Exception):
    """Raised when an NLP extraction provider fails to parse or contact upstream service."""
    pass


# ---------------------------------------------------------------------------
# Abstract Provider Interface
# ---------------------------------------------------------------------------

class BaseExtractionProvider(ABC):
    """Abstract interface for AI/NLP incident extraction providers."""

    @abstractmethod
    def extract(self, text: str) -> IncidentExtractionData:
        """Parse natural language report into structured candidate incident data."""
        pass

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider ('gemini' or 'fallback')."""
        pass


# ---------------------------------------------------------------------------
# Deterministic Fallback Provider (NER Heuristic & Regex Engine)
# ---------------------------------------------------------------------------

class DeterministicFallbackProvider(BaseExtractionProvider):
    """
    Offline deterministic extraction engine tailored to North Eastern Region geography.
    Provides reliable, zero-dependency extraction for CI, tests, and air-gapped field deployments.
    """

    @property
    def provider_name(self) -> str:
        return "fallback"

    # Known North Eastern Region Corridors & Landmarks
    CORRIDORS = [
        "NH-415", "NH-10", "NH-15", "NH-27", "NH-2", "NH-6", "NH-8", "NH-29",
        "NH-102", "NH-715", "NH-52", "NH-37", "NH-39", "NH-44", "NH-54"
    ]

    NER_TOWNS = [
        "Guwahati", "Tezpur", "Itanagar", "Shillong", "Gangtok", "Dimapur",
        "Kohima", "Imphal", "Agartala", "Aizawl", "Silchar", "Jorhat",
        "Dibrugarh", "Tawang", "Dhemaji", "Nagaon", "Golaghat", "Banderdewa",
        "Kaziranga", "Diphu", "Pasighat", "Ziro", "Mokokchung", "Churachandpur"
    ]

    # Keyword patterns for classification
    TYPE_PATTERNS = [
        (IncidentTypeEnum.LANDSLIDE, re.compile(r"\b(landslide|mudslide|rockfall|rock\s*slide|debris\s*fall|slope\s*failure|earthslip)\b", re.I)),
        (IncidentTypeEnum.FLOOD, re.compile(r"\b(flood|flooding|flash\s*flood|waterlogging|submerged|inundat|overflowing\s*river)\b", re.I)),
        (IncidentTypeEnum.HEAVY_RAIN, re.compile(r"\b(heavy\s*rain|downpour|torrential|cloudburst|deluge|incessant\s*rain)\b", re.I)),
        (IncidentTypeEnum.BRIDGE_DAMAGE, re.compile(r"\b(bridge\s*damage|bridge\s*collapse|broken\s*bridge|culvert\s*damage|culvert\s*washed)\b", re.I)),
        (IncidentTypeEnum.ROAD_DAMAGE, re.compile(r"\b(road\s*damage|crack|sinkhole|cave\s*in|eroded\s*road|asphalt|damaged\s*surface)\b", re.I)),
        (IncidentTypeEnum.ACCIDENT, re.compile(r"\b(accident|collision|crash|overturned|head\s*on|derailed|skidded)\b", re.I)),
        (IncidentTypeEnum.TRAFFIC_CONGESTION, re.compile(r"\b(traffic\s*jam|congestion|gridlock|snarl|stranded\s*vehicles|trucks\s*stuck|long\s*queue)\b", re.I)),
        (IncidentTypeEnum.BLOCKAGE, re.compile(r"\b(block|blocked|blockage|impassable|cut\s*off|closed\s*road|traffic\s*stopped|barricaded)\b", re.I)),
    ]

    SEVERITY_PATTERNS = [
        (SeverityEnum.CRITICAL, re.compile(r"\b(critical|catastrophic|severe|massive|total\s*block|completely\s*blocked|washed\s*away|life\s*threat|emergency|casualties|destroyed)\b", re.I)),
        (SeverityEnum.HIGH, re.compile(r"\b(high|major|serious|heavy|closed|unable\s*to\s*pass|dangerous|heavy\s*traffic|stranded|extensive)\b", re.I)),
        (SeverityEnum.MEDIUM, re.compile(r"\b(medium|moderate|partial|partially\s*blocked|slow\s*traffic|single\s*lane|caution)\b", re.I)),
        (SeverityEnum.LOW, re.compile(r"\b(low|minor|slight|minimal|small|clearing|manageable)\b", re.I)),
    ]

    # Coordinate extraction regex: e.g. "lat: 26.15, lon: 91.75" or "(26.15, 91.75)"
    COORD_PATTERN = re.compile(
        r"(?:lat(?:itude)?[:\s=]+)?([2-3]\d\.\d+)[,\s]+(?:lon(?:gitude)?[:\s=]+)?([8-9]\d\.\d+)",
        re.I
    )

    def extract(self, text: str) -> IncidentExtractionData:
        cleaned_text = " ".join(text.strip().split())
        if not cleaned_text:
            raise ExtractionError("Report text is empty or blank.")

        # 1. Incident Type
        detected_type = IncidentTypeEnum.OTHER
        for inc_type, pat in self.TYPE_PATTERNS:
            if pat.search(cleaned_text):
                detected_type = inc_type
                break

        # 2. Severity
        detected_severity = None
        for sev, pat in self.SEVERITY_PATTERNS:
            if pat.search(cleaned_text):
                detected_severity = sev
                break

        if not detected_severity:
            # Conservative defaults based on incident type
            if detected_type in (IncidentTypeEnum.LANDSLIDE, IncidentTypeEnum.BRIDGE_DAMAGE, IncidentTypeEnum.FLOOD):
                detected_severity = SeverityEnum.HIGH
            elif detected_type in (IncidentTypeEnum.ROAD_DAMAGE, IncidentTypeEnum.ACCIDENT, IncidentTypeEnum.BLOCKAGE):
                detected_severity = SeverityEnum.MEDIUM
            else:
                detected_severity = SeverityEnum.MEDIUM

        # 3. Road / Corridor detection
        detected_corridor = None
        for corr in self.CORRIDORS:
            corr_pattern = re.compile(rf"\b{re.escape(corr)}\b", re.I)
            if corr_pattern.search(cleaned_text):
                detected_corridor = corr.upper()
                break

        # 4. Location Text Detection
        detected_locations = []
        for town in self.NER_TOWNS:
            town_pattern = re.compile(rf"\b{re.escape(town)}\b", re.I)
            if town_pattern.search(cleaned_text):
                detected_locations.append(town)

        location_text = None
        if detected_corridor and detected_locations:
            location_text = f"{detected_corridor} near {', '.join(detected_locations)}"
        elif detected_locations:
            location_text = f"Near {', '.join(detected_locations)}"
        elif detected_corridor:
            location_text = detected_corridor
        else:
            # Extract prepositional phrase e.g. "near the road between Guwahati and Tezpur"
            loc_match = re.search(r"\b(?:near|between|at|around|close to)\s+([^.,;]+)", cleaned_text, re.I)
            if loc_match:
                location_text = loc_match.group(0).strip()

        # 5. Coordinate Extraction (conservative: null unless explicitly in text)
        latitude: Optional[float] = None
        longitude: Optional[float] = None
        coord_match = self.COORD_PATTERN.search(cleaned_text)
        if coord_match:
            try:
                cand_lat = float(coord_match.group(1))
                cand_lon = float(coord_match.group(2))
                # Validate bounds [20.0, 30.0], [88.0, 98.0]
                if 20.0 <= cand_lat <= 30.0 and 88.0 <= cand_lon <= 98.0:
                    latitude = round(cand_lat, 6)
                    longitude = round(cand_lon, 6)
            except (ValueError, TypeError):
                pass

        # 6. Confidence Scoring Heuristic
        confidence = 0.50
        if detected_type != IncidentTypeEnum.OTHER:
            confidence += 0.20
        if detected_corridor or detected_locations:
            confidence += 0.15
        if latitude is not None and longitude is not None:
            confidence += 0.10
        if len(cleaned_text.split()) >= 8:
            confidence += 0.05
        confidence = min(0.92, max(0.40, round(confidence, 2)))

        # 7. Status & Entities
        status = ExtractionStatusEnum.SUCCESS
        if detected_type == IncidentTypeEnum.OTHER and not location_text:
            status = ExtractionStatusEnum.PARTIAL
            confidence = min(confidence, 0.45)

        entities: Dict[str, Any] = {
            "keywords_detected": [m.group(0) for _, pat in self.TYPE_PATTERNS for m in [pat.search(cleaned_text)] if m],
            "corridors_detected": [detected_corridor] if detected_corridor else [],
            "locations_detected": detected_locations,
        }

        return IncidentExtractionData(
            incident_type=detected_type,
            severity=detected_severity,
            description=cleaned_text,
            location_text=location_text,
            latitude=latitude,
            longitude=longitude,
            road_corridor=detected_corridor,
            confidence=confidence,
            reported_time=datetime.now(timezone.utc),
            source="nlp_fallback_rule_engine",
            extracted_entities=entities,
            extraction_status=status,
        )


# ---------------------------------------------------------------------------
# Gemini AI Provider (REST API via Google Generative Language)
# ---------------------------------------------------------------------------

class GeminiExtractionProvider(BaseExtractionProvider):
    """
    Google Gemini extraction provider.
    Communicates via Google Generative Language REST API with structured JSON schema.
    """

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash", timeout_seconds: int = 12):
        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds

    @property
    def provider_name(self) -> str:
        return "gemini"

    def extract(self, text: str) -> IncidentExtractionData:
        if not self.api_key:
            raise ExtractionError("Gemini API key is not configured.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"

        system_instruction = (
            "You are an expert emergency transport intelligence assistant for the North Eastern Region of India (NEXUS-NER, SIH 2026). "
            "Your task is to analyze natural language field reports or citizen reports and extract structured incident data. "
            "You MUST return valid JSON adhering strictly to the schema provided.\n"
            "Rules:\n"
            "- incident_type must be one of: 'landslide', 'flood', 'heavy_rain', 'road_damage', 'bridge_damage', 'traffic_congestion', 'accident', 'blockage', 'other'.\n"
            "- severity must be one of: 'low', 'medium', 'high', 'critical'.\n"
            "- Do NOT fabricate coordinates. If coordinates are not explicitly present in text, set latitude and longitude to null.\n"
            "- If latitude and longitude are explicitly provided, ensure they are within North Eastern Region bounds: latitude [20.0, 30.0], longitude [88.0, 98.0]. Otherwise set to null.\n"
            "- road_corridor: highway code like 'NH-15', 'NH-415', or null if not referenced.\n"
            "- confidence: a float between 0.0 and 1.0 reflecting extraction certainty.\n"
            "- extracted_entities: dictionary with detected entities (hazards, casualties, blockage status, vehicles).\n"
        )

        prompt = f"Extract structured incident information from the following report:\n\n\"{text}\""

        payload = {
            "contents": [
                {
                    "parts": [{"text": prompt}]
                }
            ],
            "system_instruction": {
                "parts": [{"text": system_instruction}]
            },
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            }
        }

        try:
            headers = {"Content-Type": "application/json"}
            resp = requests.post(url, json=payload, headers=headers, timeout=self.timeout_seconds)
            if resp.status_code != 200:
                raise ExtractionError(f"Gemini API returned status code {resp.status_code}: {resp.text}")

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                raise ExtractionError("Gemini returned empty candidate response.")

            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts or "text" not in parts[0]:
                raise ExtractionError("Gemini candidate content missing text part.")

            raw_json_str = parts[0]["text"].strip()
            parsed = json.loads(raw_json_str)

            # Validate coordinate bounds conservatively
            lat = parsed.get("latitude")
            lon = parsed.get("longitude")
            if lat is not None and lon is not None:
                try:
                    lat_f = float(lat)
                    lon_f = float(lon)
                    if not (20.0 <= lat_f <= 30.0 and 88.0 <= lon_f <= 98.0):
                        lat = None
                        lon = None
                    else:
                        lat = round(lat_f, 6)
                        lon = round(lon_f, 6)
                except (ValueError, TypeError):
                    lat = None
                    lon = None
            else:
                lat = None
                lon = None

            # Validate Enum values safely
            raw_type = str(parsed.get("incident_type", "other")).lower()
            try:
                inc_type = IncidentTypeEnum(raw_type)
            except ValueError:
                inc_type = IncidentTypeEnum.OTHER

            raw_sev = str(parsed.get("severity", "medium")).lower()
            try:
                sev = SeverityEnum(raw_sev)
            except ValueError:
                sev = SeverityEnum.MEDIUM

            conf = float(parsed.get("confidence", 0.85))
            conf = max(0.0, min(1.0, conf))

            return IncidentExtractionData(
                incident_type=inc_type,
                severity=sev,
                description=str(parsed.get("description", text)).strip(),
                location_text=parsed.get("location_text"),
                latitude=lat,
                longitude=lon,
                road_corridor=parsed.get("road_corridor"),
                confidence=conf,
                reported_time=datetime.now(timezone.utc),
                source="gemini_nlp_extraction",
                extracted_entities=parsed.get("extracted_entities", {}),
                extraction_status=ExtractionStatusEnum.SUCCESS,
            )

        except (requests.RequestException, json.JSONDecodeError, KeyError, ValueError) as err:
            logger.warning("Gemini extraction call failed: %s", err)
            raise ExtractionError(f"Gemini extraction failed: {err}") from err


# ---------------------------------------------------------------------------
# Incident Extraction Service Facade
# ---------------------------------------------------------------------------

class IncidentExtractionService:
    """
    Main extraction service facade.
    Dispatches extraction requests to active provider, with automatic, graceful degradation
    to DeterministicFallbackProvider when Gemini is unavailable, unconfigured, or failing.
    """

    def __init__(self, provider: Optional[BaseExtractionProvider] = None):
        self.fallback_provider = DeterministicFallbackProvider()
        if provider:
            self._provider = provider
        elif config.GEMINI_API_KEY and config.NLP_PROVIDER == "gemini":
            self._provider = GeminiExtractionProvider(
                api_key=config.GEMINI_API_KEY,
                model=config.GEMINI_MODEL,
                timeout_seconds=config.NLP_REQUEST_TIMEOUT_SECONDS,
            )
        else:
            self._provider = self.fallback_provider

    @property
    def provider(self) -> BaseExtractionProvider:
        return self._provider

    def set_provider(self, provider: BaseExtractionProvider) -> None:
        """Dynamically set the extraction provider (useful for tests and simulation)."""
        self._provider = provider

    def extract_incident(self, text: str) -> IncidentExtractionResponse:
        """
        Execute incident extraction with strict fallback protection.
        Never throws unhandled external exceptions; returns valid extraction response.
        """
        cleaned = text.strip() if text else ""
        if len(cleaned) < 3:
            raise ExtractionError("Report text must contain at least 3 characters.")

        active_provider = self._provider

        # Attempt extraction with active provider
        if active_provider.provider_name == "gemini":
            try:
                extraction = active_provider.extract(cleaned)
                return IncidentExtractionResponse(
                    success=True,
                    provider="gemini",
                    extraction=extraction,
                )
            except Exception as exc:
                logger.warning(
                    "Gemini AI provider encountered an error: %s. Safely falling back to deterministic engine.",
                    exc
                )
                # Gracefully degrade to deterministic fallback
                fallback_extraction = self.fallback_provider.extract(cleaned)
                return IncidentExtractionResponse(
                    success=True,
                    provider="fallback",
                    extraction=fallback_extraction,
                    warning=f"Gemini AI provider unavailable ({exc}); deterministic rule engine applied.",
                )

        # Fallback provider active
        extraction = self.fallback_provider.extract(cleaned)
        return IncidentExtractionResponse(
            success=True,
            provider="fallback",
            extraction=extraction,
        )


# Global singleton instance
_nlp_service_instance: Optional[IncidentExtractionService] = None


def get_nlp_extraction_service() -> IncidentExtractionService:
    """Retrieve the global IncidentExtractionService instance."""
    global _nlp_service_instance
    if _nlp_service_instance is None:
        _nlp_service_instance = IncidentExtractionService()
    return _nlp_service_instance


def set_nlp_extraction_provider(provider: BaseExtractionProvider) -> None:
    """Override the extraction provider on the global service instance."""
    service = get_nlp_extraction_service()
    service.set_provider(provider)
