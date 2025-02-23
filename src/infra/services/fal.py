import fal_client

from src.config import config

class FalService:
    def __init__(
        self,
    ) -> None:
        self._fala_ai_client = fal_client

    async def stt(
        self,
        audio_file_path: str
    ):
        handler = self._fala_ai_client.subscribe(
        "fal-ai/whisper",
            arguments={
                "audio_url": audio_file_path
            },
        )

        print(handler)
        # return handler.text

