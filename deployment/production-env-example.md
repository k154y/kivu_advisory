# Kivu Advisory Production Environment Guide

This document explains how to configure the production environment for the Kivu Advisory platform.

The production backend uses:

- Go backend
- Next.js frontend
- Neon PostgreSQL
- Cloudflare R2 for private document storage
- Caddy or Nginx as reverse proxy
- Docker on VPS

Do not commit real production secrets to GitHub.

Real values should be stored only on the production server or in a secure secret manager.

---

## 1. Production Environment File Location

On the VPS, create a real production environment file.

Recommended path:

```txt
/opt/kivu-advisory/env/backend.env