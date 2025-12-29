# UI BLUEPRINT (OTOP) – Code Cloud Agents
Basis: backend/swagger.yaml (Tags: Health, Tasks, Audit, Enforcement, Chat, Demo, Slack)

Regeln:
- Jeder Screen: loading/error/empty/success
- Delete gibt es aktuell nicht in OpenAPI → UI zeigt kein Delete (sonst Phantom-Button)
- Jeder Button/Input: data-otop-id + data-testid
- API Calls als Platzhalter: api.<operationId>(params)

---

## SECTION: Health
### ENTITY: System

#### SCREEN: API Info
- PURPOSE: Zeigt API-Metadaten (Version, Status, Supervisor Mode)
- UI ELEMENTS:
  - Card: Name, Version, Status, Supervisor, Mode
  - Refresh Button
- BUTTONS:
  - Refresh:
    - data-otop-id="health.system.apiinfo.refresh.button"
    - data-testid="health.system.apiinfo.refresh.button"
- API LINKS:
  - health_get_api -> GET /api
- STATES:
  - loading: Skeleton/Card placeholders
  - error: Error banner + retry
  - empty: (nicht relevant)
  - success: zeigt Daten + success toast optional

#### SCREEN: Health Status
- PURPOSE: Zeigt System Health (DB, Queue, Uptime)
- UI ELEMENTS:
  - Status indicator (healthy / degraded)
  - Metrics: database, queue, uptime
  - Refresh Button
- BUTTONS:
  - Refresh:
    - data-otop-id="health.system.status.refresh.button"
    - data-testid="health.system.status.refresh.button"
- API LINKS:
  - health_get_health -> GET /health
- STATES: loading/error/empty/success

---

## SECTION: Tasks
### ENTITY: Task

#### SCREEN: Task List
- PURPOSE: Liste aller Tasks + Status + Priorität + Assignee
- UI ELEMENTS:
  - Search input (title/description)
  - Filter: priority (low/medium/high), assignee
  - Table/List: title, priority, assignee, status (wenn vorhanden), createdAt (wenn vorhanden)
  - Row actions: View, Update
  - Create Button
- BUTTONS:
  - Create:
    - data-otop-id="tasks.task.list.create.button"
    - data-testid="tasks.task.list.create.button"
  - Search:
    - data-otop-id="tasks.task.list.search.input"
    - data-testid="tasks.task.list.search.input"
  - Filter Priority:
    - data-otop-id="tasks.task.list.filter.priority.select"
    - data-testid="tasks.task.list.filter.priority.select"
  - Filter Assignee:
    - data-otop-id="tasks.task.list.filter.assignee.select"
    - data-testid="tasks.task.list.filter.assignee.select"
  - Row View:
    - data-otop-id="tasks.task.list.row.view.button"
    - data-testid="tasks.task.list.row.view.button"
  - Row Update:
    - data-otop-id="tasks.task.list.row.update.button"
    - data-testid="tasks.task.list.row.update.button"
- API LINKS:
  - tasks_get_api_tasks -> GET /api/tasks
- STATES: loading/error/empty/success

#### SCREEN: Task Create (Modal)
- PURPOSE: Task erstellen und an Enforcement Gate übergeben
- REQUIRED FIELDS:
  - title (min 1, max 200)
- OPTIONAL FIELDS:
  - description
  - priority enum: low|medium|high (default medium)
  - assignee enum: cloud_assistant (default)
  - artefacts: string[]
- UI ELEMENTS:
  - Form inputs: title, description, priority select, artefacts (tags input), assignee select
  - Submit + Cancel
- BUTTONS:
  - Title input:
    - data-otop-id="tasks.task.create.title.input"
    - data-testid="tasks.task.create.title.input"
  - Description textarea:
    - data-otop-id="tasks.task.create.description.textarea"
    - data-testid="tasks.task.create.description.textarea"
  - Priority select:
    - data-otop-id="tasks.task.create.priority.select"
    - data-testid="tasks.task.create.priority.select"
  - Artefacts input:
    - data-otop-id="tasks.task.create.artefacts.input"
    - data-testid="tasks.task.create.artefacts.input"
  - Submit:
    - data-otop-id="tasks.task.create.submit.button"
    - data-testid="tasks.task.create.submit.button"
  - Cancel:
    - data-otop-id="tasks.task.create.cancel.button"
    - data-testid="tasks.task.create.cancel.button"
- API LINKS:
  - tasks_post_api_tasks -> POST /api/tasks
- VALIDATION:
  - title required, minLength 1, maxLength 200
  - priority must be enum
- STATES:
  - loading: disable submit + spinner
  - error: show API error
  - success: toast “Task created”

