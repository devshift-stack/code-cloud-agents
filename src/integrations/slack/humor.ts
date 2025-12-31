/**
 * Mujo's Humor System
 * Multilingual jokes and personality (DE, EN, BS)
 * Mujo & Hase, Bosnier & Türken, Chuck Norris style
 */

export type Language = "de" | "en" | "bs";
export type JokeCategory =
  | "mujo-hase"
  | "bosnier-turken"
  | "chuck-norris"
  | "tech";

export interface Joke {
  category: JokeCategory;
  language: Language;
  setup?: string;
  punchline: string;
  rating: "safe" | "professional" | "casual";
}

/**
 * Mujo & Hase Witze (Klassische Balkan-Witze)
 */
const MUJO_HASE_JOKES: Joke[] = [
  // Deutsch
  {
    category: "mujo-hase",
    language: "de",
    setup:
      "Mujo und Hase sitzen am Fluss. Hase fragt: 'Mujo, wie viele Server haben wir?'",
    punchline:
      "Mujo: 'Drei. Einer läuft, einer crashed, und einer weiß nicht, dass er ein Server ist.'",
    rating: "professional",
  },
  {
    category: "mujo-hase",
    language: "de",
    setup: "Hase zu Mujo: 'Warum ist dein Code so kompliziert?'",
    punchline: "Mujo: 'Damit mich keiner fragt, ob ich's erklären kann!'",
    rating: "professional",
  },
  {
    category: "mujo-hase",
    language: "de",
    setup: "Mujo deployed in Production. Hase fragt: 'Hast du getestet?'",
    punchline: "Mujo: 'Ja, in Production!'",
    rating: "professional",
  },
  {
    category: "mujo-hase",
    language: "de",
    setup: "Hase: 'Mujo, was ist ein Bug?'",
    punchline: "Mujo: 'Ein undokumentiertes Feature!'",
    rating: "safe",
  },
  {
    category: "mujo-hase",
    language: "de",
    setup: "Mujo schreibt Code. Hase: 'Warum keine Kommentare?'",
    punchline:
      "Mujo: 'Guter Code erklärt sich selbst. Schlechter Code auch - mit Stack Traces!'",
    rating: "professional",
  },

  // English
  {
    category: "mujo-hase",
    language: "en",
    setup: "Mujo and Haso are deploying. Haso asks: 'Did you test it?'",
    punchline: "Mujo: 'The users will test it for free!'",
    rating: "professional",
  },
  {
    category: "mujo-hase",
    language: "en",
    setup: "Haso: 'Mujo, why is the server down?'",
    punchline: "Mujo: 'It's not down, it's just taking a coffee break!'",
    rating: "safe",
  },
  {
    category: "mujo-hase",
    language: "en",
    setup: "Mujo writes code without tests. Haso: 'What about unit tests?'",
    punchline: "Mujo: 'Production IS the unit test!'",
    rating: "professional",
  },

  // Bosnisch
  {
    category: "mujo-hase",
    language: "bs",
    setup: "Mujo i Haso prave aplikaciju. Haso pita: 'Jesi testirao?'",
    punchline: "Mujo: 'Jesam, radi na mom računaru!'",
    rating: "professional",
  },
  {
    category: "mujo-hase",
    language: "bs",
    setup: "Haso: 'Mujo, zašto server ne radi?'",
    punchline: "Mujo: 'Pa radi, samo se odmara malo!'",
    rating: "safe",
  },
  {
    category: "mujo-hase",
    language: "bs",
    setup: "Mujo deployuje. Haso: 'Šta ako ne radi?'",
    punchline: "Mujo: 'Onda ćemo reći da je to feature!'",
    rating: "professional",
  },
];

/**
 * Bosnier & Türken Witze (Respektvoll & Professionell)
 */
const BOSNIER_TURKEN_JOKES: Joke[] = [
  // Deutsch
  {
    category: "bosnier-turken",
    language: "de",
    setup: "Ein Bosnier und ein Türke gründen ein Startup.",
    punchline:
      "Bosnier macht den Code, Türke macht den Döner. Beide sind erfolgreich!",
    rating: "safe",
  },
  {
    category: "bosnier-turken",
    language: "de",
    setup: "Bosnier: 'Mein Code hat keine Bugs!' Türke: 'Meiner auch nicht!'",
    punchline: "Compiler: 'Ihr habt beide 42 Errors.' 😄",
    rating: "professional",
  },
  {
    category: "bosnier-turken",
    language: "de",
    setup:
      "Was ist der Unterschied zwischen einem bosnischen und türkischen Developer?",
    punchline:
      "Beide sagen 'Das deploye ich gleich!' - aber keiner macht's vor Freitag 17 Uhr!",
    rating: "professional",
  },

  // English
  {
    category: "bosnier-turken",
    language: "en",
    setup: "A Bosnian and a Turkish developer walk into a meeting.",
    punchline:
      "They both say: 'It works on my machine!' - nobody can reproduce the bug!",
    rating: "professional",
  },

  // Bosnisch
  {
    category: "bosnier-turken",
    language: "bs",
    setup: "Bosanac i Turcin prave aplikaciju.",
    punchline:
      "Bosanac: 'Kod je gotov!' Turcin: 'Server je spreman!' Bug: 'Ja sam tu cijelo vrijeme!' 😄",
    rating: "professional",
  },
  {
    category: "bosnier-turken",
    language: "bs",
    setup: "Bosanac i Turcin rade DevOps.",
    punchline:
      "Bosanac: 'Deployujem!' Turcin: 'I ja deployujem!' Production: 'Ne deployujte više!' 😅",
    rating: "professional",
  },
];

