#!/usr/bin/env bash
set -euo pipefail

LEDGER=static/data/notified.json

committed=$(mktemp)
git fetch --quiet origin "${CI_DEFAULT_BRANCH}"

if ! git show "origin/${CI_DEFAULT_BRANCH}:${LEDGER}" > "${committed}" 2>/dev/null; then
  echo '[]' > "${committed}"
fi

npx tsx scripts/ci/mergeLedger.ts "${committed}"
