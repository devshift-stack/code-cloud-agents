# Mujo's Humor System 😄

**Status:** ✅ FULLY IMPLEMENTED

Mujo ist jetzt mehrsprachig und hat Personality!

---

## Features

- 🌍 **3 Sprachen**: Deutsch, English, Bosnisch
- 😄 **4 Witz-Kategorien**:
  - **Mujo & Hase** - Klassische Balkan-Witze
  - **Bosnier & Türken** - Respektvolle Kultur-Witze
  - **Chuck Norris Style** - Über Mujo selbst
  - **Tech Jokes** - Programmierer-Humor
- 👋 **Greetings & Farewells** - Mehrsprachig
- 🎭 **Personality** - Mujo hat Charakter
- ⚙️ **Konfigurierbar** - Sprache & Humor an/aus
- 🛡️ **Professionell** - Ratings: safe, professional, casual

---

## Setup

### 1. In `.env` konfigurieren:

```bash
# Mujo's Personality
MUJO_LANGUAGE=de          # de, en, oder bs
MUJO_HUMOR_ENABLED=true   # true oder false
```

### 2. Fertig!

Mujo spricht jetzt in deiner Sprache und macht Witze!

---

## Witz-Kategorien

### 1. Mujo & Hase (Klassisch)

**Deutsch:**

```
Hase: "Mujo, warum ist dein Code so kompliziert?"
Mujo: "Damit mich keiner fragt, ob ich's erklären kann!"
```

**English:**

```
Haso: "Mujo, why is the server down?"
Mujo: "It's not down, it's just taking a coffee break!"
```

**Bosnisch:**

```
Mujo i Haso prave aplikaciju. Haso pita: "Jesi testirao?"
Mujo: "Jesam, radi na mom računaru!"
```

---

### 2. Bosnier & Türken (Respektvoll)

**Deutsch:**

```
Ein Bosnier und ein Türke gründen ein Startup.
Bosnier macht den Code, Türke macht den Döner.
Beide sind erfolgreich!
```

**English:**

```
A Bosnian and a Turkish developer walk into a meeting.
They both say: "It works on my machine!"
- nobody can reproduce the bug!
```

**Bosnisch:**

```
Bosanac i Turcin prave aplikaciju.
Bosanac: "Kod je gotov!"
Turcin: "Server je spreman!"
Bug: "Ja sam tu cijelo vrijeme!" 😄
```

---

### 3. Chuck Norris Style (über Mujo)

**Deutsch:**

- Mujo schreibt keinen Code. Er denkt an die Lösung und die Computer programmieren sich selbst.
- Mujo testet nicht in Production. Production testet in Mujo.
- Wenn Mujo deployed, sagen die Server "Danke".
- Mujo's Code hat keine Bugs. Bugs haben Mujo's Code.
- Mujo kann durch Null teilen. Das Ergebnis ist immer "perfekt".
- Mujo nutzt kein Git. Git nutzt Mujo.
- Wenn Mujo einen STOP Score von 100 sieht, geht der Score in Rente.
- Mujo braucht keinen Debugger. Bugs debuggen sich selbst wenn sie Mujo sehen.

**English:**

- Mujo doesn't write code. Code writes itself out of respect.
- Mujo doesn't deploy to production. Production deploys to Mujo.
- Mujo's merge conflicts resolve themselves.
- When Mujo runs tests, they pass before execution.
- Mujo doesn't have a STOP score. STOP scores have Mujo.

**Bosnisch:**

- Mujo ne piše kod. Kod se piše sam kad vidi Mujo.
- Mujo ne testuje u produkciji. Produkcija testuje kod Mujo.
- Kad Mujo deployuje, serveri kažu 'hvala'.
- Mujo ne debuguje. Bugovi se sami popravljaju.
- Mujo može dijeliti s nulom. Rezultat je uvijek 'savršeno'.

---

### 4. Tech Jokes

**Deutsch:**

```
Wie viele Programmierer braucht man, um eine Glühbirne zu wechseln?
Keinen. Das ist ein Hardware-Problem!
```

**English:**

```
Why do programmers prefer dark mode?
Because light attracts bugs!
```

**Bosnisch:**

```
Zašto programeri vole tamu?
Jer svjetlo privlači bugove!
```

---

## Usage

