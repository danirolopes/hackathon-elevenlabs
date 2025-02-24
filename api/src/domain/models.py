from fastapi import UploadFile, File
from pydantic import BaseModel

class TextMessage(BaseModel):
    text: str


class AudioMessage(BaseModel):
    audio: UploadFile = File(...)
