#!/usr/bin/env bash
set -euo pipefail

ATTEMPTS=5
LEDGER=static/data/notified.json

if [ -z "${GITLAB_PUSH_TOKEN:-}" ]; then
  echo 'GITLAB_PUSH_TOKEN not set — dataset will not be committed'
  exit 0
fi

git config user.name 'nemaleba-bot'
git config user.email 'bot@nemaleba.rs'

remote="origin/${CI_DEFAULT_BRANCH}"
held=$(mktemp -d)

for attempt in $(seq 1 "${ATTEMPTS}"); do
  rm -rf "${held}/data"
  cp -r static/data "${held}/data"

  git fetch --quiet origin "${CI_DEFAULT_BRANCH}"

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

  if git push --quiet \
    "https://oauth2:${GITLAB_PUSH_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git" \
    "HEAD:${CI_DEFAULT_BRANCH}"; then
    echo "dataset committed on attempt ${attempt}"
    exit 0
  fi

  echo "branch moved during the run, retrying (${attempt}/${ATTEMPTS})"
done

echo 'could not commit the dataset — deliveries this run would be repeated'
exit 1
