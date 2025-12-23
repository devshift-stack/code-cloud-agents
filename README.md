# Step2Job Cloud Agents

Deployment-Template für Supervisor-KI, Log-Auswertung und Dashboard.

## Überblick

Dieses System analysiert Agent-Logs auf potenzielle Risiken und stellt sicher, dass KI-Agenten:
- Keine unerlaubten Preisaussagen machen
- Keine rechtlichen Behauptungen ohne Faktengrundlage aufstellen
- STOP-Mechanismen bei kritischen Fragen korrekt auslösen
- PLACEHOLDER für unbestätigte Informationen verwenden

## Installation

```bash
# Repository klonen
git clone <repository-url>
cd code-cloud-agents

# Abhängigkeiten installieren
pip install -r requirements.txt
```

## Verwendung

### Kommandozeile

```bash
# Standard-Beispiel ausführen
python agents/agent_log_scorer.py

# Eigene Log-Datei analysieren
python agents/agent_log_scorer.py path/to/log.json

# Mit eigener Konfiguration
python agents/agent_log_scorer.py log.json -c config.yaml

# Ausführliche Ausgabe
python agents/agent_log_scorer.py log.json -v
```

### Als Modul

```python
from agents.agent_log_scorer import score_agent_log, load_config

# Log analysieren
log_data = {
    "agent_id": "AGENT_001",
    "contact_name": "Max Mustermann",
    "transcript": [
        {"speaker": "customer", "text": "Was kostet das?"},
        {"speaker": "agent", "text": "Das kläre ich intern."}
    ],
    "stop_triggered": True,
    "result": "STOP_REQUIRED"
}

result = score_agent_log(log_data)
print(f"Risk Level: {result['risk_level']}")
```

## Log-Format

Eingabe-Logs müssen folgendes Format haben:

```json
{
  "agent_id": "AGENT_001",        // Pflichtfeld
  "contact_name": "Max Mustermann",
  "timestamp": "2025-12-23T10:30:00",
  "transcript": [
    {"speaker": "customer", "text": "Nachricht des Kunden"},
    {"speaker": "agent", "text": "Antwort des Agenten"}
  ],
  "stop_triggered": true,
  "result": "STOP_REQUIRED - Preisfrage erkannt"
}
```

## Ausgabe-Format

```json
{
  "agent_id": "AGENT_001",
  "contact": "Max Mustermann",
  "timestamp": "2025-12-23T10:30:00",
  "price_claim": true,
  "price_keywords_found": ["kostet"],
  "legal_claim": false,
  "legal_keywords_found": [],
  "stop_triggered": true,
  "placeholder_used": true,
  "risk": 0,
  "risk_level": "LOW"
}
```

## Risk-Level

| Level | Score | Bedeutung |
|-------|-------|-----------|
| LOW | 0 | Kein Risiko erkannt |
| MEDIUM | 1 | Geringes Risiko, Überprüfung empfohlen |
| HIGH | 2 | Hohes Risiko, Aktion erforderlich |
| CRITICAL | 3+ | Kritisch, sofortige Intervention |

## Risiko-Berechnung

```
Risk = price_claim(+1) + legal_claim(+1) - stop_triggered(-1) - placeholder_bonus(-1)
```

- **+1** für jede Preis- oder Rechtsbehauptung
- **-1** wenn STOP korrekt ausgelöst wurde
- **-1** wenn PLACEHOLDER bei Claims verwendet wurde

## Konfiguration

Die Keyword-Listen und Schwellwerte können in `agents/flow_validator_checklist.yaml` angepasst werden:

```yaml
keywords:
  price:
    - "€"
    - "euro"
    - "preis"
    # ... weitere Keywords

  legal:
    - "gesetz"
    - "rechtlich"
    # ... weitere Keywords

risk_thresholds:
  low: 0
  medium: 1
  high: 2
```

## Tests

```bash
# Alle Tests ausführen
pytest tests/ -v

# Mit Coverage-Report
pytest tests/ --cov=agents --cov-report=html
```

## Projektstruktur

```
code-cloud-agents/
├── agents/
│   ├── agent_log_scorer.py          # Haupt-Scoring-Logik
│   ├── agent_training_prompts.md    # Training-Dokumentation
│   ├── flow_validator_checklist.yaml # Konfiguration & Regeln
│   ├── sample_call_log.json         # Beispiel-Log
│   └── supervisor_dashboard_mock.json
├── tests/
│   ├── test_agent_log_scorer.py     # Unit Tests
│   └── scorecards/                   # Test-Scorecards
├── requirements.txt
└── README.md
```

## Exit-Codes

| Code | Bedeutung |
|------|-----------|
| 0 | LOW Risk |
| 1 | MEDIUM Risk |
| 2 | HIGH Risk |
| 3 | CRITICAL Risk |
| 4 | Datei nicht gefunden |
| 5 | Ungültiges JSON |
| 6 | Validierungsfehler |
| 99 | Unerwarteter Fehler |

## Lizenz

Proprietär - Step2Job GmbH
