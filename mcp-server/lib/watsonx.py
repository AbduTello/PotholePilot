import os
import json
import httpx

WATSONX_URL = os.environ["WATSONX_URL"]          # e.g. https://us-south.ml.cloud.ibm.com
WATSONX_API_KEY = os.environ["WATSONX_API_KEY"]
WATSONX_PROJECT_ID = os.environ["WATSONX_PROJECT_ID"]
MODEL_ID = "ibm/granite-3-8b-instruct"

_iam_token: str | None = None


async def _get_iam_token() -> str:
    global _iam_token
    if _iam_token:
        return _iam_token
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://iam.cloud.ibm.com/identity/token",
            data={
                "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
                "apikey": WATSONX_API_KEY,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=30,
        )
        resp.raise_for_status()
        _iam_token = resp.json()["access_token"]
    return _iam_token


SYSTEM_PROMPT = """You are a civic infrastructure analyst processing pothole reports.
Your job is to extract structured information from messy resident text.
You return ONLY valid JSON. No preamble, no explanation, no markdown.

Severity rubric:
- low: small surface crack, no traffic disruption, no safety mention.
- medium: visible pothole, drivers slow down or notice, no acute danger.
- high: deep/wide pothole, cars swerving, tire damage reported, near schools/buses, low-visibility hazard, or any explicit safety language."""

USER_TEMPLATE = """Resident report: "{description}"

Return JSON with this exact schema:
{{
  "issue_type": "pothole" | "crack" | "sinkhole" | "other",
  "severity": "low" | "medium" | "high",
  "safety_concerns": [array of short phrases],
  "landmarks_mentioned": [array of strings],
  "urgency_signals": [array of phrases],
  "estimated_age_days": number or null
}}"""


async def granite_extract(description: str) -> dict:
    token = await _get_iam_token()
    payload = {
        "model_id": MODEL_ID,
        "project_id": WATSONX_PROJECT_ID,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_TEMPLATE.format(description=description)},
        ],
        "parameters": {
            "max_new_tokens": 400,
            "temperature": 0,
        },
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{WATSONX_URL}/ml/v1/text/chat?version=2024-05-31",
            json=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        resp.raise_for_status()

    raw = resp.json()["choices"][0]["message"]["content"].strip()

    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Fallback defaults so the pipeline never crashes
        return {
            "issue_type": "pothole",
            "severity": "medium",
            "safety_concerns": [],
            "landmarks_mentioned": [],
            "urgency_signals": [],
            "estimated_age_days": None,
        }
