/*
SRTM Hillshade
-
Generate a hillshade image based on the SRTM 30m DEM.
from: https://groups.google.com/forum/#!topic/google-earth-engine-developers/zN9b6DBy4N4
*/

function radians(img) { return img.toFloat().multiply(3.1415927).divide(180); }

function hillshade(dem, az, ze) {
  var terrain = ee.call('Terrain', dem);
  var slope = radians(terrain.select(['slope']));
  var aspect = radians(terrain.select(['aspect']));
  var azimuth = radians(ee.Image(az));
  var zenith = radians(ee.Image(ze));
  return azimuth.subtract(aspect).cos().multiply(slope.sin()).multiply(zenith.sin())
      .add(zenith.cos().multiply(slope.cos()));
}

var DEM = ee.Image('USGS/SRTMGL1_003');
var Azi = ee.Image(54);  // azimuth angle
var Zen = ee.Image(45);  // zenith angle

//var Hillshade = ee.Terrain.hillshade(DEM,Azi,Zen);
var Hillshade = hillshade(DEM,Azi,Zen);

Map.addLayer(Hillshade, {min:0.4, max:1});
