# Aviation Data Integration (ADS-B, NOTAM, METAR, TAF, FlightAware/FlightRadar24 compatible)
import requests
from fastapi import APIRouter, HTTPException, Query
from src.core.config import settings

router = APIRouter(tags=["aviation-data"])

@router.get("/adsb/live")
def get_adsb_live(lat: float = Query(...), lon: float = Query(...), radius_km: int = Query(100)):
    """Get live aircraft positions from OpenSky/ADSB Exchange"""
    try:
        # Example: OpenSky API (replace with your API key and endpoint)
        url = f"https://opensky-network.org/api/states/all?lamin={lat-1}&lomin={lon-1}&lamax={lat+1}&lomax={lon+1}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"ADS-B data error: {e}")

@router.get("/notam")
def get_notam(icao: str = Query(...)):
    """Get NOTAMs for an airport (AviationStack or FAA)"""
    try:
        # Example: AviationStack API (replace with your API key)
        url = f"http://api.aviationstack.com/v1/notams?access_key={settings.AVIATIONSTACK_API_KEY}&airport_icao={icao}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"NOTAM data error: {e}")

@router.get("/metar")
def get_metar(icao: str = Query(...)):
    """Get latest METAR for an airport (AviationWeather.gov)"""
    try:
        url = f"https://aviationweather.gov/api/data/metar?ids={icao}&format=json"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"METAR data error: {e}")

@router.get("/taf")
def get_taf(icao: str = Query(...)):
    """Get latest TAF for an airport (AviationWeather.gov)"""
    try:
        url = f"https://aviationweather.gov/api/data/taf?ids={icao}&format=json"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TAF data error: {e}")
