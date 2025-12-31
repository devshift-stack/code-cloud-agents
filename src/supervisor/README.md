# Supervisor → Slack Integration (Mujo Bot)

**Status:** ✅ FULLY IMPLEMENTED

Mujo bot ist jetzt mit dem Supervisor System verbunden!

---

## Übersicht

Diese Integration verbindet das **Supervisor System** (Meta Supervisor, Engineering Lead Supervisor, Cloud Assistant) mit **Slack** über den **Mujo bot**.

### Was macht es?

Der Supervisor sendet automatisch Alerts zu:

- 🛑 **STOP Score Alerts** - Kritische Risiko-Scores (>40)
- 🔴 **System Health Alerts** - Degradierte oder unhealthy Systeme
- ⚠️ **Task Completion Notifications** - Tasks mit Gaps oder Risiken
- 📢 **Custom Messages** - Beliebige Supervisor-Nachrichten

---

## Architecture

```
┌─────────────────────────────────┐
│   META SUPERVISOR               │
│   - System Health Monitoring    │
│   - Routing                     │
└───────────────┬─────────────────┘
                │
                ↓
┌─────────────────────────────────┐
│   ENGINEERING LEAD SUPERVISOR   │
│   - STOP Score Computation      │
│   - Task Verification           │
└───────────────┬─────────────────┘
                │
                ↓
┌─────────────────────────────────┐
│   CLOUD ASSISTANT               │
│   - Task Execution              │
│   - Evidence Collection         │
└───────────────┬─────────────────┘
                │
                ↓
┌─────────────────────────────────┐
│   SUPERVISOR NOTIFICATIONS      │
│   (Mujo bot → Slack)            │
└───────────────┬─────────────────┘
                │
                ↓
┌─────────────────────────────────┐
│   SLACK                         │
│   - #alerts Channel             │
│   - Team Notifications          │
└─────────────────────────────────┘
```

---

## Setup

### 1. Slack bereits konfiguriert

Du hast bereits:

- ✅ Mujo bot erstellt (Activi Agent App)
- ✅ Bot Token konfiguriert: `SLACK_TOKEN`
- ✅ Bot in Slack aktiviert

### 2. Notifications aktivieren

In `.env`:

```bash
# Slack Notifications aktivieren
SLACK_NOTIFICATIONS_ENABLED=true
SLACK_ALERT_CHANNEL=#general  # Oder dein Channel

# Optional: Thresholds anpassen
SUPERVISOR_STOP_SCORE_THRESHOLD=40
SUPERVISOR_STOP_RATE_THRESHOLD=0.3
SUPERVISOR_QUEUE_DEPTH_THRESHOLD=50
```

### 3. Mujo bot in Channel einladen

Damit Mujo Nachrichten senden kann:

```
/invite @Mujo
```

### 4. Fertig!

Die Integration ist sofort einsatzbereit.

---

## Usage

### Import

```typescript
import {
  createSupervisorNotifications,
  createMetaSupervisor,
  createCloudAssistant,
  computeStopScore,
} from "./src/supervisor/index.js";
```

### 1. STOP Score Alert senden

```typescript
const notifications = createSupervisorNotifications({
  channel: "#dev-alerts",
});

// STOP Score berechnen
const stopScore = computeStopScore(["PRICING_WITHOUT_FACT", "MISSING_TESTS"]);

// Alert senden
await notifications.sendStopScoreAlert(
  "Database Migration Task",
  stopScore,
  "Missing test coverage and unverified pricing claims",
);
```

**Slack Output:**

```
🔴 STOP Score Alert

Task: Database Migration Task
STOP Score: 55/100
Severity: HIGH
Stop Required: YES

Reasons:
• PRICING WITHOUT FACT
• MISSING TESTS

Context:
Missing test coverage and unverified pricing claims

🤖 Supervisor Alert | 2025-12-26 15:30:00
```

### 2. System Health Alert

