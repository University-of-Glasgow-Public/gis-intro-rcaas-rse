var marker = {};
var lat = "";
var lng = "";
function onMapClick(e) {
    marker = new L.circleMarker(e.latlng, {
        radius: 3,
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.7
    });
    map.addLayer(marker);
    lat += e.latlng.lat + ",";
    lng += e.latlng.lng + ",";
    document.getElementById('latitude').value = lat;
    document.getElementById('longitude').value = lng;
}
map.on('click', onMapClick);