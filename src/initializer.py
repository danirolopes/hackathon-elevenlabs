import os

import uvicorn


class Initializer:
    def __init__(
        self,
        *,
        app: str,
        host: str,
        port: int,
    ) -> None:
        self._app = app
        self._host = host
        self._port = port

    def start(self) -> None:
        log_level = os.environ.get("LOG_LEVEL", "info").lower()

        uvicorn.run(
            app=self._app,
            host=self._host,
            port=self._port,
            log_level=log_level,
            log_config=None,
        )
