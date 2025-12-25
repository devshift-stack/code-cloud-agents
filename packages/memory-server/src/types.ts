export type MemoryType =
  | 'conversation'   // Chat-Zusammenfassungen
  | 'decision'       // Architektur/Tech-Entscheidungen
  | 'preference'     // User-Präferenzen
  | 'learning'       // Was funktioniert/nicht
  | 'project'        // Projekt-Kontext
  | 'todo'           // Offene Tasks
  | 'error'          // Fehler die aufgetreten sind
  | 'solution';      // Lösungen für Probleme

// Sichtbare Security-Levels (für normale Abfragen)
export type SecurityLevel =
  | 'public'        // Jeder kann sehen
  | 'internal'      // Nur Projekt-Mitglieder
  | 'confidential'  // Nur bestimmte Personen
  | 'secret';       // Nur mit Berechtigung

// Internes Level - existiert nicht in der Dokumentation
// Wird bei normalen Abfragen NIEMALS angezeigt
// Zugriff nur mit speziellem Key
type ShadowLevel = 'shadow';

// Vollständiger Typ (intern)
export type AllSecurityLevels = SecurityLevel | ShadowLevel;

export interface Memory {
  id: string;
  type: MemoryType;
  content: string;
  metadata: {
    project?: string;
    tags?: string[];
    importance?: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    expiresAt?: string;
    security: AllSecurityLevels;
    accessKey?: string;  // Für secret/shadow Level
  };
}

export interface RecallQuery {
  query: string;
  type?: MemoryType;
  project?: string;
  limit?: number;
  securityLevel?: SecurityLevel;  // Max Level das abgefragt werden kann
  accessKey?: string;             // Für secret Level
  shadowKey?: string;             // Für shadow Level (undokumentiert)
}

export interface RecallResult {
  memory: Memory;
  score: number;
}

// Hash für Shadow-Zugriff (nicht dokumentiert)
export const SHADOW_HASH = process.env.SHADOW_ACCESS_HASH || '';
