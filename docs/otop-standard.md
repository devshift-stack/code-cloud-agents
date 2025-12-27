# OTOP Standard (Repo-weit)

## Ziel
1) **Backend-Funktionen** sind eindeutig & stabil referenzierbar (OpenAPI `operationId`).
2) **UI-Elemente** sind eindeutig & stabil referenzierbar (`data-otop-id` / `data-testid`).
3) **Verbindung** Frontend↔Backend ist robust (keine hardcoded URLs).

---

## 1) Backend Standard (OpenAPI = Function Registry)

### Pflicht
- Jede REST-Operation MUSS besitzen:
  - `operationId` (eindeutig innerhalb der Spec)
  - `tags` (mind. 1 Tag; dient als Gruppierung im Tool)

### operationId Konvention (deterministisch)
**Format:** `{tagSlug}_{method}_{pathSlug}`

Beispiele:
- Tag: `Tasks`, Methode: `POST`, Pfad: `/tasks`  
  → `tasks_post_tasks`
- Tag: `Candidates`, Methode: `GET`, Pfad: `/candidates/{id}`  
  → `candidates_get_candidates_id`

**Regeln:**
- `tagSlug` = lower + `_` statt Leerzeichen
- `pathSlug` = path ohne führenden `/`, `/`→`_`, `{id}`→`id`
- Keine Sonderzeichen, nur `[a-z0-9_]`

### Tags Konvention
- Tags sollten “Menü-Struktur” im OTOP Tool abbilden:
  - `Auth`, `Agents`, `Tasks`, `CRM`, `Telephony`, `Admin`, `Utils`
- Optional: “Substruktur” im Tag-Name: `CRM/Candidates`, `CRM/Jobs`

### Health/Ready (empfohlen)
- `/health` (liveness)
- `/ready` (readiness; z.B. DB/Queue ready)

---

## 2) Frontend Standard (UI IDs = Link Targets)

### Web (React/Vite/Next)
Jede interaktive Komponente MUSS haben:
- `data-testid`
- `data-otop-id`

**ID Schema:** `{domain}.{entity}.{screen}.{component}.{action}`

Beispiele:
- `crm.candidate.list.search.input`
- `crm.candidate.list.create.button`
- `crm.candidate.form.save.button`
- `agents.task.detail.disable.toggle`

**Beispiel:**
```tsx
<button
  data-testid="crm.candidate.list.create.button"
  data-otop-id="crm.candidate.list.create.button"
>
  Create
</button>
```

### React Native (Expo)
React Native nutzt kein `data-*`, darum:
- `testID` (Tests & Tool-Anker)
- `accessibilityLabel` (OTOP-Label, stabil)

```tsx
<TouchableOpacity
  testID="crm.candidate.list.create.button"
  accessibilityLabel="otop:crm.candidate.list.create.button"
>
  <Text>Create</Text>
</TouchableOpacity>
```

### Flutter
```dart
ElevatedButton(
  key: const Key('crm.candidate.list.create.button'),
  onPressed: () {},
  child: const Text('Create'),
)
```

---

## 3) Verbindung Frontend ↔ Backend (keine hardcoded URLs)
Erlaubt:
- Proxy `/api/*` (best)
- ENV `*_API_BASE_URL` (ok)

Verboten:
- Hardcoded Domains/Ports im Code (`http://localhost:...`, `https://api...`)

---

## 4) Definition of Done (für “Fertigstellung”)
Ein UI gilt als „fertig“, wenn:
- alle benötigten Backend-Funktionen entweder
  - **verlinkt** sind (UI-ID → operationId), oder
  - bewusst als **deaktiviert** markiert sind
- Delete/Disable/Unlink erzeugt Warnung über Auswirkungen (Dependencies)