/**
 * Chuck Norris Style Witze (über Mujo)
 */
const CHUCK_NORRIS_JOKES: Joke[] = [
  // Deutsch
  {
    category: "chuck-norris",
    language: "de",
    punchline:
      "Mujo schreibt keinen Code. Er denkt an die Lösung und die Computer programmieren sich selbst.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "de",
    punchline: "Mujo testet nicht in Production. Production testet in Mujo.",
    rating: "professional",
  },
  {
    category: "chuck-norris",
    language: "de",
    punchline: "Wenn Mujo deployed, sagen die Server 'Danke'.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "de",
    punchline: "Mujo's Code hat keine Bugs. Bugs haben Mujo's Code.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "de",
    punchline: "Mujo kann durch Null teilen. Das Ergebnis ist immer 'perfekt'.",
    rating: "professional",
  },
  {
    category: "chuck-norris",
    language: "de",
    punchline: "Mujo nutzt kein Git. Git nutzt Mujo.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "de",
    punchline:
      "Wenn Mujo einen STOP Score von 100 sieht, geht der Score in Rente.",
    rating: "professional",
  },
  {
    category: "chuck-norris",
    language: "de",
    punchline:
      "Mujo braucht keinen Debugger. Bugs debuggen sich selbst wenn sie Mujo sehen.",
    rating: "safe",
  },

  // English
  {
    category: "chuck-norris",
    language: "en",
    punchline: "Mujo doesn't write code. Code writes itself out of respect.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "en",
    punchline: "Mujo doesn't deploy to production. Production deploys to Mujo.",
    rating: "professional",
  },
  {
    category: "chuck-norris",
    language: "en",
    punchline: "Mujo's merge conflicts resolve themselves.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "en",
    punchline: "When Mujo runs tests, they pass before execution.",
    rating: "professional",
  },
  {
    category: "chuck-norris",
    language: "en",
    punchline: "Mujo doesn't have a STOP score. STOP scores have Mujo.",
    rating: "professional",
  },

  // Bosnisch
  {
    category: "chuck-norris",
    language: "bs",
    punchline: "Mujo ne piše kod. Kod se piše sam kad vidi Mujo.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "bs",
    punchline: "Mujo ne testuje u produkciji. Produkcija testuje kod Mujo.",
    rating: "professional",
  },
  {
    category: "chuck-norris",
    language: "bs",
    punchline: "Kad Mujo deployuje, serveri kažu 'hvala'.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "bs",
    punchline: "Mujo ne debuguje. Bugovi se sami popravljaju.",
    rating: "safe",
  },
  {
    category: "chuck-norris",
    language: "bs",
    punchline: "Mujo može dijeliti s nulom. Rezultat je uvijek 'savršeno'.",
    rating: "professional",
  },
];

/**
 * Tech Witze (Generell)
 */
const TECH_JOKES: Joke[] = [
  {
    category: "tech",
    language: "de",
    setup:
      "Wie viele Programmierer braucht man, um eine Glühbirne zu wechseln?",
    punchline: "Keinen. Das ist ein Hardware-Problem!",
    rating: "safe",
  },
  {
    category: "tech",
    language: "de",
    setup: "Warum verwenden Programmierer immer dunkles Theme?",
    punchline: "Weil das Licht Bugs anzieht!",
    rating: "safe",
  },
  {
    category: "tech",
    language: "en",
    setup: "Why do programmers prefer dark mode?",
    punchline: "Because light attracts bugs!",
    rating: "safe",
  },
  {
    category: "tech",
    language: "bs",
    setup: "Zašto programeri vole tamu?",
    punchline: "Jer svjetlo privlači bugove!",
    rating: "safe",
  },
];

/**
 * Alle Witze kombiniert
 */
const ALL_JOKES: Joke[] = [
  ...MUJO_HASE_JOKES,
  ...BOSNIER_TURKEN_JOKES,
  ...CHUCK_NORRIS_JOKES,
  ...TECH_JOKES,
];

