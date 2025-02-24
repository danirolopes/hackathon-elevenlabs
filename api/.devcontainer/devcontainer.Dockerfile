FROM python:3.12-slim

RUN mkdir -p /workspaces

ARG UID=1000

ARG GID=1000

RUN groupadd -f -o -r -g $GID vscode \
  && useradd -ms /bin/bash -o -u $UID -g $GID vscode

RUN chown -R vscode:vscode /workspaces

RUN apt-get update \
  && apt-get -y install --no-install-recommends openssh-client fontconfig fonts-powerline curl git jq locales \
  && rm -rf /var/lib/apt/lists/*

RUN localedef -i en_US -c -f UTF-8 -A /usr/share/locale/locale.alias en_US.UTF-8

ENV LANG en_US.utf8

ENV LANGUAGE en_US

RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
    && mkdir /commandhistory \
    && touch /commandhistory/.bash_history \
    && chown -R vscode:vscode /commandhistory \
    && echo "$SNIPPET" >> "/home/vscode/.bashrc"

USER vscode

RUN pip install --user -U pip setuptools "pdm>=2.18,<3"

RUN <<PDMSHELL cat >> /home/vscode/.bashrc
pdm() {
  local command=\$1
  if [[ "\$command" == "shell" ]]; then
    eval \$(pdm venv activate)
  else
    command pdm \$@
  fi
}
PDMSHELL
