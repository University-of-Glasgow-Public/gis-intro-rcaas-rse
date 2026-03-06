Whilst you could just clone the repository, or browse the content, it is often a more rich experience 
if you go through the process as if you were developing your own web site, and this tutorial adopts 
that pedagogical approach.

This guide assumes you are using UV to manage your environment and Visual Studio Code as an IDE 
and will tie in with the GIS tutorial on Leaflet and MongoDB and will demonstrate how to use python 
to access MongoDB and create dynamic map content. We will use flask to facilitate creating the web 
pages and flask-pymongo to bridge between Flask and MongoDB. It does not cover the insallation of VS 
code or UV as there are plenty of guides online already.

Flask-pymongo has methods that are identically or similarly named to the ones we covered in the 
MongoDB-Leaflet tutorial. For example, find in MongoDB has an identically named method in flask-pymongo.
The findOne method in MongoDB has a similarly named method find_one in flask-pymongo. When using 
flask-pymongo query methods the query string needs to be formatted slightly differently, such as 
wrapping $nearSphere in double quotes. Another difference is the return type. Whilst MongoDB findOne 
queries return a JSON document, pymongo find_one returns that same document as a data dictionary. 
This difference needs to be accounted with a json conversion when returning results to the web page 
script element controlling presentation of those data on a map.

Start your VS code application and open a terminal and change directory to the root of your usual 
coding project workspace (I tend to use a folder directly under my user account folder) and execute 
uv init [project name] to set up the core project content. E.g.,

```
uv init bothy
```

Navigate to the new project folder: 

```
cd bothy
```

The BOTHY folder should contain: .gitignore, .python-version, main.py, project.toml (with no dependencies specified as yet and with requires-python set to “>=3.13” - at least at the time of writing this - along with some basic project metadata) and README.md. Rename main.py to app.py y right clicking on the file in EXPLORER and selecting Rename... Execute uv venv to create your virtual environment and source .venv/bin/activate to activate it. When you revisit the project after working on another project or the next day you may need to run the activate step again.

```
uv venv
source .venv/bin/activate
```

The BOTHY folder should now have a .venv folder with nested bin and lib folders and .gitignore, CACHEDIR.TAG, and pyenv.cfg files. Next we will add the libraries that we need.

```
uv add flask 
uv add flask-pymongo 
```

This will specify the necessary dependencies in the dependencies array in the toml file and add flask and flask-pymongo and their dependencies to the lib folder in your virtual environment.

Modify the content of app.py file as below. The search function will be called when the application’s root directory '/' is visited. It will return a basic search form that we will use to find bothies and present them on a map. The form action is to visit /bothy and the bothy method will handle this. If you have an issue with the flask import this may be resolved by changing the interpreter to the one in your environment by opening the Command Palette(cmd+shift+p on mac or ctrl+shift+p on windows) and selecting the Python: Select Interpreter and then selecting the one in the .venv in the BOTHY folder.

Create a template folder and add a search and results page: search.html and bothies.html, with content as shown below.

Execute: flask run # if this fails check if your environment is active.

Enter this URLin the browser of your choice: http://127.0.0.1:5000/