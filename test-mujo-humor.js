/**
 * Test Mujo's Humor System
 * Tests multilingual jokes (DE/EN/BS) and personality
 */

import "dotenv/config";
import {
  getRandomJoke,
  getGreeting,
  getFarewell,
  addHumor,
  getMujoSignature,
} from "./src/integrations/slack/humor.js";
import { createSupervisorNotifications } from "./src/supervisor/index.js";

console.log("😄 Testing Mujo's Humor System\n");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 1: Mujo & Hase Witze");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Deutsch
console.log("🇩🇪 DEUTSCH:");
const jokeDE = getRandomJoke("de", "mujo-hase");
if (jokeDE) {
  if (jokeDE.setup) console.log(`   ${jokeDE.setup}`);
  console.log(`   → ${jokeDE.punchline}`);
  console.log(`   (${jokeDE.rating})\n`);
}

// English
console.log("🇬🇧 ENGLISH:");
const jokeEN = getRandomJoke("en", "mujo-hase");
if (jokeEN) {
  if (jokeEN.setup) console.log(`   ${jokeEN.setup}`);
  console.log(`   → ${jokeEN.punchline}`);
  console.log(`   (${jokeEN.rating})\n`);
}

// Bosnisch
console.log("🇧🇦 BOSANSKI:");
const jokeBS = getRandomJoke("bs", "mujo-hase");
if (jokeBS) {
  if (jokeBS.setup) console.log(`   ${jokeBS.setup}`);
  console.log(`   → ${jokeBS.punchline}`);
  console.log(`   (${jokeBS.rating})\n`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 2: Bosnier & Türken Witze");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const bosnierTurkenJoke = getRandomJoke("de", "bosnier-turken");
if (bosnierTurkenJoke) {
  if (bosnierTurkenJoke.setup) console.log(`   ${bosnierTurkenJoke.setup}`);
  console.log(`   → ${bosnierTurkenJoke.punchline}\n`);
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 3: Chuck Norris Style (über Mujo)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// 5 Random Chuck Norris style jokes
console.log("🇩🇪 DEUTSCH:");
for (let i = 0; i < 3; i++) {
  const chuckJoke = getRandomJoke("de", "chuck-norris");
  if (chuckJoke) {
    console.log(`   ${i + 1}. ${chuckJoke.punchline}`);
  }
}

console.log("\n🇬🇧 ENGLISH:");
for (let i = 0; i < 3; i++) {
  const chuckJoke = getRandomJoke("en", "chuck-norris");
  if (chuckJoke) {
    console.log(`   ${i + 1}. ${chuckJoke.punchline}`);
  }
}

console.log("\n🇧🇦 BOSANSKI:");
for (let i = 0; i < 3; i++) {
  const chuckJoke = getRandomJoke("bs", "chuck-norris");
  if (chuckJoke) {
    console.log(`   ${i + 1}. ${chuckJoke.punchline}`);
  }
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 4: Greetings & Farewells");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("🇩🇪 DEUTSCH:");
console.log(`   Greeting: ${getGreeting("de")}`);
console.log(`   Farewell: ${getFarewell("de")}\n`);

console.log("🇬🇧 ENGLISH:");
console.log(`   Greeting: ${getGreeting("en")}`);
console.log(`   Farewell: ${getFarewell("en")}\n`);

console.log("🇧🇦 BOSANSKI:");
console.log(`   Greeting: ${getGreeting("bs")}`);
console.log(`   Farewell: ${getFarewell("bs")}\n`);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 5: Add Humor to Messages");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const message = "Deployment erfolgreich abgeschlossen!";
const withHumor = addHumor(message, "success", "de");
console.log("Original:");
console.log(`   ${message}\n`);
console.log("Mit Humor:");
console.log(`   ${withHumor}\n`);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 6: Mujo's Signature");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

console.log("🇩🇪 DEUTSCH:");
console.log(`   ${getMujoSignature("de")}\n`);

console.log("🇬🇧 ENGLISH:");
console.log(`   ${getMujoSignature("en")}\n`);

console.log("🇧🇦 BOSANSKI:");
console.log(`   ${getMujoSignature("bs")}\n`);

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("TEST 7: Send Joke to Slack (optional)");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

const notifications = createSupervisorNotifications({
  channel: "#general",
  language: "de",
  humor: true,
});

if (notifications.isEnabled()) {
  console.log("✅ Slack enabled - Sending joke...\n");

  // Pick a random joke
  const randomJoke = getRandomJoke("de", "chuck-norris");
  if (randomJoke) {
    await notifications.sendCustomMessage(
      "😄 Mujo's Witz des Tages",
      randomJoke.punchline,
      "info",
    );
    console.log("✅ Joke sent to Slack!");
  }
} else {
  console.log("ℹ️  Slack disabled - Skipping Slack test");
}

console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✅ All humor tests completed!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

console.log("\n💡 Mujo speaks:");
console.log("   🇩🇪 Deutsch");
console.log("   🇬🇧 English");
console.log("   🇧🇦 Bosanski");
console.log("\n💡 Joke Categories:");
console.log("   - Mujo & Hase (klassisch)");
console.log("   - Bosnier & Türken (respektvoll)");
console.log("   - Chuck Norris Style (über Mujo)");
console.log("   - Tech Jokes");
