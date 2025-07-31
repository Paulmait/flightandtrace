import requests
import datetime

def get_weather_for_airport(airport_code):
    # Example OpenWeather API call (replace with real API key)
    url = f"https://api.openweathermap.org/data/2.5/weather?q={airport_code}&appid=YOUR_API_KEY"
    response = requests.get(url)
    if response.ok:
        data = response.json()
        return data['weather'][0]['main'], data['wind']['speed']
    return None, None

# Example previous delays lookup
def get_previous_delays(route):
    # Replace with DB/API lookup
    return 15  # minutes average delay

# Rule engine for delay prediction
def predict_delay(scheduled_departure, origin, destination, route):
    weather, wind = get_weather_for_airport(origin)
    previous_delay = get_previous_delays(route)
    delay_probability = 0.1  # base
    predicted_delay = 0
    if weather in ['Thunderstorm', 'Snow', 'Fog']:
        delay_probability += 0.5
        predicted_delay += 30
    if wind and wind > 20:
        delay_probability += 0.2
        predicted_delay += 10
    if previous_delay > 10:
        delay_probability += 0.2
        predicted_delay += previous_delay
    return {
        "delay_probability": min(delay_probability, 1.0),
        "predicted_delay_minutes": predicted_delay
    }

# Microservice entry point
def predict_delay_service(request_json):
    scheduled_departure = request_json['scheduled_departure']
    origin = request_json['origin']
    destination = request_json['destination']
    route = request_json['route']
    return predict_delay(scheduled_departure, origin, destination, route)
