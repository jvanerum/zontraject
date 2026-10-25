#!/usr/bin/env bash
# Opstartcheck voor ZonTraject (Git Bash op Windows). Wordt gebruikt door de /resume-skill.
set -euo pipefail
cd "$(dirname "$0")"

echo "== Git"
git status --short
git log --oneline -5 2>/dev/null || echo "  (nog geen commits)"

echo "== Tools"
for c in git uv node npm; do  # Python zelf beheert uv
  printf "  %-8s %s\n" "$c" "$(command -v "$c" >/dev/null && echo ok || echo ONTBREEKT)"
done

echo "== Backend: sync + tests + lint"
uv sync -q && uv run pytest -q && uv run ruff check .

if command -v npm >/dev/null; then
  echo "== Frontend: install + build"
  (cd web && npm install --silent --no-fund --no-audit && npm run build)
else
  echo "== Frontend overgeslagen (Node ontbreekt)"
fi

echo
echo "Starten: uv run uvicorn zontraject.main:app --reload  →  http://127.0.0.1:8000"
