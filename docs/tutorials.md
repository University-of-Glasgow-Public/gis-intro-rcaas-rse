

## Developing the main application
Whilst you could just clone the repository, or browse the content, it is often a more rich experience 
if you go through the process as if you were developing your own web site, and this tutorial adopts 
that pedagogical approach.

This guide assumes you are using UV to manage your environment and Visual Studio Code as an IDE 
and will tie in with the GIS tutorial on Leaflet and MongoDB and will demonstrate how to use python 
to access MongoDB and create dynamic map content. We will use flask to facilitate creating the web 
pages and flask-pymongo to bridge between Flask and MongoDB. It does not cover the insallation of VS 
code or UV as there are plenty of guides online already.

Flask-pymongo has methods that are identically or similarly named to the ones covered in the 
MongoDB-Leaflet tutorial. For example, find in MongoDB has an identically named method in flask-pymongo.
The findOne method in MongoDB has a similarly named method find_one in flask-pymongo. When using 
flask-pymongo query methods the query string needs to be formatted slightly differently, such as 
wrapping $nearSphere in double quotes. Another difference is the return type. Whilst MongoDB findOne 
queries return a JSON document, pymongo find_one returns that same document as a data dictionary. 
This difference needs to be accounted for with a json conversion when returning results to the web page 
script element controlling presentation of those data on a map.

Start VS code on your laptop and open a terminal (ctrl shift ` or select New Terminal in the Terminal 
menubar item) and change directory to the root of your usual coding project workspace and execute 
uv init [project name] to set up the core project content and navigate to the new project folder. E.g.,

```
cd /Users/bob.mcfadden/VscodeProjects
uv init bothy
cd bothy
```

The BOTHY folder should contain: 
* .gitignore, 
* .python-version, 
* main.py, 
* project.toml (with no dependencies specified as yet, requires-python set to “>=3.13” and some metadata),
* README.md. 
Rename main.py to app.py by right clicking on the file in EXPLORER and selecting Rename... 
Execute uv venv to create your virtual environment and source .venv/bin/activate to activate it. 
When you revisit the project after working on another project or the next day you may need to run the activate step again.

```
uv venv
source .venv/bin/activate
```

The BOTHY folder should now have a .venv folder with 
* bin folder,
* lib folder, 
* .gitignore, 
* CACHEDIR.TAG, 
* pyenv.cfg files. 

Next we will add the libraries that we need.

```
uv add flask 
uv add flask-pymongo 
```

This will specify the necessary dependencies in the dependencies array in the toml file and add flask 
and flask-pymongo and their dependencies to the lib folder in your virtual environment.

Modify the content of app.py file as below. 

```
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
```

The search function will be called when the application’s search directory '/search' is visited.
It will return a basic search form that we will use to find bothies and present them on a map.

```
@app.route('/search', methods=['GET'])
def search():
    """Returns the search form page with a dropdown of site names to search within."""
    sites = retrieve_site_names()
    return render_template('search.html', sites=sites)
```

Lets build that page as shown below:

```

The form action is to visit /bothy and the bothy method will handle this. 
  
```
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
```  
  
If you have an issue with the flask import this may be resolved by changing the interpreter to the one in your environment
by opening the Command Palette(cmd+shift+p on mac or ctrl+shift+p on windows) and selecting the Python: Select Interpreter
and then selecting the one in the .venv in the BOTHY folder.

Create a templates folder in the project root directory and within it add the following pages, copying content direct from 
the matching file in the templates folder of this repository:
* base.html
* view.html
* search.html
* addbothy.html
* addsite.html

Start the application (if this fails check if your environment is active).

```
flask run
```

Enter this URLin the browser of your choice: http://127.0.0.1:5000/view