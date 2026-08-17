let poly = L.polygon([]).addTo(map);
poly.enableEdit();

map.editTools.startPolygon()

poly.on('dblclick', L.DomEvent.stop).on('dblclick', poly.toggleEdit);

const latlngs = []

// // --- State ---
const undoBtn = document.getElementById('undo-btn');
const clearBtn = document.getElementById('clear-btn');
let drawnPolygon = false;

// // --- Helpers ---
function updateFormFieldsFromCoords(e) {

    if (!poly) {
        document.getElementById('latitude').value = '';
        document.getElementById('longitude').value = '';
        undoBtn.disabled = true;
        return;
    }
    latlngs.push(e.latlng)

    const lats = latlngs.map(latlng => latlng.lat).join(',');
    const lngs = latlngs.map(latlng => latlng.lng).join(',');

    document.getElementById('latitude').value = lats;
    document.getElementById('longitude').value = lngs;
    undoBtn.disabled = false;
}
map.on('editable:drawing:click', updateFormFieldsFromCoords);



// function validatePolygon(polygon) {
//     const latlngs = polygon.getLatLngs()[0];

//     if (!latlngs || latlngs.length < 3) {
//         return { valid: false, reason: 'Add at least 3 points to form a polygon.' };
//     }

//     const geoJsonPolygon = {
//         type: 'Feature',
//         geometry: { 
//             type: 'Polygon', 
//             coordinates: [[...latlngs.map(l => [l.lng, l.lat]), [latlngs[0].lng, latlngs[0].lat]]]
//         },
//         properties: {}
//     };

//     // Detect self-intersections using turf
//     const k = turf.kinks(geoJsonPolygon);
//     if (k && k.features && k.features.length > 0) {
//         return { valid: false, reason: 'Invalid polygon: edges intersect. Please adjust your points.' };
//     }

//     // Check for non-degenerate area
//     const area = turf.area(geoJsonPolygon);
//     if (!area || area < 1e-8) {
//         return { valid: false, reason: 'Polygon area is zero or too small.' };
//     }

//     return { valid: true, polygon: geoJsonPolygon };
function deleteShape(e) {
    //if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey) && this.editEnabled()) this.editor.deleteShapeAt(e.latlng);
};
function resetAll() {

    console.log(map.editTools.editLayer)
    // map.removeLayer(map.editTools.editLayer)
    // map.removeLayer(map.editTools.featuresLayer)
    map.editTools.editLayer.clearLayers()
    map.editTools.featuresLayer.clearLayers()
    map.removeLayer(poly)
    poly = L.polygon([]).addTo(map);
    poly.enableEdit();
    map.editTools.startPolygon()
    isDrawing = false;
    latlngs.splice(0,latlngs.length)
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';

    undoBtn.disabled = true;
}



// map.on('click', function(e) {
//     if (!isDrawing) {
//         isDrawing = true;
//       // map.editTools.drawingCursor = 'crosshair';
//         drawnPolygon = L.polygon([e.latlng], { color: 'blue', drawingCursor: 'crosshair' }).addTo(map);
//         console.log(drawnPolygon)
//         drawnPolygon.enableEdit(map);
//     } else {
//         const latlngs = drawnPolygon.getLatLngs()[0];
//         latlngs.push(e.latlng);
//         drawnPolygon.setLatLngs([latlngs]);
//     }
//     updateFormFieldsFromCoords();
// });

undoBtn.addEventListener('click', function () {
    if (drawnPolygon) {

        const latlngs = drawnPolygon.getLatLngs()[0];
        if (latlngs.length > 0) {
            latlngs.pop();
            drawnPolygon.setLatLngs([latlngs]);
            updateFormFieldsFromCoords();
        }
    }
});

clearBtn.addEventListener('click', function () {
    resetAll();
});