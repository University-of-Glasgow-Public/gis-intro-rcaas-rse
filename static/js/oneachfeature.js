function onEachFeature(feature, layer) {
    var content = '<p>Details:</p>';
    if (feature.properties && feature.properties.name) {
        content += '<p>Name: ' + feature.properties.name + '</p>';
    }
    layer.bindPopup(content);
}