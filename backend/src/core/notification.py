import pika
import logging
import os
from typing import Optional
import pika.credentials

def get_rabbitmq_connection():
    """Get secure RabbitMQ connection with authentication"""
    rabbitmq_host = os.getenv('RABBITMQ_HOST', 'localhost')
    rabbitmq_port = int(os.getenv('RABBITMQ_PORT', '5672'))
    rabbitmq_user = os.getenv('RABBITMQ_USER', 'guest')
    rabbitmq_pass = os.getenv('RABBITMQ_PASS', 'guest')
    rabbitmq_vhost = os.getenv('RABBITMQ_VHOST', '/')
    
    credentials = pika.PlainCredentials(rabbitmq_user, rabbitmq_pass)
    parameters = pika.ConnectionParameters(
        host=rabbitmq_host,
        port=rabbitmq_port,
        virtual_host=rabbitmq_vhost,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )
    
    return pika.BlockingConnection(parameters)

def send_to_queue(user_id: str, tail_number: str, status: str) -> bool:
    """Send notification to RabbitMQ queue with secure connection"""
    try:
        connection = get_rabbitmq_connection()
        channel = connection.channel()
        
        # Declare queue as durable for persistence
        channel.queue_declare(queue='flight_notifications', durable=True)
        
        message = f"{user_id}:{tail_number}:{status}"
        
        # Make message persistent
        channel.basic_publish(
            exchange='',
            routing_key='flight_notifications',
            body=message,
            properties=pika.BasicProperties(
                delivery_mode=2,  # Make message persistent
            )
        )
        
        logging.info(f"Sent notification: {message}")
        connection.close()
        return True
        
    except Exception as e:
        logging.error(f"Queue error: {e}")
        return False

def set_webhook(user_id: str, url: str) -> bool:
    """Store webhook URL in database"""
    # TODO: Implement database storage for webhook URLs
    # This should validate the URL and store it securely
    try:
        # Validate URL format
        if not url.startswith(('https://', 'http://')):
            raise ValueError("Invalid webhook URL format")
        
        # Store in database (stub for now)
        logging.info(f"Webhook set for user {user_id}: {url}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to set webhook: {e}")
        return False
