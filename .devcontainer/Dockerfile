FROM mcr.microsoft.com/devcontainers/go:1.26-bookworm

ARG NODE_VERSION=22

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    curl \
    git \
    gnupg \
    make \
    postgresql-client \
  && curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && npm install -g npm@latest \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV GOFLAGS="-buildvcs=false"
ENV GOCACHE="/home/vscode/.cache/go-build"
ENV GOPATH="/home/vscode/go"

WORKDIR /workspace