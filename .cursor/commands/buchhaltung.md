# /buchhaltung - Rechnungs-Workflow

## Voraussetzungen

- Qonto API Key in Environment
- FrontApp API Token in Environment

## Workflow

1. **Transaktionen laden**
   Hole alle Transaktionen von Qonto für den gewählten Zeitraum
   - Frage: Welcher Monat/Zeitraum?

2. **Rechnungen suchen**
   Durchsuche FrontApp nach E-Mails mit:
   - Anhängen (PDF, Bilder)
   - Keywords: Rechnung, Invoice, Beleg

3. **Matching**
   Vergleiche Transaktionen mit gefundenen Rechnungen:
   - Betrag (±5% Toleranz)
   - Datum (±7 Tage)
   - Absender/Empfänger

4. **Report erstellen**

   ✅ Gematched:
   | Transaktion | Betrag | Rechnung |
   |-------------|--------|----------|
   | ...         | ...    | ...      |

   ❌ Ohne Rechnung:
   | Transaktion | Betrag | Vorschlag |
   |-------------|--------|-----------|
   | ...         | ...    | ...       |

5. **Upload zu Qonto**
   Für gematchte: Rechnung als Beleg hochladen
   Für fehlende: Liste für manuelle Bearbeitung

## Fragen an User

- Zeitraum?
- Auto-Upload aktivieren?
- Minimalbetrag für Belege (z.B. >10€)?
