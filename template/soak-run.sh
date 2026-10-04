#!/usr/bin/env bash
# SOAK-тест — запускать ВРУЧНУЮ, не через агента.
# Требует bash (POSIX sh). Windows: Git Bash (идёт с Git for Windows) или WSL.
# Использование: bash soak-run.sh [DURATION] [RATE]   (по умолчанию: 2h, <70% от колена>)
# Артефакты: reports/summary-*-soak-*.json (k6) + soak-metrics.txt (сэмплы heap/пула).
set -uo pipefail
cd "$(dirname "$0")"
mkdir -p reports
rm -f soak-metrics.txt

SERVICE="<service>"            # имя сервиса из lib/services.js
BASE_URL="<url>"               # напр. http://host.docker.internal:8080
DURATION="${1:-2h}"
RATE="${2:-<70% от колена>}"   # подставить 70% найденного колена
INTERVAL=15

case "$DURATION" in
  *h) DURATION_SECONDS=$(( ${DURATION%h} * 3600 )) ;;
  *m) DURATION_SECONDS=$(( ${DURATION%m} * 60 )) ;;
  *)  DURATION_SECONDS=7200 ;;
esac
SAMPLES=$(( DURATION_SECONDS / INTERVAL ))

echo "=== SOAK: RATE=${RATE}, DURATION=${DURATION} ==="
START=$(date +%s)
SPINNER='|/-\'

( for i in $(seq 1 "$SAMPLES"); do
    m=$(curl -s "${BASE_URL}/system/metrics")
    cpu=$(echo "$m" | grep '^process_cpu_usage' | awk '{printf "%.0f", $NF*100}')
    heap=$(echo "$m" | grep -E 'jvm_memory_used_bytes.*id="[^"]*(Tenured|Old)[^"]*"' | head -1 | awk '{printf "%.0f", $NF/1048576}')
    active=$(echo "$m" | grep '^hikaricp_connections_active' | awk '{printf "%.0f", $NF}')
    max=$(echo "$m" | grep '^hikaricp_connections_max' | awk '{printf "%.0f", $NF}')
    pending=$(echo "$m" | grep '^hikaricp_connections_pending' | awk '{printf "%.0f", $NF}')
    metrics="cpu=${cpu}% heap=${heap}MB pool=${active}/${max} pending=${pending}"
    remaining=$(( DURATION_SECONDS - ($(date +%s) - START) ))
    rem="$((remaining/60))м$((remaining%60))с"
    echo "[$(date +%H:%M:%S)] осталось ${rem} | ${metrics}" >> soak-metrics.txt
    ticks=$(( INTERVAL * 4 ))
    for j in $(seq 1 "$ticks"); do
      spin=$(printf '%s' "$SPINNER" | cut -c"$(( (j-1) % 4 + 1 ))")
      remaining=$(( DURATION_SECONDS - ($(date +%s) - START) ))
      rem="$((remaining/60))м$((remaining%60))с"
      printf '\r[%s] осталось %s | %s   ' "$spin" "$rem" "$metrics"
      sleep 0.25
    done
  done ) & SAMPLER=$!
trap 'kill $SAMPLER 2>/dev/null; echo; echo "=== SOAK завершён: $(date '+%H:%M:%S') ==="' EXIT

docker run --rm -u "$(id -u):$(id -g)" -v "$PWD":/k6 -w /k6 grafana/k6:0.57.0 run --quiet \
  -e SERVICE=${SERVICE} -e BASE_URL=${BASE_URL} -e RATE=${RATE} -e DURATION=${DURATION} -e PRE_ALLOCATED_VUS=40 \
  scripts/throughput-soak.js
