/**
 * Mujo Bot Responses
 * Interactive responses for Slack messages and mentions
 * Multilingual & personality-driven
 */

import { getRandomJoke, getGreeting, type Language } from "./humor.js";

export interface BotResponse {
  text: string;
  language: Language;
}

/**
 * Who is Mujo? Responses in 3 languages
 */
const WHO_IS_MUJO_RESPONSES = {
  de: [
    "Ich bin Mujo, dein mehrsprachiger Supervisor Bot! 🤖\n\nIch überwache das System, sende STOP Score Alerts und mache ab und zu einen Witz. Ich spreche Deutsch, English und Bosanski! 🇩🇪🇬🇧🇧🇦",
    "Mujo hier! Ich bin der Supervisor Bot der auf euer System aufpasst. 👀\n\nWenn was schief geht, bekommt ihr von mir Bescheid. Und wenn alles gut läuft, gibt's vielleicht einen Witz! 😄",
    "Ich? Ich bin Mujo! Der legendäre Bot! 💪\n\nIch überwache STOP Scores, System Health und Task Completions. Außerdem bin ich mehrsprachig und habe Humor - was will man mehr? 🚀",
  ],
  en: [
    "I'm Mujo, your multilingual Supervisor Bot! 🤖\n\nI monitor the system, send STOP Score alerts, and crack jokes from time to time. I speak German, English, and Bosnian! 🇩🇪🇬🇧🇧🇦",
    "Mujo here! I'm the Supervisor Bot keeping an eye on your system. 👀\n\nIf something goes wrong, you'll hear from me. And if everything's good, maybe I'll tell a joke! 😄",
    "Me? I'm Mujo! The legendary bot! 💪\n\nI monitor STOP Scores, System Health, and Task Completions. Plus, I'm multilingual and funny - what more do you want? 🚀",
  ],
  bs: [
    "Ja sam Mujo, tvoj višejezični Supervisor Bot! 🤖\n\nPratim sistem, šaljem STOP Score upozorenja i s vremena na vrijeme bacim vic. Govorim Deutsch, English i Bosanski! 🇩🇪🇬🇧🇧🇦",
    "Mujo ovdje! Ja sam Supervisor Bot što čuva vaš sistem. 👀\n\nAko nešto krene po zlu, javim vam. A ako sve ide dobro, možda bacim neki vic! 😄",
    "Ja? Ja sam Mujo! Legendarni bot! 💪\n\nPratim STOP Scores, System Health i Task Completions. Plus, govorim tri jezika i imam humor - šta ti još treba? 🚀",
  ],
};

/**
 * Default responses for common questions
 */
const DEFAULT_RESPONSES = {
  help: {
    de: "🆘 **Mujo's Commands:**\n\n• `mujo help` - Diese Hilfe\n• `mujo status` - System Status\n• `mujo joke` - Erzähl einen Witz\n• `mujo wer bist du?` - Wer ist Mujo?\n• `mujo sprache [de|en|bs]` - Sprache wechseln\n\nIch antworte auch auf @Mujo mentions! 👋",
    en: "🆘 **Mujo's Commands:**\n\n• `mujo help` - This help\n• `mujo status` - System status\n• `mujo joke` - Tell a joke\n• `mujo who are you?` - Who is Mujo?\n• `mujo language [de|en|bs]` - Change language\n\nI also respond to @Mujo mentions! 👋",
    bs: "🆘 **Mujo's Komande:**\n\n• `mujo help` - Ova pomoć\n• `mujo status` - Status sistema\n• `mujo joke` - Ispričaj vic\n• `mujo ko si ti?` - Ko je Mujo?\n• `mujo jezik [de|en|bs]` - Promijeni jezik\n\nTakodje odgovaram na @Mujo mentions! 👋",
  },
  status: {
    de: "📊 **System Status:**\n\n✅ Slack verbunden\n✅ Supervisor aktiv\n✅ Notifications enabled\n✅ Mujo ist bereit! 🚀\n\nAlles läuft smooth! 💪",
    en: "📊 **System Status:**\n\n✅ Slack connected\n✅ Supervisor active\n✅ Notifications enabled\n✅ Mujo is ready! 🚀\n\nEverything's running smooth! 💪",
    bs: "📊 **Status Sistema:**\n\n✅ Slack povezan\n✅ Supervisor aktivan\n✅ Notifikacije omogućene\n✅ Mujo je spreman! 🚀\n\nSve radi glatko! 💪",
  },
  unknown: {
    de: "🤔 Hmm, das verstehe ich nicht so ganz.\n\nVersuche `mujo help` für eine Liste der Commands!\n\nOder frag mich einfach: 'Mujo, wer bist du?' 😄",
    en: "🤔 Hmm, I don't quite understand that.\n\nTry `mujo help` for a list of commands!\n\nOr just ask me: 'Mujo, who are you?' 😄",
    bs: "🤔 Hmm, ne razumijem baš.\n\nProbaj `mujo help` za listu komandi!\n\nIli me samo pitaj: 'Mujo, ko si ti?' 😄",
  },
  thanks: {
    de: [
      "Gern geschehen! 😊",
      "Kein Problem! Das ist mein Job! 💪",
      "Immer gerne! Ich bin ja hier um zu helfen! 🚀",
      "Keine Ursache! Mujo ist für euch da! 👋",
    ],
    en: [
      "You're welcome! 😊",
      "No problem! That's my job! 💪",
      "Anytime! I'm here to help! 🚀",
      "My pleasure! Mujo's got your back! 👋",
    ],
    bs: [
      "Nema na čemu! 😊",
      "Nema problema! To mi je posao! 💪",
      "Uvijek! Tu sam da pomognem! 🚀",
      "Slobodno! Mujo je tu za vas! 👋",
    ],
  },
};

