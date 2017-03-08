// count available Sentinel-2 images with buffer to remove the MGRS tile overlap
// by Guido Lemoine https://groups.google.com/d/msg/google-earth-engine-developers/Ec5jwx5wjjk/FvM79cCDDgAJ

var startDate = ee.Date.fromYMD(2017,1,1);
var endDate = ee.Date.fromYMD(2017,2,20);

// Select Sentinel 2 image collection and filter by date
var temp = ee.ImageCollection('COPERNICUS/S2')
           .filterDate(startDate,endDate);

// Count the number of images avalable
var fc = ee.FeatureCollection(temp).filterBounds(Safrica);

fc = fc.map(function(f) { return f.buffer(-9800)})

fc = fc.reduceToImage(['system:time_start'], "count").clip(Safrica);

Map.addLayer(fc, {min: 0, max: 12})
// Map.addLayer(count, {palette:['FFffff','000000'], min:[0], max:[50], opacity:1});

// Export raster with number of avalable Sentinel 2 images at a 10km scale.
Export.image.toDrive({
  image: fc, 
  description:'Sentinel2_SafricaCount_10km',
  'region': Safrica,
  'scale': 10000, 
  maxPixels: 1.0E13});
