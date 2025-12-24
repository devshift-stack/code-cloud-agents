# Code Cloud Agents

## Frontend (Figma UI)

React + Vite + TypeScript Dashboard für Agent-Management.

```bash
npm install
npm run dev
```

## Backend (Python)

Deployment-Template für Supervisor-KI, Log-Auswertung und Dashboard.

### Features

- **Risikobewertung**: Automatische Erkennung von Preis- und Rechtsbehauptungen
- **Batch-Verarbeitung**: Mehrere Log-Dateien parallel verarbeiten
- **Report-Export**: JSON, CSV und HTML Reports
- **Dashboard-Generierung**: Live Supervisor-Dashboard
- **Alert-System**: Automatische Warnungen bei kritischen Vorfällen
- **Agent-Statistiken**: Performance-Tracking pro Agent

### Installation

```bash
pip install -r requirements.txt
```

### Verwendung

```bash
# Einzelne Datei analysieren
python agents/agent_log_scorer.py sample_call_log.json

# Batch-Verarbeitung
python agents/agent_log_scorer.py --batch ./logs/
```

## Lizenz

Proprietär - Step2Job GmbH