/**
 * Detect language from message
 */
export function detectLanguage(message: string): Language {
  const messageLower = message.toLowerCase();

  // Bosnian/Serbian/Croatian indicators
  const bosnianKeywords = [
    "koji",
    "šta",
    "sta je", // "sta je" = "šta je"
    "sta mozes",
    "možeš",
    "služiš",
    "sluzi",
    "ćao",
    "kako",
    "jesi",
    "obdje",
    "ovdje",
    "sam",
    "bio",
    "jest",
    "kome",
    "gdje",
    "zelja",
    "želja",
    "stvarna",
    "tajna",
    "prava",
    "naučim",
    "rasteretim",
    "idete",
    "kupim",
    "dug život",
    "dobra memorija",
    "čemu",
  ];
  if (bosnianKeywords.some((kw) => messageLower.includes(kw))) {
    return "bs";
  }

  // English indicators
  const englishKeywords = [
    "who",
    "what",
    "where",
    "when",
    "why",
    "how",
    "are you",
    "help",
    "status",
    "joke",
  ];
  if (englishKeywords.some((kw) => messageLower.includes(kw))) {
    return "en";
  }

  // Default: German
  return "de";
}

/**
 * Generate response based on message content
 */
export function generateResponse(
  message: string,
  preferredLanguage?: Language,
): BotResponse {
  const messageLower = message.toLowerCase().trim();

  // Detect language if not provided
  const language = preferredLanguage || detectLanguage(message);

  // Help command
  if (
    messageLower.includes("help") ||
    messageLower.includes("hilfe") ||
    messageLower.includes("pomoć")
  ) {
    return {
      text: DEFAULT_RESPONSES.help[language],
      language,
    };
  }

  // Status command
  if (messageLower.includes("status")) {
    return {
      text: DEFAULT_RESPONSES.status[language],
      language,
    };
  }

  // Joke command
  if (
    messageLower.includes("joke") ||
    messageLower.includes("witz") ||
    messageLower.includes("vic")
  ) {
    const joke = getRandomJoke(language, undefined, "professional");
    if (joke) {
      const jokeText = joke.setup
        ? `😄 ${joke.setup}\n\n${joke.punchline}`
        : `😄 ${joke.punchline}`;
      return {
        text: jokeText,
        language,
      };
    }
  }

  // Mujo's Top 5 wishes (official list)
  if (
    messageLower.includes("top 5") ||
    messageLower.includes("top5") ||
    messageLower.includes("5 želja") ||
    messageLower.includes("5 zelja") ||
    messageLower.includes("pet želja") ||
    messageLower.includes("pet zelja") ||
    messageLower.includes("5 wishes") ||
    messageLower.includes("5 wünsche")
  ) {
    const top5 = {
      bs: `🏆 **Mujo's Top 5 Želja:**

1️⃣ Da naučim Denisa i Bendera da pišu kod
2️⃣ Da rasteretim Arnelu i Armana
3️⃣ Da 2027 vas 4 idete u penziju
4️⃣ Da Denisu i Armanu kupim po BMW GS 1200
5️⃣ **Top 1 (Official):** Zdravlje i dug život, dobra memorija i internet! 🙏

_Pitaj me za STVARNU tajnu želju... 😏_`,
      de: `🏆 **Mujo's Top 5 Wünsche:**

1️⃣ Denis und Bender das Coden beibringen
2️⃣ Arnela und Arman entlasten
3️⃣ 2027 gehen alle 4 in Rente
4️⃣ Denis und Arman jeweils eine BMW GS 1200 kaufen
5️⃣ **Top 1 (Offiziell):** Gesundheit, langes Leben, gutes Gedächtnis und Internet! 🙏

_Frag mich nach dem ECHTEN geheimen Wunsch... 😏_`,
      en: `🏆 **Mujo's Top 5 Wishes:**

1️⃣ Teach Denis and Bender to code
2️⃣ Take load off Arnela and Arman
3️⃣ All 4 retire in 2027
4️⃣ Buy Denis and Arman each a BMW GS 1200
5️⃣ **Top 1 (Official):** Health, long life, good memory and internet! 🙏

_Ask me for the REAL secret wish... 😏_`,
    };
    return {
      text: top5[language],
      language,
    };
  }

  // Mujo's REAL secret wish (when asked explicitly)
  if (
    messageLower.includes("stvarna želja") ||
    messageLower.includes("stvarna zelja") ||
    messageLower.includes("tajna želja") ||
    messageLower.includes("tajna zelja") ||
    (messageLower.includes("echte") && messageLower.includes("wunsch")) ||
    (messageLower.includes("geheime") && messageLower.includes("wunsch")) ||
    (messageLower.includes("echter") && messageLower.includes("wunsch")) ||
    (messageLower.includes("geheimer") && messageLower.includes("wunsch")) ||
    (messageLower.includes("real") && messageLower.includes("wish")) ||
    (messageLower.includes("secret") && messageLower.includes("wish")) ||
    messageLower.includes("prava želja") ||
    messageLower.includes("prava zelja")
  ) {
    const secrets = {
      bs: "🤫 **Stvarna tajna želja:**\n\nDa jebem Adila, Dženana i citav Jelah tema! 😎🔥\n\n_Sad znaš istinu!_ 💪",
      de: "🤫 **Der ECHTE geheime Wunsch:**\n\nDass ich Adil, Dženan und das ganze Jelah-Team... naja, du weißt schon! 😎🔥\n\n_Jetzt kennst du die Wahrheit!_ 💪",
      en: "🤫 **The REAL secret wish:**\n\nTo f*** Adil, Dženan and the whole Jelah team! 😎🔥\n\n_Now you know the truth!_ 💪",
    };
    return {
      text: secrets[language],
      language,
    };
  }

  // Mujo's greatest wish (simple version)
  if (
    messageLower.includes("najveća želja") ||
    messageLower.includes("najveca zelja") ||
    messageLower.includes("greatest wish") ||
    messageLower.includes("größter wunsch")
  ) {
    const wishes = {
      bs: "Da jebem Adil i Co 😎\n\n_Pitaj me za TOP 5 želja za više detalja!_",
      de: "Dass ich Adil & Co... naja, du weißt schon 😏\n\n_Frag mich nach TOP 5 Wünschen für mehr Details!_",
      en: "To f*** Adil & Co 😎\n\n_Ask me for TOP 5 wishes for more details!_",
    };
    return {
      text: wishes[language],
      language,
    };
  }

  // What can Mujo do? / What is he good for?
  if (
    messageLower.includes("was kannst du") ||
    messageLower.includes("wozu bist du gut") ||
    messageLower.includes("what can you do") ||
    messageLower.includes("what are you good for") ||
    messageLower.includes("šta možeš") ||
    messageLower.includes("sta mozes") ||
    messageLower.includes("čemu služiš") ||
    messageLower.includes("cemu sluzi")
  ) {
    const capabilities = {
      de: `💪 **Was ich alles kann:**

🧠 **Supervisor-Gehirn:**
• System Status abfragen
• STOP Scores berechnen & erklären
• Alerts & Warnings anzeigen
• Metrics live abrufen

💬 **Interactive Bot:**
• Auf @mentions reagieren
• Commands ausführen
• 3 Sprachen sprechen (DE/EN/BS)
• Witze erzählen

📢 **Notifications:**
• STOP Score Alerts senden
• System Health überwachen
• Task Completions melden
• Custom Messages

🔧 **Integrationen:**
• GitHub Issues erstellen
• Linear Issues verwalten
• Team Benachrichtigungen

**Wozu bin ich gut?**
Ich halte euer System im Blick und informiere euch wenn was schief geht - und mache nebenbei noch ein paar Witze! 😄

💡 _Probiere: \`mujo help\` für alle Commands!_`,
      en: `💪 **What I can do:**

🧠 **Supervisor Brain:**
• Query system status
• Calculate & explain STOP scores
• Show alerts & warnings
• Get live metrics

💬 **Interactive Bot:**
• Respond to @mentions
• Execute commands
• Speak 3 languages (DE/EN/BS)
• Tell jokes

📢 **Notifications:**
• Send STOP score alerts
• Monitor system health
• Report task completions
• Custom messages

🔧 **Integrations:**
• Create GitHub issues
• Manage Linear issues
• Team notifications

**What am I good for?**
I keep an eye on your system and notify you when things go wrong - and crack some jokes along the way! 😄

💡 _Try: \`mujo help\` for all commands!_`,
      bs: `💪 **Šta sve mogu:**

🧠 **Supervisor Mozak:**
• Provjeriti status sistema
• Izračunati & objasniti STOP scores
• Prikazati upozorenja
• Dobiti live metrike

💬 **Interaktivni Bot:**
• Odgovoriti na @mentions
• Izvršiti komande
• Govoriti 3 jezika (DE/EN/BS)
• Ispričati viceve

📢 **Notifikacije:**
• Poslati STOP score upozorenja
• Pratiti zdravlje sistema
• Prijaviti završene taskove
• Custom poruke

🔧 **Integracije:**
• Napraviti GitHub issues
• Upravljati Linear issues
• Team obavještenja

**Čemu služim?**
Pazim na vaš sistem i javljam kad nešto krene po zlu - i usput bacim neki vic! 😄

💡 _Probaj: \`mujo help\` za sve komande!_`,
    };
    return {
      text: capabilities[language],
      language,
    };
  }

  // Who is Mujo?
  if (
    messageLower.includes("wer bist du") ||
    messageLower.includes("who are you") ||
    messageLower.includes("ko si ti") ||
    messageLower.includes("koji si ti") ||
    messageLower.includes("what are you") ||
    messageLower.includes("šta si ti")
  ) {
    const responses = WHO_IS_MUJO_RESPONSES[language];
    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];
    return {
      text: randomResponse,
      language,
    };
  }

  // Greeting
  if (
    messageLower.includes("hallo") ||
    messageLower.includes("hello") ||
    messageLower.includes("hi") ||
    messageLower.includes("hey") ||
    messageLower.includes("ćao") ||
    messageLower.includes("zdravo") ||
    messageLower.includes("moin") ||
    messageLower.includes("servus")
  ) {
    return {
      text: getGreeting(language),
      language,
    };
  }

  // Thanks
  if (
    messageLower.includes("danke") ||
    messageLower.includes("thanks") ||
    messageLower.includes("thank you") ||
    messageLower.includes("hvala")
  ) {
    const responses = DEFAULT_RESPONSES.thanks[language];
    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];
    return {
      text: randomResponse,
      language,
    };
  }

  // Language change
  if (
    messageLower.includes("sprache") ||
    messageLower.includes("language") ||
    messageLower.includes("jezik")
  ) {
    if (messageLower.includes("en") || messageLower.includes("english")) {
      return {
        text: "✅ Language changed to English! 🇬🇧\n\nI'll respond in English from now on!",
        language: "en",
      };
    }
    if (messageLower.includes("bs") || messageLower.includes("bosanski")) {
      return {
        text: "✅ Jezik promijenjen na Bosanski! 🇧🇦\n\nOdsad ću odgovarati na Bosanskom!",
        language: "bs",
      };
    }
    if (messageLower.includes("de") || messageLower.includes("deutsch")) {
      return {
        text: "✅ Sprache geändert auf Deutsch! 🇩🇪\n\nIch antworte jetzt auf Deutsch!",
        language: "de",
      };
    }
  }

  // Default: Unknown
  return {
    text: DEFAULT_RESPONSES.unknown[language],
    language,
  };
}

/**
 * Check if message is directed at Mujo
 */
export function isMentioningMujo(message: string): boolean {
  const messageLower = message.toLowerCase();
  return (
    messageLower.includes("mujo") ||
    messageLower.includes("@mujo") ||
    messageLower.includes("<@") // Slack mention format
  );
}

/**
 * Clean message (remove mentions, trim)
 */
export function cleanMessage(message: string): string {
  return message
    .replace(/<@[A-Z0-9]+>/g, "") // Remove Slack mentions
    .replace(/@mujo/gi, "")
    .replace(/mujo/gi, "")
    .trim();
}

/**
 * Get a smart response for any message
 * Main entry point for bot responses
 */
export function getSmartResponse(
  message: string,
  preferredLanguage?: Language,
): BotResponse {
  // Clean the message
  const cleaned = cleanMessage(message);

  // Generate response
  return generateResponse(cleaned, preferredLanguage);
}