```typescript
const metaSupervisor = createMetaSupervisor();
const notifications = createSupervisorNotifications();

// System Health Update
metaSupervisor.updateHealth("code-cloud-agents", {
  status: "degraded",
  stopRate: 0.35,
  queueDepth: 55,
  avgStopScore: 45,
});

// Alert senden
const metrics = metaSupervisor.getAggregatedMetrics();
await notifications.sendSystemHealthAlert(
  "code-cloud-agents",
  metrics.systemHealth["code-cloud-agents"],
);
```

**Slack Output:**

```
🟡 System Health Alert

System: code-cloud-agents
Status: DEGRADED
Task Completion Rate: 75.0%
Stop Rate: 35.0%
Avg Stop Score: 45.0
Queue Depth: 55

Warnings:
• System is degraded
• High stop rate: 35.0%
• Queue overload: 55 tasks pending

🤖 Meta Supervisor | 2025-12-26 15:30:00
```

### 3. Task Completion Notification

```typescript
const assistant = createCloudAssistant();
const notifications = createSupervisorNotifications();

// Task ausführen
assistant.startTask("TASK-123", "Implement OAuth");
assistant.addStep("Created login endpoint", "file:src/api/auth.ts");
assistant.recordGap("Missing password reset");

// Completion Notification
const proposal = assistant.complete();
await notifications.sendTaskCompletionNotification("TASK-123", proposal);
```

**Slack Output:**

```
⚠️ Task COMPLETE WITH GAPS

Task ID: TASK-123
Status: COMPLETE_WITH_GAPS

Gaps:
• Missing password reset

Next Steps:
• Address gaps: Missing password reset

Evidence: 2 artefacts collected

🤖 Cloud Assistant | 2025-12-26 15:30:00
```

### 4. Custom Message

```typescript
const notifications = createSupervisorNotifications();

// Info Message
await notifications.sendCustomMessage(
  "Deployment Started",
  "Production deployment initiated\n\n*Target:* production-eu\n*Version:* v2.1.0",
  "info",
);

// Warning Message
await notifications.sendCustomMessage(
  "High Memory Usage",
  "System memory at 85%\n\n*Threshold:* 90%",
  "warning",
);

// Error Message
await notifications.sendCustomMessage(
  "Deployment Failed",
  "Database migration timeout\n\n*Action:* Rolling back",
  "error",
);
```

---

## Notification Types

### STOP Score Alerts

**Wann:** STOP Score >= Threshold (default: 40)

**Enthält:**

- Task Name
- STOP Score (0-100)
- Severity (LOW, MEDIUM, HIGH, CRITICAL)
- Reasons (z.B. MISSING_TESTS)
- Context (optional)

**Emoji:**

- 🔴 CRITICAL (70-100)
- 🟠 HIGH (40-69)
- 🟡 MEDIUM (20-39)
- 🟢 LOW (0-19)

### System Health Alerts

**Wann:**

- System status != "healthy"
- Stop Rate >= Threshold (default: 0.3)
- Queue Depth >= Threshold (default: 50)

**Enthält:**

- System ID
- Status (healthy, degraded, unhealthy)
- Task Completion Rate
- Stop Rate
- Average STOP Score
- Queue Depth
- Warnings

### Task Completion Notifications

**Wann:**

- Status = STOP_REQUIRED
- Status = COMPLETE_WITH_GAPS

**Enthält:**

- Task ID
- Status
- Risks
- Gaps
- Next Steps
- Evidence Count

### Custom Messages

**Wann:** Manuell ausgelöst

**Levels:**

- `info` - ℹ️ Informationen
- `warning` - ⚠️ Warnungen
- `error` - 🔴 Fehler

---

## Configuration

### Environment Variables

```bash
# Notifications aktivieren/deaktivieren
SLACK_NOTIFICATIONS_ENABLED=true

# Default Channel für Alerts
SLACK_ALERT_CHANNEL=#alerts

# Thresholds
SUPERVISOR_STOP_SCORE_THRESHOLD=40    # STOP Score ab 40 → Alert
SUPERVISOR_STOP_RATE_THRESHOLD=0.3    # Stop Rate ab 30% → Alert
SUPERVISOR_QUEUE_DEPTH_THRESHOLD=50   # Queue ab 50 Tasks → Alert
```

