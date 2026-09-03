#!/bin/sh

set -eu

cd "${CI_PRIMARY_REPOSITORY_PATH:-$(cd "$(dirname "$0")/.." && pwd)}"

npm ci
npm run ios:sync
