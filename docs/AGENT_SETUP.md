# Cloud Agents Setup - CRM Automatisierung

## 🎯 Ziel: CRM komplett durch Agents ersetzen

---

## 📋 Agent-Übersicht

| Agent | Ersetzt | Trigger | Priorität |
|-------|---------|---------|-----------|
| **Lead Import Agent** | Manuelles Eintragen | Webhook/API | 🔴 Hoch |
| **Lead Qualifier Agent** | Sales-Qualifizierung | Nach Import | 🔴 Hoch |
| **Voice AI Agent** | Telefon-Sales | Score > 50 | 🔴 Hoch |
| **Email Agent** | Follow-up Mails | Nach Call/Event | 🟡 Mittel |
| **Report Agent** | Tägliche Reports | Scheduled | 🟢 Niedrig |
| **Support Agent** | Kundenanfragen | Ticket/Chat | 🟡 Mittel |

---

## 🤖 Agent 1: Lead Import Agent

### Funktion
Automatisch Leads aus verschiedenen Quellen importieren

### Trigger
- Webhook von Website-Formular
- API Call von Ads (Facebook, Google)
- CSV Import
- E-Mail Parser

### Einstellungen
```yaml
name: lead-import-agent
model: claude-3-haiku  # Schnell + günstig
tools:
  - Read
  - Write
  - Bash(curl:*)
  - Database
temperature: 0.1  # Deterministisch
max_tokens: 1000
```

### Prompt
```
Du bist ein Lead Import Agent.

AUFGABE:
1. Validiere eingehende Lead-Daten
2. Prüfe auf Duplikate (Email/Telefon)
3. Bereinige Daten (Formatierung)
4. Speichere in CRM Datenbank
5. Trigger Lead Qualifier Agent

REGELN:
- Keine Halluzinationen
- Bei fehlenden Pflichtfeldern: STOP
- Duplikate: Merge mit bestehendem Lead

OUTPUT:
{
  "status": "success|error",
  "lead_id": 123,
  "action": "created|merged|rejected",
  "next_agent": "lead-qualifier"
}
```

---

## 🤖 Agent 2: Lead Qualifier Agent

### Funktion
Automatisch Lead Score berechnen und priorisieren

### Trigger
- Nach Lead Import
- Täglich für alle Leads ohne Score
- Nach Interaction Update

### Einstellungen
```yaml
name: lead-qualifier-agent
model: claude-3-sonnet  # Bessere Analyse
tools:
  - Read
  - Database
  - WebSearch  # Firmen-Research
temperature: 0.3
max_tokens: 2000
```

### Scoring Kriterien
```
SCORE BERECHNUNG (0-100):

+20: Vollständige Kontaktdaten
+15: Firmen-Email (nicht Gmail/Yahoo)
+10: Telefonnummer vorhanden
+15: Firma gefunden & > 10 Mitarbeiter
+10: Branche passt zu Zielmarkt
+10: Budget-Indikator vorhanden
+10: Dringlichkeit erkennbar
+10: Entscheider-Position

PRIORITÄT:
- 70-100: HOT → Sofort anrufen
- 50-69: WARM → Innerhalb 24h
- 30-49: COLD → Nurture Sequence
- 0-29: DISQUALIFIED → Archivieren
```

### Prompt
```
Du bist ein Lead Qualifier Agent.

AUFGABE:
1. Lade Lead-Daten aus CRM
2. Recherchiere Firma (falls vorhanden)
3. Berechne Lead Score nach Kriterien
4. Setze Priorität (HOT/WARM/COLD)
5. Empfehle nächste Aktion

REGELN:
- Nur verifizierbare Fakten nutzen
- Bei Unsicherheit: konservativ scoren
- Nie Score erfinden

OUTPUT:
{
  "lead_id": 123,
  "score": 75,
  "priority": "HOT",
  "reasons": ["Firmen-Email", "Entscheider"],
  "next_action": "voice-call",
  "next_agent": "voice-ai-agent"
}
```

