let poly = map.editTools.startPolygon();
poly.on('dblclick', L.DomEvent.stop).on('dblclick', poly.toggleEdit);

const latlngs = []

// // --- State ---
const undoBtn = document.getElementById('undo-btn');
const clearBtn = document.getElementById('clear-btn');

// // --- Helpers ---
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
    const firstVertex = document.querySelectorAll('.leaflet-marker-icon.leaflet-div-icon.leaflet-vertex-icon.leaflet-zoom-animated.leaflet-interactive.leaflet-marker-draggable');
    if (firstVertex.length > 0 && firstLatLng) {
        firstVertex[0].classList += ' leaflet-first-vertex-icon';
    }

    if (e && e.type === 'editable:drawing:end') {
        if (firstVertex.length > 0) {
            firstVertex[0].classList.remove('leaflet-first-vertex-icon');
        }
    }
}

function updateCompletionNote(e) {
    const note = document.getElementById('polygon-completion-note');
    if (!note) {
        return;
    }

    const currentLatLngs = getCurrentLatLngs();
    note.hidden = currentLatLngs.length < 2 || (e && e.type === 'editable:drawing:end');
}

function updateFormFieldsFromCoords() {

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
    undoBtn.disabled = latlngs.length === 0;

    updatePolygonVertexStyles();
    updateCompletionNote();
}
map.on('editable:drawing:click', updateFormFieldsFromCoords);

map.on('editable:vertex:dragend', (e) => {
    const features = e.editTools.featuresLayer.toGeoJSON().features
    const vertices = features.map(feature => feature.geometry.coordinates[0].map(coord => L.latLng(coord[1], coord[0])));
    const lats = vertices[0].map(latlng => latlng.lat).join(',');
    const lngs = vertices[0].map(latlng => latlng.lng).join(',');
    document.getElementById('latitude').value = lats;
    document.getElementById('longitude').value = lngs;
    updatePolygonVertexStyles();
    updateCompletionNote();

})

map.on('editable:drawing:end', (e) => {

    updatePolygonVertexStyles(e);
    updateCompletionNote(e);
});

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

    updateFormFieldsFromCoords();
    updatePolygonVertexStyles();
    updateCompletionNote();
});

clearBtn.addEventListener('click', function () {
    resetAll();
});