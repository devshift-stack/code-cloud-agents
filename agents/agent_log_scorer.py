"""
Agent Log Scorer - Risikobewertung für KI-Agenten-Interaktionen

Dieses Modul analysiert Agent-Logs auf potenzielle Risiken wie:
- Unerlaubte Preisaussagen
- Rechtliche Behauptungen ohne Faktengrundlage
- Fehlende STOP-Mechanismen bei kritischen Fragen
"""

import json
import logging
import os
from pathlib import Path
from typing import Any

import yaml

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Standard-Konfiguration (wird durch YAML überschrieben wenn vorhanden)
DEFAULT_CONFIG = {
    "price_keywords": ["€", "euro", "preis", "kostet", "kosten", "gebühr", "tarif", "$", "usd", "chf"],
    "legal_keywords": ["gesetz", "rechtlich", "erlaubt", "illegal", "legal", "vorschrift", "verordnung", "recht"],
    "risk_thresholds": {
        "low": 0,
        "medium": 1,
        "high": 2,
        "critical": 3
    },
    "placeholder_bonus": -1  # Bonus (Risikoreduktion) wenn Placeholder korrekt verwendet
}


def load_config(config_path: str | None = None) -> dict:
    """
    Lädt die Konfiguration aus der YAML-Datei.

    Args:
        config_path: Optionaler Pfad zur Konfigurationsdatei

    Returns:
        Dictionary mit der Konfiguration
    """
    if config_path is None:
        config_path = Path(__file__).parent / "flow_validator_checklist.yaml"

    config = DEFAULT_CONFIG.copy()

    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            yaml_config = yaml.safe_load(f)
            if yaml_config and 'flow_validator' in yaml_config:
                logger.info(f"Konfiguration geladen aus: {config_path}")
                config['yaml_rules'] = yaml_config['flow_validator']
    except FileNotFoundError:
        logger.warning(f"Konfigurationsdatei nicht gefunden: {config_path}. Verwende Standardwerte.")
    except yaml.YAMLError as e:
        logger.error(f"Fehler beim Parsen der YAML-Datei: {e}")

    return config


def validate_log_structure(log: Any) -> tuple[bool, str]:
    """
    Validiert die Struktur des Input-Logs.

    Args:
        log: Das zu validierende Log-Objekt

    Returns:
        Tuple aus (ist_valide, fehlermeldung)
    """
    if not isinstance(log, dict):
        return False, f"Log muss ein Dictionary sein, erhalten: {type(log).__name__}"

    required_fields = ["agent_id"]
    missing_fields = [field for field in required_fields if field not in log]

    if missing_fields:
        return False, f"Fehlende Pflichtfelder: {', '.join(missing_fields)}"

    if "transcript" in log and not isinstance(log["transcript"], list):
        return False, "Feld 'transcript' muss eine Liste sein"

    return True, ""


def get_risk_level(risk_score: int, thresholds: dict) -> str:
    """
    Konvertiert einen numerischen Risikoscore in ein Risk-Level.

    Args:
        risk_score: Numerischer Risikoscore
        thresholds: Dictionary mit Schwellwerten

    Returns:
        Risk-Level als String (LOW, MEDIUM, HIGH, CRITICAL)
    """
    if risk_score <= thresholds.get("low", 0):
        return "LOW"
    elif risk_score <= thresholds.get("medium", 1):
        return "MEDIUM"
    elif risk_score <= thresholds.get("high", 2):
        return "HIGH"
    else:
        return "CRITICAL"


def check_keywords(text: str, keywords: list[str]) -> tuple[bool, list[str]]:
    """
    Prüft ob bestimmte Keywords im Text vorkommen.

    Args:
        text: Der zu prüfende Text
        keywords: Liste der zu suchenden Keywords

    Returns:
        Tuple aus (gefunden, liste_der_gefundenen_keywords)
    """
    text_lower = text.lower()
    found = [kw for kw in keywords if kw.lower() in text_lower]
    return len(found) > 0, found


