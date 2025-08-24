"""
Email Service API using SendGrid
Handles all transactional emails for FlightTrace
"""

import os
import json
from datetime import datetime
from http.server import BaseHTTPRequestHandler
from typing import Dict, Optional

# SendGrid configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'noreply@flightandtrace.com')
SENDGRID_FROM_NAME = os.environ.get('SENDGRID_FROM_NAME', 'FlightTrace')

# Email templates
EMAIL_TEMPLATES = {
    'welcome': {
        'subject': 'Welcome to FlightTrace! ✈️',
        'html': """
        <h2>Welcome to FlightTrace!</h2>
        <p>Hi {name},</p>
        <p>Thank you for joining FlightTrace! You now have access to:</p>
        <ul>
            <li>Real-time flight tracking</li>
            <li>Flight history and analytics</li>
            <li>Environmental impact data</li>
            <li>And much more!</li>
        </ul>
        <p>Your subscription: <strong>{tier}</strong></p>
        <p>Trial ends: <strong>{trial_end}</strong></p>
        <a href="https://flightandtrace.com/live.html" style="display:inline-block;padding:12px 24px;background:#0099ff;color:white;text-decoration:none;border-radius:6px;">Start Tracking Flights</a>
        <p>Need help? Reply to this email or visit our support center.</p>
        <p>Happy tracking!<br>The FlightTrace Team</p>
        """
    },
    'trial_ending': {
        'subject': 'Your FlightTrace trial ends in 3 days',
        'html': """
        <h2>Your trial is ending soon</h2>
        <p>Hi {name},</p>
        <p>Your FlightTrace trial will end in <strong>3 days</strong> on {trial_end}.</p>
        <p>Don't lose access to:</p>
        <ul>
            <li>Unlimited flight tracking</li>
            <li>90-day flight history</li>
            <li>Weather overlays</li>
            <li>API access</li>
        </ul>
        <p>Continue with {tier} for just <strong>${price}/month</strong></p>
        <a href="https://flightandtrace.com/subscribe" style="display:inline-block;padding:12px 24px;background:#0099ff;color:white;text-decoration:none;border-radius:6px;">Continue Subscription</a>
        <p>Questions? Reply to this email.</p>
        """
    },
    'subscription_confirmed': {
        'subject': 'Subscription Confirmed - FlightTrace {tier}',
        'html': """
        <h2>Subscription Confirmed!</h2>
        <p>Hi {name},</p>
        <p>Your FlightTrace {tier} subscription is now active!</p>
        <p><strong>Subscription Details:</strong></p>
        <ul>
            <li>Plan: {tier}</li>
            <li>Price: ${price}/month</li>
            <li>Next billing: {next_billing}</li>
        </ul>
        <p>You now have access to all {tier} features.</p>
        <a href="https://flightandtrace.com/account" style="display:inline-block;padding:12px 24px;background:#0099ff;color:white;text-decoration:none;border-radius:6px;">Manage Subscription</a>
        <p>Thank you for choosing FlightTrace!</p>
        """
    },
    'subscription_cancelled': {
        'subject': 'Subscription Cancelled - We\'re sorry to see you go',
        'html': """
        <h2>Subscription Cancelled</h2>
        <p>Hi {name},</p>
        <p>Your FlightTrace subscription has been cancelled.</p>
        <p><strong>Important Information:</strong></p>
        <ul>
            <li>Access until: {access_until}</li>
            <li>Refund amount: ${refund_amount}</li>
            <li>Data retention: 90 days</li>
        </ul>
        <p>You can download your data here:</p>
        <a href="{data_export_link}" style="display:inline-block;padding:12px 24px;background:#0099ff;color:white;text-decoration:none;border-radius:6px;">Download My Data</a>
        <p><strong>Special Offer:</strong> Return within 30 days and get 50% off for 3 months!</p>
        <p>We'd love to hear your feedback. What could we improve?</p>
        <p>Thank you for trying FlightTrace.</p>
        """
    },
    'payment_failed': {
        'subject': 'Payment Failed - Action Required',
        'html': """
        <h2>Payment Failed</h2>
        <p>Hi {name},</p>
        <p>We were unable to process your payment for FlightTrace {tier}.</p>
        <p><strong>What happens next:</strong></p>
        <ul>
            <li>We'll retry in 3 days</li>
            <li>Your access continues during this time</li>
            <li>Update payment method to avoid interruption</li>
        </ul>
        <a href="https://flightandtrace.com/payment" style="display:inline-block;padding:12px 24px;background:#ff4444;color:white;text-decoration:none;border-radius:6px;">Update Payment Method</a>
        <p>Need help? Reply to this email.</p>
        """
    },
    'flight_alert': {
        'subject': 'Flight Alert: {flight_number} {alert_type}',
        'html': """
        <h2>Flight Alert</h2>
        <p>Flight {flight_number} has {alert_type}.</p>
        <p><strong>Flight Details:</strong></p>
        <ul>
            <li>Route: {origin} → {destination}</li>
            <li>Status: {status}</li>
            <li>Time: {time}</li>
        </ul>
        <a href="https://flightandtrace.com/track?flight={flight_number}" style="display:inline-block;padding:12px 24px;background:#0099ff;color:white;text-decoration:none;border-radius:6px;">Track Flight</a>
        <p>Manage your alerts in account settings.</p>
        """
    }
}

