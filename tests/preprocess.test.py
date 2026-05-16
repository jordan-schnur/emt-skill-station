"""
Unit tests for preprocess.py – PDF reading and data generation
"""

import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Import the preprocess module
sys.path.insert(0, str(Path(__file__).parent.parent))
import preprocess


class TestDataStructure:
    """Test the SHEETS data structure"""

    def test_sheets_is_list(self):
        """SHEETS should be a list"""
        assert isinstance(preprocess.SHEETS, list)
        assert len(preprocess.SHEETS) > 0

    def test_each_sheet_has_required_fields(self):
        """Each sheet must have required fields"""
        required_fields = ["id", "title", "category", "totalPoints", "sections"]
        for sheet in preprocess.SHEETS:
            for field in required_fields:
                assert field in sheet, f"Sheet {sheet.get('id')} missing {field}"

    def test_sheet_ids_are_unique(self):
        """Sheet IDs should be unique"""
        ids = [sheet["id"] for sheet in preprocess.SHEETS]
        assert len(ids) == len(set(ids)), "Duplicate sheet IDs found"

    def test_sheets_have_sections(self):
        """Each sheet must have at least one section"""
        for sheet in preprocess.SHEETS:
            assert len(sheet["sections"]) > 0, f"Sheet {sheet['id']} has no sections"

    def test_sections_have_required_fields(self):
        """Each section must have required fields"""
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                assert "name" in section, f"Section in {sheet['id']} missing name"
                assert "steps" in section, f"Section {section.get('name')} in {sheet['id']} missing steps"
                assert "header" in section, f"Section {section.get('name')} in {sheet['id']} missing header field"

    def test_steps_have_required_fields(self):
        """Each step must have text and points"""
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                for step in section["steps"]:
                    assert "text" in step, f"Step in {sheet['id']}/{section['name']} missing text"
                    assert "points" in step, f"Step in {sheet['id']}/{section['name']} missing points"
                    assert isinstance(step["points"], int), f"Points should be int in {sheet['id']}/{section['name']}"

    def test_substeps_have_required_fields(self):
        """If a step has substeps, they must have text and points"""
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                for step in section["steps"]:
                    if "substeps" in step and step["substeps"]:
                        for substep in step["substeps"]:
                            assert "text" in substep, f"Substep missing text in {sheet['id']}/{section['name']}/{step['text']}"
                            assert "points" in substep, f"Substep missing points in {sheet['id']}/{section['name']}/{step['text']}"

    def test_total_points_calculation(self):
        """totalPoints should match sum of all step points"""
        for sheet in preprocess.SHEETS:
            calculated_points = 0
            for section in sheet["sections"]:
                for step in section["steps"]:
                    step_points = step["points"]
                    if "substeps" in step and step["substeps"]:
                        # If has substeps, points come from substeps
                        substep_points = sum(s["points"] for s in step["substeps"])
                        calculated_points += substep_points
                    else:
                        calculated_points += step_points

            assert calculated_points == sheet["totalPoints"], (
                f"Sheet {sheet['id']}: declared {sheet['totalPoints']} "
                f"but calculated {calculated_points}"
            )

    def test_critical_criteria_exist(self):
        """Each sheet should have critical criteria"""
        for sheet in preprocess.SHEETS:
            assert "criticalCriteria" in sheet, f"Sheet {sheet['id']} missing criticalCriteria"
            assert isinstance(sheet["criticalCriteria"], list), f"criticalCriteria should be a list in {sheet['id']}"
            assert len(sheet["criticalCriteria"]) > 0, f"Sheet {sheet['id']} has no critical criteria"


class TestDataValidation:
    """Test data validation logic"""

    def test_no_empty_step_text(self):
        """Step text should not be empty"""
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                for step in section["steps"]:
                    assert step["text"].strip(), f"Empty step text in {sheet['id']}/{section['name']}"
                    if "substeps" in step:
                        for substep in step["substeps"]:
                            assert substep["text"].strip(), f"Empty substep text in {sheet['id']}/{section['name']}"

    def test_no_duplicate_step_text_in_section(self):
        """Steps within a section should have unique text"""
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                texts = [step["text"] for step in section["steps"]]
                assert len(texts) == len(set(texts)), (
                    f"Duplicate step text in {sheet['id']}/{section['name']}"
                )

    def test_all_points_positive(self):
        """Points should be positive integers"""
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                for step in section["steps"]:
                    assert step["points"] > 0, f"Non-positive points in {sheet['id']}/{section['name']}/{step['text']}"
                    if "substeps" in step:
                        for substep in step["substeps"]:
                            assert substep["points"] > 0, f"Non-positive points in substep {substep['text']}"

    def test_section_names_not_empty(self):
        """Section names should not be empty"""
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                assert section["name"].strip(), f"Empty section name in {sheet['id']}"

    def test_category_is_set(self):
        """Sheet category should be set"""
        for sheet in preprocess.SHEETS:
            assert sheet.get("category"), f"Sheet {sheet['id']} has no category"

    def test_no_whitespace_in_ids(self):
        """IDs should not have whitespace"""
        for sheet in preprocess.SHEETS:
            assert " " not in sheet["id"], f"Whitespace in sheet ID: {sheet['id']}"


