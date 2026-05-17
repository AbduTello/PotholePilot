import asyncio
from dotenv import load_dotenv
load_dotenv()

from mcp.server.fastmcp import FastMCP
from tools.extract_report import extract_report_details
from tools.find_duplicates import find_nearby_duplicates
from tools.nearby_locations import get_nearby_sensitive_locations
from tools.calculate_score import calculate_priority_score
from tools.update_status import update_repair_status

mcp = FastMCP("potholepilot", host="0.0.0.0", port=8000)


@mcp.tool()
async def extract_report_details_tool(description: str) -> dict:
    """Send a resident's pothole description to IBM Granite and extract structured fields."""
    return await extract_report_details(description)


@mcp.tool()
async def find_nearby_duplicates_tool(lat: float, lng: float) -> dict:
    """Query the database for existing reports within 100m. Returns cluster_id and duplicate_count."""
    return await find_nearby_duplicates(lat, lng)


@mcp.tool()
async def get_nearby_sensitive_locations_tool(lat: float, lng: float) -> dict:
    """Return schools, hospitals, bus stops within 200m of the given coordinates."""
    return await get_nearby_sensitive_locations(lat, lng)


@mcp.tool()
async def calculate_priority_score_tool(
    severity: str,
    duplicate_count: int,
    nearby_sensitive: list,
    safety_concerns: list,
    days_open: float,
    lat: float,
    lng: float,
    zip_code: str = "",
) -> dict:
    """Run the deterministic priority formula. Returns 0-100 score + plain-English reason."""
    return await calculate_priority_score(
        severity=severity,
        duplicate_count=duplicate_count,
        nearby_sensitive=nearby_sensitive,
        safety_concerns=safety_concerns,
        days_open=days_open,
        lat=lat,
        lng=lng,
        zip_code=zip_code or None,
    )


@mcp.tool()
async def update_repair_status_tool(report_id: str, status: str) -> dict:
    """Update a report's status. Worker action. Status: open | in_progress | completed | deferred."""
    return await update_repair_status(report_id, status)


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
