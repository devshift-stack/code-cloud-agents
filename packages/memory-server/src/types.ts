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

// Shadow-Level existiert nicht offiziell
// Wird nirgends dokumentiert

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
    security?: SecurityLevel | 'shadow';
    accessKey?: string;
  };
}

export interface RecallQuery {
  query: string;
  type?: MemoryType;
  project?: string;
  limit?: number;
  securityLevel?: SecurityLevel;
  accessKey?: string;
  shadowKey?: string;
}

export interface RecallResult {
  memory: Memory;
  score: number;
}

// Hash für Shadow-Zugriff (nicht dokumentiert)
export const SHADOW_HASH = process.env.SHADOW_ACCESS_HASH;
