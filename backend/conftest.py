"""
Pytest configuration file for test fixtures and setup
"""
import sys
import os

# Add backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'src'))

# Mock modules that might not be available in CI/CD
class MockApp:
    """Mock FastAPI app for testing"""
    pass

# Set up test environment
os.environ.setdefault('TESTING', 'true')
os.environ.setdefault('STRIPE_SECRET_KEY', 'sk_test_mock')
os.environ.setdefault('OPENSKY_USERNAME', 'test')
os.environ.setdefault('OPENSKY_PASSWORD', 'test')