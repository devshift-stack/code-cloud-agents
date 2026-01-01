#!/bin/bash
# Auto-Debug Script for Cloud Agents
# Führt alle Debugging-Checks automatisch aus

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   AUTO-DEBUG: Frontend-Backend Diagnose"
echo "   Server: $(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost')"
echo "   Zeit: $(date '+%Y-%m-%d %H:%M:%S')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Zähler
PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}! WARN${NC}: $1"
    ((WARN++))
}

# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[1/7] PM2 Prozesse prüfen${NC}"
echo "────────────────────────────────────────────────────────────"

PM2_STATUS=$(pm2 jlist 2>/dev/null)
if [ -z "$PM2_STATUS" ] || [ "$PM2_STATUS" == "[]" ]; then
    check_fail "PM2 läuft nicht oder keine Prozesse"
else
    ONLINE=$(echo "$PM2_STATUS" | grep -o '"status":"online"' | wc -l)
    STOPPED=$(echo "$PM2_STATUS" | grep -o '"status":"stopped"' | wc -l)
    ERRORED=$(echo "$PM2_STATUS" | grep -o '"status":"errored"' | wc -l)

    if [ "$ONLINE" -gt 0 ]; then
        check_pass "$ONLINE Prozess(e) online"
    fi
    if [ "$STOPPED" -gt 0 ]; then
        check_warn "$STOPPED Prozess(e) gestoppt"
    fi
    if [ "$ERRORED" -gt 0 ]; then
        check_fail "$ERRORED Prozess(e) mit Fehler"
    fi

    # Zeige Prozesse
    echo ""
    pm2 list --no-color 2>/dev/null | head -15
fi
echo ""

# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[2/7] Port-Belegung prüfen${NC}"
echo "────────────────────────────────────────────────────────────"

PORTS_TO_CHECK="3000 3001 4000 8000"
for PORT in $PORTS_TO_CHECK; do
    if netstat -tuln 2>/dev/null | grep -q ":$PORT " || ss -tuln 2>/dev/null | grep -q ":$PORT "; then
        SERVICE=$(lsof -i :$PORT 2>/dev/null | tail -1 | awk '{print $1}')
        check_pass "Port $PORT belegt ($SERVICE)"
    else
        echo "  Port $PORT: nicht belegt"
    fi
done
echo ""

# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[3/7] Backend Health-Checks${NC}"
echo "────────────────────────────────────────────────────────────"

# Cloud-Agents Backend - versuche Port 4000, dann 3002 (Server-abhängig)
BACKEND_PORT=""
for PORT in 4000 3002; do
    BACKEND_RESP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:$PORT/health 2>/dev/null)
    if [ "$BACKEND_RESP" == "200" ]; then
        check_pass "Cloud-Agents Backend (Port $PORT) antwortet"
        BACKEND_PORT=$PORT
        break
    fi
done

if [ -z "$BACKEND_PORT" ]; then
    # Prüfe ob irgendwas auf den Ports läuft
    if ss -tuln 2>/dev/null | grep -qE ":4000|:3002"; then
        check_warn "Backend-Port belegt aber /health antwortet nicht"
    else
        check_fail "Cloud-Agents Backend nicht erreichbar (4000/3002)"
    fi
fi

# Admin Dashboard (Port 3000 oder 3001) - 200 oder 307 (Redirect) ist OK
ADMIN_PORT=""
for PORT in 3000 3001; do
    ADMIN_RESP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://localhost:$PORT 2>/dev/null)
    # 200 = OK, 307/308 = Redirect (normal für Next.js)
    if [[ "$ADMIN_RESP" == "200" || "$ADMIN_RESP" == "307" || "$ADMIN_RESP" == "308" ]]; then
        check_pass "Admin Dashboard (Port $PORT) antwortet ($ADMIN_RESP)"
        ADMIN_PORT=$PORT
        break
    fi
done

if [ -z "$ADMIN_PORT" ]; then
    check_fail "Admin Dashboard nicht erreichbar (3000/3001)"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[4/7] API Endpoints testen${NC}"
echo "────────────────────────────────────────────────────────────"

# Test verschiedene API Endpoints (nutze erkannten Backend-Port)
API_PORT=${BACKEND_PORT:-4000}
ENDPOINTS=(
    "http://localhost:$API_PORT/health"
    "http://localhost:$API_PORT/api"
    "http://localhost:$API_PORT/api/tasks"
)

for EP in "${ENDPOINTS[@]}"; do
    RESP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$EP" 2>/dev/null)
    EP_SHORT=$(echo "$EP" | sed 's|http://localhost:[0-9]*/||')
    if [ "$RESP" == "200" ]; then
        check_pass "$EP_SHORT → 200 OK"
    elif [ "$RESP" == "401" ]; then
        check_warn "$EP_SHORT → 401 (Auth erforderlich)"
    elif [ "$RESP" == "404" ]; then
        echo "  $EP_SHORT → 404 (nicht gefunden)"
    elif [ "$RESP" == "000" ]; then
        check_fail "$EP_SHORT → Keine Verbindung"
    else
        check_warn "$EP_SHORT → $RESP"
    fi
done
echo ""

# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[5/7] Datenbank-Verbindung prüfen${NC}"
echo "────────────────────────────────────────────────────────────"

