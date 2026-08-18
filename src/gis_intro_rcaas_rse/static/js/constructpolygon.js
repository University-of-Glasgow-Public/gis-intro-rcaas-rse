let poly = map.editTools.startPolygon();
poly.on('dblclick', L.DomEvent.stop).on('dblclick', poly.toggleEdit);

const latlngs = []

const undoBtn = document.getElementById('undo-btn');
const clearBtn = document.getElementById('clear-btn');

function getCurrentLatLngs() {
    if (!poly || !poly.getLatLngs) {
        return [];
    }

    const featureLatLngs = poly.getLatLngs();
    return Array.isArray(featureLatLngs[0]) ? featureLatLngs[0].slice() : featureLatLngs.slice();
}

function updatePolygonVertexStyles(e) {
    if (!poly || !map.editTools || !map.editTools.editLayer) {
        return;
    }

    const firstLatLng = getCurrentLatLngs()[0];
    const vertices = document.querySelectorAll('.leaflet-marker-icon.leaflet-div-icon.leaflet-vertex-icon.leaflet-zoom-animated.leaflet-interactive.leaflet-marker-draggable');
    if (vertices.length > 0 && firstLatLng && (!e || e.type !== 'editable:vertex:dragend')) {
        vertices[0].classList += ' leaflet-first-vertex-icon';
    }

    if (e && e.type === 'editable:drawing:end') {
        if (vertices.length > 0) {
            vertices[0].classList.remove('leaflet-first-vertex-icon');
        }

        vertices.forEach((vertex, index) => {
            vertex.classList.add('subtract-vertex');
        })
    } else {
        vertices.forEach((vertex, index) => {
            vertex.classList.remove('subtract-vertex');
        })
    }
}

function updateCompletionNote(e) {
    const note = document.getElementById('polygon-completion-note');
    if (!note || (e && e.type === 'editable:vertex:dragend')) {
        return;
    }

    const currentLatLngs = getCurrentLatLngs();

    note.hidden = currentLatLngs.length < 2 || (e && e.type === 'editable:drawing:end');
}

function updateFormFieldsFromCoords(e) {

    if (!poly) {
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        undoBtn.disabled = true;
        return;
    }

    const currentLatLngs = getCurrentLatLngs();
    latlngs.splice(0, latlngs.length, ...currentLatLngs);

    const lats = latlngs.map(latlng => latlng.lat).join(',');
    const lngs = latlngs.map(latlng => latlng.lng).join(',');

    document.getElementById('latitude').value = lats;
    document.getElementById('longitude').value = lngs;
    //undoBtn.disabled = latlngs.length === 0;

    if (!e) { 
        return; 
    }

    if (e.type === 'editable:drawing:click' || e.type === 'editable:drawing:end') {
        updatePolygonVertexStyles(e);
        updateCompletionNote(e);
    }
}

function resetAll() {

    map.editTools.editLayer.clearLayers();
    map.editTools.featuresLayer.clearLayers();

    poly = map.editTools.startPolygon();
    poly.on('dblclick', L.DomEvent.stop).on('dblclick', poly.toggleEdit);

    latlngs.splice(0, latlngs.length);

    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';

    undoBtn.disabled = true;
    updateCompletionNote();
    updatePolygonVertexStyles();
}

map.on('editable:drawing:click', (e) => {
    undoBtn.disabled = true;
    updateFormFieldsFromCoords(e);
});

map.on('editable:vertex:dragend', (e) => {
    const features = e.editTools.featuresLayer.toGeoJSON().features
    const vertices = features.map(feature => feature.geometry.coordinates[0].map(coord => L.latLng(coord[1], coord[0])));
    const lats = vertices[0].map(latlng => latlng.lat).join(',');
    const lngs = vertices[0].map(latlng => latlng.lng).join(',');
    document.getElementById('latitude').value = lats;
    document.getElementById('longitude').value = lngs;
    updatePolygonVertexStyles(e);
    updateCompletionNote(e);

})

map.on('editable:drawing:end', (e) => {
    undoBtn.disabled = false;
    updatePolygonVertexStyles(e);
    updateCompletionNote(e);
});

map.on('editable:dragend', (e) => {
     const features = e.editTools.featuresLayer.toGeoJSON().features
    const vertices = features.map(feature => feature.geometry.coordinates[0].map(coord => L.latLng(coord[1], coord[0])));
    const lats = vertices[0].map(latlng => latlng.lat).join(',');
    const lngs = vertices[0].map(latlng => latlng.lng).join(',');
    document.getElementById('latitude').value = lats;
    document.getElementById('longitude').value = lngs;
    updatePolygonVertexStyles(e);
    updateCompletionNote(e);
});

undoBtn.addEventListener('click', function () {
    if (!poly) {
        return;
    }

    const currentLatLngs = getCurrentLatLngs();
    if (currentLatLngs.length === 0) {
        return;
    }

    const updatedLatLngs = currentLatLngs.slice(0, -1);

    poly.setLatLngs(updatedLatLngs);
    latlngs.splice(0, latlngs.length, ...updatedLatLngs);

    if (poly.editor) {
        poly.editor._drawnLatLngs = updatedLatLngs;
        if (typeof poly.editor.reset === 'function') {
            poly.editor.reset();
        }
    }

    if (latlngs.length === 0) {
        resetAll();
    }

    updateFormFieldsFromCoords(null);

});

clearBtn.addEventListener('click', function () {
    resetAll();
});