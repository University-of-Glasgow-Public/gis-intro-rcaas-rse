from collections.abc import Generator

import pytest
from flask.testing import FlaskClient

from gis_intro_rcaas_rse.app import app


@pytest.fixture
def client() -> Generator[FlaskClient]:
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client