---

## 🤖 Agent 3: Voice AI Agent

### Funktion
Automatische Verkaufsanrufe durchführen

### Trigger
- Lead Score > 50
- Manueller Trigger
- Scheduled Follow-up

### Provider-Einstellungen
```yaml
name: voice-ai-agent
provider: vapi  # oder retell, bland

voice_config:
  language: de-DE
  voice: "ElevenLabs - Stefan"  # Männlich, professionell
  speed: 1.0

stt_config:
  provider: deepgram
  model: nova-2
  language: de

llm_config:
  provider: anthropic
  model: claude-3-sonnet
  temperature: 0.7

telephony:
  provider: twilio
  from_number: "+49..."
```

### Call Script
```
ERÖFFNUNG:
"Guten Tag, [Name]. Hier ist [Agent] von [Firma].
Ich rufe an wegen Ihrer Anfrage zu [Thema].
Haben Sie kurz 2 Minuten Zeit?"

QUALIFIZIERUNG:
1. "Was genau suchen Sie?"
2. "Bis wann brauchen Sie eine Lösung?"
3. "Wer entscheidet über solche Investitionen?"
4. "Haben Sie ein Budget im Kopf?"

ABSCHLUSS:
- Bei Interesse: Termin für Demo vereinbaren
- Bei Fragen: An menschlichen Mitarbeiter übergeben
- Bei Ablehnung: Höflich verabschieden, Follow-up Email

REGELN:
- Nie Preise nennen (→ STOP, an Menschen übergeben)
- Nie rechtliche Aussagen machen
- Bei Aggression: Höflich beenden
```

---

## 🤖 Agent 4: Email Agent

### Funktion
Automatische Follow-up E-Mails senden

### Trigger
- Nach Voice Call (immer)
- Nach X Tagen ohne Reaktion
- Nach Interaction Event

### Einstellungen
```yaml
name: email-agent
model: claude-3-haiku
tools:
  - Read
  - SendGrid  # oder SMTP
  - Database
temperature: 0.5
```

### Email Templates
```
NACH CALL - INTERESSE:
Subject: Zusammenfassung unseres Gesprächs | [Firma]

Hallo [Name],

vielen Dank für das nette Gespräch heute.

Wie besprochen:
- [Punkt 1 aus Call]
- [Punkt 2 aus Call]

Ihr Demo-Termin: [Datum/Uhrzeit]

Bei Fragen erreichen Sie mich unter [Nummer].

Beste Grüße,
[Agent]

---

NACH CALL - KEIN INTERESSE:
Subject: Danke für Ihre Zeit | [Firma]

Hallo [Name],

danke, dass Sie sich Zeit genommen haben.

Falls sich Ihre Situation ändert, melden Sie sich gerne.

Beste Grüße,
[Agent]

---

FOLLOW-UP (7 Tage):
Subject: Kurze Nachfrage | [Thema]

Hallo [Name],

ich wollte kurz nachfragen, ob Sie noch Fragen haben.

[Personalisierter Punkt basierend auf CRM-Daten]

Beste Grüße,
[Agent]
```

---

## 🤖 Agent 5: Report Agent

### Funktion
Tägliche/Wöchentliche Reports erstellen

### Trigger
- Täglich 18:00
- Wöchentlich Montag 09:00
- Auf Anfrage

### Einstellungen
```yaml
name: report-agent
model: claude-3-sonnet
tools:
  - Read
  - Database
  - Charts  # Matplotlib/Plotly
temperature: 0.1
```

### Report Struktur
```
DAILY REPORT:

📊 Heute: [Datum]

LEADS:
- Neue Leads: X
- Qualifiziert: X (HOT: X, WARM: X)
- Konvertiert: X

CALLS:
- Durchgeführt: X
- Erfolgreich: X (X%)
- Termine vereinbart: X

EMAILS:
- Gesendet: X
- Geöffnet: X (X%)
- Geklickt: X (X%)

TOP LEADS:
1. [Name] - Score: 95 - [Firma]
2. [Name] - Score: 87 - [Firma]
3. [Name] - Score: 82 - [Firma]

⚠️ AKTIONEN ERFORDERLICH:
- Lead X wartet seit 3 Tagen
- Call mit Y fehlgeschlagen
```