### Programmatic Configuration

```typescript
const notifications = createSupervisorNotifications({
  channel: "#dev-alerts",
  enabled: true,
  thresholds: {
    stopScore: 50, // Nur kritische Scores
    stopRate: 0.4, // Höhere Toleranz
    queueDepth: 100, // Mehr Tasks erlaubt
  },
});

// Zur Laufzeit ändern
notifications.updateConfig({
  channel: "#urgent-alerts",
  thresholds: {
    stopScore: 30,
  },
});
```

---

## Testing

### Test Script ausführen

```bash
npx tsx test-supervisor-slack.js
```

**Testet:**

1. ✅ STOP Score Alert
2. ✅ System Health Alert
3. ✅ Task Completion Notification
4. ✅ Custom Message

**Output:**

```
🧪 Testing Supervisor → Slack (Mujo) Integration

✅ Slack notifications enabled
📢 Channel: #general

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 1: STOP Score Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STOP Score: 55/100 (HIGH)
Stop Required: YES
✅ STOP alert sent to Slack

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 2: System Health Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
System Status: degraded
Stop Rate: 35.0%
Queue Depth: 55
✅ Health alert sent to Slack

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 3: Task Completion
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Task Status: COMPLETE_WITH_GAPS
Gaps: 2
Risks: 0
✅ Task completion sent to Slack

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 4: Custom Message
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Custom message sent to Slack

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All tests completed!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Check your Slack channel for the messages!
```

---

## Real-World Use Cases

### 1. CI/CD Pipeline Monitoring

```typescript
const notifications = createSupervisorNotifications({
  channel: "#deployments",
});

// Deployment Start
await notifications.sendCustomMessage(
  "🚀 Deployment Started",
  "Version v2.1.0 → production-eu",
  "info",
);

// Deployment Success
await notifications.sendCustomMessage(
  "✅ Deployment Successful",
  "v2.1.0 deployed in 4m 32s",
  "info",
);

// Deployment Failed
await notifications.sendCustomMessage(
  "❌ Deployment Failed",
  "Database migration timeout\n\nRolling back to v2.0.9",
  "error",
);
```

### 2. Continuous Monitoring Loop

```typescript
const metaSupervisor = createMetaSupervisor();
const notifications = createSupervisorNotifications();

// Check every 60 seconds
setInterval(async () => {
  const alerts = metaSupervisor.checkAlerts();

  for (const alert of alerts) {
    await notifications.sendCustomMessage(
      "System Alert",
      alert,
      alert.includes("CRITICAL") ? "error" : "warning",
    );
  }
}, 60000);
```

### 3. Task Risk Detection

```typescript
const assistant = createCloudAssistant();
const notifications = createSupervisorNotifications();

assistant.startTask("FEAT-789", "Payment Integration");

// Detect risk during execution
assistant.recordRisk("No rollback plan for failed payments");

const stopScore = computeStopScore([
  "MISSING_DEPLOY_CONFIG",
  "COST_OR_LOAD_RISK",
]);

if (stopScore.stopRequired) {
  await notifications.sendStopScoreAlert(
    "FEAT-789: Payment Integration",
    stopScore,
  );
}
```

### 4. Daily Status Reports

```typescript
const notifications = createSupervisorNotifications();
const metaSupervisor = createMetaSupervisor();

// Send at end of day
const metrics = metaSupervisor.getAggregatedMetrics();

await notifications.sendCustomMessage(
  "📊 Daily Report",
  `*Total Tasks:* ${metrics.totalTasks}
*Completed:* ${metrics.completedTasks}
*Stopped:* ${metrics.stoppedTasks}
*Avg STOP Score:* ${metrics.avgStopScore.toFixed(1)}`,
  "info",
);
```

---

## API Reference

