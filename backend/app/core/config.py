import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "SupportIQ"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "supportiq-super-secret-jwt-key-for-local-demo-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    DATABASE_URL: str = "sqlite:///./supportiq.db"
    UPLOAD_DIR: str = "./uploads"
    
    # AI Provider: "demo", "gemini", "groq", "openai"
    AI_PROVIDER: str = "demo"
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    AI_MODEL: str = ""
    
    # Retrieval parameters
    RETRIEVAL_CONFIDENCE_THRESHOLD: float = 0.35
    MAX_RETRIEVAL_CHUNKS: int = 5
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()

# Ensure uploads directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
