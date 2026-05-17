from lib.watsonx import granite_extract


async def extract_report_details(description: str) -> dict:
    """Call Granite to extract structured fields from raw resident text."""
    result = await granite_extract(description)
    return {
        "issue_type":          result.get("issue_type", "pothole"),
        "severity":            result.get("severity", "medium"),
        "safety_concerns":     result.get("safety_concerns", []),
        "landmarks_mentioned": result.get("landmarks_mentioned", []),
        "urgency_signals":     result.get("urgency_signals", []),
        "estimated_age_days":  result.get("estimated_age_days"),
    }
