# CRM Workflow & Automatisierungs-Plan

## 📊 CRM Übersicht

**System:** Flask CRM mit Voice AI Integration
**Repo:** https://github.com/dsactivi-2/old_crm_updated

### Features
- Customer Management (CRUD)
- Interaction Logging (Calls, Emails, Meetings, Notes)
- Voice AI Sales Agents (Vapi, Retell, Bland)
- Lead Scoring
- Call Queue Management

---

## 🔄 Aktueller Workflow (Manuell)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Lead kommt │ →  │  Manuell    │ →  │  Agent ruft │ →  │  Follow-up  │
│    rein     │    │  eintragen  │    │    an       │    │  manuell    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      ↓                  ↓                  ↓                  ↓
   Website/         CRM öffnen,        Voice AI          E-Mail,
   Telefon          Daten eingeben     oder manuell      Notizen
```

### Manuelle Schritte
| Schritt | Wer | Dauer | Häufigkeit |
|---------|-----|-------|------------|
| Lead eintragen | Mitarbeiter | 5 min | 50x/Tag |
| Lead qualifizieren | Sales | 15 min | 50x/Tag |
| Anruf tätigen | Sales/Voice AI | 10 min | 30x/Tag |
| Follow-up planen | Sales | 5 min | 30x/Tag |
| Report erstellen | Manager | 30 min | 1x/Tag |

**Gesamt:** ~20 Stunden/Tag manuelle Arbeit

---

## 🤖 Automatisierter Workflow (Mit Agents)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Lead kommt │ →  │  AUTO:      │ →  │  AUTO:      │ →  │  AUTO:      │
│    rein     │    │  Import     │    │  Voice AI   │    │  Follow-up  │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      ↓                  ↓                  ↓                  ↓
   Webhook          Lead Agent        Voice Agent       Email Agent
   Trigger          qualifiziert      ruft an           scheduled
```

### Agent-Zuweisungen

| Task | Agent | Trigger | Automatisierung |
|------|-------|---------|-----------------|
| Lead Import | `/import-lead` | Webhook | 100% |
| Lead Qualifizierung | `/qualify-lead` | Nach Import | 90% |
| Erster Anruf | Voice AI Agent | Lead Score > 50 | 100% |
| Follow-up E-Mail | `/send-email` | Nach Anruf | 100% |
| Report | `/generate-report` | Täglich 18:00 | 100% |
| Code Review | `/review` | Bei PR | 100% |
| Security Check | `/security` | Vor Deploy | 100% |

---

## 🔗 Agent-Kette (Befehlskette)

### Lead Processing Chain
```
[Webhook: Neuer Lead]
        ↓
[Agent 1: /import-lead]
   - Daten validieren
   - In CRM eintragen
   - Duplikate prüfen
        ↓
[Agent 2: /qualify-lead]
   - Lead Score berechnen
   - Priorität setzen
   - Tags zuweisen
        ↓
[Decision: Score > 50?]
   ├─ JA → [Agent 3: Voice AI Call]
   │            - Automatischer Anruf
   │            - Qualifizierungsfragen
   │            - Notizen speichern
   │                  ↓
   │        [Agent 4: /follow-up]
   │            - E-Mail senden
   │            - Termin planen
   │            - Task erstellen
   │
   └─ NEIN → [Agent 5: /nurture-email]
                - Nurture Sequence
                - Re-Score nach 7 Tagen
```

### Development Chain
```
[PR Created]
     ↓
[/review] → Code Quality Check
     ↓
[/security] → Security Audit
     ↓
[/test] → Run Tests
     ↓
[Decision: All Pass?]
  ├─ JA → Auto-Merge + Deploy
  └─ NEIN → Notify Developer
```

---

## 📋 Neue Commands für CRM

### 1. `/import-lead`
```markdown
Importiere Lead aus: $ARGUMENTS (JSON/CSV/Form)
- Validiere Daten
- Prüfe Duplikate
- Berechne initialen Score
- Erstelle Customer in CRM
```

### 2. `/qualify-lead`
```markdown
Qualifiziere Lead: $ARGUMENTS (Customer ID)
- Analysiere vorhandene Daten
- Berechne Lead Score (0-100)
- Setze Priorität (Hot/Warm/Cold)
- Empfehle nächste Aktion
```

### 3. `/send-email`
```markdown
Sende E-Mail an: $ARGUMENTS (Customer ID + Template)
- Lade Customer Daten
- Personalisiere Template
- Sende via SMTP/SendGrid
- Logge Interaction
```

### 4. `/generate-report`
```markdown
Erstelle Report: $ARGUMENTS (daily/weekly/monthly)
- Aggregiere Stats
- Berechne KPIs
- Erstelle Charts
- Export als PDF/HTML
```

### 5. `/voice-call`
```markdown
Starte Voice AI Call: $ARGUMENTS (Customer ID)
- Lade Customer Profil
- Wähle passenden Voice Agent
- Starte Anruf via Vapi/Retell/Bland
- Speichere Transcript
```

---

## 📈 ROI Schätzung

| Metrik | Vorher (Manuell) | Nachher (Automatisiert) | Ersparnis |
|--------|------------------|-------------------------|-----------|
| Lead-Eingabe | 5 min/Lead | 0 min | 100% |
| Qualifizierung | 15 min/Lead | 1 min | 93% |
| Anrufe/Tag | 30 | 100+ | 233%+ |
| Follow-ups | Oft vergessen | 100% | ∞ |
| Reports | 30 min/Tag | 0 min | 100% |

**Zeitersparnis:** ~18 Stunden/Tag
**Mehr Leads bearbeitet:** 3x mehr
**Kosten:** ~$50-100/Monat (API Calls)

---

## 🚀 Implementierungs-Plan

### Phase 1: Basis (Woche 1)
- [ ] CRM deployen
- [ ] Webhook für Lead Import einrichten
- [ ] `/import-lead` Command implementieren
- [ ] `/qualify-lead` Command implementieren

### Phase 2: Voice AI (Woche 2)
- [ ] Voice AI Provider konfigurieren (Vapi/Retell)
- [ ] `/voice-call` Command implementieren
- [ ] Auto-Call bei hohem Lead Score

### Phase 3: Automatisierung (Woche 3)
- [ ] E-Mail Templates erstellen
- [ ] `/send-email` Command implementieren
- [ ] Follow-up Automation

### Phase 4: Reporting (Woche 4)
- [ ] Dashboard KPIs definieren
- [ ] `/generate-report` Command implementieren
- [ ] Scheduled Reports

---

## 🔐 Security Checkpoints

- [ ] API Keys in Doppler, nicht im Code
- [ ] Webhook Signature Verification
- [ ] Rate Limiting für API Calls
- [ ] GDPR-konforme Datenspeicherung
- [ ] Audit Log für alle Aktionen
