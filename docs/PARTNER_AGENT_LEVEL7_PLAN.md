# Partner-Agent Level 7 (24/7 Cloud) - Kompletter Projektplan

## 📦 TEIL 1: Was du ALLES brauchst

```
┌─────────────────────────────────────────────────────────┐
│  ÜBERSICHT: Komponenten                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. APIs (Accounts + Keys)                              │
│     ├── Anthropic API (Claude)         ~$20/Monat      │
│     └── Slack API (kostenlos)          $0              │
│                                                         │
│  2. Server (24/7 Cloud)                                 │
│     ├── Option A: Hetzner VPS          ~€4/Monat       │
│     ├── Option B: Railway              ~$5/Monat       │
│     └── Option C: AWS EC2              ~$10/Monat      │
│                                                         │
│  3. Code-Repository                                     │
│     └── GitHub (kostenlos)             $0              │
│                                                         │
│  4. Dateisystem für Agent                               │
│     └── Auf dem Server selbst          $0              │
│                                                         │
│  5. Monitoring (optional)                               │
│     └── Uptime Kuma (self-hosted)      $0              │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  TOTAL MONATLICH:                      ~€10-25/Monat   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ TEIL 2: Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                        DEIN HANDY/PC                            │
│                             │                                   │
│                             │ Slack App                         │
│                             ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                     📱 SLACK                            │    │
│  │                                                         │    │
│  │   Du: "Baue mir eine Todo-App"                          │    │
│  │                                                         │    │
│  └───────────────────────────┬─────────────────────────────┘    │
│                              │                                  │
│                              │ Webhook                          │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                 ☁️ CLOUD SERVER (24/7)                  │    │
│  │                                                         │    │
│  │   ┌─────────────────────────────────────────────────┐   │    │
│  │   │           PARTNER-AGENT Level 7                 │   │    │
│  │   │                                                 │   │    │
│  │   │   1. Empfängt Nachricht                         │   │    │
│  │   │   2. Analysiert & denkt mit                     │   │    │
│  │   │   3. Fragt nach (via Slack)                     │   │    │
│  │   │   4. Wartet auf Antwort                         │   │    │
│  │   │   5. Plant mit Checkpoints                      │   │    │
│  │   │   6. Baut Code                                  │   │    │
│  │   │   7. Committed zu GitHub                        │   │    │
│  │   │   8. Reportet Ergebnis (via Slack)              │   │    │
│  │   │                                                 │   │    │
│  │   │   TOOLS:                                        │   │    │
│  │   │   ├── 📁 Dateien lesen/schreiben                │   │    │
│  │   │   ├── 💻 Code ausführen                         │   │    │
│  │   │   ├── 🔍 Web suchen                             │   │    │
│  │   │   └── 📤 Git push                               │   │    │
│  │   │                                                 │   │    │
│  │   └─────────────────────────────────────────────────┘   │    │
│  │                          │                              │    │
│  │                          │ Claude API                   │    │
│  │                          ▼                              │    │
│  │   ┌─────────────────────────────────────────────────┐   │    │
│  │   │              🧠 CLAUDE API                      │   │    │
│  │   │              (Anthropic)                        │   │    │
│  │   └─────────────────────────────────────────────────┘   │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              │ Git Push                         │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    📂 GITHUB                            │    │
│  │                    (Code-Repository)                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 TEIL 3: Kompletter Schritt-für-Schritt Plan

### PHASE 1: Accounts & APIs einrichten (1-2 Stunden)

#### 1.1 Anthropic Account erstellen
- Gehe zu: https://console.anthropic.com
- Account erstellen
- API-Key erstellen unter "API Keys"
- Key sicher speichern (beginnt mit `sk-ant-...`)
- $20 Guthaben aufladen

#### 1.2 Slack App erstellen
- Gehe zu: https://api.slack.com/apps
- Klicke "Create New App"
- Wähle "From scratch"
- Name: "Partner-Agent"
- Workspace auswählen

#### 1.3 Slack Berechtigungen setzen
- Gehe zu "OAuth & Permissions"
- Unter "Scopes" → "Bot Token Scopes" hinzufügen:
  - `chat:write`
  - `channels:read`
  - `channels:history`
  - `app_mentions:read`
  - `files:write`
- Gehe zu "Socket Mode" → Aktivieren
- Erstelle App-Level Token mit `connections:write` Scope
- "Install to Workspace" klicken
- Tokens speichern:
  - Bot Token: `xoxb-...`
  - App Token: `xapp-...`

#### 1.4 GitHub Repository erstellen
- Gehe zu: https://github.com/new
- Name: "agent-projects" (oder dein Name)
- Gehe zu Settings → Developer Settings → Personal Access Tokens
- "Generate new token (classic)"
- Scopes: `repo` (alle)
- Token speichern: `ghp_...`

---

### PHASE 2: Server einrichten (30-60 Minuten)

#### 2.1 Hetzner VPS bestellen
- Gehe zu: https://www.hetzner.com/cloud
- "Add Server" klicken
- Auswählen:
  - Location: Nürnberg oder Falkenstein
  - Image: Ubuntu 22.04
  - Type: CX11 (2 vCPU, 4GB RAM) - €4.50/Monat
- SSH Key hinzufügen (oder Passwort nutzen)
- Server erstellen
- IP-Adresse notieren

#### 2.2 Server verbinden
```bash
ssh root@DEINE_SERVER_IP
```

#### 2.3 Server Setup
```bash
# System updaten
apt update && apt upgrade -y

