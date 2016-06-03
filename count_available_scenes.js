/*
Visualize number of available scenes
from 0 to 20 scenes, paletted from red over blue to green
*/

var s2 = ee.ImageCollection("COPERNICUS/S2")  // Sentinel-2
  .filterDate(ee.Date("2016-01-01"), ee.Date("2016-06-01"))  // first half of 2016

var countViz = {min: 0, max: 20, palette: ['cc0000', '2950c5', '009a44']};
Map.addLayer(s2.select(1).count(), countViz, 'count');
