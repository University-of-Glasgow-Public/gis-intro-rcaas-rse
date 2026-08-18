let poly = L.polygon([]).addTo(map);
poly.enableEdit();

map.editTools.startPolygon();

poly.on('dblclick', L.DomEvent.stop).on('dblclick', poly.toggleEdit);

const latlngs = []

// // --- State ---
const undoBtn = document.getElementById('undo-btn');
const clearBtn = document.getElementById('clear-btn');

// // --- Helpers ---
function updateFormFieldsFromCoords(e) {

    if (!poly) {
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        undoBtn.disabled = true;
        return;
    }

    if (e) {
        latlngs.push(e.latlng);
    }

    const lats = latlngs.map(latlng => latlng.lat).join(',');
    const lngs = latlngs.map(latlng => latlng.lng).join(',');

    document.getElementById('latitude').value = lats;
    document.getElementById('longitude').value = lngs;
    undoBtn.disabled = false;
}
map.on('editable:drawing:click', updateFormFieldsFromCoords);

function resetAll() {

    map.editTools.editLayer.clearLayers();
    map.editTools.featuresLayer.clearLayers();
    map.removeLayer(poly);

    poly = L.polygon([]).addTo(map);
    poly.enableEdit();
    map.editTools.startPolygon();

    latlngs.splice(0, latlngs.length);

    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';

    undoBtn.disabled = true;
}

undoBtn.addEventListener('click', function () {
    if (poly) {
        if (latlngs.length > 0) {
            latlngs.pop();
            map.editTools.editLayer.clearLayers();
            map.editTools.featuresLayer.clearLayers();
            map.removeLayer(poly);

            poly = L.polygon(latlngs).addTo(map);
            poly.enableEdit();
            map.editTools.startPolygon();

            updateFormFieldsFromCoords(null);
        }
    }
});

clearBtn.addEventListener('click', function () {
    resetAll();
});