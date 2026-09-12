#!/usr/bin/env bash
set -euo pipefail

ATTEMPTS=5
LEDGER=static/data/notified.json

# Credentials come from the checkout, so there is no token to check for. What has to be
# guaranteed is that the dataset is actually written back: a run that sends notifications
# and then fails to record them would send the same ones again next time, so a push that
# cannot be made fails the job rather than passing quietly.
git config user.name 'nemaleba-bot'
git config user.email 'bot@nemaleba.rs'

remote="origin/${DEFAULT_BRANCH}"
held=$(mktemp -d)

for attempt in $(seq 1 "${ATTEMPTS}"); do
  rm -rf "${held}/data"
  cp -r static/data "${held}/data"

  git fetch --quiet origin "${DEFAULT_BRANCH}"

  if ! git show "${remote}:${LEDGER}" > "${held}/ledger.json" 2>/dev/null; then
    echo '[]' > "${held}/ledger.json"
  fi

  git checkout --quiet --force -B persist "${remote}"

  rm -rf static/data
  cp -r "${held}/data" static/data
  npx tsx scripts/ci/mergeLedger.ts "${held}/ledger.json"

  git add static/data

  if git diff --staged --quiet; then
    echo 'dataset unchanged'
    exit 0
  fi

  git commit --quiet -m 'Refresh outage data [skip ci]'

  if git push --quiet origin "HEAD:${DEFAULT_BRANCH}"; then
    echo "dataset committed on attempt ${attempt}"
    exit 0
  fi

  echo "branch moved during the run, retrying (${attempt}/${ATTEMPTS})"
done

echo 'could not commit the dataset — deliveries this run would be repeated'
exit 1
