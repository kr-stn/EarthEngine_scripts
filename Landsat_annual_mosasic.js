/*
Create yearly, cloud-free mosaics from Landsat data and calculate the percentile values.
This can be used as a basis for land cover change analysis or classifications.
*/

// Load the Landsat 5 collection
var LT5 = ee.ImageCollection('LANDSAT/LT5_L1T');

// filter to year
var LT5_2005 = LT5.filterDate(ee.Date('2005-01-01'), ee.Date('2005-12-31'));

// Create a cloud-free Top-of-Athmosphere composite with custom parameters
var p50_2005 = ee.Algorithms.Landsat.simpleComposite({
  collection: LT5_2005,
  percentile: 50,
  cloudScoreRange: 5
});

var p10_2005 = ee.Algorithms.Landsat.simpleComposite({
  collection: LT5_2005,
  percentile: 10,
  cloudScoreRange: 5
});

var p90_2005 = ee.Algorithms.Landsat.simpleComposite({
  collection: LT5_2005,
  percentile: 90,
  cloudScoreRange: 5
});

// Display the composites.
Map.setCenter(105.77, 10.07, 9);
Map.addLayer(p50_2005, {bands: ['B4', 'B3', 'B2'], max: 255}, 'LT5 TOA 2005 median');


// Export composites
// the region you want to export (var roi) can be drawn as a polygon directly in the EarthEngine editor
Export.image(p50_2005, 'LT5_TOA_2005_p50_RRD', {
  scale: 30,
  region: roi
});

Export.image(p10_2005, 'LT5_TOA_2005_p10_RRD', {
  scale: 30,
  region: roi
});

Export.image(p90_2005, 'LT5_TOA_2005_p90_RRD', {
  scale: 30,
  region: roi
});
