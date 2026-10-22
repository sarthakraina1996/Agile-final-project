#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v npm >/dev/null 2>&1; then
  echo "Install Node.js 24 LTS from https://nodejs.org, then open this launcher again."
  printf "Press Enter to close. "
  read -r answer
  exit 1
fi
npm run local
result=$?
if [ "$result" -ne 0 ]; then
  printf "Press Enter to close. "
  read -r answer
fi
exit "$result"
