# Git-basiertes Deployment - Setup Dokumentation

**Datum:** 2025-12-26
**Server:** 178.156.178.70
**Repository:** https://github.com/dsactivi-2/code-cloud-agents

---

## ✅ Setup Abgeschlossen

### 1. SSH Key Konfiguration

**Server:** `/root/.ssh/github_deploy` (ed25519)
**GitHub:** Deploy Key hinzugefügt mit Write-Access
**SSH Config:** `/root/.ssh/config` konfiguriert für github.com

**Test-Befehl:**

```bash
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "ssh -T git@github.com"
# Output: Hi dsactivi-2/code-cloud-agents! You've successfully authenticated...
```

### 2. Git Repository Konfiguration

**Branch:** main (korrekt eingerichtet)
**Remote:** `git@github.com:dsactivi-2/code-cloud-agents.git` (SSH)
**Status:** Up to date mit origin/main

**Verifikation:**

```bash
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "cd /root/cloud-agents && git status"
# On branch main
# Your branch is up to date with 'origin/main'.
# nothing to commit, working tree clean
```

---

## 🚀 Neuer Deployment-Prozess

### Automatisches Deployment mit `./deploy.sh`

Das Deployment-Script wurde von rsync auf git-basiert umgestellt:

**Schritte:**

1. **Local Checks** - Prüft auf uncommitted changes
2. **Push to GitHub** - Pusht zum main branch
3. **Pull on Server** - Fetcht und reset auf origin/main
4. **Install Dependencies** - `npm ci --legacy-peer-deps`
5. **Restart PM2** - Startet Backend neu
6. **Health Check** - Verifiziert Server-Status

**Verwendung:**

```bash
cd /Users/dsselmanovic/activi-dev-repos/Optimizecodecloudagents
./deploy.sh
```

### Vorteile gegenüber rsync

✅ **Git-History erhalten** - Vollständige Commit-Historie auf dem Server
✅ **Rollbacks möglich** - `git reset --hard <commit>` für schnelle Reverts
✅ **Schneller** - Nur geänderte Dateien werden übertragen
✅ **Sicherer** - Kein Risiko von gelöschten Dateien
✅ **Nachvollziehbar** - Jedes Deployment ist ein Git-Commit

---

## 🔧 Manuelle Deployment-Befehle

### Deployment ohne Script

```bash
# 1. Lokal pushen
git push origin main

# 2. Auf Server pullen
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 << 'EOF'
cd /root/cloud-agents
git fetch origin main
git reset --hard origin/main
git clean -fd
npm ci --legacy-peer-deps
pm2 restart cloud-agents-backend
EOF

# 3. Health Check
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "curl -sf http://localhost:3000/health" | jq .
```

### Rollback auf vorherige Version

```bash
# Git Log anzeigen
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "cd /root/cloud-agents && git log --oneline -10"

# Rollback auf bestimmten Commit
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 << 'EOF'
cd /root/cloud-agents
git reset --hard <commit-hash>
npm ci --legacy-peer-deps
pm2 restart cloud-agents-backend
EOF
```

---

## 📋 Deployment Checklist

Vor jedem Deployment:

- [ ] Lokale Tests erfolgreich (`npm test`)
- [ ] Keine uncommitted changes
- [ ] Auf main branch
- [ ] Code reviewed
- [ ] Breaking Changes dokumentiert

Nach jedem Deployment:

- [ ] Health Check erfolgreich (HTTP 200)
- [ ] PM2 Status grün
- [ ] Logs prüfen (keine Errors)
- [ ] Funktionalität testen

---

## 🔐 Sicherheit

**SSH Keys:**

- Server Key: `/root/.ssh/github_deploy` (privat, bleibt auf Server)
- GitHub Deploy Key: Nur für dieses Repository, Write-Access
- SSH Config: `StrictHostKeyChecking no` für automatisierte Deployments

**Secrets Management:**

- Doppler für alle Secrets (ANTHROPIC_API_KEY, etc.)
- Keine `.env` Dateien im Git-Repository
- Server-seitige Doppler-Konfiguration unabhängig von local

---

## 🐛 Troubleshooting

### Problem: Git pull schlägt fehl

```bash
# SSH-Verbindung testen
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "ssh -T git@github.com"

# Git Status prüfen
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "cd /root/cloud-agents && git status"

# Bei merge conflicts: Hard reset
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "cd /root/cloud-agents && git reset --hard origin/main"
```

### Problem: PM2 startet nicht

```bash
# Logs anzeigen
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "pm2 logs cloud-agents-backend --lines 50"

# PM2 komplett neu starten
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "pm2 delete cloud-agents-backend && pm2 start ecosystem.config.js"
```

### Problem: Health Check schlägt fehl

```bash
# Backend-Port prüfen
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "netstat -tulpn | grep :3000"

# Direkt auf Server testen
ssh -i ~/.ssh/activi_cloud_agent root@178.156.178.70 "curl -v http://localhost:3000/health"
```

---

## 📊 Deployment-Metriken

**Setup-Zeitpunkt:** 2025-12-26
**Erster erfolgreicher Git-Pull:** 2025-12-26
**Server-Version:** main branch (commit 904ab35)
**Deployment-Methode:** Git + SSH

---

**🤖 Generated with Claude Code**
**Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>**
