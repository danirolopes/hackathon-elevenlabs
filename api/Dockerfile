FROM gcr.io/qt-shared-services-3w/python:3.12 as base

ENV WORKDIR=/app

WORKDIR $WORKDIR

RUN pip install -U pip setuptools "pdm>=2.18,<3"

COPY . .

#-----------------------------------------------------

FROM base as runtime

RUN pdm install --prod --skip=:post

CMD ["pdm", "run", "start"]
