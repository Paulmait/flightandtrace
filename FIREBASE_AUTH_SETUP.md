# 🔐 Firebase Authentication Setup Guide

## Complete Setup for FlightTrace

### 1. Enable Authentication Methods in Firebase Console

Go to [Firebase Console](https://console.firebase.google.com/project/flighttrace-3c5d7/authentication/providers)

Enable these providers:
- ✅ **Email/Password** - Basic authentication
- ✅ **Google** - Social login
- ✅ **GitHub** - Developer login (optional)
- ✅ **Microsoft** - Business users (optional)

### 2. Add Firebase Auth to Your Frontend

Create `public/auth.js`:

```javascript
// Firebase Authentication Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// Your Firebase config (already have this)
const firebaseConfig = {
    apiKey: "AIzaSyDKGFoRgBHoUGvtfxdfvBxDad9Y6hXPvBU",
    authDomain: "flighttrace-3c5d7.firebaseapp.com",
    projectId: "flighttrace-3c5d7",
    storageBucket: "flighttrace-3c5d7.appspot.com",
    messagingSenderId: "488464281653",
    appId: "1:488464281653:web:abc123def456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Authentication Functions
export async function signUp(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Create Stripe customer
        await createStripeCustomer(user.uid, email);
        
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function signInWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Create Stripe customer if new user
        await createStripeCustomer(user.uid, user.email);
        
        return { success: true, user };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logOut() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Monitor auth state
export function onAuth(callback) {
    return onAuthStateChanged(auth, callback);
}

// Create Stripe customer for new users
async function createStripeCustomer(userId, email) {
    try {
        const response = await fetch('/api/subscription/create-customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, email })
        });
        return await response.json();
    } catch (error) {
        console.error('Error creating Stripe customer:', error);
    }
}
```

### 3. Update Your Login Page

Update `public/login.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - FlightTrace</title>
    <link rel="stylesheet" href="nav-style.css">
    <style>
        .auth-container {
            max-width: 400px;
            margin: 100px auto;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 12px;
        }
        .auth-form input {
            width: 100%;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 6px;
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }
        .auth-button {
            width: 100%;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border: none;
            border-radius: 6px;
            background: #0099ff;
            color: white;
            cursor: pointer;
            font-size: 1rem;
        }
        .social-login {
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.2);
        }
        .google-btn {
            background: white;
            color: #333;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
        }
        .error-message {
            color: #ff4444;
            margin: 0.5rem 0;
        }
        .success-message {
            color: #44ff44;
            margin: 0.5rem 0;
        }
    </style>
</head>
<body>
    <div class="auth-container">
        <h2 id="auth-title">Sign In to FlightTrace</h2>
        
        <form id="auth-form">
            <input type="email" id="email" placeholder="Email" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit" class="auth-button" id="submit-btn">Sign In</button>
        </form>
        
        <div class="social-login">
            <button class="auth-button google-btn" onclick="googleSignIn()">
                <img src="https://www.google.com/favicon.ico" width="20">
                Sign in with Google
            </button>
        </div>
        
        <div id="message"></div>
        
        <p style="text-align: center; margin-top: 2rem;">
            <span id="toggle-text">Don't have an account?</span>
            <a href="#" onclick="toggleMode()" style="color: #0099ff;">Sign Up</a>
        </p>
    </div>

    <script type="module">
        import { signUp, signIn, signInWithGoogle, onAuth } from './auth.js';
        
        let isSignUp = false;
        
        // Check if user is already logged in
        onAuth((user) => {
            if (user) {
                // Redirect to dashboard or subscription page
                window.location.href = '/dashboard.html';
            }
        });
        
        // Handle form submission
        document.getElementById('auth-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const messageDiv = document.getElementById('message');
            
            const result = isSignUp 
                ? await signUp(email, password)
                : await signIn(email, password);
            
            if (result.success) {
                messageDiv.innerHTML = '<div class="success-message">Success! Redirecting...</div>';
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
            } else {
                messageDiv.innerHTML = `<div class="error-message">${result.error}</div>`;
            }
        });
        
        // Google Sign In
        window.googleSignIn = async () => {
            const result = await signInWithGoogle();
            const messageDiv = document.getElementById('message');
            
            if (result.success) {
                messageDiv.innerHTML = '<div class="success-message">Success! Redirecting...</div>';
                setTimeout(() => {
                    window.location.href = '/dashboard.html';
                }, 1500);
            } else {
                messageDiv.innerHTML = `<div class="error-message">${result.error}</div>`;
            }
        };
        
        // Toggle between Sign In and Sign Up
        window.toggleMode = () => {
            isSignUp = !isSignUp;
            document.getElementById('auth-title').textContent = isSignUp ? 'Sign Up for FlightTrace' : 'Sign In to FlightTrace';
            document.getElementById('submit-btn').textContent = isSignUp ? 'Sign Up' : 'Sign In';
            document.getElementById('toggle-text').textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
        };
    </script>
</body>
</html>
```

### 4. Protect Your Routes

Create `public/auth-guard.js`:

```javascript
import { onAuth } from './auth.js';

// Check if user is authenticated
export function requireAuth(redirectUrl = '/login.html') {
    onAuth((user) => {
        if (!user) {
            window.location.href = redirectUrl;
        }
    });
}

// Check subscription status
export async function requireSubscription(tier = 'free') {
    onAuth(async (user) => {
        if (!user) {
            window.location.href = '/login.html';
            return;
        }
        
        const response = await fetch('/api/subscription/status', {
            headers: {
                'Authorization': `Bearer ${await user.getIdToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.tier < tier) {
            window.location.href = '/pricing.html';
        }
    });
}
```

### 5. Add to Protected Pages

Add this to pages that require authentication:

```html
<script type="module">
    import { requireAuth } from './auth-guard.js';
    requireAuth();