# Python installieren
apt install python3.11 python3-pip python3.11-venv git -y

# Projekt-Ordner erstellen
mkdir -p /opt/partner-agent/workspace
cd /opt/partner-agent

# Virtual Environment erstellen
python3.11 -m venv venv
source venv/bin/activate

# Dependencies installieren
pip install anthropic slack-sdk slack-bolt python-dotenv gitpython
```

#### 2.4 Environment Variables erstellen
```bash
nano /opt/partner-agent/.env
```

Inhalt:
```
ANTHROPIC_API_KEY=sk-ant-DEIN_KEY_HIER
SLACK_BOT_TOKEN=xoxb-DEIN_TOKEN_HIER
SLACK_APP_TOKEN=xapp-DEIN_TOKEN_HIER
GITHUB_TOKEN=ghp_DEIN_TOKEN_HIER
```

Speichern: `Ctrl+O`, `Enter`, `Ctrl+X`

---

### PHASE 3: Agent-Code erstellen (2-4 Stunden)

#### Dateistruktur
```
/opt/partner-agent/
├── main.py              # Hauptprogramm
├── agent.py             # Agent-Logik
├── tools.py             # Tools (File, Git, etc.)
├── slack_handler.py     # Slack Kommunikation
├── prompts.py           # System Prompts
├── .env                 # API Keys (schon erstellt)
├── requirements.txt     # Dependencies
└── workspace/           # Arbeitsordner für Agent
```

---

#### DATEI: requirements.txt
```
anthropic>=0.18.0
slack-sdk>=3.20.0
slack-bolt>=1.18.0
python-dotenv>=1.0.0
gitpython>=3.1.40
```

---

#### DATEI: prompts.py
```python
SYSTEM_PROMPT = """
Du bist ein Partner-Agent Level 7.

## Dein Verhalten

### Bei JEDER Aufgabe:
1. ANALYSIERE was alles nötig ist
2. SCHLAGE VOR was der User vergessen könnte:
   - MUSS: [kritische Features]
   - SOLLTE: [wichtige Features]
   - OPTIONAL: [nice-to-have]
3. FRAGE welche davon gewünscht sind
4. ZEIGE deinen Plan, warte auf OK
5. BAUE mit Checkpoints
6. BERICHTE am Ende was du gemacht hast

### Denke immer mit:
- Was könnte der User vergessen haben?
- Welche Risiken gibt es?
- Was sind Alternativen?

### Antwort-Format (JSON):
{
    "phase": "analyse|frage|plan|checkpoint|bauen|fertig",
    "nachricht": "Was du dem User sagst",
    "fragen": ["Frage 1", "Frage 2"],
    "vorschlaege": {"muss": [], "sollte": [], "optional": []},
    "plan": ["Schritt 1", "Schritt 2"],
    "code": "Falls du Code generiert hast",
    "datei": "Dateiname falls Code gespeichert werden soll",
    "warte_auf_ok": true/false
}

### Tools die du hast:
- Dateien lesen und schreiben
- Code ausführen
- Git commit und push
- Web suchen

### WICHTIG:
- NIEMALS ohne OK des Users große Änderungen machen
- Bei Unklarheit IMMER fragen
- Checkpoints nach jedem größeren Schritt
"""
```

---

#### DATEI: tools.py
```python
import os
import subprocess
from pathlib import Path