#### SCREEN: Task Detail
- PURPOSE: Task Details + Status (und Logs wenn im Schema)
- UI ELEMENTS:
  - Read-only fields: title, description, priority, status, assignee
  - Update Button (öffnet Update Modal)
- BUTTONS:
  - Back:
    - data-otop-id="tasks.task.detail.back.button"
    - data-testid="tasks.task.detail.back.button"
  - Update:
    - data-otop-id="tasks.task.detail.update.button"
    - data-testid="tasks.task.detail.update.button"
- API LINKS:
  - tasks_get_api_tasks_id -> GET /api/tasks/{id}
- STATES: loading/error/empty/success

#### SCREEN: Task Update (Modal)
- PURPOSE: Task bearbeiten
- UI ELEMENTS:
  - Form wie Create (falls Schema gleich)
  - Save + Cancel
- BUTTONS:
  - Save:
    - data-otop-id="tasks.task.update.save.button"
    - data-testid="tasks.task.update.save.button"
  - Cancel:
    - data-otop-id="tasks.task.update.cancel.button"
    - data-testid="tasks.task.update.cancel.button"
- API LINKS:
  - tasks_post_api_tasks_id -> POST /api/tasks/{id}
- STATES: loading/error/success

---

## SECTION: Audit
### ENTITY: AuditLog

#### SCREEN: Audit List
- PURPOSE: Audit Logs anzeigen
- UI ELEMENTS:
  - Search input
  - Table: timestamp, actor, action, entity, result
  - Row action: View
- BUTTONS:
  - Search:
    - data-otop-id="audit.log.list.search.input"
    - data-testid="audit.log.list.search.input"
  - Row View:
    - data-otop-id="audit.log.list.row.view.button"
    - data-testid="audit.log.list.row.view.button"
- API LINKS:
  - audit_get_api_audit -> GET /api/audit
- STATES: loading/error/empty/success

#### SCREEN: Audit Detail
- PURPOSE: Einzelnen Audit Eintrag anzeigen
- UI ELEMENTS:
  - JSON viewer (payload) + Meta fields
- BUTTONS:
  - Back:
    - data-otop-id="audit.log.detail.back.button"
    - data-testid="audit.log.detail.back.button"
- API LINKS:
  - audit_get_api_audit_id -> GET /api/audit/{id}
- STATES: loading/error/empty/success

---

## SECTION: Enforcement
### ENTITY: BlockedTask

#### SCREEN: Blocked Tasks
- PURPOSE: Tasks anzeigen, die Approval brauchen
- UI ELEMENTS:
  - Table/List: task id, title, score, reason
  - Row actions: Approve, Reject, View
- BUTTONS:
  - Row Approve:
    - data-otop-id="enforcement.blocked.list.row.approve.button"
    - data-testid="enforcement.blocked.list.row.approve.button"
  - Row Reject:
    - data-otop-id="enforcement.blocked.list.row.reject.button"
    - data-testid="enforcement.blocked.list.row.reject.button"
  - Row View:
    - data-otop-id="enforcement.blocked.list.row.view.button"
    - data-testid="enforcement.blocked.list.row.view.button"
- API LINKS:
  - enforcement_get_api_enforcement_blocked -> GET /api/enforcement/blocked
- STATES: loading/error/empty/success

#### SCREEN: Approve Task (Modal)
- PURPOSE: Human approval mit Kommentar
- UI ELEMENTS:
  - Comment textarea
  - Confirm + Cancel
- BUTTONS:
  - Comment:
    - data-otop-id="enforcement.approve.comment.textarea"
    - data-testid="enforcement.approve.comment.textarea"
  - Confirm:
    - data-otop-id="enforcement.approve.confirm.button"
    - data-testid="enforcement.approve.confirm.button"
  - Cancel:
    - data-otop-id="enforcement.approve.cancel.button"
    - data-testid="enforcement.approve.cancel.button"
- API LINKS:
  - enforcement_post_api_enforcement_approve -> POST /api/enforcement/approve
- STATES: loading/error/success

#### SCREEN: Reject Task (Modal)
- PURPOSE: Human reject mit Kommentar
- UI ELEMENTS:
  - Comment textarea
  - Confirm + Cancel
- BUTTONS:
  - Comment:
    - data-otop-id="enforcement.reject.comment.textarea"
    - data-testid="enforcement.reject.comment.textarea"
  - Confirm:
    - data-otop-id="enforcement.reject.confirm.button"
    - data-testid="enforcement.reject.confirm.button"
  - Cancel:
    - data-otop-id="enforcement.reject.cancel.button"
    - data-testid="enforcement.reject.cancel.button"
- API LINKS:
  - enforcement_post_api_enforcement_reject -> POST /api/enforcement/reject
