"""
Stripe Setup Script for FlightTrace
This script helps create products and prices in Stripe
"""

import stripe
import os
from typing import Dict, Any

# Set your Stripe secret key here (use test key first)
# Get from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY = "sk_test_YOUR_KEY_HERE"  # Replace with your actual test key

stripe.api_key = STRIPE_SECRET_KEY

def create_products_and_prices():
    """Create FlightTrace products and pricing in Stripe"""
    
    if "YOUR_KEY_HERE" in STRIPE_SECRET_KEY:
        print("⚠️  Please update STRIPE_SECRET_KEY with your actual Stripe secret key")
        print("Get it from: https://dashboard.stripe.com/apikeys")
        return
    
    try:
        # Create Premium Product
        print("Creating FlightTrace Premium product...")
        premium_product = stripe.Product.create(
            name="FlightTrace Premium",
            description="Advanced flight tracking with fuel estimation and weather overlays",
            metadata={
                "features": "unlimited_tracking,fuel_estimates,co2_tracking,weather_overlays,email_notifications,csv_export,30_day_history",
                "tier": "premium"
            }
        )
        print(f"✅ Created product: {premium_product.id}")
        
        # Create Premium Price
        premium_price = stripe.Price.create(
            product=premium_product.id,
            unit_amount=799,  # $7.99 in cents
            currency="usd",
            recurring={"interval": "month"},
            metadata={"tier": "premium"}
        )
        print(f"✅ Created premium price: {premium_price.id}")
        
        # Create Professional Product
        print("\nCreating FlightTrace Professional product...")
        professional_product = stripe.Product.create(
            name="FlightTrace Professional",
            description="Professional aviation tools with API access and priority support",
            metadata={
                "features": "everything_premium,api_access_10000,realtime_alerts,365_day_history,priority_support,custom_integrations,bulk_export,team_sharing_5",
                "tier": "professional"
            }
        )
        print(f"✅ Created product: {professional_product.id}")
        
        # Create Professional Price
        professional_price = stripe.Price.create(
            product=professional_product.id,
            unit_amount=2499,  # $24.99 in cents
            currency="usd",
            recurring={"interval": "month"},
            metadata={"tier": "professional"}
        )
        print(f"✅ Created professional price: {professional_price.id}")
        
        print("\n" + "="*60)
        print("🎉 SUCCESS! Products created in Stripe")
        print("="*60)
        print("\n📋 Add these to your Vercel Environment Variables:\n")
        print(f"STRIPE_PREMIUM_PRICE_ID={premium_price.id}")
        print(f"STRIPE_PROFESSIONAL_PRICE_ID={professional_price.id}")
        print(f"STRIPE_SECRET_KEY={STRIPE_SECRET_KEY}")
        print("\n✅ Next steps:")
        print("1. Go to https://dashboard.stripe.com/products to verify")
        print("2. Set up webhook at https://dashboard.stripe.com/webhooks")
        print("3. Add webhook endpoint: https://flightandtrace.com/api/subscription/webhook")
        print("4. Copy the webhook signing secret (starts with whsec_)")
        print("5. Add all environment variables to Vercel")
        
        return {
            "premium_product_id": premium_product.id,
            "premium_price_id": premium_price.id,
            "professional_product_id": professional_product.id,
            "professional_price_id": professional_price.id
        }
        
    except stripe.error.AuthenticationError:
        print("❌ Authentication failed. Please check your Stripe secret key.")
        print("Get it from: https://dashboard.stripe.com/apikeys")
    except stripe.error.StripeError as e:
        print(f"❌ Stripe error: {str(e)}")
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")

def create_customer_portal_configuration():
    """Configure the Customer Portal for subscription management"""
    
    try:
        print("\nConfiguring Customer Portal...")
        
        portal_config = stripe.billing_portal.Configuration.create(
            business_profile={
                "headline": "Manage your FlightTrace subscription",
            },
            features={
                "customer_update": {
                    "enabled": True,
                    "allowed_updates": ["email", "tax_id", "address"]
                },
                "invoice_history": {"enabled": True},
                "payment_method_update": {"enabled": True},
                "subscription_cancel": {
                    "enabled": True,
                    "mode": "immediately",
                    "proration_behavior": "create_prorations"
                },
                "subscription_pause": {"enabled": False},
                "subscription_update": {
                    "enabled": True,
                    "default_allowed_updates": ["price", "quantity"],
                    "proration_behavior": "create_prorations"
                }
            },
            default_return_url="https://flightandtrace.com/account"
        )
        
        print(f"✅ Customer Portal configured: {portal_config.id}")
        print("   Customers can manage subscriptions at: /api/subscription/portal")
        
    except Exception as e:
        print(f"⚠️  Could not configure customer portal: {str(e)}")
        print("   You can configure it manually at: https://dashboard.stripe.com/settings/billing/portal")

def create_test_coupon():
    """Create a test coupon for beta users"""
    
    try:
        print("\nCreating beta user coupon...")
        
        coupon = stripe.Coupon.create(
            percent_off=50,
            duration="repeating",
            duration_in_months=3,
            id="BETA50",
            metadata={"description": "50% off for 3 months for beta users"}
        )
        
        print(f"✅ Created coupon: {coupon.id}")
        print("   Beta users can use code: BETA50 for 50% off for 3 months")
        
    except stripe.error.StripeError as e:
        if "already exists" in str(e):
            print("ℹ️  Coupon BETA50 already exists")
        else:
            print(f"⚠️  Could not create coupon: {str(e)}")

def verify_webhook_endpoint():
    """Check if webhook endpoint is configured"""
    
    try:
        print("\nChecking webhook endpoints...")
        
        endpoints = stripe.WebhookEndpoint.list(limit=10)
        
        found = False
        for endpoint in endpoints.data:
            if "flightandtrace.com" in endpoint.url:
                found = True
                print(f"✅ Webhook endpoint found: {endpoint.url}")
                print(f"   Status: {endpoint.status}")
                print(f"   Events: {', '.join(endpoint.enabled_events[:3])}...")
                
        if not found:
            print("⚠️  No webhook endpoint found for flightandtrace.com")
            print("   Create one at: https://dashboard.stripe.com/webhooks")
            print("   Endpoint URL: https://flightandtrace.com/api/subscription/webhook")
            
    except Exception as e:
        print(f"ℹ️  Could not check webhooks: {str(e)}")

if __name__ == "__main__":
    print("="*60)
    print("🚀 FlightTrace Stripe Setup Script")
    print("="*60)
    
    # Create products and prices
    result = create_products_and_prices()
    
    if result:
        # Configure customer portal
        create_customer_portal_configuration()
        
        # Create beta coupon
        create_test_coupon()
        
        # Verify webhook
        verify_webhook_endpoint()
        
        print("\n" + "="*60)
        print("📋 IMPORTANT: Save these IDs:")
        print("="*60)
        for key, value in result.items():
            print(f"{key}: {value}")
        
        print("\n✅ Setup complete! Don't forget to:")
        print("1. Set up webhooks")
        print("2. Add all environment variables to Vercel")
        print("3. Test with test cards before going live")