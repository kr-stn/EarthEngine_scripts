/**
 * Export NAIP image patches with according labels from NLCD
 * exported as TFRecord format for training a DNN with tensorflow
 * 
 * source and documentation: https://docs.google.com/document/d/1OKzLjlwNs7XirSi8AmdTScz6IdaBbohARGFrv4VK6kw
 * 
**/

// Load 2016 NAIP imagery.
var naip2016 = ee.ImageCollection('USDA/NAIP/DOQQ')
  .filterDate('2016-01-01', '2017-01-01')
  .mosaic();
Map.addLayer(naip2016, {}, 'NAIP 2016');

// Load National Land Cover Database data.
var nlcd = ee.Image('USGS/NLCD/NLCD2011').select('landcover');
Map.addLayer(nlcd.randomVisualizer(), {}, 'NLCD');

// Generate 1000 sample points in northern California.
var region = ee.Geometry.Rectangle(
  [-123, 38.5, -121.5, 39.5], null, false);
var points = ee.FeatureCollection.randomPoints(region, 1000);
Map.addLayer(region, {}, 'Region');
Map.addLayer(points, {}, 'Points');

// Sample 65x65-pixel NAIP image pataches and the relevant
// NLCD landcover value at each point.
var labeledPatches = naip2016
  .neighborhoodToArray(ee.Kernel.square(32))
  .addBands(nlcd)
  .sampleRegions({
    collection: points,
    projection: 'EPSG:32610',
    scale: 0.6,
  });

// Export to a TFRecord file in Cloud Storage, creating a file
// at gs://mdh-testbucket/LabeledPatches/ee_export.tfrecord
// which you can load directly in TensorFlow.
Export.table.toCloudStorage({
  collection: labeledPatches,
  description: 'LabeledPatches',
  bucket: 'mdh-testbucket',
  fileNamePrefix: 'LabeledPatches/',
  fileFormat: 'TFRecord',
  selectors: ['R', 'G', 'B', 'N', 'landcover'],
});