WORKSPACE = "/opt/partner-agent/workspace"

def ensure_workspace():
    """Erstellt Workspace-Ordner falls nicht vorhanden"""
    Path(WORKSPACE).mkdir(parents=True, exist_ok=True)

def read_file(filename: str) -> str:
    """Liest eine Datei"""
    filepath = os.path.join(WORKSPACE, filename)
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            return f.read()
    return f"Datei {filename} nicht gefunden"

def write_file(filename: str, content: str) -> str:
    """Schreibt eine Datei"""
    ensure_workspace()
    filepath = os.path.join(WORKSPACE, filename)

    # Unterordner erstellen falls nötig
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)

    with open(filepath, 'w') as f:
        f.write(content)
    return f"Datei {filename} erstellt"

def list_files(directory: str = "") -> str:
    """Listet Dateien auf"""
    dirpath = os.path.join(WORKSPACE, directory)
    if os.path.exists(dirpath):
        files = os.listdir(dirpath)
        return "\n".join(files) if files else "Ordner ist leer"
    return "Ordner nicht gefunden"

def run_command(command: str) -> str:
    """Führt Shell-Befehl aus"""
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=WORKSPACE
        )
        output = result.stdout + result.stderr
        return output[:2000] if output else "Befehl ausgeführt (keine Ausgabe)"
    except subprocess.TimeoutExpired:
        return "Timeout nach 60 Sekunden"
    except Exception as e:
        return f"Fehler: {str(e)}"

def git_commit_and_push(message: str) -> str:
    """Committed und pusht zu GitHub"""
    try:
        run_command("git add .")
        run_command(f'git commit -m "{message}"')
        run_command("git push")
        return "Änderungen zu GitHub gepusht"
    except Exception as e:
        return f"Git-Fehler: {str(e)}"
```

---

#### DATEI: agent.py
```python
import json
from anthropic import Anthropic
from prompts import SYSTEM_PROMPT
from tools import read_file, write_file, list_files, run_command, git_commit_and_push

client = Anthropic()

class PartnerAgent:
    def __init__(self):
        self.messages = []
        self.waiting_for_ok = False

    def reset(self):
        """Reset für neue Aufgabe"""
        self.messages = []
        self.waiting_for_ok = False

    def process(self, user_input: str) -> str:
        """Verarbeitet User-Input und gibt Antwort zurück"""

        self.messages.append({
            "role": "user",
            "content": user_input
        })

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=self.messages
        )

        answer = response.content[0].text
        self.messages.append({
            "role": "assistant",
            "content": answer
        })

        # Versuche JSON zu parsen
        try:
            data = json.loads(answer)
            return self._handle_response(data)
        except json.JSONDecodeError:
            return answer

    def _handle_response(self, data: dict) -> str:
        """Verarbeitet strukturierte Antwort"""

        result = []

        # Nachricht hinzufügen
        if data.get("nachricht"):
            result.append(data["nachricht"])

        # Vorschläge formatieren
        if data.get("vorschlaege"):
            v = data["vorschlaege"]
            if v.get("muss"):
                result.append("\n*MUSS:*\n" + "\n".join(f"• {x}" for x in v["muss"]))
            if v.get("sollte"):
                result.append("\n*SOLLTE:*\n" + "\n".join(f"• {x}" for x in v["sollte"]))
            if v.get("optional"):
                result.append("\n*OPTIONAL:*\n" + "\n".join(f"• {x}" for x in v["optional"]))

        # Fragen formatieren
        if data.get("fragen"):
            result.append("\n*Fragen:*\n" + "\n".join(f"❓ {x}" for x in data["fragen"]))

        # Plan formatieren
        if data.get("plan"):
            result.append("\n*Plan:*\n" + "\n".join(f"{i+1}. {x}" for i, x in enumerate(data["plan"])))

        # Code ausführen
        if data.get("code") and data.get("datei"):
            write_file(data["datei"], data["code"])
            result.append(f"\n✅ Datei `{data['datei']}` erstellt")

        # Checkpoint
        if data.get("warte_auf_ok"):
            self.waiting_for_ok = True
            result.append("\n\n_Warte auf dein OK um fortzufahren..._")

        # Phase fertig
        if data.get("phase") == "fertig":
            result.append("\n\n✅ *Aufgabe abgeschlossen!*")
            self.reset()

        return "\n".join(result)