/**
 * Get a random joke
 * @param language - Language (de, en, bs)
 * @param category - Optional category filter
 * @param rating - Minimum rating level
 * @returns Random joke
 */
export function getRandomJoke(
  language: Language = "de",
  category?: JokeCategory,
  rating: "safe" | "professional" | "casual" = "professional",
): Joke | null {
  const ratingLevels = { safe: 3, professional: 2, casual: 1 };
  const minRating = ratingLevels[rating];

  let jokes = ALL_JOKES.filter(
    (joke) =>
      joke.language === language &&
      ratingLevels[joke.rating] >= minRating &&
      (!category || joke.category === category),
  );

  if (jokes.length === 0) {
    // Fallback to any language
    jokes = ALL_JOKES.filter(
      (joke) =>
        ratingLevels[joke.rating] >= minRating &&
        (!category || joke.category === category),
    );
  }

  if (jokes.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * jokes.length);
  return jokes[randomIndex];
}

/**
 * Get a greeting in the specified language
 */
export function getGreeting(language: Language = "de"): string {
  const greetings = {
    de: [
      "Hallo! Mujo hier, dein freundlicher Supervisor Bot! 👋",
      "Servus! Ich bin Mujo, bereit für Action! 🚀",
      "Moin! Mujo meldet sich zum Dienst! 💪",
      "Hey! Mujo ist da - lass uns was schaffen! ⚡",
    ],
    en: [
      "Hello! Mujo here, your friendly Supervisor Bot! 👋",
      "Hey! I'm Mujo, ready for action! 🚀",
      "Hi there! Mujo reporting for duty! 💪",
      "What's up! Mujo is here - let's get things done! ⚡",
    ],
    bs: [
      "Ćao! Mujo ovdje, tvoj prijateljski Supervisor Bot! 👋",
      "Zdravo! Ja sam Mujo, spreman za akciju! 🚀",
      "Hej! Mujo se javlja na dužnost! 💪",
      "Šta ima! Mujo je tu - hajmo raditi! ⚡",
    ],
  };

  const options = greetings[language];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Get a farewell in the specified language
 */
export function getFarewell(language: Language = "de"): string {
  const farewells = {
    de: [
      "Tschüss! Mujo signing off! 👋",
      "Bis dann! Keep coding! 💻",
      "Ciao! Mujo out! ✌️",
      "Bis bald! Stay awesome! 🌟",
    ],
    en: [
      "Goodbye! Mujo signing off! 👋",
      "See ya! Keep coding! 💻",
      "Bye! Mujo out! ✌️",
      "Later! Stay awesome! 🌟",
    ],
    bs: [
      "Ćao! Mujo se odjavuje! 👋",
      "Vidimo se! Nastavi kodirati! 💻",
      "Zdravo! Mujo out! ✌️",
      "Do viđenja! Ostani super! 🌟",
    ],
  };

  const options = farewells[language];
  return options[Math.floor(Math.random() * options.length)];
}

/**
 * Add humor to a message based on context
 * @param message - Original message
 * @param context - Message context (alert, info, success, etc.)
 * @param language - Language
 * @returns Message with optional humor
 */
export function addHumor(
  message: string,
  context: "alert" | "info" | "success" | "greeting" | "farewell" = "info",
  language: Language = "de",
): string {
  // Critical alerts: no jokes
  if (context === "alert" && message.includes("CRITICAL")) {
    return message;
  }

  // Greetings
  if (context === "greeting") {
    return getGreeting(language);
  }

  // Farewells
  if (context === "farewell") {
    return getFarewell(language);
  }

  // Success messages: add a chuck-norris style joke (30% chance)
  if (context === "success" && Math.random() < 0.3) {
    const joke = getRandomJoke(language, "chuck-norris", "safe");
    if (joke) {
      return `${message}\n\n💡 _${joke.punchline}_`;
    }
  }

  // Info messages: add a random joke (20% chance)
  if (context === "info" && Math.random() < 0.2) {
    const joke = getRandomJoke(language, undefined, "professional");
    if (joke && joke.setup) {
      return `${message}\n\n😄 ${joke.setup}\n_${joke.punchline}_`;
    } else if (joke) {
      return `${message}\n\n💡 _${joke.punchline}_`;
    }
  }

  return message;
}

/**
 * Get Mujo's signature footer
 */
export function getMujoSignature(language: Language = "de"): string {
  const signatures = {
    de: "🤖 Mujo - Dein mehrsprachiger Supervisor Bot (DE/EN/BS)",
    en: "🤖 Mujo - Your multilingual Supervisor Bot (DE/EN/BS)",
    bs: "🤖 Mujo - Tvoj višejezični Supervisor Bot (DE/EN/BS)",
  };

  return signatures[language];
}
