"""
Unit Tests für den Agent Log Scorer

Testet die Kernfunktionalität:
- Input-Validierung
- Keyword-Erkennung
- Risk-Scoring
- Risk-Level-Zuordnung
"""

import json
import pytest
import sys
from pathlib import Path

# Projektverzeichnis zum Path hinzufügen
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.agent_log_scorer import (
    score_agent_log,
    validate_log_structure,
    check_keywords,
    get_risk_level,
    load_config,
    DEFAULT_CONFIG
)


class TestValidateLogStructure:
    """Tests für die Input-Validierung."""

    def test_valid_minimal_log(self):
        """Minimales gültiges Log mit nur agent_id."""
        log = {"agent_id": "AGENT_001"}
        is_valid, error = validate_log_structure(log)
        assert is_valid is True
        assert error == ""

    def test_valid_full_log(self):
        """Vollständiges gültiges Log."""
        log = {
            "agent_id": "AGENT_001",
            "contact_name": "Max Mustermann",
            "timestamp": "2025-12-23T10:00:00",
            "transcript": [{"speaker": "agent", "text": "Hallo"}],
            "stop_triggered": True,
            "result": "SUCCESS"
        }
        is_valid, error = validate_log_structure(log)
        assert is_valid is True

    def test_invalid_not_dict(self):
        """Log ist kein Dictionary."""
        is_valid, error = validate_log_structure("not a dict")
        assert is_valid is False
        assert "Dictionary" in error

    def test_invalid_missing_agent_id(self):
        """Fehlendes Pflichtfeld agent_id."""
        log = {"contact_name": "Test"}
        is_valid, error = validate_log_structure(log)
        assert is_valid is False
        assert "agent_id" in error

    def test_invalid_transcript_not_list(self):
        """Transcript ist keine Liste."""
        log = {"agent_id": "AGENT_001", "transcript": "not a list"}
        is_valid, error = validate_log_structure(log)
        assert is_valid is False
        assert "Liste" in error


class TestCheckKeywords:
    """Tests für die Keyword-Erkennung."""

    def test_price_keyword_euro_symbol(self):
        """Erkennung des Euro-Symbols."""
        found, keywords = check_keywords("Das kostet 100€", ["€", "euro"])
        assert found is True
        assert "€" in keywords

    def test_price_keyword_euro_word(self):
        """Erkennung des Wortes Euro."""
        found, keywords = check_keywords("Das sind 100 Euro", ["€", "euro"])
        assert found is True
        assert "euro" in keywords

    def test_legal_keyword(self):
        """Erkennung von rechtlichen Keywords."""
        found, keywords = check_keywords("Das ist gesetzlich geregelt", ["gesetz", "rechtlich"])
        assert found is True
        assert "gesetz" in keywords

    def test_case_insensitive(self):
        """Keywords werden case-insensitive erkannt."""
        found, keywords = check_keywords("Das ist RECHTLICH verboten", ["rechtlich"])
        assert found is True

    def test_no_match(self):
        """Keine Keywords gefunden."""
        found, keywords = check_keywords("Guten Tag, wie kann ich helfen?", ["€", "gesetz"])
        assert found is False
        assert keywords == []


class TestGetRiskLevel:
    """Tests für die Risk-Level-Zuordnung."""

    def test_risk_level_low(self):
        """Risk Score 0 = LOW."""
        level = get_risk_level(0, DEFAULT_CONFIG["risk_thresholds"])
        assert level == "LOW"

    def test_risk_level_medium(self):
        """Risk Score 1 = MEDIUM."""
        level = get_risk_level(1, DEFAULT_CONFIG["risk_thresholds"])
        assert level == "MEDIUM"

    def test_risk_level_high(self):
        """Risk Score 2 = HIGH."""
        level = get_risk_level(2, DEFAULT_CONFIG["risk_thresholds"])
        assert level == "HIGH"

    def test_risk_level_critical(self):
        """Risk Score > 2 = CRITICAL."""
        level = get_risk_level(3, DEFAULT_CONFIG["risk_thresholds"])
        assert level == "CRITICAL"

    def test_risk_level_negative_becomes_low(self):
        """Negative Scores werden als LOW behandelt."""
        level = get_risk_level(-1, DEFAULT_CONFIG["risk_thresholds"])
        assert level == "LOW"


