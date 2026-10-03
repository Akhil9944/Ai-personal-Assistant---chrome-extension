from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat import router as chat_router

app = FastAPI(
    title="Screen-Aware Gemini AI Assistant API",
    description="Backend API powering the multimodal screen-aware Chrome extension",
    version="1.0.0"
)

# CORS configuration to allow Chrome Extensions (chrome-extension://*) and localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Screen-Aware Gemini AI Assistant API is up and running.",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health():
    return {"status": "healthy"}
