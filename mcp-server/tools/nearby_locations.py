import math
from lib.supabase import get_client

SENSITIVE_RADIUS_M = 200


def _haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def get_nearby_sensitive_locations(lat: float, lng: float) -> dict:
    """Return all sensitive locations within 200m, with distance in metres."""
    db = get_client()
    resp = db.table("sensitive_locations").select("id, name, type, lat, lng").execute()
    rows = resp.data or []

    nearby = []
    for loc in rows:
        dist = _haversine_m(lat, lng, loc["lat"], loc["lng"])
        if dist <= SENSITIVE_RADIUS_M:
            nearby.append({
                "id":       loc["id"],
                "name":     loc["name"],
                "type":     loc["type"],
                "distance": round(dist),
            })

    nearby.sort(key=lambda x: x["distance"])
    return {"locations": nearby}
