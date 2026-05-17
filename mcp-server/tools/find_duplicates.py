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

    Cluster bootstrap: if nearby reports exist but none has a cluster_id yet, this
    is the first detected collision — create a new clusters row and back-fill all
    nearby reports so the stat card shows the right count.
    """
    db = get_client()
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

    # Use the most common existing cluster_id if any nearby report has one
    cluster_ids = [r["cluster_id"] for r in nearby if r["cluster_id"]]
    if cluster_ids:
        cluster_id = max(set(cluster_ids), key=cluster_ids.count)
    else:
        # First collision in this area — create the cluster row
        all_lats = [r["lat"] for r in nearby] + [lat]
        all_lngs = [r["lng"] for r in nearby] + [lng]
        centroid_lat = sum(all_lats) / len(all_lats)
        centroid_lng = sum(all_lngs) / len(all_lngs)

        insert_resp = db.table("clusters").insert({
            "centroid_lat": centroid_lat,
            "centroid_lng": centroid_lng,
            "report_count": len(nearby) + 1,  # nearby + the new report being submitted
        }).execute()

        cluster_id = insert_resp.data[0]["id"] if insert_resp.data else None

        # Back-fill nearby reports that don't yet have a cluster_id
        if cluster_id:
            unassigned_ids = [r["id"] for r in nearby if not r["cluster_id"]]
            if unassigned_ids:
                db.table("reports").update({"cluster_id": cluster_id}).in_(
                    "id", unassigned_ids
                ).execute()

    return {
        "cluster_id":      cluster_id,
        "duplicate_count": len(nearby),
    }