# SQLite (Code Cloud Agents verwendet SQLite, nicht PostgreSQL)
SQLITE_DB="/root/cloud-agents/data/database.sqlite"
SQLITE_DB_ALT="./data/database.sqlite"

if [ -f "$SQLITE_DB" ]; then
    DB_SIZE=$(ls -lh "$SQLITE_DB" 2>/dev/null | awk '{print $5}')
    check_pass "SQLite Datenbank vorhanden ($DB_SIZE)"
elif [ -f "$SQLITE_DB_ALT" ]; then
    DB_SIZE=$(ls -lh "$SQLITE_DB_ALT" 2>/dev/null | awk '{print $5}')
    check_pass "SQLite Datenbank vorhanden ($DB_SIZE)"
else
    # Suche nach SQLite DB in gängigen Orten
    FOUND_DB=$(find /root -name "*.sqlite" -o -name "*.db" 2>/dev/null | head -1)
    if [ -n "$FOUND_DB" ]; then
        DB_SIZE=$(ls -lh "$FOUND_DB" 2>/dev/null | awk '{print $5}')
        check_pass "SQLite gefunden: $FOUND_DB ($DB_SIZE)"
    else
        check_warn "Keine SQLite Datenbank gefunden"
    fi
fi
echo ""

# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[6/7] Letzte Fehler in Logs${NC}"
echo "────────────────────────────────────────────────────────────"

# PM2 Error Logs der letzten Minuten
ERRORS_FOUND=0
for LOGFILE in /root/.pm2/logs/*-error.log; do
    if [ -f "$LOGFILE" ]; then
        RECENT_ERRORS=$(tail -50 "$LOGFILE" 2>/dev/null | grep -iE "error|exception|fatal|crash" | tail -3)
        if [ -n "$RECENT_ERRORS" ]; then
            LOGNAME=$(basename "$LOGFILE")
            echo -e "${YELLOW}$LOGNAME:${NC}"
            echo "$RECENT_ERRORS" | head -3 | sed 's/^/  /'
            ((ERRORS_FOUND++))
        fi
    fi
done

if [ "$ERRORS_FOUND" -eq 0 ]; then
    check_pass "Keine kritischen Fehler in Logs"
else
    check_warn "$ERRORS_FOUND Log-Datei(en) mit Fehlern"
fi
echo ""

# ═══════════════════════════════════════════════════════════════
echo -e "${BLUE}[7/7] System-Ressourcen${NC}"
echo "────────────────────────────────────────────────────────────"

# Speicher
MEM_TOTAL=$(free -m 2>/dev/null | awk '/^Mem:/{print $2}')
MEM_USED=$(free -m 2>/dev/null | awk '/^Mem:/{print $3}')
if [ -n "$MEM_TOTAL" ] && [ -n "$MEM_USED" ]; then
    MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
    if [ "$MEM_PERCENT" -lt 80 ]; then
        check_pass "RAM: ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PERCENT}%)"
    elif [ "$MEM_PERCENT" -lt 95 ]; then
        check_warn "RAM: ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PERCENT}%)"
    else
        check_fail "RAM kritisch: ${MEM_USED}MB / ${MEM_TOTAL}MB (${MEM_PERCENT}%)"
    fi
fi

# Disk
DISK_PERCENT=$(df -h / 2>/dev/null | awk 'NR==2 {gsub(/%/,""); print $5}')
if [ -n "$DISK_PERCENT" ]; then
    if [ "$DISK_PERCENT" -lt 80 ]; then
        check_pass "Disk: ${DISK_PERCENT}% belegt"
    elif [ "$DISK_PERCENT" -lt 95 ]; then
        check_warn "Disk: ${DISK_PERCENT}% belegt"
    else
        check_fail "Disk kritisch: ${DISK_PERCENT}% belegt"
    fi
fi

# CPU Load
LOAD=$(cat /proc/loadavg 2>/dev/null | awk '{print $1}')
CORES=$(nproc 2>/dev/null || echo 1)
if [ -n "$LOAD" ]; then
    LOAD_INT=${LOAD%.*}
    if [ "$LOAD_INT" -lt "$CORES" ]; then
        check_pass "CPU Load: $LOAD (${CORES} Cores)"
    else
        check_warn "CPU Load hoch: $LOAD (${CORES} Cores)"
    fi
fi
echo ""

# ═══════════════════════════════════════════════════════════════
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   ZUSAMMENFASSUNG"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "   ${GREEN}✓ PASS: $PASS${NC}  |  ${YELLOW}! WARN: $WARN${NC}  |  ${RED}✗ FAIL: $FAIL${NC}"
echo ""

if [ "$FAIL" -gt 0 ]; then
    echo -e "   ${RED}STATUS: PROBLEME GEFUNDEN${NC}"
    echo "   → Prüfe die FAIL-Meldungen oben"
    exit 1
elif [ "$WARN" -gt 0 ]; then
    echo -e "   ${YELLOW}STATUS: WARNUNGEN VORHANDEN${NC}"
    echo "   → System läuft, aber prüfe Warnungen"
    exit 0
else
    echo -e "   ${GREEN}STATUS: ALLES OK${NC}"
    exit 0
fi
