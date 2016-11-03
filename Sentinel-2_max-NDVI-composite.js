/*
Sentinel-2 maximum NDVI composite
source: https://groups.google.com/d/msg/google-earth-engine-developers/GBhCHMclAng/ltX8WbhwAAAJ
*/
var s2 = ee.ImageCollection("COPERNICUS/S2");

var rgb_viz = {min:0, max:2000, bands:['R','G','B']};
var ndvi_viz = {bands:'NDVI', min:0, max:0.3, palette:'000000,00FF00'};
s2 = s2.select(['B2','B3','B4','B5'], ['B','G','R','N']);

function addNdvi(img) {
  var nd = img.normalizedDifference(['N', 'R']);
  return img.addBands(nd.rename('NDVI'));
}
var ndvi = s2.map(addNdvi);
var greenest = ndvi.qualityMosaic('NDVI');
Map.addLayer(s2.median(), rgb_viz, 'RGB (median)');
Map.addLayer(ndvi, ndvi_viz, 'NDVI', false);
Map.addLayer(greenest, rgb_viz, 'RGB (greenest pixel)');
