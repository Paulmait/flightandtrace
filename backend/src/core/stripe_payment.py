import stripe
import logging
from fastapi import APIRouter, HTTPException, Request, Depends, Header
from src.core.config import settings
from src.core.auth import get_current_active_user
from src.db.database import get_connection
from datetime import datetime
import hmac
import hashlib
from typing import Optional

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY
stripe.api_version = "2023-10-16"

router = APIRouter(tags=["payments"])

# Webhook endpoint secret
WEBHOOK_SECRET = settings.STRIPE_WEBHOOK_SECRET

@router.post("/create-checkout-session")
async def create_checkout_session(
    plan: str,
    current_user: dict = Depends(get_current_active_user)
):
    """Create a Stripe checkout session for subscription"""
    try:
        # Validate plan
        valid_plans = ["premium", "family", "enterprise"]
        plan_lower = plan.lower()
        if plan_lower not in valid_plans:
            raise HTTPException(status_code=400, detail="Invalid plan")
        
        # Get or create Stripe customer
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT stripe_customer_id FROM users WHERE user_id = ?",
            (current_user["user_id"],)
        )
        result = cursor.fetchone()
        
        if result and result[0]:
            customer_id = result[0]
        else:
            # Create new Stripe customer
            customer = stripe.Customer.create(
                email=current_user["email"],
                metadata={"user_id": str(current_user["user_id"])}
            )
            customer_id = customer.id
            
            # Save customer ID
            cursor.execute(
                "UPDATE users SET stripe_customer_id = ? WHERE user_id = ?",
                (customer_id, current_user["user_id"])
            )
            conn.commit()
        
        conn.close()
        
        # Price IDs from Stripe Dashboard (use environment variables in production)
        price_lookup = {
            "premium": settings.STRIPE_PRICE_PREMIUM,
            "family": settings.STRIPE_PRICE_FAMILY,
            "enterprise": settings.STRIPE_PRICE_ENTERPRISE
        }
        
        price_id = price_lookup.get(plan_lower)
        if not price_id:
            raise HTTPException(status_code=400, detail="Price not configured")
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=f"{settings.FRONTEND_URL}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.FRONTEND_URL}/subscription/cancel",
            metadata={
                "user_id": str(current_user["user_id"]),
                "plan": plan_lower
            },
            subscription_data={
                "trial_period_days": 14 if plan_lower == "premium" else 0,
                "metadata": {
                    "user_id": str(current_user["user_id"]),
                    "plan": plan_lower
                }
            },
            allow_promotion_codes=True,
            billing_address_collection="required",
            customer_update={
                "address": "auto"
            }
        )
        
        # Log checkout session creation
        logger.info(f"Checkout session created for user {current_user['user_id']}, plan: {plan}")
        
        return {
            "sessionId": session.id,
            "url": session.url,
            "publishableKey": settings.STRIPE_PUBLISHABLE_KEY
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {str(e)}")
        raise HTTPException(status_code=400, detail="Payment processing error")
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None)
):
    """Handle Stripe webhooks"""
    try:
        payload = await request.body()
        sig_header = stripe_signature
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, WEBHOOK_SECRET
            )
        except ValueError:
            logger.error("Invalid payload")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Handle different event types
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            await handle_checkout_session_completed(session)
            
        elif event["type"] == "customer.subscription.created":
            subscription = event["data"]["object"]
            await handle_subscription_created(subscription)
            
        elif event["type"] == "customer.subscription.updated":
            subscription = event["data"]["object"]
            await handle_subscription_updated(subscription)
            
        elif event["type"] == "customer.subscription.deleted":
            subscription = event["data"]["object"]
            await handle_subscription_deleted(subscription)
            
        elif event["type"] == "invoice.payment_succeeded":
            invoice = event["data"]["object"]
            await handle_payment_succeeded(invoice)
            
        elif event["type"] == "invoice.payment_failed":
            invoice = event["data"]["object"]
            await handle_payment_failed(invoice)
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        raise HTTPException(status_code=500, detail="Webhook processing error")

async def handle_checkout_session_completed(session):
    """Handle successful checkout"""
    user_id = session["metadata"].get("user_id")
    if not user_id:
        logger.error("No user_id in session metadata")
        return
    
    logger.info(f"Checkout completed for user {user_id}")

async def handle_subscription_created(subscription):
    """Handle new subscription"""
    user_id = subscription["metadata"].get("user_id")
    if not user_id:
        return
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Record subscription
    cursor.execute("""
        INSERT INTO subscriptions (
            user_id, plan, status, stripe_customer_id, stripe_subscription_id,
            current_period_start, current_period_end, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        int(user_id),
        subscription["metadata"].get("plan", "premium"),
        subscription["status"],
        subscription["customer"],
        subscription["id"],
        datetime.fromtimestamp(subscription["current_period_start"]),
        datetime.fromtimestamp(subscription["current_period_end"]),
        datetime.utcnow()
    ))
    
    conn.commit()
    conn.close()
    
    logger.info(f"Subscription created for user {user_id}")

async def handle_subscription_updated(subscription):
    """Handle subscription updates"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE subscriptions 
        SET status = ?, current_period_start = ?, current_period_end = ?,
            updated_at = ?
        WHERE stripe_subscription_id = ?
    """, (
        subscription["status"],
        datetime.fromtimestamp(subscription["current_period_start"]),
        datetime.fromtimestamp(subscription["current_period_end"]),
        datetime.utcnow(),
        subscription["id"]
    ))
    
    conn.commit()
    conn.close()

async def handle_subscription_deleted(subscription):
    """Handle subscription cancellation"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        UPDATE subscriptions 
        SET status = 'cancelled', updated_at = ?
        WHERE stripe_subscription_id = ?
    """, (datetime.utcnow(), subscription["id"]))
    
    conn.commit()
    conn.close()

async def handle_payment_succeeded(invoice):
    """Log successful payments"""
    logger.info(f"Payment succeeded for invoice {invoice['id']}")

async def handle_payment_failed(invoice):
    """Handle failed payments"""
    logger.warning(f"Payment failed for invoice {invoice['id']}")
    # TODO: Send notification to user

@router.get("/subscription-status")
async def get_subscription_status(
    current_user: dict = Depends(get_current_active_user)
):
    """Get user's subscription status"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT plan, status, current_period_end, trial_end
        FROM subscriptions
        WHERE user_id = ? AND status IN ('active', 'trialing')
        ORDER BY created_at DESC
        LIMIT 1
    """, (current_user["user_id"],))
    
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {
            "plan": result[0],
            "status": result[1],
            "current_period_end": result[2],
            "trial_end": result[3],
            "is_active": True
        }
    else:
        return {
            "plan": "free",
            "status": "inactive",
            "is_active": False
        }

@router.post("/cancel-subscription")
async def cancel_subscription(
    current_user: dict = Depends(get_current_active_user)
):
    """Cancel user's subscription"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get active subscription
        cursor.execute("""
            SELECT stripe_subscription_id
            FROM subscriptions
            WHERE user_id = ? AND status IN ('active', 'trialing')
            ORDER BY created_at DESC
            LIMIT 1
        """, (current_user["user_id"],))
        
        result = cursor.fetchone()
        conn.close()
        
        if not result:
            raise HTTPException(status_code=404, detail="No active subscription found")
        
        # Cancel at period end
        subscription = stripe.Subscription.modify(
            result[0],
            cancel_at_period_end=True
        )
        
        return {
            "status": "cancelled",
            "cancel_at": subscription.current_period_end,
            "message": "Subscription will be cancelled at the end of the current billing period"
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=400, detail="Error cancelling subscription")
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
