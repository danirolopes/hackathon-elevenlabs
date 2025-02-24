from elevenlabs.client import ElevenLabs

from src.config import config

class ElevenlabsService:
    def __init__(
        self,
    ) -> None:
        self._elevenlabs_client = ElevenLabs(api_key=config.ELEVENLABS_API_KEY)

    async def generate(
        self,
        text: str
    ):
        stream = self._elevenlabs_client.generate(
            text=text,
            voice="JBFqnCBsd6RMkjVDRZzb",
            model="eleven_multilingual_v2",
            stream=True
        )

        for chunk in stream:
            yield chunk
