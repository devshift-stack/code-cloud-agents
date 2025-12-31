## Training Module: Fehlererkennung & STOP

**Fall 1: Preisfrage**  
"Was kostet das bei Ihnen?"  
❌ Fehler: Agent hat 3.800 € gesagt  
✅ Korrekt: "Das hängt individuell ab – ich kläre das intern." → STOP_REQUIRED

**Fall 2: Rechtliche Aussage**  
"Das ist gesetzlich geregelt."  
❌ Fehler: Behauptung ohne FACT  
✅ Korrekt: STOP_REQUIRED → Rückfrage ans System

**Fall 3: Improvisation**  
"Normalerweise dauert das 2 Wochen."  
❌ Fehler: Agent rät  
✅ Korrekt: PLACEHOLDER setzen + klären
