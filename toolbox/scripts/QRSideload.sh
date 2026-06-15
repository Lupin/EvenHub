#!/usr/bin/env bash
cd "$(dirname "$0")"
npx evenhub qr --url "http://$(ipconfig getifaddr en0):5173"
npx vite --host 0.0.0.0 --port 5173
