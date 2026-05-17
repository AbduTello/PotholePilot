from lib.supabase import get_client

VALID_STATUSES = {"open", "in_progress", "completed", "deferred"}


async def update_repair_status(report_id: str, status: str) -> dict:
    if status not in VALID_STATUSES:
        return {"error": f"Invalid status '{status}'. Must be one of: {', '.join(VALID_STATUSES)}"}

    db = get_client()
    resp = db.table("reports").update({"status": status}).eq("id", report_id).execute()

    if not resp.data:
        return {"error": f"Report {report_id} not found or update failed"}

    return {"report_id": report_id, "status": status, "ok": True}
