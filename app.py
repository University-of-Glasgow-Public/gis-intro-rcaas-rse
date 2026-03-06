# app.py
"""Main application file for the gis intro app.

The module contains the main flask application and all routes. 
It also contains some helper functions to build a polygon from 
form data and to retrieve site names and site documents from the database.

© 2026 University of Glasgow
Licensed under the BSD 3-Clause License
"""
from flask import Flask, render_template, request
from flask_pymongo import PyMongo

app = Flask(__name__)
# Connect to a database, in this case a local database called cocdb
app.config["MONGO_URI"] = "mongodb://127.0.0.1:27017/cocdb"
mongo = PyMongo() # Create a PyMongo object
mongo.init_app(app) # initialise this PyMongo ready for use

@app.route('/search', methods=['GET'])
def search():
    """Returns the search form page with a dropdown of site names to search within."""
    sites = retrieve_site_names()
    return render_template('search.html', sites=sites)

@app.route('/results', methods=['POST'])
def results():
    """Returns the results from the search page.

    Process the search form and return a page with a map
    showing bothies that match the search criteria. Search 
    criteria can be a name, a circle defined by a centre point and radius,
    or a site defined by a polygon. If no search criteria is provided, 
    all bothies are returned. N.B. Form validation is non existent. 
    Consider wtf forms.
    """
    data = {}
    result = request.form
    longitude = 0.0
    latitude = 0.0
    distance = 0
    # User is searching by name
    if result["Name"]:
        data = mongo.db.bothies.find_one({"properties.name": result["Name"]},{"_id": 0})
    # User is searching within a circle
    elif result["Longitude"] and result["Latitude"] and result["Distance"]:
        longitude = float(result["Longitude"])
        latitude = float(result["Latitude"])
        distance = float(result["Distance"])
        data = mongo.db.bothies.find(
            {"geometry":
                {"$nearSphere":
                    {"$geometry":
                        {"type": "Point", "coordinates": [ longitude,latitude ]},
                        "$maxDistance": distance
                    }
                }
            },{"_id": 0}
        )
    # User is searching within a site
    elif result["Site"] != "site_unselected":
        # Find the site document by name
        site = mongo.db.sites.find_one({"properties.name": result["Site"]})
        # Use the geometry property of the site to specify the region in which to search
        data = mongo.db.bothies.find(
            {"geometry": {"$geoWithin": {"$geometry": site["geometry"]}}},{"_id": 0}
        )
    # User is not constraining the result set
    else:
        # Find all but dont include the id field
        data = mongo.db.bothies.find({},{"_id": 0})
    sites = retrieve_sites()
    return render_template("bothies.html", data=data, sites=sites,
                           longitude=longitude, latitude=latitude, distance=distance)

@app.route('/bothyform', methods=['GET'])
def bothyform():
    """Return a page with a map and form."""
    return render_template('addbothy.html')

@app.route('/addbothy', methods=['POST'])
def addbothy():
    """Creates a new bothy document.
    
    Processes the bothy form and creates a new bothy representation
    as a dictionary, inserts the new record and returns the 
    map page with all bothies and sites.  N.B. Form validation is non existent. 
    Consider wtf forms.
    """
    result = request.form
    longitude = float(result["Longitude"])
    latitude = float(result["Latitude"])
    name = result["Name"]
    new_bothy = {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [ longitude, latitude ]},
        "properties": {"name": name}
    }
    # Add the new bothy to the bothy collection
    mongo.db.bothies.insert_one(new_bothy)
    # Find all bothies, including the new one, excluding the id field
    data = mongo.db.bothies.find({},{"_id": 0})
    # Find all sites
    sites = retrieve_sites()
    return render_template("bothies.html", data=data, sites=sites,
                           longitude=0.0, latitude=0.0, distance=0.0)

@app.route('/siteform', methods=['GET'])
def siteform():
    """Return and add site map and form."""
    return render_template('addsite.html')

@app.route('/addsite', methods=['POST'])
def addsite():
    """Creates a new site document.

    Processes the site form and creates a new site representation
    as a dictionary, inserts the new record and returns the 
    map page with all bothies and sites. N.B. Form validation is non existent. 
    Consider wtf forms.
    """
    result = request.form
    longitude = result["Longitude"]
    latitude = result["Latitude"]
    name = result["Name"]
    polygon = [build_polygon(longitude,latitude)]
    site = {
        "type": "Feature",
        "geometry": { "type": "Polygon", "coordinates": polygon },
        "properties": { "name": name}
    }
    # Add the new site to the sites collection
    mongo.db.sites.insert_one(site)
    # Find all bothies excluding the id field
    data = mongo.db.bothies.find({},{"_id": 0})
    # Find all sites, including the new one
    sites = retrieve_sites()
    return render_template("bothies.html", data=data, sites=sites,
                               longitude=0.0, latitude=0.0, distance=0.0)

def build_polygon(longitude,latitude):
    """Converts a string of longitudes and latitudes to a polygon specification.

    :param longitude: a csv string of longitudes for all points specified
    that will have a trailing comma and may or may not have the same point
    at the start and end (i.e., polygon may not be closed off)
    :param latitude: a csv string of latitudes for all points specified
    that will have a trailing comma and may or may not have the same point
    at the start and end (i.e., polygon may not be closed off)

    :return: an array of point arrays defining the polygon
    :rtype: Array
    """
    # strip trailing comma and split into array of coordinate strings
    longitude_split = longitude.rstrip(",").split(",")
    latitude_split = latitude.rstrip(",").split(",")
    # if end point != start point, start point is duplicated to ensure a valid polygon.
    if(longitude_split[0] != longitude_split[-1] and latitude_split[0] != latitude_split[-1]):
        longitude_split.append(longitude_split[0])
        latitude_split.append(latitude_split[0])
    polygon_coords = []
    # convert to floats and build a point and add it to the polygon coords array
    for i,lng in enumerate(longitude_split):
        lng_as_float = float(lng)
        lat_as_float = float(latitude_split[i])
        polygon_coords.append([lng_as_float,lat_as_float])
    return polygon_coords

def retrieve_site_names():
    """returns a list of site names.
    
    Finds all the site documents with just the property name field 
    key and value and pulls out the property name field value.

    :return: a unique list of site names excluding any empty names
    :rtype: Array
    """
    sites = mongo.db.sites.find({},{ "_id": 0, "properties.name": 1})
    site_list = []
    for site in sites:
        name = site.get("properties",{}).get("name")
        if name:
            site_list.append(name)
    return site_list

def retrieve_sites():
    """Returns all site documents.
    
    :return: all site documents without the id field
    :rtype: Cursor    
    """
    return mongo.db.sites.find({}, {"_id": 0})

if __name__ == '__main__':
    app.run(debug=True)
