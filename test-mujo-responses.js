/**
 * Test Mujo's Interactive Responses
 * Shows what Mujo would answer to different questions
 */

import "dotenv/config";
import {
  generateResponse,
  detectLanguage,
  isMentioningMujo,
  getSmartResponse,
} from "./src/integrations/slack/bot-responses.js";

console.log("💬 Testing Mujo's Interactive Responses\n");

// Test messages
const testMessages = [
  // Bosnian - User's question!
  "mujo koji si ti K... obdje?",
  "@mujo ko si ti?",
  "mujo šta si ti?",

  // German
  "mujo wer bist du?",
  "@mujo hilfe",
  "mujo erzähl einen witz",
  "hallo mujo!",
  "danke mujo",

  // English
  "@mujo who are you?",
  "mujo help",
  "mujo tell me a joke",
  "hey mujo!",

  // Mixed
  "mujo status",
  "mujo sprache english",
];

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("Testing Messages:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

for (const message of testMessages) {
  console.log(`📩 User: "${message}"`);

  // Detect language
  const lang = detectLanguage(message);
  console.log(`   Detected language: ${lang}`);

  // Check if mentioning Mujo
  const mentioning = isMentioningMujo(message);
  console.log(`   Mentioning Mujo: ${mentioning ? "YES" : "NO"}`);

  // Get response
  const response = getSmartResponse(message);
  console.log(`\n🤖 Mujo (${response.language}):`);
  console.log(`   ${response.text.split("\n").join("\n   ")}`);
  console.log("\n" + "─".repeat(50) + "\n");
}

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("✅ All response tests completed!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

console.log("\n💡 To make Mujo respond in Slack:");
console.log("   1. Set up Slack Event Subscriptions");
console.log("   2. Create Webhook endpoint");
console.log("   3. Listen for 'message' events");
console.log("   4. Use getSmartResponse() to reply");