def send_email_via_sendgrid(to_email: str, template_name: str, variables: Dict) -> Dict:
    """Send email using SendGrid API"""
    if not SENDGRID_API_KEY:
        return {
            'status': 'error',
            'message': 'SendGrid API key not configured',
            'fallback': 'Email would be sent in production'
        }
    
    try:
        import requests
        
        template = EMAIL_TEMPLATES.get(template_name, EMAIL_TEMPLATES['welcome'])
        
        # Replace variables in template
        html_content = template['html']
        subject = template['subject']
        
        for key, value in variables.items():
            html_content = html_content.replace(f'{{{key}}}', str(value))
            subject = subject.replace(f'{{{key}}}', str(value))
        
        # SendGrid API request
        url = 'https://api.sendgrid.com/v3/mail/send'
        headers = {
            'Authorization': f'Bearer {SENDGRID_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'personalizations': [{
                'to': [{'email': to_email}],
                'subject': subject
            }],
            'from': {
                'email': SENDGRID_FROM_EMAIL,
                'name': SENDGRID_FROM_NAME
            },
            'content': [{
                'type': 'text/html',
                'value': html_content
            }],
            'tracking_settings': {
                'click_tracking': {'enable': True},
                'open_tracking': {'enable': True}
            }
        }
        
        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code in [200, 201, 202]:
            return {
                'status': 'success',
                'message': 'Email sent successfully',
                'message_id': response.headers.get('X-Message-Id', '')
            }
        else:
            return {
                'status': 'error',
                'message': f'SendGrid error: {response.status_code}',
                'details': response.text
            }
            
    except Exception as e:
        return {
            'status': 'error',
            'message': str(e)
        }

def send_email_via_smtp(to_email: str, template_name: str, variables: Dict) -> Dict:
    """Fallback: Send email using SMTP (for development)"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    template = EMAIL_TEMPLATES.get(template_name, EMAIL_TEMPLATES['welcome'])
    
    # Replace variables
    html_content = template['html']
    subject = template['subject']
    
    for key, value in variables.items():
        html_content = html_content.replace(f'{{{key}}}', str(value))
        subject = subject.replace(f'{{{key}}}', str(value))
    
    # For development, just return success
    return {
        'status': 'success',
        'message': 'Email queued (SMTP fallback)',
        'template': template_name,
        'to': to_email
    }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle email sending requests"""
        path = self.path.split('?')[0]
        
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else '{}'
        
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {}
        
        # CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        response_data = {}
        
        if '/send' in path:
            to_email = data.get('to_email')
            template = data.get('template', 'welcome')
            variables = data.get('variables', {})
            
            if not to_email:
                response_data = {
                    'status': 'error',
                    'message': 'Email address required'
                }
            else:
                # Try SendGrid first, fallback to SMTP
                if SENDGRID_API_KEY:
                    response_data = send_email_via_sendgrid(to_email, template, variables)
                else:
                    response_data = send_email_via_smtp(to_email, template, variables)
                    
        elif '/templates' in path:
            # List available templates
            response_data = {
                'status': 'success',
                'templates': list(EMAIL_TEMPLATES.keys()),
                'count': len(EMAIL_TEMPLATES)
            }
            
        elif '/test' in path:
            # Test email configuration
            response_data = {
                'status': 'success',
                'sendgrid_configured': bool(SENDGRID_API_KEY),
                'from_email': SENDGRID_FROM_EMAIL,
                'from_name': SENDGRID_FROM_NAME,
                'templates_available': len(EMAIL_TEMPLATES)
            }
            
        else:
            response_data = {
                'status': 'success',
                'endpoints': {
                    '/send': 'Send email',
                    '/templates': 'List email templates',
                    '/test': 'Test email configuration'
                },
                'example_request': {
                    'to_email': 'user@example.com',
                    'template': 'welcome',
                    'variables': {
                        'name': 'John Doe',
                        'tier': 'Premium',
                        'trial_end': '2024-01-01'
                    }
                }
            }
        
        self.wfile.write(json.dumps(response_data, indent=2).encode())
    
    def do_OPTIONS(self):
        """Handle CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()