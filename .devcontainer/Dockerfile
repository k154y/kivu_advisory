FROM mcr.microsoft.com/devcontainers/go:1.25-bookworm

ARG NODE_VERSION=22

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    git \
    postgresql-client \
    unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash - \
    && apt-get update \
    && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && rm -rf /var/lib/apt/lists/*

RUN go install github.com/air-verse/air@latest

USER vscode

WORKDIR /workspace
