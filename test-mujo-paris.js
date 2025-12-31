/**
 * Test Mujo's Paris Easter Egg
 * Tests automatic DM to Arnel when someone mentions Paris trip
 */

console.log("✈️ Testing Mujo's Paris Easter Egg\n");
console.log("=".repeat(60) + "\n");

// Test messages that should trigger the Paris DM
const testMessages = [
  // Bosnian
  "ja moram na put u Paris",
  "moram u Paris sutra",
  "idem u Paris sledece nedjelje",

  // English
  "I'm going to Paris next week",
  "going to Paris for a conference",

  // German
  "ich muss nach Paris",
  "fahre nach Paris morgen",
];

console.log("📋 Test Messages (should all trigger DM to Arnel):\n");
console.log("─".repeat(60));

for (const message of testMessages) {
  const messageLower = message.toLowerCase();

  // Detection logic (same as in slack-events.ts)
  const triggers =
    messageLower.includes("ja moram na put u paris") ||
    messageLower.includes("moram u paris") ||
    messageLower.includes("idem u paris") ||
    messageLower.includes("going to paris") ||
    messageLower.includes("nach paris");

  console.log(`\n📩 Message: "${message}"`);
  console.log(`   Trigger: ${triggers ? "✅ YES" : "❌ NO"}`);

  if (triggers) {
    console.log(
      `   Action: 📨 DM to Arnel: "Hocemo na kafu nas dvoje dok Denis bude na putu? ☕😏"`,
    );
    console.log(`   Action: 📢 Channel: "✈️ Bon voyage!"`);
  }
}

console.log("\n" + "─".repeat(60));
console.log("\n=".repeat(60));
console.log("\n✅ Paris Easter Egg Test Complete!\n");

// Messages that should NOT trigger
console.log("📋 Negative Tests (should NOT trigger):\n");
console.log("─".repeat(60));

const negativeMessages = [
  "I love Paris!",
  "Paris is beautiful",
  "mujo help",
  "random message",
];

for (const message of negativeMessages) {
  const messageLower = message.toLowerCase();

  const triggers =
    messageLower.includes("ja moram na put u paris") ||
    messageLower.includes("moram u paris") ||
    messageLower.includes("idem u paris") ||
    messageLower.includes("going to paris") ||
    messageLower.includes("nach paris");

  console.log(`\n📩 Message: "${message}"`);
  console.log(
    `   Trigger: ${triggers ? "❌ FALSE POSITIVE!" : "✅ Correctly ignored"}`,
  );
}

console.log("\n" + "─".repeat(60));
console.log("\n🎁 Easter Egg Behavior:");
console.log("   • Triggered without mentioning Mujo");
console.log("   • Sends DM to Arnel automatically");
console.log("   • Sends subtle 'Bon voyage!' in channel");
console.log("   • Works in 3 languages (DE/EN/BS)");
console.log("\n💡 Setup Required:");
console.log("   • Set SLACK_ARNEL_USER_ID=U01234567 in .env");
console.log("   • Arnel's User ID from Slack App Settings");
