from src.core.user import get_user_tail_numbers
from src.core.notification import send_to_queue
# from src.api.opensky import get_flight_by_tail  # Stub for API integration

def poll_flight_status_for_user(user_id):
    tail_numbers = get_user_tail_numbers(user_id)
    for tail_number in tail_numbers:
        current_state = "airborne"  # Replace with actual API call
        previous_state = "on_ground"  # Replace with DB query
        if state_changed(previous_state, current_state):
            # update_flight_state(tail_number, current_state)  # DB update stub
            send_to_queue(user_id, tail_number, current_state)

def state_changed(prev, curr):
    return prev != curr
