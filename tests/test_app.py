from unittest.mock import patch

import pytest

from gis_intro_rcaas_rse.app import build_polygon, retrieve_site_names


def test_build_polygon_closes_open_polygon_trailing_comma():
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


def test_build_polygon_no_trailing_comma():
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


def test_build_polygon_preserves_closed_polygon():
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


def test_build_polygon_invalid_coordinate_raises():
    with pytest.raises(ValueError):
        build_polygon(
            "1,abc,3,",
            "4,5,6,",
        )


def test_build_polygon_single_point():
    with pytest.raises(ValueError):
        build_polygon(
            "1,",
            "2,",
        )


def test_build_polygon_mismatched_coordinate_counts():
    with pytest.raises(ValueError):
        build_polygon(
            "1,2,3,",
            "4,5,",
        )


@patch("gis_intro_rcaas_rse.app.mongo")
def test_retrieve_site_names(mock_mongo):
    mock_mongo.db.sites.find.return_value = [
        {"properties": {"name": "Site A"}},
        {"properties": {"name": "Site B"}},
        {"properties": {}},
        {},
    ]

    result = retrieve_site_names()

    assert result == ["Site A", "Site B"]
