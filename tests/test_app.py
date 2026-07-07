from unittest.mock import MagicMock, patch

import pytest

from gis_intro_rcaas_rse.app import build_polygon, retrieve_site_names


def test_build_polygon_closes_open_polygon_trailing_comma() -> None:
    """Test that build_polygon closes an open polygon when the
    first and last points are not the same, and a trailing comma is present."""
    result = build_polygon(
        "1,2,3,",
        "4,5,6,",
    )

    assert result == [
        [1.0, 4.0],
        [2.0, 5.0],
        [3.0, 6.0],
        [1.0, 4.0],
    ]


def test_build_polygon_closes_open_polygon_same_lng() -> None:
    """Test that build_polygon closes an open polygon when the first and last points
    are not the same, but the first and last longitudes are the same."""
    result = build_polygon(
        "1,2,3,1",
        "4,5,6,3",
    )

    assert result == [
        [1.0, 4.0],
        [2.0, 5.0],
        [3.0, 6.0],
        [1.0, 3.0],
        [1.0, 4.0],
    ]


def test_build_polygon_no_trailing_comma() -> None:
    """Test that build_polygon works correctly when there is no trailing comma."""
    result = build_polygon(
        "1,2,3",
        "4,5,6",
    )

    assert result == [
        [1.0, 4.0],
        [2.0, 5.0],
        [3.0, 6.0],
        [1.0, 4.0],
    ]


def test_build_polygon_preserves_closed_polygon() -> None:
    """Test that build_polygon preserves a closed polygon when the
    first and last points are the same."""
    result = build_polygon(
        "1,2,3,1,",
        "4,5,6,4,",
    )

    assert result == [
        [1.0, 4.0],
        [2.0, 5.0],
        [3.0, 6.0],
        [1.0, 4.0],
    ]


def test_build_polygon_invalid_coordinate_raises() -> None:
    """Test that build_polygon raises a ValueError when an
    invalid coordinate is provided."""
    with pytest.raises(ValueError):
        build_polygon(
            "1,abc,3,",
            "4,5,6,",
        )


def test_build_polygon_single_point() -> None:
    """Test that build_polygon raises a ValueError when there is only one point."""
    with pytest.raises(ValueError):
        build_polygon(
            "1,",
            "2,",
        )


def test_build_polygon_mismatched_coordinate_counts() -> None:
    """Test that build_polygon raises a ValueError when the number
    of longitudes and latitudes are not the same."""
    with pytest.raises(ValueError):
        build_polygon(
            "1,2,3,",
            "4,5,",
        )


@patch("gis_intro_rcaas_rse.app.mongo")
def test_retrieve_site_names(mock_mongo: MagicMock) -> None:
    """Test that retrieve_site_names returns a unique list of site names
    excluding any empty names."""
    mock_mongo.db.sites.find.return_value = [
        {"properties": {"name": "Site A"}},  # Valid site with name
        {"properties": {"name": "Site B"}},  # Valid site with name
        {"properties": {"description": "Site C"}},  # No name field
        {"properties": {"name": ""}},  # Empty name field
        {"properties": {}},  # No name field
        {},  # No properties field
    ]

    result = retrieve_site_names()

    assert result == ["Site A", "Site B"]