class TestDataGeneration:
    """Test functions that process data"""

    def test_generate_cards_from_sheet(self):
        """Test that cards can be generated from sheet data"""
        sheet = preprocess.SHEETS[0]

        # Mock the function that would do this
        def generate_cards(sheet):
            cards = []
            for section in sheet["sections"]:
                for step_idx, step in enumerate(section["steps"]):
                    substeps = step.get("substeps", [])
                    if not substeps:
                        cards.append({
                            "id": f"{sheet['id']}::{section['name']}::{step_idx}",
                            "text": step["text"],
                            "points": step["points"],
                            "section": section["name"],
                            "stepIndex": step_idx,
                        })
                    else:
                        for sub_idx, substep in enumerate(substeps):
                            cards.append({
                                "id": f"{sheet['id']}::{section['name']}::{step_idx}::{sub_idx}",
                                "text": substep["text"],
                                "points": substep["points"],
                                "section": section["name"],
                                "stepIndex": step_idx,
                                "subIndex": sub_idx,
                                "parent": step["text"],
                            })
            return cards

        cards = generate_cards(sheet)

        # Should have cards
        assert len(cards) > 0, f"No cards generated for {sheet['id']}"

        # Each card should have required fields
        for card in cards:
            assert "id" in card
            assert "text" in card
            assert "points" in card
            assert "section" in card

        # Card count should be reasonable (not obviously wrong)
        total_steps = sum(
            len(section["steps"]) +
            sum(len(s.get("substeps", [])) for s in section["steps"])
            for section in sheet["sections"]
        )
        assert len(cards) == total_steps


class TestDataExport:
    """Test JSON export of data"""

    def test_can_serialize_to_json(self):
        """Sheet data should be JSON-serializable"""
        for sheet in preprocess.SHEETS:
            try:
                json_str = json.dumps(sheet)
                assert json_str
                parsed = json.loads(json_str)
                assert parsed["id"] == sheet["id"]
            except Exception as e:
                pytest.fail(f"Sheet {sheet['id']} not JSON serializable: {e}")

    def test_can_serialize_all_sheets(self):
        """All sheets should be JSON-serializable together"""
        try:
            json_str = json.dumps({"sheets": preprocess.SHEETS})
            parsed = json.loads(json_str)
            assert len(parsed["sheets"]) == len(preprocess.SHEETS)
        except Exception as e:
            pytest.fail(f"SHEETS not JSON serializable: {e}")

    def test_json_roundtrip(self):
        """Data should survive JSON roundtrip unchanged"""
        original = preprocess.SHEETS[0]
        json_str = json.dumps(original)
        restored = json.loads(json_str)

        assert restored["id"] == original["id"]
        assert restored["title"] == original["title"]
        assert len(restored["sections"]) == len(original["sections"])


class TestDataConsistency:
    """Test cross-sheet and internal consistency"""

    def test_no_overlapping_card_ids(self):
        """Card IDs should be globally unique across all sheets"""
        all_ids = set()
        for sheet in preprocess.SHEETS:
            for section in sheet["sections"]:
                for step_idx, step in enumerate(section["steps"]):
                    substeps = step.get("substeps", [])
                    if not substeps:
                        card_id = f"{sheet['id']}::{section['name']}::{step_idx}"
                        assert card_id not in all_ids, f"Duplicate card ID: {card_id}"
                        all_ids.add(card_id)
                    else:
                        for sub_idx, _ in enumerate(substeps):
                            card_id = f"{sheet['id']}::{section['name']}::{step_idx}::{sub_idx}"
                            assert card_id not in all_ids, f"Duplicate card ID: {card_id}"
                            all_ids.add(card_id)

    def test_all_sheets_have_content(self):
        """No sheet should be empty"""
        for sheet in preprocess.SHEETS:
            total_steps = sum(
                len(section["steps"]) for section in sheet["sections"]
            )
            assert total_steps > 0, f"Sheet {sheet['id']} has no steps"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
