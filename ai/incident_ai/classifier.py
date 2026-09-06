import re


INCIDENT_KEYWORDS = {

    "LANDSLIDE": [
        "landslide",
        "mudslide",
        "mud slide",
        "rockfall",
        "rock fall",
        "rocks fell",
        "rocks falling",
        "rocks on road",
        "large rocks",
        "mud and rocks",
        "mud and debris",
        "debris flow",
        "landslide debris",
        "slope collapse",
        "hill collapse",
        "earth collapse",
        "soil collapse",
        "slope failure",
    ],

    "FLOOD": [
        "flood",
        "flooded",
        "flooding",
        "waterlogging",
        "water logging",
        "road submerged",
        "road underwater",
        "water on road",
        "heavy water",
    ],

    "ROAD_BLOCKAGE": [
        "blocked road",
        "road blocked",
        "road blockage",
        "road closed",
        "debris blocking",
        "obstruction",
        "tree blocking",
        "fallen tree",
    ],

    "ACCIDENT": [
        "accident",
        "collision",
        "crash",
        "vehicle crash",
        "road accident",
        "truck accident",
        "car accident",
        "bike accident",
    ],

    "FIRE": [
        "fire",
        "burning",
        "smoke",
        "forest fire",
        "vehicle fire",
        "road fire",
    ],

    "ROAD_DAMAGE": [
        "pothole",
        "potholes",
        "road damage",
        "damaged road",
        "road broken",
        "broken road",
        "crack in road",
        "road crack",
        "minor crack",
        "large crack",
        "road cracks",
        "surface damage",
    ],
}


def classify_incident(description: str) -> dict:
    """
    Classify a road incident from text.

    This is a rule-based baseline classifier.
    """

    if not description or not description.strip():
        return {
            "incident_type": "UNKNOWN",
            "confidence": 0.0,
        }

    text = re.sub(
        r"\s+",
        " ",
        description.lower().strip(),
    )

    scores = {}

    for incident_type, keywords in INCIDENT_KEYWORDS.items():

        score = 0

        for keyword in keywords:

            if keyword in text:
                score += 1

        scores[incident_type] = score

    best_type = max(
        scores,
        key=scores.get,
    )

    best_score = scores[best_type]

    # No keyword matched
    if best_score == 0:

        return {
            "incident_type": "UNKNOWN",
            "confidence": 0.30,
        }

    # Keyword evidence confidence.
    confidence = min(
        0.60 + (best_score * 0.10),
        0.95,
    )

    return {
        "incident_type": best_type,
        "confidence": round(
            confidence,
            2,
        ),
    }