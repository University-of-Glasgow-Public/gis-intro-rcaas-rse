// --- State ---
let markers = [];              // Leaflet markers
let coords = [];               // Points as [lng, lat] in clicked order
let drawnLine = null;          // L.Polyline during drawing
let drawnPolygon = null;       // L.Polygon after validation (dblclick)
let closingLine = null;
const undoBtn = document.getElementById('undo-btn');
const clearBtn = document.getElementById('clear-btn');

// --- Helpers ---
function updateFormFieldsFromCoords() {
    // Recompute lat/lng strings from coords so undo stays correct
    const lats = coords.map(([lng, lat]) => lat).join(',');
    const lngs = coords.map(([lng, lat]) => lng).join(',');
    document.getElementById('latitude').value = lats;
    document.getElementById('longitude').value = lngs;

    // Enable/disable undo based on count
    undoBtn.disabled = coords.length === 0;
}

function getClosedRing() {
    if (coords.length < 3) return null;
    const ring = [...coords];
    const first = ring[0];
    const last = ring[ring.length - 1];
    const isClosed = first[0] === last[0] && first[1] === last[1];
    if (!isClosed) ring.push(first);
    return ring;
}

function validatePolygon() {
    const ring = getClosedRing();
    if (!ring) {
        return { valid: false, reason: 'Add at least 3 points to form a polygon.' };
    }
    if (ring.length < 4) {
        return { valid: false, reason: 'A polygon must have at least 4 points (including the closing point).' };
    }

    const polygon = {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [ring] },
        properties: {}
    };

    // Detect self-intersections
    const k = turf.kinks(polygon);
    if (k && k.features && k.features.length > 0) {
        return { valid: false, reason: 'Invalid polygon: edges intersect. Please adjust your points.' };
    }

    // Optional: ensure non-degenerate area
    const area = turf.area(polygon);
    if (!area || area < 1e-8) {
        return { valid: false, reason: 'Polygon area is zero or too small.' };
    }

    return { valid: true, polygon };
}

function redrawLineAndPolygon() {
    // Remove previous overlays
    if (drawnLine) { map.removeLayer(drawnLine); drawnLine = null; }
    if (closingLine) { map.removeLayer(closingLine); closingLine = null; }
    if (drawnPolygon) { map.removeLayer(drawnPolygon); drawnPolygon = null; }

    if (coords.length > 1) {
        const latLngs = coords.map(([lng, lat]) => [lat, lng]);

        // Standard dashed line between points
        drawnLine = L.polyline(latLngs, {
            color: '#007bff',
            weight: 2,
            dashArray: '6,6'
        }).addTo(map);

        // Draw preview "closing" dashed line:
        // last point -> first point
        const first = latLngs[0];
        const last = latLngs[latLngs.length - 1];

        closingLine = L.polyline([last, first], {
            color: '#007bff',
            weight: 2,
            dashArray: '6,6',
            opacity: 0.5   // slightly lighter for clarity
        }).addTo(map);
    }
}


function drawFinalPolygon() {
    const ring = getClosedRing();
    if (!ring) return;

    const latLngs = ring.map(([lng, lat]) => [lat, lng]);
    drawnPolygon = L.polygon(latLngs, { color: '#28a745', weight: 2, fillOpacity: 0.25 }).addTo(map);
}

function onMapClick(e) {
    // Add a marker
    const m = L.marker(e.latlng).addTo(map);
    markers.push(m);

    // Record as [lng, lat]
    coords.push([e.latlng.lng, e.latlng.lat]);

    // Update UI
    updateFormFieldsFromCoords();
    redrawLineAndPolygon();
}

function undoLastPoint() {
    if (coords.length === 0) return;

    // Remove last marker from map
    const last = markers.pop();
    if (last) map.removeLayer(last);

    // Remove last coordinate
    coords.pop();

    // Redraw overlays and update inputs
    redrawLineAndPolygon();
    updateFormFieldsFromCoords();
}

function resetAll() {
    // Clear coords
    coords = [];

    // Remove markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Remove overlays
    if (drawnLine) { map.removeLayer(drawnLine); drawnLine = null; }
    if (drawnPolygon) { map.removeLayer(drawnPolygon); drawnPolygon = null; }

    // Clear form
    document.getElementById('latitude').value = '';
    document.getElementById('longitude').value = '';

    undoBtn.disabled = true;
}

// --- Event wiring ---
map.on('click', onMapClick);

// Double-click: try to validate and draw filled polygon
map.on('dblclick', function () {
    const result = validatePolygon();
    if (!result.valid) {
        alert(result.reason);
        return;
    }
    drawFinalPolygon();
});

undoBtn.addEventListener('click', function (e) {
    e.preventDefault();
    undoLastPoint();
});

clearBtn.addEventListener('click', function (e) {
    e.preventDefault();
    resetAll();
});

// Final validation on submit (prevents MongoDB errors)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    form.addEventListener('submit', (evt) => {
        const result = validatePolygon();
        if (!result.valid) {
            evt.preventDefault();
            alert(result.reason);
            return false;
        }
        // Ensure closed ring goes to backend if you need it:
        const ring = getClosedRing();
        const lats = ring.map(([lng, lat]) => lat).join(',');
        const lngs = ring.map(([lng, lat]) => lng).join(',');
        document.getElementById('latitude').value = lats;
        document.getElementById('longitude').value = lngs;
    });
});
// var marker = {};
// var lat = "";
// var lng = "";
// function onMapClick(e) {
//     marker = new L.circleMarker(e.latlng, {
//         radius: 3,
//         color: 'red',
//         fillColor: '#f03',
//         fillOpacity: 0.7
//     });
//     map.addLayer(marker);
//     lat += e.latlng.lat + ",";
//     lng += e.latlng.lng + ",";
//     document.getElementById('latitude').value = lat;
//     document.getElementById('longitude').value = lng;
// }
// map.on('click', onMapClick);