### Import

```typescript
import {
  getRandomJoke,
  getGreeting,
  getFarewell,
  addHumor,
  getMujoSignature,
  type Language,
  type JokeCategory,
} from "./src/integrations/slack/humor.js";
```

---

### 1. Random Joke bekommen

```typescript
// German joke
const joke = getRandomJoke("de", "mujo-hase");
console.log(joke.setup); // "Hase: 'Mujo, was ist ein Bug?'"
console.log(joke.punchline); // "Mujo: 'Ein undokumentiertes Feature!'"
console.log(joke.rating); // "safe"

// English Chuck Norris style
const chuckJoke = getRandomJoke("en", "chuck-norris");
console.log(chuckJoke.punchline);
// "Mujo doesn't write code. Code writes itself out of respect."

// Bosnian, any category
const randomJoke = getRandomJoke("bs");
console.log(randomJoke.punchline);
```

**Parameters:**

- `language`: `"de"` | `"en"` | `"bs"` (default: `"de"`)
- `category`: `"mujo-hase"` | `"bosnier-turken"` | `"chuck-norris"` | `"tech"` (optional)
- `rating`: `"safe"` | `"professional"` | `"casual"` (default: `"professional"`)

---

### 2. Greeting & Farewell

```typescript
// German
const greeting = getGreeting("de");
// "Hallo! Mujo hier, dein freundlicher Supervisor Bot! 👋"

const farewell = getFarewell("de");
// "Tschüss! Mujo signing off! 👋"

// English
const greetingEN = getGreeting("en");
// "Hello! Mujo here, your friendly Supervisor Bot! 👋"

// Bosnisch
const greetingBS = getGreeting("bs");
// "Ćao! Mujo ovdje, tvoj prijateljski Supervisor Bot! 👋"
```

---

### 3. Humor zu Messages hinzufügen

```typescript
const message = "Deployment erfolgreich!";

// Add humor (30% chance for success, 20% for info)
const withHumor = addHumor(message, "success", "de");
// Might add a Chuck Norris style joke

console.log(withHumor);
// "Deployment erfolgreich!
//
// 💡 _Mujo testet nicht in Production. Production testet in Mujo._"
```

**Context Types:**

- `"alert"` - Keine Witze bei CRITICAL alerts
- `"info"` - 20% Chance für Witz
- `"success"` - 30% Chance für Chuck Norris style
- `"greeting"` - Zeigt Greeting
- `"farewell"` - Zeigt Farewell

---

### 4. Mujo's Signature

```typescript
const signature = getMujoSignature("de");
// "🤖 Mujo - Dein mehrsprachiger Supervisor Bot (DE/EN/BS)"

const signatureEN = getMujoSignature("en");
// "🤖 Mujo - Your multilingual Supervisor Bot (DE/EN/BS)"

const signatureBS = getMujoSignature("bs");
// "🤖 Mujo - Tvoj višejezični Supervisor Bot (DE/EN/BS)"
```

---

## Integration mit Supervisor Notifications

Mujo's Humor ist automatisch in `SupervisorNotifications` integriert!

```typescript
import { createSupervisorNotifications } from "./src/supervisor/index.js";

const notifications = createSupervisorNotifications({
  channel: "#alerts",
  language: "de", // Mujo spricht Deutsch
  humor: true, // Witze aktiviert
});

// Footer enthält automatisch Mujo's Signature
await notifications.sendCustomMessage("Test", "Hallo Welt!", "info");

// Footer in Slack:
// "🤖 Mujo - Dein mehrsprachiger Supervisor Bot (DE/EN/BS) | Supervisor System | 2025-12-26 15:30:00"
```

---

## Ratings (Professionalität)

Alle Witze haben ein Rating:

### `"safe"` ✅

- Komplett harmlos
- Für alle Audiences
- Keine kontroversen Themen

### `"professional"` ⚙️

- Business-appropriate
- Tech-Humor
- Standard für Supervisor Notifications

### `"casual"` 😄

- Lockerer Humor
- Für informelle Chats
- Nicht in kritischen Alerts

**Filterung:**

```typescript
// Nur "safe" Witze
const safeJoke = getRandomJoke("de", undefined, "safe");

// "professional" oder besser (default)
const professionalJoke = getRandomJoke("de", undefined, "professional");

// Alle Witze (auch "casual")
const anyJoke = getRandomJoke("de", undefined, "casual");
```

