from groq import Groq
from src.config import config

class GroqService:
    def __init__(
        self,
    ) -> None:
        self._groq_client = Groq(api_key=config.GROQ_API_KEY)

    async def stt(
        self,
        audio_file_path: str
    ):
        with open(audio_file_path, "rb") as file:
            transcription = self._groq_client.audio.transcriptions.create(
            file=(audio_file_path, file.read()),
            model="whisper-large-v3-turbo",
            response_format="json",

        )

        return transcription.text