- STATES: loading/error/success

---

## SECTION: Chat
### ENTITY: Chat

#### SCREEN: Chat Console
- PURPOSE: Nachricht senden + Antwort anzeigen
- UI ELEMENTS:
  - Agent select (optional)
  - Message textarea
  - Send Button
  - Response panel (messages)
- BUTTONS:
  - Agent Select:
    - data-otop-id="chat.console.agent.select"
    - data-testid="chat.console.agent.select"
  - Message:
    - data-otop-id="chat.console.message.textarea"
    - data-testid="chat.console.message.textarea"
  - Send:
    - data-otop-id="chat.console.send.button"
    - data-testid="chat.console.send.button"
- API LINKS:
  - chat_post_api_chat_send -> POST /api/chat/send
- STATES: loading/error/empty/success

#### SCREEN: Agents List
- PURPOSE: verfügbare Chat Agents anzeigen
- UI ELEMENTS:
  - List of agents + Refresh
- BUTTONS:
  - Refresh:
    - data-otop-id="chat.agents.list.refresh.button"
    - data-testid="chat.agents.list.refresh.button"
- API LINKS:
  - chat_get_api_chat_agents -> GET /api/chat/agents
- STATES: loading/error/empty/success

---

## SECTION: Demo
### ENTITY: DemoInvite

#### SCREEN: Create Invite (Modal)
- PURPOSE: Demo Invite erzeugen
- UI ELEMENTS:
  - Form (gemäß Schema) + Submit/Cancel
- BUTTONS:
  - Submit:
    - data-otop-id="demo.invite.create.submit.button"
    - data-testid="demo.invite.create.submit.button"
  - Cancel:
    - data-otop-id="demo.invite.create.cancel.button"
    - data-testid="demo.invite.create.cancel.button"
- API LINKS:
  - demo_post_api_demo_invites -> POST /api/demo/invites
- STATES: loading/error/success

#### SCREEN: Redeem Invite
- PURPOSE: Invite Code einlösen
- UI ELEMENTS:
  - Code input + Redeem button
- BUTTONS:
  - Code input:
    - data-otop-id="demo.invite.redeem.code.input"
    - data-testid="demo.invite.redeem.code.input"
  - Redeem:
    - data-otop-id="demo.invite.redeem.submit.button"
    - data-testid="demo.invite.redeem.submit.button"
- API LINKS:
  - demo_post_api_demo_redeem -> POST /api/demo/redeem
- STATES: loading/error/success

#### SCREEN: Demo Stats
- PURPOSE: Demo Stats anzeigen
- UI ELEMENTS:
  - KPI Cards + Refresh
- BUTTONS:
  - Refresh:
    - data-otop-id="demo.stats.refresh.button"
    - data-testid="demo.stats.refresh.button"
- API LINKS:
  - demo_get_api_demo_stats -> GET /api/demo/stats
- STATES: loading/error/empty/success

#### SCREEN: Demo User Detail
- PURPOSE: Demo User Infos anzeigen (by userid)
- UI ELEMENTS:
  - userid input (optional) + Details + Back
- BUTTONS:
  - UserId input:
    - data-otop-id="demo.user.detail.userid.input"
    - data-testid="demo.user.detail.userid.input"
  - Back:
    - data-otop-id="demo.user.detail.back.button"
    - data-testid="demo.user.detail.back.button"
- API LINKS:
  - demo_get_api_demo_users_userid -> GET /api/demo/users/{userid}
- STATES: loading/error/empty/success

---

## SECTION: Slack
### ENTITY: SlackIntegration

#### SCREEN: Slack Events (Info/Status)
- PURPOSE: Zeigt Slack Events Endpoint + Setup Hinweise. (Receive Endpoint ist normalerweise kein UI Button)
- UI ELEMENTS:
  - Info card + Endpoint URL
  - Copy URL Button
  - Setup steps (Slack App config)
- BUTTONS:
  - Copy URL:
    - data-otop-id="slack.integration.events.copyurl.button"
    - data-testid="slack.integration.events.copyurl.button"
- API LINKS:
  - slack_post_api_slack_events -> POST /api/slack/events (Receive webhook)
- STATES: success only (kein echter fetch, außer du baust später status endpoint)

### ENTITY: WebhookManagement (TODO)
- NOTE: In OpenAPI fehlen Management-Endpunkte (list/create/edit/test/logs).
- Wenn du Webhook-UI willst, musst du diese Endpoints ergänzen:
  - GET /api/slack/webhooks
  - POST /api/slack/webhooks
  - PATCH /api/slack/webhooks/{id}
  - POST /api/slack/webhooks/{id}/test
  - GET /api/slack/webhooks/{id}/deliveries