---

## Sprachen

### Deutsch 🇩🇪

```typescript
getRandomJoke("de");
getGreeting("de");
getMujoSignature("de");
```

- 5 Mujo & Hase Witze
- 3 Bosnier & Türken Witze
- 8 Chuck Norris Style Witze
- 2 Tech Jokes
- 4 Greetings, 4 Farewells

---

### English 🇬🇧

```typescript
getRandomJoke("en");
getGreeting("en");
getMujoSignature("en");
```

- 3 Mujo & Haso Jokes
- 1 Bosnian & Turkish Joke
- 5 Chuck Norris Style Jokes
- 1 Tech Joke
- 4 Greetings, 4 Farewells

---

### Bosnisch 🇧🇦

```typescript
getRandomJoke("bs");
getGreeting("bs");
getMujoSignature("bs");
```

- 3 Mujo i Haso vicevi
- 2 Bosanac i Turcin vicevi
- 5 Chuck Norris Style vicevi
- 1 Tech vic
- 4 Pozdrava, 4 Oprosta

---

## Testing

### Test Script ausführen

```bash
npx tsx test-mujo-humor.js
```

**Testet:**

1. ✅ Mujo & Hase Witze (DE/EN/BS)
2. ✅ Bosnier & Türken Witze
3. ✅ Chuck Norris Style Witze (DE/EN/BS)
4. ✅ Greetings & Farewells (DE/EN/BS)
5. ✅ Add Humor zu Messages
6. ✅ Mujo's Signature (DE/EN/BS)
7. ✅ Send Joke to Slack (optional)

**Output:**

```
😄 Testing Mujo's Humor System

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST 1: Mujo & Hase Witze
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🇩🇪 DEUTSCH:
   Hase: 'Mujo, was ist ein Bug?'
   → Mujo: 'Ein undokumentiertes Feature!'
   (safe)

🇬🇧 ENGLISH:
   Mujo and Haso are deploying. Haso asks: 'Did you test it?'
   → Mujo: 'The users will test it for free!'
   (professional)

🇧🇦 BOSANSKI:
   Haso: 'Mujo, zašto server ne radi?'
   → Mujo: 'Pa radi, samo se odmara malo!'
   (safe)

✅ All humor tests completed!
```

---

## Beispiele

### 1. Greeting beim Start

```typescript
const greeting = getGreeting("de");
await slack.sendMessage({
  channel: "#general",
  text: greeting,
});
// "Servus! Ich bin Mujo, bereit für Action! 🚀"
```

---

### 2. Random Joke senden

```typescript
const joke = getRandomJoke("de", "chuck-norris");
await slack.sendMessage({
  channel: "#random",
  text: `😄 Mujo's Witz:\n\n${joke.punchline}`,
});
```

---

### 3. Daily Joke Bot

```typescript
// Jeden Tag um 9:00 Uhr
cron.schedule("0 9 * * *", async () => {
  const joke = getRandomJoke("de");
  await notifications.sendCustomMessage(
    "😄 Guten Morgen!",
    joke.setup ? `${joke.setup}\n\n${joke.punchline}` : joke.punchline,
    "info",
  );
});
```

---

### 4. Sprache wechseln

```typescript
const notificationsDE = createSupervisorNotifications({ language: "de" });
const notificationsEN = createSupervisorNotifications({ language: "en" });
const notificationsBS = createSupervisorNotifications({ language: "bs" });

// German
await notificationsDE.sendCustomMessage("Test", "Hallo", "info");
// Footer: "🤖 Mujo - Dein mehrsprachiger Supervisor Bot"

// English
await notificationsEN.sendCustomMessage("Test", "Hello", "info");
// Footer: "🤖 Mujo - Your multilingual Supervisor Bot"

// Bosnisch
await notificationsBS.sendCustomMessage("Test", "Zdravo", "info");
// Footer: "🤖 Mujo - Tvoj višejezični Supervisor Bot"
```

---

### 5. Humor deaktivieren

```typescript
const notifications = createSupervisorNotifications({
  humor: false, // Keine Witze
});

