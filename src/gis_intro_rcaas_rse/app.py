# app.py
"""Main application file for the gis intro app.

The module contains the main flask application and all routes.
It also contains some helper functions to build a polygon from
form data and to retrieve site names and site documents from the database.

© 2026 University of Glasgow
Licensed under the BSD 3-Clause License
"""

import os
from typing import Any

from flask import Flask, render_template, request
from flask_pymongo import PyMongo

app = Flask(__name__)

# Use environment variable (Docker will override this)
app.config["MONGO_URI"] = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017/cocdb")

# Initialize PyMongo
mongo = PyMongo(app)


@app.route("/search", methods=["GET"])
def search() -> str:
    """Returns the search form page with a dropdown of site names to search within."""
    sites = retrieve_site_names()
    return render_template("search.html", sites=sites)


@app.route("/results", methods=["POST", "GET"])
def results() -> str:
    """Returns a map of bothies and sites.

    POST: Process the search form and return a page with a map
    showing bothies that match the search criteria. Search
    criteria can be a name, a circle defined by a centre point and radius,
    or a site defined by a polygon. If no search criteria is provided,
    no bothies are returned, but sites will be shown.
    N.B. Form validation is non existent.
    Consider wtf forms.

    GET: Return a page with a map showing all bothies and sites.
    """
    data = {}
    result = request.form
    longitude = 0.0
    latitude = 0.0
    radius = 0.0
    db = mongo.db
    assert db is not None
    if request.method == "POST":
        # User is searching by name
        if result["Name"]:
            data = db.bothies.find_one({"properties.name": result["Name"]}, {"_id": 0})
        # User is searching within a circle
        elif result["Longitude"] and result["Latitude"] and result["Radius"]:
            longitude = float(result["Longitude"])
            latitude = float(result["Latitude"])
            radius = float(result["Radius"])
            data = db.bothies.find(
                {
                    "geometry": {
                        "$nearSphere": {
                            "$geometry": {
                                "type": "Point",
                                "coordinates": [longitude, latitude],
                            },
                            "$maxDistance": radius,
                        }
                    }
                },
                {"_id": 0},
            )
        # User is searching within a site
        elif result["Site"] != "site_unselected":
            # Find the site document by name
            site = db.sites.find_one({"properties.name": result["Site"]})
            # Use the geometry property of the site to specify
            # the region in which to search
            data = db.bothies.find(
                {"geometry": {"$geoWithin": {"$geometry": site["geometry"]}}},
                {"_id": 0},
            )

    if request.method == "GET":
        # Find all but dont include the id field
        data = db.bothies.find({}, {"_id": 0})

    sites = retrieve_sites()
    return render_template(
        "bothies.html",
        data=data,
        sites=sites,
        longitude=longitude,
        latitude=latitude,
        radius=radius,
    )


@app.route("/bothyform", methods=["GET"])
def bothyform() -> str:
    """Return a page with a map and form."""
    return render_template("addbothy.html")


@app.route("/addbothy", methods=["POST"])
def addbothy() -> str:
    """Creates a new bothy document.

    Processes the bothy form and creates a new bothy representation as a dictionary,
    inserts the new record and returns the  map page with all bothies and sites.
    N.B. Form validation is non existent. Consider wtf forms.
    """
    result = request.form
    longitude = float(result["Longitude"])
    latitude = float(result["Latitude"])
    name = result["BothyName"]
    new_bothy = {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [longitude, latitude]},
        "properties": {"name": name},
    }
    db = mongo.db

    if db is None:
        raise RuntimeError("MongoDB has not been initialized")

    # Add the new bothy to the bothy collection
    db.bothies.insert_one(new_bothy)
    # Find all bothies, including the new one, excluding the id field
    data = db.bothies.find({}, {"_id": 0})
    # Find all sites
    sites = retrieve_sites()
    return render_template(
        "bothies.html", data=data, sites=sites, longitude=0.0, latitude=0.0, radius=0.0
    )


@app.route("/siteform", methods=["GET"])
def siteform() -> str:
    """Return and add site map and form."""
    return render_template("addsite.html")


@app.route("/addsite", methods=["POST"])
def addsite() -> str:
    """Creates a new site document.

    Processes the site form and creates a new site representation
    as a dictionary, inserts the new record and returns the
    map page with all bothies and sites. N.B. Form validation is non existent.
    Consider wtf forms.
    """
    result = request.form
    longitude = result["Longitude"]
    latitude = result["Latitude"]
    name = result["SiteName"]
    polygon = [build_polygon(longitude, latitude)]
    site = {
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": polygon},
        "properties": {"name": name},
    }
    db = mongo.db
    if db is None:
        raise RuntimeError("MongoDB has not been initialized")
    # Add the new site to the sites collection
    db.sites.insert_one(site)
    # Find all bothies excluding the id field
    data = db.bothies.find({}, {"_id": 0})
    # Find all sites, including the new one
    sites = retrieve_sites()
    return render_template(
        "bothies.html", data=data, sites=sites, longitude=0.0, latitude=0.0, radius=0.0
    )


def build_polygon(longitude: str, latitude: str) -> list[list[float]]:
    """Converts a string of longitudes and latitudes to a polygon specification.

    :param longitude: a csv string of longitudes for all points specified
    that will have a trailing comma and may or may not have the same point
    at the start and end (i.e., polygon may not be closed off)
    :param latitude: a csv string of latitudes for all points specified
    that will have a trailing comma and may or may not have the same point
    at the start and end (i.e., polygon may not be closed off)

    :return: an array of point arrays defining the polygon
    """
    # strip trailing comma and split into array of coordinate strings
    longitude_split = longitude.rstrip(",").split(",")
    latitude_split = latitude.rstrip(",").split(",")
    # check that the number of longitudes and latitudes are the same
    if len(longitude_split) != len(latitude_split):
        raise ValueError(
            "Longitude and latitude lists must contain the same number of points"
        )
    # check that there are at least 2 points to form a polygon once closed off
    if len(longitude_split) < 2:
        raise ValueError(
            "Lists must contain at least 2 points to form a polygon once closed off"
        )
    # if end point != start point, start point is duplicated to ensure a valid polygon.
    if (
        longitude_split[0] != longitude_split[-1]
        or latitude_split[0] != latitude_split[-1]
    ):
        longitude_split.append(longitude_split[0])
        latitude_split.append(latitude_split[0])
    polygon_coords = []
    # convert to floats and build a point and add it to the polygon coords array
    for i, lng in enumerate(longitude_split):
        lng_as_float = float(lng)
        lat_as_float = float(latitude_split[i])
        polygon_coords.append([lng_as_float, lat_as_float])
    return polygon_coords


def retrieve_site_names() -> list[str]:
    """returns a list of site names.

    Finds all the site documents with just the property name field
    key and value and pulls out the property name field value.

    :return: a unique list of site names excluding any empty names
    """
    db = mongo.db
    if db is None:
        raise RuntimeError("MongoDB has not been initialized")
    sites = db.sites.find({}, {"_id": 0, "properties.name": 1})
    site_list = []
    for site in sites:
        name = site.get("properties", {}).get("name")
        if name:
            site_list.append(name)
    return site_list


def retrieve_sites() -> list[dict[str, Any]]:
    """Return all site documents without the _id field."""
    db = mongo.db
    if db is None:
        raise RuntimeError("MongoDB has not been initialized")
    return list(db.sites.find({}, {"_id": 0}))


if __name__ == "__main__":
    app.run(debug=True)
