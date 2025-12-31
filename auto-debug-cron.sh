#!/bin/bash
# Auto-Debug mit Slack Alert
# Wird täglich um 6:00 Uhr und nach jedem Deploy ausgeführt

LOG_FILE="/var/log/auto-debug.log"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
HOSTNAME=$(hostname -I 2>/dev/null | awk '{print $1}' || hostname)
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Farben für Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Diagnose ausführen
run_diagnosis() {
    PASS=0
    FAIL=0
    WARN=0
    DETAILS=""

    # 1. PM2 Check
    PM2_STATUS=$(pm2 jlist 2>/dev/null)
    ONLINE=$(echo "$PM2_STATUS" | grep -o '"status":"online"' | wc -l)
    ERRORED=$(echo "$PM2_STATUS" | grep -o '"status":"errored"' | wc -l)

    if [ "$ONLINE" -gt 0 ] && [ "$ERRORED" -eq 0 ]; then
        ((PASS++))
    elif [ "$ERRORED" -gt 0 ]; then
        ((FAIL++))
        DETAILS="${DETAILS}\n❌ PM2: $ERRORED Prozess(e) mit Fehler"
    else
        ((WARN++))
        DETAILS="${DETAILS}\n⚠️ PM2: Keine Prozesse laufen"
    fi

    # 2. Port Check (4000 = Backend)
    if netstat -tuln 2>/dev/null | grep -q ":4000 " || ss -tuln 2>/dev/null | grep -q ":4000 "; then
        ((PASS++))
    else
        ((FAIL++))
        DETAILS="${DETAILS}\n❌ Backend Port 4000 nicht belegt"
    fi

    # 3. API Health Check
    API_RESP=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 http://localhost:4000/api/health 2>/dev/null)
    if [ "$API_RESP" == "200" ]; then
        ((PASS++))
    elif [ "$API_RESP" == "404" ]; then
        # Kein health endpoint, aber Server antwortet
        ((PASS++))
    elif [ "$API_RESP" == "000" ]; then
        ((FAIL++))
        DETAILS="${DETAILS}\n❌ API nicht erreichbar (Port 4000)"
    else
        ((WARN++))
        DETAILS="${DETAILS}\n⚠️ API antwortet mit $API_RESP"
    fi

    # 4. Disk Check
    DISK_PERCENT=$(df -h / 2>/dev/null | awk 'NR==2 {gsub(/%/,""); print $5}')
    if [ -n "$DISK_PERCENT" ] && [ "$DISK_PERCENT" -gt 90 ]; then
        ((FAIL++))
        DETAILS="${DETAILS}\n❌ Disk kritisch: ${DISK_PERCENT}% belegt"
    elif [ -n "$DISK_PERCENT" ] && [ "$DISK_PERCENT" -gt 80 ]; then
        ((WARN++))
        DETAILS="${DETAILS}\n⚠️ Disk: ${DISK_PERCENT}% belegt"
    else
        ((PASS++))
    fi

    # 5. RAM Check
    MEM_PERCENT=$(free 2>/dev/null | awk '/^Mem:/{printf "%.0f", $3/$2*100}')
    if [ -n "$MEM_PERCENT" ] && [ "$MEM_PERCENT" -gt 95 ]; then
        ((FAIL++))
        DETAILS="${DETAILS}\n❌ RAM kritisch: ${MEM_PERCENT}%"
    elif [ -n "$MEM_PERCENT" ] && [ "$MEM_PERCENT" -gt 85 ]; then
        ((WARN++))
        DETAILS="${DETAILS}\n⚠️ RAM: ${MEM_PERCENT}%"
    else
        ((PASS++))
    fi

    # 6. Error Logs Check (letzte Stunde)
    RECENT_ERRORS=0
    for LOGFILE in /root/.pm2/logs/*-error.log; do
        if [ -f "$LOGFILE" ]; then
            # Zähle kritische Fehler in letzter Stunde
            COUNT=$(find "$LOGFILE" -mmin -60 -exec grep -ciE "fatal|crash|ECONNREFUSED|ENOMEM" {} \; 2>/dev/null)
            RECENT_ERRORS=$((RECENT_ERRORS + COUNT))
        fi
    done

    if [ "$RECENT_ERRORS" -gt 10 ]; then
        ((FAIL++))
        DETAILS="${DETAILS}\n❌ $RECENT_ERRORS kritische Fehler in Logs (letzte Stunde)"
    elif [ "$RECENT_ERRORS" -gt 0 ]; then
        ((WARN++))
        DETAILS="${DETAILS}\n⚠️ $RECENT_ERRORS Fehler in Logs"
    else
        ((PASS++))
    fi

    # Ergebnis
    echo "PASS=$PASS"
    echo "FAIL=$FAIL"
    echo "WARN=$WARN"
    echo "DETAILS=$DETAILS"
}

# Slack Nachricht senden
send_slack() {
    local STATUS=$1
    local PASS=$2
    local FAIL=$3
    local WARN=$4
    local DETAILS=$5

    if [ -z "$SLACK_WEBHOOK" ]; then
        echo "Kein SLACK_WEBHOOK_URL gesetzt, überspringe Slack"
        return
    fi

    if [ "$STATUS" == "FAIL" ]; then
        EMOJI="🚨"
        COLOR="#dc3545"
        TEXT="PROBLEME auf Server $HOSTNAME"
    elif [ "$STATUS" == "WARN" ]; then
        EMOJI="⚠️"
        COLOR="#ffc107"
        TEXT="Warnungen auf Server $HOSTNAME"
    else
        EMOJI="✅"
        COLOR="#28a745"
        TEXT="Server $HOSTNAME OK"
    fi

    PAYLOAD=$(cat <<EOF
{
    "attachments": [{
        "color": "$COLOR",
        "blocks": [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": "$EMOJI Auto-Diagnose: $TEXT"}
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": "*Server:*\n$HOSTNAME"},
                    {"type": "mrkdwn", "text": "*Zeit:*\n$DATE"},
                    {"type": "mrkdwn", "text": "*✓ PASS:*\n$PASS"},
                    {"type": "mrkdwn", "text": "*✗ FAIL:*\n$FAIL"},
                    {"type": "mrkdwn", "text": "*! WARN:*\n$WARN"}
                ]
            }
        ]
    }]
}
EOF
)

    # Details hinzufügen wenn vorhanden
    if [ -n "$DETAILS" ]; then
        DETAILS_CLEAN=$(echo -e "$DETAILS" | sed 's/"/\\"/g' | tr '\n' ' ')
        PAYLOAD=$(echo "$PAYLOAD" | sed 's/}]}$/},{"type":"section","text":{"type":"mrkdwn","text":"'"$DETAILS_CLEAN"'"}}]}/')
    fi

    curl -s -X POST -H 'Content-type: application/json' --data "$PAYLOAD" "$SLACK_WEBHOOK" > /dev/null
}

# Hauptlogik
main() {
    echo "[$DATE] Auto-Diagnose gestartet auf $HOSTNAME" >> "$LOG_FILE"

    # Diagnose ausführen
    eval $(run_diagnosis)

    # Status bestimmen
    if [ "$FAIL" -gt 0 ]; then
        STATUS="FAIL"
    elif [ "$WARN" -gt 0 ]; then
        STATUS="WARN"
    else
        STATUS="OK"
    fi

    # Log schreiben
    echo "[$DATE] Status: $STATUS (PASS=$PASS, FAIL=$FAIL, WARN=$WARN)" >> "$LOG_FILE"

    # Terminal Output
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  AUTO-DIAGNOSE: $HOSTNAME"
    echo "  $DATE"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "  ${GREEN}✓ PASS: $PASS${NC}  |  ${YELLOW}! WARN: $WARN${NC}  |  ${RED}✗ FAIL: $FAIL${NC}"

    if [ -n "$DETAILS" ]; then
        echo ""
        echo -e "$DETAILS"
    fi
    echo ""

    # Slack Alert nur bei FAIL oder WARN
    if [ "$STATUS" == "FAIL" ] || [ "$STATUS" == "WARN" ]; then
        send_slack "$STATUS" "$PASS" "$FAIL" "$WARN" "$DETAILS"
        echo "📤 Slack Alert gesendet"
    fi

    # Exit Code
    if [ "$STATUS" == "FAIL" ]; then
        exit 1
    else
        exit 0
    fi
}

main "$@"
