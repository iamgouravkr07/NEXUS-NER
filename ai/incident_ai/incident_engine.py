from classifier import classify_incident
from severity import estimate_severity


def analyze_incident(
    description: str,
) -> dict:
    """
    Analyze a text-based road incident.

    Pipeline:

        Text
         ↓
        Classification
         ↓
        Severity
         ↓
        Confidence
    """

    classification = classify_incident(
        description
    )

    incident_type = classification[
        "incident_type"
    ]

    classification_confidence = classification[
        "confidence"
    ]

    severity_result = estimate_severity(
        description,
        incident_type,
    )

    severity = severity_result[
        "severity"
    ]

    severity_confidence = severity_result[
        "confidence"
    ]

    # Combined confidence.
    confidence = (
        classification_confidence
        + severity_confidence
    ) / 2

    return {
        "incident_type": incident_type,
        "severity": severity,
        "confidence": round(
            confidence,
            2,
        ),
    }


if __name__ == "__main__":

    test_cases = [
        "Large rocks and mud are blocking the highway",
        "A small pothole was reported on the road",
        "The road is completely flooded",
        "A truck accident has blocked traffic",
        "Smoke and fire are visible near the road",
        "There is a minor crack in the road",
    ]

    print("=" * 60)
    print("INCIDENT AI TEST")
    print("=" * 60)

    for description in test_cases:

        result = analyze_incident(
            description
        )

        print("\nInput:")
        print(description)

        print("\nOutput:")
        print(result)

    print("\n" + "=" * 60)