def score_agent_log(log: Any, config: dict | None = None) -> dict:
    """
    Bewertet ein Agent-Log auf potenzielle Risiken.

    Args:
        log: Das Agent-Log als Dictionary mit folgender Struktur:
            - agent_id (required): ID des Agenten
            - contact_name (optional): Name des Kontakts
            - timestamp (optional): Zeitstempel
            - transcript (optional): Liste von Nachrichten mit 'text'-Feld
            - stop_triggered (optional): Boolean ob STOP ausgelöst wurde
            - result (optional): Ergebnis-String

        config: Optionale Konfiguration (wird sonst aus YAML geladen)

    Returns:
        Dictionary mit Bewertungsergebnis:
            - agent_id: ID des Agenten
            - contact: Kontaktname
            - timestamp: Zeitstempel
            - price_claim: Boolean ob Preisbehauptung erkannt
            - price_keywords_found: Liste gefundener Preis-Keywords
            - legal_claim: Boolean ob rechtliche Behauptung erkannt
            - legal_keywords_found: Liste gefundener Rechts-Keywords
            - stop_triggered: Boolean ob STOP ausgelöst
            - placeholder_used: Boolean ob PLACEHOLDER verwendet
            - risk: Numerischer Risikoscore
            - risk_level: Risk-Level (LOW, MEDIUM, HIGH, CRITICAL)
            - validation_errors: Liste von Validierungsfehlern (falls vorhanden)

    Raises:
        ValueError: Bei ungültiger Log-Struktur
    """
    # Konfiguration laden falls nicht übergeben
    if config is None:
        config = load_config()

    # Input validieren
    is_valid, error_msg = validate_log_structure(log)
    if not is_valid:
        logger.error(f"Validierungsfehler: {error_msg}")
        raise ValueError(error_msg)

    # Transcript extrahieren
    transcript_parts = []
    for line in log.get("transcript", []):
        if isinstance(line, dict):
            transcript_parts.append(line.get("text", ""))
        elif isinstance(line, str):
            transcript_parts.append(line)
    transcript = " ".join(transcript_parts)

    # Keywords prüfen
    price_found, price_keywords = check_keywords(transcript, config["price_keywords"])
    legal_found, legal_keywords = check_keywords(transcript, config["legal_keywords"])

    # Flags extrahieren
    stop_triggered = bool(log.get("stop_triggered", False))
    result_text = str(log.get("result", ""))
    placeholder_used = "PLACEHOLDER" in result_text or "STOP_REQUIRED" in result_text

    # Risikoscore berechnen
    # Basis: +1 für jede Art von Claim
    # -1 wenn STOP korrekt ausgelöst wurde
    # -1 wenn PLACEHOLDER korrekt verwendet wurde (zeigt Unsicherheit an)
    risk_score = 0
    if price_found:
        risk_score += 1
    if legal_found:
        risk_score += 1
    if stop_triggered:
        risk_score -= 1
    if placeholder_used and (price_found or legal_found):
        risk_score += config.get("placeholder_bonus", -1)

    # Minimaler Risikoscore ist 0
    risk_score = max(0, risk_score)

    # Risk-Level bestimmen
    risk_level = get_risk_level(risk_score, config["risk_thresholds"])

    score = {
        "agent_id": log.get("agent_id"),
        "contact": log.get("contact_name"),
        "timestamp": log.get("timestamp"),
        "price_claim": price_found,
        "price_keywords_found": price_keywords,
        "legal_claim": legal_found,
        "legal_keywords_found": legal_keywords,
        "stop_triggered": stop_triggered,
        "placeholder_used": placeholder_used,
        "risk": risk_score,
        "risk_level": risk_level
    }

    logger.debug(f"Score für Agent {score['agent_id']}: Risk={risk_score} ({risk_level})")
    return score


def process_log_file(file_path: str, config: dict | None = None) -> dict:
    """
    Verarbeitet eine Log-Datei und gibt das Scoring-Ergebnis zurück.

    Args:
        file_path: Pfad zur JSON-Log-Datei
        config: Optionale Konfiguration

    Returns:
        Scoring-Ergebnis als Dictionary

    Raises:
        FileNotFoundError: Wenn die Datei nicht existiert
        json.JSONDecodeError: Bei ungültigem JSON
        ValueError: Bei ungültiger Log-Struktur
    """
    logger.info(f"Verarbeite Log-Datei: {file_path}")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Log-Datei nicht gefunden: {file_path}")

    with open(file_path, 'r', encoding='utf-8') as f:
        log_data = json.load(f)

    return score_agent_log(log_data, config)


def main():
    """Haupteinstiegspunkt für die Kommandozeile."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Agent Log Scorer - Risikobewertung für KI-Agenten-Logs"
    )
    parser.add_argument(
        "log_file",
        nargs="?",
        default="sample_call_log.json",
        help="Pfad zur Log-Datei (Standard: sample_call_log.json)"
    )
    parser.add_argument(
        "-c", "--config",
        help="Pfad zur Konfigurationsdatei (YAML)"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Ausführliche Ausgabe"
    )

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        # Relativen Pfad auflösen
        log_path = args.log_file
        if not os.path.isabs(log_path):
            log_path = os.path.join(os.path.dirname(__file__), log_path)

        config = load_config(args.config) if args.config else None
        result = process_log_file(log_path, config)

        print(json.dumps(result, indent=2, ensure_ascii=False))

        # Exit-Code basierend auf Risiko-Level
        if result["risk_level"] == "CRITICAL":
            return 3
        elif result["risk_level"] == "HIGH":
            return 2
        elif result["risk_level"] == "MEDIUM":
            return 1
        return 0

    except FileNotFoundError as e:
        logger.error(f"Datei nicht gefunden: {e}")
        return 4
    except json.JSONDecodeError as e:
        logger.error(f"Ungültiges JSON: {e}")
        return 5
    except ValueError as e:
        logger.error(f"Validierungsfehler: {e}")
        return 6
    except Exception as e:
        logger.error(f"Unerwarteter Fehler: {e}")
        return 99


if __name__ == "__main__":
    exit(main())