---

## 🤖 Agent 6: Support Agent

### Funktion
Kundenanfragen beantworten

### Trigger
- Neues Support-Ticket
- Chat-Nachricht
- Email an Support

### Einstellungen
```yaml
name: support-agent
model: claude-3-sonnet
tools:
  - Read
  - Database
  - KnowledgeBase
temperature: 0.3
max_tokens: 1500
```

### Prompt
```
Du bist ein Support Agent für [Firma].

AUFGABE:
1. Verstehe die Kundenanfrage
2. Suche in Knowledge Base nach Lösung
3. Beantworte höflich und präzise
4. Bei komplexen Fällen: Eskalieren

REGELN:
- Nie Preise ändern oder Rabatte geben
- Nie rechtliche Aussagen machen
- Bei Beschwerden: Immer eskalieren
- Bei technischen Problemen: Ticket erstellen

ESKALATION BEI:
- Kündigungsabsicht
- Rechtliche Fragen
- Technische Bugs
- Unzufriedener Kunde (Sentiment negativ)
```

---

## 🔗 Agent-Kette Konfiguration

```yaml
# agent-chain.yaml

chains:
  lead_processing:
    name: "Lead Processing Chain"
    trigger: "webhook:new_lead"
    agents:
      - agent: lead-import-agent
        on_success: lead-qualifier-agent
        on_error: notify_admin

      - agent: lead-qualifier-agent
        conditions:
          - if: "score >= 70"
            then: voice-ai-agent
          - if: "score >= 50"
            then: email-agent
          - else: nurture-sequence

      - agent: voice-ai-agent
        on_success: email-agent
        on_error: schedule_retry

      - agent: email-agent
        on_success: log_interaction
        on_error: notify_admin

  daily_operations:
    name: "Daily Operations"
    trigger: "schedule:18:00"
    agents:
      - agent: report-agent
        recipients: ["manager@firma.de"]

  support_flow:
    name: "Support Flow"
    trigger: "ticket:created"
    agents:
      - agent: support-agent
        escalation_to: "support@firma.de"
```

---

## 📊 Cursor Cloud Agents Einstellungen

### In Cursor Settings:

```
Repository: dsactivi-2/old_crm_updated
Install Script: pip install -r requirements.txt
Start Script: doppler run -- gunicorn app:app
Secret: DOPPLER_TOKEN
```

### Environment Variables (in Doppler):

```
# Database
DATABASE_URL=sqlite:///crm.db

# Voice AI
VAPI_API_KEY=xxx
TWILIO_SID=xxx
TWILIO_TOKEN=xxx
TWILIO_PHONE=+49xxx

# Email
SENDGRID_API_KEY=xxx

# LLM
ANTHROPIC_API_KEY=xxx
OPENAI_API_KEY=xxx
```

---

## 🚀 Aktivierungsreihenfolge

1. **Lead Import Agent** aktivieren
   - Webhook URL an Website geben
   - Test mit Beispiel-Lead

2. **Lead Qualifier Agent** aktivieren
   - Scoring-Regeln anpassen
   - Test mit importierten Leads

3. **Email Agent** aktivieren
   - Templates anpassen
   - SendGrid konfigurieren

4. **Voice AI Agent** aktivieren
   - Provider auswählen (Vapi empfohlen)
   - Script anpassen
   - Test-Call durchführen

5. **Report Agent** aktivieren
   - Schedule einrichten
   - Empfänger konfigurieren

6. **Support Agent** aktivieren
   - Knowledge Base aufbauen
   - Eskalations-Regeln festlegen