// Oder in .env:
MUJO_HUMOR_ENABLED = false;
```

---

## API Reference

### `getRandomJoke(language, category?, rating?)`

Gibt einen zufälligen Witz zurück.

**Parameters:**

- `language`: `"de"` | `"en"` | `"bs"` (required)
- `category`: `"mujo-hase"` | `"bosnier-turken"` | `"chuck-norris"` | `"tech"` (optional)
- `rating`: `"safe"` | `"professional"` | `"casual"` (default: `"professional"`)

**Returns:** `Joke | null`

```typescript
interface Joke {
  category: JokeCategory;
  language: Language;
  setup?: string;
  punchline: string;
  rating: "safe" | "professional" | "casual";
}
```

---

### `getGreeting(language)`

Gibt eine zufällige Begrüßung zurück.

**Parameters:**

- `language`: `"de"` | `"en"` | `"bs"` (default: `"de"`)

**Returns:** `string`

---

### `getFarewell(language)`

Gibt einen zufälligen Abschied zurück.

**Parameters:**

- `language`: `"de"` | `"en"` | `"bs"` (default: `"de"`)

**Returns:** `string`

---

### `addHumor(message, context, language)`

Fügt Humor zu einer Message hinzu (chance-based).

**Parameters:**

- `message`: `string` - Original message
- `context`: `"alert"` | `"info"` | `"success"` | `"greeting"` | `"farewell"` (default: `"info"`)
- `language`: `"de"` | `"en"` | `"bs"` (default: `"de"`)

**Returns:** `string` - Message mit oder ohne Humor

**Behavior:**

- `alert` + CRITICAL: no humor
- `success`: 30% chance for Chuck Norris joke
- `info`: 20% chance for random joke
- `greeting`: returns greeting
- `farewell`: returns farewell

---

### `getMujoSignature(language)`

Gibt Mujo's Signature zurück.

**Parameters:**

- `language`: `"de"` | `"en"` | `"bs"` (default: `"de"`)

**Returns:** `string`

---

## Best Practices

1. **Sprache konsistent wählen** - Eine Sprache pro Channel

   ```typescript
   const de = createSupervisorNotifications({ language: "de" });
   const en = createSupervisorNotifications({ language: "en" });
   ```

2. **Humor in kritischen Alerts aus** - Automatisch deaktiviert bei CRITICAL

   ```typescript
   // CRITICAL alerts: no humor (automatic)
   if (stopScore.severity === "CRITICAL") {
     // addHumor() returns original message
   }
   ```

3. **Professional Rating nutzen** - Standard für Business

   ```typescript
   const joke = getRandomJoke("de", undefined, "professional");
   ```

4. **Testing mit verschiedenen Sprachen** - Multi-language support
   ```typescript
   ["de", "en", "bs"].forEach((lang) => {
     const joke = getRandomJoke(lang as Language);
     console.log(`${lang}: ${joke.punchline}`);
   });
   ```

---

## Troubleshooting

### Keine Witze erscheinen

**Problem:** `addHumor()` gibt immer nur Original zurück

**Lösung:**

- `addHumor()` ist chance-based (20-30%)
- Mehrmals testen oder direkt `getRandomJoke()` nutzen

---

### Falsche Sprache

**Problem:** Witze in falscher Sprache

**Lösung:**

```bash
# In .env setzen
MUJO_LANGUAGE=de  # oder en, oder bs
```

---

### Jokes nicht professionell genug

**Problem:** Witze zu casual

**Lösung:**

```typescript
const joke = getRandomJoke("de", undefined, "safe");
// Nur "safe" Witze
```

---

## Erweiterungen

Neue Witze hinzufügen in `src/integrations/slack/humor.ts`:

```typescript
const MUJO_HASE_JOKES: Joke[] = [
  ...{
    category: "mujo-hase",
    language: "de",
    setup: "Hase fragt Mujo: '...'",
    punchline: "Mujo: '...'",
    rating: "professional",
  },
];
```

---

**Implementiert:** 2025-12-26
**Status:** Production Ready ✅
**Sprachen:** 🇩🇪 Deutsch, 🇬🇧 English, 🇧🇦 Bosanski
**Kategorien:** 4 (Mujo & Hase, Bosnier & Türken, Chuck Norris, Tech)
**Total Jokes:** 30+
**Rating:** safe, professional, casual
