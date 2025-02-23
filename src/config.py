import logging
import os
import sys

import pydash as _
from typing import cast, get_type_hints
from pydantic import BaseModel, ValidationError


class Config(BaseModel):
    ELEVENLABS_API_KEY: str
    HOST: str
    PORT: int
    FAL_KEY: str
    GROQ_API_KEY: str

    @property
    def DOCS_URL(self) -> str | None:
        return "/docs"

    @property
    def REDOC_URL(self) -> str | None:
        return "/redoc"


class HelperConfig:
    _logger = logging.getLogger(__name__)

    def __init__(self) -> None:
        self._config_type = Config
        self._config: Config | None = None

    def _get_variables(self) -> dict[str, str]:
        variables: dict[str, str] = {}

        for model_field in self._config_type.model_fields:
            if model_field in os.environ:
                variables[model_field] = os.environ[model_field]

        return variables

    def _initialize(self) -> None:
        try:
            variables = self._get_variables()
            self._config = self._config_type.model_validate(variables)
        except ValidationError as error:
            self._logger.error(
                msg="Initialization failed, invalid configuration",
                extra={
                    "errors": error.errors(
                        include_input=False,
                        include_url=False,
                    ),
                },
            )
            logging.shutdown()
            sys.exit(1)

    def __getattr__(self, name: str) -> object:
        if self._config is None:
            self._initialize()

        return getattr(self._config, name)


config = cast(Config, HelperConfig())
