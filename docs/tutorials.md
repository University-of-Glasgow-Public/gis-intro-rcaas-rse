

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

Copy the contents of app.py file from GitHub into your app.py file, overwriting any of the default content. 
This file represents the Controller in the Model View Controller architecture (MVC). It is brokering various requests and returning responses; controlling the flow of the application. In this very simple application the model can be viewed as the database and the data dictionaries that map to the documents in the collections. PyMongo 
does not do models in the sense of clasic Object Relational Mapping (ORM) tools such as Hibernate. If this is important then you may want to consider mongoengine as an alternative. The view elements are the template files. 

The search function will be called when the application’s search directory '/search' is visited.
This is specified with the app.route annotation. It will return a basic search form that we will 
use to find bothies and present them on a map.

```
@app.route('/search', methods=['GET'])
def search():
    """Returns the search form page with a dropdown of site names to search within."""
    sites = retrieve_site_names()
    return render_template('search.html', sites=sites)
```

Create a templates directory in the root of the project filder and within it a new search.html file.
Copy the contents of search.html file from GitHub into the blank new file. While you are at it create base,
addbothy, addsite and bothies.html

The results method is called as a result of the form specification in search.html (using HTTP POST) using 
constraints specified in the form as well as directly from a URL with no constraints (using HTTP GET).

```
<form action="http://127.0.0.1:5000/results" method="POST">

http://127.0.0.1:5000/results
```

The method is sensitive to the request method. If the request method is POST then the method checks which
of the three search types was made. If the Name field is not null then at most only one bothy is returned
based on the unique name field. The `{"_id": 0}` argument means that the native primary key field is not 
returned. If neither Name nor searching in a circle conditions are met then the assumption is the user is
searching by site as long as an option other than site_unselected has been selected. Step one is to find
the site by name and use the geometry of that site in step two to define the geoWithin search. If the 
request method is GET then the method will retun all bothies in the collection (without their primary keys).
Lastly all sites are retrieved so that they can be rendered on the map and the method returns the user to
bothies.html along with the bothy and site data and any search by circle specifications so that the bounding 
circle can be plotted on the map.

```
@app.route('/results', methods=['POST', 'GET'])
def results():
    ...
    data = {}
    result = request.form
    longitude = 0.0
    latitude = 0.0
    radius = 0
    if request.method == 'POST':
        # User is searching by name
        if result["Name"]:
            data = mongo.db.bothies.find_one(
                {"properties.name": result["Name"]}, {"_id": 0})
        # User is searching within a circle
        elif result["Longitude"] and result["Latitude"] and result["Radius"]:
            longitude = float(result["Longitude"])
            latitude = float(result["Latitude"])
            radius = float(result["Radius"])
            data = mongo.db.bothies.find(
                {"geometry":
                    {"$nearSphere":
                        {"$geometry":
                            {"type": "Point", "coordinates": [
                                longitude, latitude]},
                            "$maxDistance": radius
                         }
                     }
                 }, {"_id": 0}
            )
        # User is searching within a site
        elif result["Site"] != "site_unselected":
            # Find the site document by name
            site = mongo.db.sites.find_one({"properties.name": result["Site"]})
            # Use the geometry property of the site to specify the region in which to search
            data = mongo.db.bothies.find(
                {"geometry": {"$geoWithin": {"$geometry": site["geometry"]}}}, {
                    "_id": 0}
            )

    if request.method == 'GET':
        # Find all but dont include the id field
        data = mongo.db.bothies.find({}, {"_id": 0})

    sites = retrieve_sites()
    return render_template("bothies.html", data=data, sites=sites,
                           longitude=longitude, latitude=latitude, radius=radius)

```
  
The bothyform and siteform methods are called from URLs as defined in the method app.route
annotations and return form pages addbothy and addsite.html respectively.

```
@app.route('/bothyform', methods=['GET'])
def bothyform():
    """Return a page with a map and form."""
    return render_template('addbothy.html')


@app.route('/siteform', methods=['GET'])
def siteform():
    """Return and add site map and form."""
    return render_template('addsite.html')

```

The addbothy method responds to the submission 
```
@app.route('/addbothy', methods=['POST'])
def addbothy():
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
        "properties": {"name": name}
    }
    # Add the new bothy to the bothy collection
    mongo.db.bothies.insert_one(new_bothy)
    # Find all bothies, including the new one, excluding the id field
    data = mongo.db.bothies.find({}, {"_id": 0})
    # Find all sites
    sites = retrieve_sites()
    return render_template("bothies.html", data=data, sites=sites,
                           longitude=0.0, latitude=0.0, radius=0.0)
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