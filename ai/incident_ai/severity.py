SEVERITY_KEYWORDS = {

    "HIGH": [
        "large",
        "major",
        "massive",
        "severe",
        "dangerous",
        "completely blocked",
        "fully blocked",
        "road completely blocked",
        "multiple vehicles",
        "many vehicles",
        "injured",
        "injuries",
        "casualties",
        "trapped",
        "bridge collapsed",
        "road collapsed",
    ],

    "MEDIUM": [
        "moderate",
        "partially blocked",
        "partially damaged",
        "partial blockage",
        "rocks on road",
        "mud on road",
        "debris on road",
        "traffic affected",
        "traffic slow",
    ],

    "LOW": [
        "small",
        "minor",
        "slight",
        "small amount",
        "minor damage",
        "small crack",
    ],
}


def estimate_severity(
    description: str,
    incident_type: str,
) -> dict:
    """
    Estimate incident severity from text.

    This is a rule-based baseline and should
    later be replaced or enhanced by a trained
    model / LLM / vision model.
    """

    text = description.lower().strip()

    scores = {
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
    }

    for severity, keywords in SEVERITY_KEYWORDS.items():

        for keyword in keywords:

            if keyword in text:
                scores[severity] += 1

    # Default severity depends on incident type.
    if max(scores.values()) == 0:

        if incident_type in {
            "LANDSLIDE",
            "FLOOD",
            "ACCIDENT",
        }:
            severity = "MEDIUM"
        else:
            severity = "LOW"

    else:
        severity = max(
            scores,
            key=scores.get,
        )

    # Severity confidence is evidence confidence,
    # not a statistical probability.
    matched_score = scores[severity]

    confidence = min(
        0.60 + (matched_score * 0.10),
        0.95,
    )

    return {
        "severity": severity,
        "confidence": round(confidence, 2),
    }