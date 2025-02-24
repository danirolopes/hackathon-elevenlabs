from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from src.config import config
from src.di import DiModule
from src.infra.http.router import router

app = FastAPI(
    docs_url=config.DOCS_URL,
    redoc_url=config.REDOC_URL,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get(
    "/healthz",
    status_code=status.HTTP_204_NO_CONTENT,
    include_in_schema=False,
)
async def _get_healthz() -> None: ...
