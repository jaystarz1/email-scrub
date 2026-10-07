#!/usr/bin/env bash
# Build, then run the engine tests and (if Playwright is available) the browser test.
set -e
cd "$(dirname "$0")/.."
python3 build.py
node tests/engine.test.js
node tests/browser.test.mjs
