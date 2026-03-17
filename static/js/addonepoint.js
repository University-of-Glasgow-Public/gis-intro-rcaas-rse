var marker = {};
function onMapClick(e) {
    if (marker != undefined) {
        map.removeLayer(marker);
    };
    marker = new L.Marker(e.latlng, { icon: customIcon });
    map.addLayer(marker);
    document.getElementById('latitude').value = e.latlng.lat;
    document.getElementById('longitude').value = e.latlng.lng;
}
map.on('click', onMapClick);