### `createSupervisorNotifications(config?)`

Erstellt Supervisor Notifications Instanz.

**Parameters:**

- `config?.channel` - Default Channel (default: `#alerts`)
- `config?.enabled` - Aktiviert/Deaktiviert (default: from ENV)
- `config?.thresholds` - Alert Thresholds

**Returns:** `SupervisorNotifications`

---

### `sendStopScoreAlert(taskName, stopScore, context?)`

Sendet STOP Score Alert.

**Parameters:**

- `taskName: string` - Task Name
- `stopScore: StopScoreResult` - Stop Score Ergebnis
- `context?: string` - Zusätzlicher Kontext

**Returns:** `Promise<{ success: boolean; error?: string }>`

---

### `sendSystemHealthAlert(systemId, health)`

Sendet System Health Alert.

**Parameters:**

- `systemId: string` - System ID
- `health: SystemHealth` - System Health Daten

**Returns:** `Promise<{ success: boolean; error?: string }>`

---

### `sendTaskCompletionNotification(taskId, proposal)`

Sendet Task Completion Notification.

**Parameters:**

- `taskId: string` - Task ID
- `proposal: StatusProposal` - Status Proposal

**Returns:** `Promise<{ success: boolean; error?: string }>`

---

### `sendCustomMessage(title, message, level?)`

Sendet Custom Message.

**Parameters:**

- `title: string` - Titel
- `message: string` - Nachricht (Markdown)
- `level?: "info" | "warning" | "error"` - Level (default: `info`)

**Returns:** `Promise<{ success: boolean; error?: string }>`

---

## Troubleshooting

### Error: "Slack notifications disabled"

**Lösung:**

```bash
# In .env
SLACK_NOTIFICATIONS_ENABLED=true
SLACK_ENABLED=true
```

### Error: "not_in_channel"

**Lösung:**
Mujo bot in Channel einladen:

```
/invite @Mujo
```

### Error: "channel_not_found"

**Lösung:**
Channel-Namen mit `#` verwenden:

```bash
SLACK_ALERT_CHANNEL=#general
```

### Keine Nachrichten empfangen

**Prüfen:**

1. ✅ `SLACK_NOTIFICATIONS_ENABLED=true`
2. ✅ `SLACK_TOKEN` korrekt
3. ✅ Mujo bot in Channel
4. ✅ STOP Score >= Threshold
5. ✅ Messages Tab aktiviert (für DMs)

---

## Best Practices

1. **Separate Channels** - Verschiedene Channels für verschiedene Alert-Typen

   ```typescript
   const criticalAlerts = createSupervisorNotifications({
     channel: "#critical",
   });
   const infoAlerts = createSupervisorNotifications({ channel: "#info" });
   ```

2. **Threshold anpassen** - Je nach Team-Größe

   ```typescript
   const notifications = createSupervisorNotifications({
     thresholds: {
       stopScore: 50, // Weniger false positives
       queueDepth: 100, // Mehr Kapazität
     },
   });
   ```

3. **Context hinzufügen** - Immer Context bei STOP Alerts

   ```typescript
   await notifications.sendStopScoreAlert(
     taskName,
     stopScore,
     "User: @john, Branch: feature/auth, PR: #123",
   );
   ```

4. **Monitoring Loop** - Continuous monitoring für Prod
   ```typescript
   setInterval(async () => {
     const alerts = metaSupervisor.checkAlerts();
     for (const alert of alerts) {
       await notifications.sendCustomMessage("Alert", alert, "warning");
     }
   }, 60000);
   ```

---

## Examples

Siehe `src/supervisor/example.ts` für vollständige Beispiele:

- ✅ STOP Score Alert
- ✅ System Health Monitoring
- ✅ Task Completion
- ✅ Complete Workflow
- ✅ Custom Messages
- ✅ Monitoring Loop

---

**Implementiert:** 2025-12-26
**Status:** Production Ready ✅
**Bot:** Mujo (Activi Agent)
**Integration:** Fully Functional
