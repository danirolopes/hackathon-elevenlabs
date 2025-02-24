from typing import AsyncIterator
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Request, status
import tempfile
import os

from src.infra.services.fal import FalService
from src.infra.services.groq import GroqService
from src.infra.services.elevenlabs import ElevenlabsService
from src.domain.models import Message, AudioMessage

router = APIRouter()


@router.post(
    "/tts/stream",
    summary=f"Publish the data to receive audio from LLM",
    description=(
        "Publish the data to receive audio from LLM"
    ),
    status_code=status.HTTP_200_OK,
    response_model=bytes
)
async def tts_stream(request: Message):
    text_audio = ElevenlabsService().generate(text=request.text)

    return StreamingResponse(text_audio, media_type="audio/mpeg")


@router.post(
    "/stt/stream",
    summary=f"Publish the audio data to receive audio from LLM",
    description=(
        "Publish the audio data to receive audio from LLM"
    ),
    status_code=status.HTTP_200_OK,
)
async def stt_stream(request: AudioMessage) -> None:
    fd, tmp_file_path = tempfile.mkstemp(suffix='.wav', dir='./src/tmp')

    with os.fdopen(fd, 'wb') as tmp_file:
        audio_data = await audio.read()
        tmp_file.write(audio_data)

    transcription = await GroqService().stt(audio_file_path=tmp_file_path)

    return {"transcription: ", transcription}


