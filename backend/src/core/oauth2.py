# OAuth2/SSO backend scaffold for FastAPI

from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from src.core.config import settings
from src.db.database import get_connection
from src.core.auth import create_access_token

router = APIRouter(tags=["oauth2"])

oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

@router.get("/login/google")
async def login_google(request: Request):
    redirect_uri = settings.FRONTEND_URL + "/oauth2/callback/google"
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/oauth2/callback/google")
async def auth_google(request: Request):
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = await oauth.google.parse_id_token(request, token)
        email = user_info.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="No email from provider")
        conn = get_connection()
        cursor = conn.cursor()
        # Try to find user by email
        cursor.execute("SELECT user_id FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        if row:
            user_id = row[0]
        else:
            # Create new user
            cursor.execute("INSERT INTO users (email, username, email_verified, is_active) VALUES (?, ?, 1, 1)", (email, email.split('@')[0]))
            user_id = cursor.lastrowid
            conn.commit()
        conn.close()
        # Issue JWT
        jwt_token = create_access_token({"sub": user_id, "email": email})
        # Redirect to frontend with token
        return RedirectResponse(url=settings.FRONTEND_URL + f"/login/success?token={jwt_token}")
    except Exception as e:
        raise HTTPException(status_code=400, detail="OAuth2 login failed")