</script>
```

For premium features:

```html
<script type="module">
    import { requireSubscription } from './auth-guard.js';
    requireSubscription('premium');
</script>
```

### 6. Firebase Security Rules

In Firebase Console, set these Firestore rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Subscriptions are managed by backend
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && 
        request.auth.uid == resource.data.userId;
      allow write: if false; // Only backend can write
    }
    
    // Flight searches are user-specific
    match /searches/{searchId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

### 7. Backend Integration

Update your Python API to verify Firebase tokens:

```python
# api/auth_middleware.py
import os
import firebase_admin
from firebase_admin import credentials, auth
from functools import wraps

# Initialize Firebase Admin
cred = credentials.Certificate({
    "type": "service_account",
    "project_id": "flighttrace-3c5d7",
    # Add your service account credentials
})
firebase_admin.initialize_app(cred)

def verify_token(handler_func):
    @wraps(handler_func)
    def wrapper(self, *args, **kwargs):
        auth_header = self.headers.get('Authorization')
        
        if not auth_header or not auth_header.startswith('Bearer '):
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'Unauthorized'
            }).encode())
            return
        
        token = auth_header.split('Bearer ')[1]
        
        try:
            decoded_token = auth.verify_id_token(token)
            self.user_id = decoded_token['uid']
            self.user_email = decoded_token.get('email')
            return handler_func(self, *args, **kwargs)
        except Exception as e:
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'Invalid token'
            }).encode())
            return
    
    return wrapper
```

## What's Next After Firebase Auth?

### 1. **User Dashboard** (`dashboard.html`)
- Display user profile
- Show subscription status
- Recent flight searches
- Saved flights
- Account settings

### 2. **Subscription Management**
- Link Firebase users to Stripe customers
- Handle subscription upgrades/downgrades
- Payment method management
- Billing history

### 3. **Personalized Features**
- Save favorite flights
- Set up flight alerts
- Track flight history
- Share flights with family

### 4. **Admin Panel**
- User management
- Subscription analytics
- Revenue tracking
- Support tickets

### 5. **Email Notifications**
- Welcome emails (SendGrid)
- Flight alerts
- Subscription reminders
- Password reset

### 6. **Security Enhancements**
- Two-factor authentication
- Session management
- Rate limiting per user
- Audit logs

## Environment Variables to Add to Vercel

```
# Firebase Admin SDK (for backend)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account"...}

# SendGrid (for emails)
SENDGRID_API_KEY=your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@flightandtrace.com

# Session Management
JWT_SECRET=generate_random_32_char_string
SESSION_SECRET=generate_random_32_char_string
```

## Testing Your Setup

1. **Test Sign Up**: Go to `/login.html` and create a new account
2. **Test Google Sign In**: Click "Sign in with Google"
3. **Test Protected Routes**: Try accessing `/dashboard.html` without login
4. **Test Subscription**: Complete a Stripe checkout after login
5. **Test Sign Out**: Verify logout works correctly

Your authentication system will be fully integrated with your existing Stripe payments!