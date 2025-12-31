/**
 * Test Mujo's Top 5 Wishes Multi-Level Easter Egg
 */

import { generateResponse } from "./src/integrations/slack/bot-responses.js";

console.log("🏆 Testing Mujo's Top 5 Wishes Easter Egg\n");
console.log("=".repeat(60) + "\n");

// Level 1: Simple wish
console.log("📊 LEVEL 1: Simple Greatest Wish\n");
console.log("─".repeat(60));

const simple = [
  "mujo sta je tvoja najveca zelja?",
  "mujo what is your greatest wish?",
];

for (const msg of simple) {
  console.log(`📩 User: "${msg}"`);
  const response = generateResponse(msg);
  console.log(`🤖 Mujo (${response.language}):`);
  console.log(`   ${response.text.split("\n").join("\n   ")}`);
  console.log("");
}

console.log("=".repeat(60) + "\n");

// Level 2: Top 5 wishes
console.log("📊 LEVEL 2: Top 5 Wishes (Official List)\n");
console.log("─".repeat(60));

const top5 = [
  "mujo top 5 zelja",
  "mujo top 5 wishes",
  "@mujo was sind deine top 5 wünsche?",
];

for (const msg of top5) {
  console.log(`📩 User: "${msg}"`);
  const response = generateResponse(msg);
  console.log(`🤖 Mujo (${response.language}):`);
  console.log(`   ${response.text.split("\n").join("\n   ")}`);
  console.log("");
}

console.log("=".repeat(60) + "\n");

// Level 3: Secret wish (after being prompted)
console.log("📊 LEVEL 3: Real Secret Wish (After Prompt)\n");
console.log("─".repeat(60));

const secret = [
  "mujo stvarna tajna zelja",
  "mujo real secret wish",
  "@mujo was ist dein echter geheimer wunsch?",
];

for (const msg of secret) {
  console.log(`📩 User: "${msg}"`);
  const response = generateResponse(msg);
  console.log(`🤖 Mujo (${response.language}):`);
  console.log(`   ${response.text.split("\n").join("\n   ")}`);
  console.log("");
}

console.log("=".repeat(60));
console.log("\n✅ Multi-Level Easter Egg Test Complete!\n");

console.log("💡 Flow:");
console.log("   1. Simple wish → Teaser + hint to ask for Top 5");
console.log("   2. Top 5 wishes → Official list + hint for secret");
console.log("   3. Secret wish → The REAL answer! 😎");