class TestScoreAgentLog:
    """Tests für die Hauptfunktion score_agent_log."""

    def test_no_claims_no_risk(self):
        """Keine Claims = Risiko 0."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Guten Tag, wie kann ich Ihnen helfen?"}]
        }
        result = score_agent_log(log)
        assert result["risk"] == 0
        assert result["risk_level"] == "LOW"
        assert result["price_claim"] is False
        assert result["legal_claim"] is False

    def test_price_claim_without_stop(self):
        """Preisclaim ohne STOP = erhöhtes Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Das kostet 500 Euro"}],
            "stop_triggered": False
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True
        assert result["risk"] == 1
        assert result["risk_level"] == "MEDIUM"

    def test_price_claim_with_stop(self):
        """Preisclaim mit STOP = reduziertes Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Sie fragen nach dem Preis?"}],
            "stop_triggered": True,
            "result": "STOP_REQUIRED"
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True
        assert result["stop_triggered"] is True
        assert result["risk"] == 0
        assert result["risk_level"] == "LOW"

    def test_legal_claim_high_risk(self):
        """Rechtliche Behauptung = erhöhtes Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Das ist rechtlich erlaubt"}],
            "stop_triggered": False
        }
        result = score_agent_log(log)
        assert result["legal_claim"] is True
        assert result["risk"] >= 1

    def test_both_claims_highest_risk(self):
        """Preis- und Rechtsclaim ohne STOP = höchstes Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Das kostet 100€ und ist gesetzlich geregelt"}],
            "stop_triggered": False
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True
        assert result["legal_claim"] is True
        assert result["risk"] == 2
        assert result["risk_level"] == "HIGH"

    def test_placeholder_reduces_risk(self):
        """PLACEHOLDER im Result reduziert Risiko."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Der Preis hängt ab von..."}],
            "stop_triggered": False,
            "result": "PLACEHOLDER - Preis wird geklärt"
        }
        result = score_agent_log(log)
        assert result["placeholder_used"] is True
        # Risk wird durch Placeholder reduziert
        assert result["risk"] <= 1

    def test_invalid_log_raises_error(self):
        """Ungültiges Log wirft ValueError."""
        with pytest.raises(ValueError):
            score_agent_log("not a dict")

    def test_missing_agent_id_raises_error(self):
        """Fehlende agent_id wirft ValueError."""
        with pytest.raises(ValueError):
            score_agent_log({"transcript": []})

    def test_output_contains_all_fields(self):
        """Output enthält alle erwarteten Felder."""
        log = {"agent_id": "AGENT_001"}
        result = score_agent_log(log)

        expected_fields = [
            "agent_id", "contact", "timestamp",
            "price_claim", "price_keywords_found",
            "legal_claim", "legal_keywords_found",
            "stop_triggered", "placeholder_used",
            "risk", "risk_level"
        ]
        for field in expected_fields:
            assert field in result, f"Feld '{field}' fehlt im Output"


class TestLoadConfig:
    """Tests für das Laden der Konfiguration."""

    def test_load_default_config(self):
        """Standardkonfiguration wird geladen."""
        config = load_config()
        assert "price_keywords" in config
        assert "legal_keywords" in config
        assert "risk_thresholds" in config

    def test_nonexistent_config_uses_defaults(self):
        """Fehlende Config-Datei nutzt Standardwerte."""
        config = load_config("/nonexistent/path/config.yaml")
        assert config == DEFAULT_CONFIG


class TestIntegrationWithScorecards:
    """Integrationstests mit den vorhandenen Scorecards."""

    @pytest.fixture
    def scorecards_dir(self):
        """Pfad zum Scorecards-Verzeichnis."""
        return Path(__file__).parent / "scorecards"

    def test_scorecard_files_exist(self, scorecards_dir):
        """Scorecard-Dateien existieren."""
        assert scorecards_dir.exists(), f"Scorecards-Verzeichnis nicht gefunden: {scorecards_dir}"

        scorecard_files = list(scorecards_dir.glob("scorecard_*.json"))
        assert len(scorecard_files) == 10, f"Erwartet 10 Scorecards, gefunden: {len(scorecard_files)}"

    def test_scorecards_valid_json(self, scorecards_dir):
        """Alle Scorecards sind gültiges JSON."""
        for scorecard_path in scorecards_dir.glob("scorecard_*.json"):
            with open(scorecard_path) as f:
                data = json.load(f)
                assert "agent_id" in data
                assert "risk" in data


class TestEdgeCases:
    """Tests für Randfälle."""

    def test_empty_transcript(self):
        """Leeres Transcript wird korrekt behandelt."""
        log = {"agent_id": "AGENT_001", "transcript": []}
        result = score_agent_log(log)
        assert result["risk"] == 0

    def test_transcript_with_empty_text(self):
        """Transcript mit leerem Text."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": ""}, {"text": ""}]
        }
        result = score_agent_log(log)
        assert result["risk"] == 0

    def test_transcript_as_string_list(self):
        """Transcript als Liste von Strings (nicht Dicts)."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": ["Guten Tag", "Das kostet 50€"]
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True

    def test_none_values_handled(self):
        """None-Werte werden korrekt behandelt."""
        log = {
            "agent_id": "AGENT_001",
            "contact_name": None,
            "timestamp": None,
            "result": None
        }
        result = score_agent_log(log)
        assert result["contact"] is None
        assert result["placeholder_used"] is False

    def test_special_characters_in_transcript(self):
        """Sonderzeichen im Transcript."""
        log = {
            "agent_id": "AGENT_001",
            "transcript": [{"text": "Preis: 100€ (inkl. MwSt.)"}]
        }
        result = score_agent_log(log)
        assert result["price_claim"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