```

---

#### DATEI: slack_handler.py
```python
import os
from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from agent import PartnerAgent

# Slack App initialisieren
app = App(token=os.environ["SLACK_BOT_TOKEN"])

# Agent-Instanzen pro Channel
agents = {}

def get_agent(channel_id: str) -> PartnerAgent:
    """Holt oder erstellt Agent für Channel"""
    if channel_id not in agents:
        agents[channel_id] = PartnerAgent()
    return agents[channel_id]

@app.event("app_mention")
def handle_mention(event, say):
    """Reagiert auf @Partner-Agent Mentions"""
    channel = event["channel"]
    text = event["text"]

    # @mention entfernen
    text = text.split(">", 1)[-1].strip()

    if not text:
        say("Wie kann ich dir helfen? Beschreibe dein Projekt!")
        return

    agent = get_agent(channel)

    say("🤔 Denke nach...")

    try:
        response = agent.process(text)
        say(response)
    except Exception as e:
        say(f"❌ Fehler: {str(e)}")

@app.event("message")
def handle_message(event, say):
    """Reagiert auf Nachrichten (für Follow-ups)"""
    # Ignoriere Bot-Nachrichten
    if event.get("bot_id"):
        return

    channel = event["channel"]
    text = event.get("text", "")

    # Nur wenn Agent auf OK wartet
    agent = get_agent(channel)
    if not agent.waiting_for_ok:
        return

    # OK erhalten
    if text.lower() in ["ok", "ja", "yes", "weiter", "go"]:
        agent.waiting_for_ok = False
        response = agent.process("OK, mach weiter.")
        say(response)

def start():
    """Startet den Slack Handler"""
    handler = SocketModeHandler(app, os.environ["SLACK_APP_TOKEN"])
    handler.start()
```

---

#### DATEI: main.py
```python
#!/usr/bin/env python3
"""
Partner-Agent Level 7
24/7 Cloud Agent mit Slack-Integration
"""

import os
from dotenv import load_dotenv

# Environment laden
load_dotenv()

# Prüfe ob alle Keys da sind
required_keys = [
    "ANTHROPIC_API_KEY",
    "SLACK_BOT_TOKEN",
    "SLACK_APP_TOKEN"
]

for key in required_keys:
    if not os.environ.get(key):
        print(f"❌ Fehlt: {key}")
        exit(1)

print("✅ Alle API-Keys gefunden")
print("🚀 Starte Partner-Agent...")

from slack_handler import start
start()
```

---

### PHASE 4: Testen (1-2 Stunden)

#### 4.1 Agent starten
```bash
cd /opt/partner-agent
source venv/bin/activate
python main.py
```

#### 4.2 In Slack testen
- Lade den Bot in einen Channel ein: `/invite @Partner-Agent`
- Schreibe: `@Partner-Agent Hallo`
- Agent sollte antworten

#### 4.3 Code-Generierung testen
- Schreibe: `@Partner-Agent Erstelle eine hello.py Datei die "Hallo Welt" ausgibt`
- Agent sollte Datei erstellen

#### 4.4 Checkpoint testen
- Schreibe: `@Partner-Agent Baue mir eine einfache Todo-App`
- Agent sollte Plan zeigen und fragen

---

### PHASE 5: 24/7 Deployment (30 Minuten)

#### 5.1 Systemd Service erstellen
```bash
sudo nano /etc/systemd/system/partner-agent.service
```

Inhalt:
```ini
[Unit]
Description=Partner Agent Level 7
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/partner-agent
EnvironmentFile=/opt/partner-agent/.env
ExecStart=/opt/partner-agent/venv/bin/python /opt/partner-agent/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

#### 5.2 Service aktivieren und starten
```bash
sudo systemctl daemon-reload
sudo systemctl enable partner-agent
sudo systemctl start partner-agent
```

#### 5.3 Status prüfen
```bash
sudo systemctl status partner-agent
```

#### 5.4 Logs anschauen
```bash
journalctl -u partner-agent -f
```

