import math
from lib.supabase import get_client

DUPLICATE_RADIUS_M = 100


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Straight-line distance in metres between two lat/lng points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def find_nearby_duplicates(lat: float, lng: float) -> dict:
    """
    Find existing reports within DUPLICATE_RADIUS_M of lat/lng.
    Returns the cluster_id of the nearest cluster (or None) and a total duplicate count.
    Pure Python haversine — no PostGIS extension required.
    """
    db = get_client()
    # Fetch all open/in-progress reports with their location
    resp = db.table("reports").select("id, lat, lng, cluster_id").in_(
        "status", ["open", "in_progress"]
    ).execute()
    rows = resp.data or []

    nearby = [
        r for r in rows
        if _haversine_m(lat, lng, r["lat"], r["lng"]) <= DUPLICATE_RADIUS_M
    ]

    if not nearby:
        return {"cluster_id": None, "duplicate_count": 0}

    # Pick the cluster_id most common among nearby reports
    cluster_ids = [r["cluster_id"] for r in nearby if r["cluster_id"]]
    if cluster_ids:
        cluster_id = max(set(cluster_ids), key=cluster_ids.count)
    else:
        cluster_id = None

    return {
        "cluster_id":      cluster_id,
        "duplicate_count": len(nearby),
    }
