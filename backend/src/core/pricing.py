# Monetization Flows and Pricing Tiers
PRICING_TIERS = [
    {
        "name": "Free",
        "price": 0,
        "features": [
            "Track up to 3 tail numbers",
            "24-hour history",
            "Basic alerts"
        ]
    },
    {
        "name": "Premium",
        "price": 5,
        "features": [
            "Unlimited tail numbers",
            "Advanced notifications",
            "Flight replay"
        ],
        "annual_price": 50
    },
    {
        "name": "Family Plan",
        "price": 8,
        "features": [
            "Up to 5 users per household",
            "Shared tracking lists"
        ],
        "annual_price": 80
    },
    {
        "name": "Enterprise",
        "price": None,
        "features": [
            "Concierge onboarding",
            "Brandable dashboards",
            "API access"
        ],
        "custom_pricing": True
    }
]

def get_pricing_tiers():
    return PRICING_TIERS
