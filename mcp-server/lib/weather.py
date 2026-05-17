import httpx

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
FREEZE_THRESHOLD_F = 32.0
FREEZE_THRESHOLD_C = 0.0


async def get_freeze_thaw_multiplier(lat: float, lng: float) -> float:
    """Return 1.3 if a freeze-thaw event is forecast within 7 days, else 1.0."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                OPEN_METEO_URL,
                params={
                    "latitude": lat,
                    "longitude": lng,
                    "daily": "temperature_2m_max,temperature_2m_min",
                    "temperature_unit": "celsius",
                    "forecast_days": 7,
                    "timezone": "America/Detroit",
                },
                timeout=10,
            )
            resp.raise_for_status()
        data = resp.json()
        highs = data["daily"]["temperature_2m_max"]
        lows  = data["daily"]["temperature_2m_min"]

        for high, low in zip(highs, lows):
            # Freeze-thaw: crosses 0°C (thaws above, freezes below)
            if high > FREEZE_THRESHOLD_C and low <= FREEZE_THRESHOLD_C:
                return 1.3
        return 1.0
    except Exception:
        return 1.0  # safe default — never crash the pipeline
