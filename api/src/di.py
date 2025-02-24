from injector import Module, provider, singleton
from elevenlabs.client import ElevenLabs

from src.initializer import Initializer
from src.config import config


class DiModule(Module):
    @singleton
    @provider
    def provide_initializer(self) -> Initializer:
        return Initializer(
            app="src.infra.http.fastapi:app",
            host=config.HOST,
            port=config.PORT,
        )
