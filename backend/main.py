from src.db.database import init_db
from src.api.fastapi_app import app
import uvicorn

if __name__ == "__main__":
    init_db()
    uvicorn.run(app, host="0.0.0.0", port=8000)
