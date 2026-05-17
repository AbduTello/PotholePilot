from lib.weather import get_freeze_thaw_multiplier

# Zip-level median household income — 2022 ACS approximations for Detroit area
ZIP_INCOME: dict[str, int] = {
    "48201": 30_000,   # Midtown/Downtown
    "48202": 32_000,   # New Center
    "48214": 38_000,   # West Village
    "48207": 45_000,   # Lafayette Park
    "48226": 60_000,   # Downtown core
    "48230": 95_000,   # Grosse Pointe Park
}
CITY_MEDIAN_INCOME = 35_000  # Detroit approximate median

SEVERITY_WEIGHTS = {"low": 10, "medium": 25, "high": 40}
PROXIMITY_BONUSES = {"school": 20, "hospital": 15, "bus_stop": 10, "senior_center": 15}
SAFETY_KEYWORDS = [
    "swerving", "swerved", "flat tire", "blown tire", "accident", "crash",
    "dangerous", "hazard", "injury", "pothole", "deep", "huge", "large",
]


def _build_reason(
    severity: str,
    duplicate_count: int,
    nearby_sensitive: list[dict],
    matched_keywords: list[str],
    days_open: float,
    freeze_thaw: float,
    equity_adj: int,
    final_score: int,
) -> str:
    parts = []
    if severity == "high":
        parts.append("it is a severe hazard")
    elif severity == "medium":
        parts.append("it is a moderate hazard")
    else:
        parts.append("it is a minor hazard")

    if duplicate_count > 1:
        parts.append(f"has {duplicate_count} duplicate reports")

    schools = [loc["name"] for loc in nearby_sensitive if loc["type"] == "school"]
    hospitals = [loc["name"] for loc in nearby_sensitive if loc["type"] == "hospital"]
    bus_stops = [loc["name"] for loc in nearby_sensitive if loc["type"] == "bus_stop"]

    if schools:
        parts.append(f"is near {schools[0]}")
    if hospitals:
        parts.append(f"is near {hospitals[0]}")
    if bus_stops:
        parts.append("is near a bus stop")

    if matched_keywords:
        parts.append(f"residents mention {', '.join(matched_keywords[:2])}")

    if days_open >= 7:
        parts.append(f"has been open for {int(days_open)} days")

    if freeze_thaw > 1.0:
        parts.append("freezing temperatures are forecast this week")

    if equity_adj > 0:
        parts.append("this area has historically received slower repairs")

    if not parts:
        return f"This pothole scored {final_score}."

    reason_body = "; ".join(parts)
    return f"This pothole scored {final_score} because {reason_body}."


async def calculate_priority_score(
    severity: str,
    duplicate_count: int,
    nearby_sensitive: list[dict],
    safety_concerns: list[str],
    days_open: float,
    lat: float,
    lng: float,
    zip_code: str | None = None,
) -> dict:
    # Base score
    base = SEVERITY_WEIGHTS.get(severity, 25)
    base += min(duplicate_count * 3, 20)

    # Proximity bonus — take best single bonus per location
    for loc in nearby_sensitive:
        base += PROXIMITY_BONUSES.get(loc.get("type", ""), 0)

    # Safety keyword bonus
    all_text = " ".join(safety_concerns).lower()
    matched = [kw for kw in SAFETY_KEYWORDS if kw in all_text]
    base += min(len(matched) * 10, 20)

    # Age bonus
    base += min(days_open * 0.5, 15)

    # Freeze-thaw multiplier
    freeze_thaw = await get_freeze_thaw_multiplier(lat, lng)
    score = base * freeze_thaw

    # Equity adjustment
    equity_adj = 0
    if zip_code and zip_code in ZIP_INCOME:
        if ZIP_INCOME[zip_code] < CITY_MEDIAN_INCOME:
            equity_adj = 10
    score += equity_adj

    final = min(round(score), 100)

    reason = _build_reason(
        severity, duplicate_count, nearby_sensitive,
        matched, days_open, freeze_thaw, equity_adj, final,
    )

    return {
        "priority_score":  final,
        "priority_reason": reason,
        "freeze_thaw_multiplier": freeze_thaw,
        "equity_flag": equity_adj > 0,
    }
