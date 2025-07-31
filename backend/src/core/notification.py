import pika
import logging

def send_to_queue(user_id, tail_number, status):
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
        channel = connection.channel()
        channel.queue_declare(queue='flight_notifications')
        message = f"{user_id}:{tail_number}:{status}"
        channel.basic_publish(exchange='', routing_key='flight_notifications', body=message)
        logging.info(f"Sent notification: {message}")
        connection.close()
    except Exception as e:
        logging.error(f"Queue error: {e}")

def set_webhook(user_id, url):
    # Store webhook URL in DB or config (stub)
    pass