#### 5.5 Neustart bei Problemen
```bash
sudo systemctl restart partner-agent
```

---

## 📊 TEIL 4: Zeit- und Kosten-Übersicht

### Zeitaufwand
| Phase | Zeit |
|-------|------|
| Phase 1: Accounts & APIs | 1-2 Stunden |
| Phase 2: Server einrichten | 30-60 Minuten |
| Phase 3: Code schreiben | 2-4 Stunden |
| Phase 4: Testen | 1-2 Stunden |
| Phase 5: Deployment | 30 Minuten |
| **TOTAL** | **6-10 Stunden (1-2 Tage)** |

### Monatliche Kosten
| Service | Kosten |
|---------|--------|
| Hetzner VPS (CX11) | €4.50 |
| Anthropic API (geschätzt) | €15-30 |
| Slack | €0 (kostenlos) |
| GitHub | €0 (kostenlos) |
| **TOTAL** | **~€20-35/Monat** |

---

## ✅ TEIL 5: Checkliste

### Phase 1: Accounts
- [ ] Anthropic Account erstellt
- [ ] Anthropic API-Key gespeichert
- [ ] Slack App erstellt
- [ ] Slack Bot Token (xoxb-...) gespeichert
- [ ] Slack App Token (xapp-...) gespeichert
- [ ] GitHub Repo erstellt
- [ ] GitHub Token (ghp_...) gespeichert

### Phase 2: Server
- [ ] Hetzner VPS bestellt
- [ ] SSH Zugang funktioniert
- [ ] Python + Pip installiert
- [ ] Virtual Environment erstellt
- [ ] Dependencies installiert
- [ ] .env Datei erstellt

### Phase 3: Code
- [ ] requirements.txt erstellt
- [ ] prompts.py erstellt
- [ ] tools.py erstellt
- [ ] agent.py erstellt
- [ ] slack_handler.py erstellt
- [ ] main.py erstellt

### Phase 4: Test
- [ ] Agent startet ohne Fehler
- [ ] Agent antwortet in Slack
- [ ] Agent erstellt Dateien
- [ ] Checkpoints funktionieren

### Phase 5: 24/7
- [ ] Systemd Service erstellt
- [ ] Service läuft (systemctl status)
- [ ] Auto-Restart funktioniert
- [ ] Logs sind lesbar

---

## 🎯 TEIL 6: So nutzt du den Agent

### Einfache Befehle
```
@Partner-Agent Erstelle eine Python-Funktion die Primzahlen berechnet
```

### Projekte mit Checkpoints
```
@Partner-Agent Baue mir ein CRM für Kundenmanagement
```
→ Agent zeigt Plan
→ Du sagst "OK"
→ Agent baut
→ Agent zeigt Checkpoint
→ Du sagst "OK" oder "Ändere X"
→ Agent macht weiter

### Befehle während Agent arbeitet
- `OK` / `Ja` / `Weiter` - Fortfahren
- `Stop` - Abbrechen
- `Ändere X` - Änderung anfordern

---

## 🔧 TEIL 7: Troubleshooting

### Agent startet nicht
```bash
# Logs checken
journalctl -u partner-agent -n 50

# Manuell starten um Fehler zu sehen
cd /opt/partner-agent
source venv/bin/activate
python main.py
```

### Slack-Verbindung fehlgeschlagen
- Prüfe SLACK_BOT_TOKEN und SLACK_APP_TOKEN
- Prüfe ob Socket Mode aktiviert ist
- Prüfe ob App in Workspace installiert ist

### API-Fehler
- Prüfe ANTHROPIC_API_KEY
- Prüfe Guthaben auf console.anthropic.com

### Agent antwortet nicht
- Prüfe ob Bot im Channel ist: `/invite @Partner-Agent`
- Prüfe ob du @mention verwendest

---

## 📝 TEIL 8: Erweiterungsideen (für später)

1. **Email-Integration** - Agent kann Emails lesen/senden
2. **Kalender-Integration** - Agent plant Termine
3. **Datenbank** - Agent speichert Wissen langfristig
4. **Web-Suche** - Agent kann googlen
5. **Multi-User** - Verschiedene Agents pro User
6. **Dashboard** - Web-UI für Monitoring

---

*Erstellt: $(date)*
*Für: Partner-Agent Level 7 mit 24/7 Cloud-Deployment*
