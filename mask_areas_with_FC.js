/*
Mask areas of an image with a FeatureCollection
answer to the question https://groups.google.com/d/msg/google-earth-engine-developers/0kXnVX2xwXY/hU_MtbkQAQAJ
*/


var Roads = ee.FeatureCollection('ft:1O7sFz-bv-EJZvssxffGFr-NI6xaZnPrR08rB5eRp','geometry');

////////////////////////////////////////////////////////////////////////////////////
//Info about Study area// 
///////////////////////////////////////////////////////////////////////////////////
var region = ee.FeatureCollection('ft:1cO7rYgRmd5L_DCCanxgMXVwXBdd4HDSMRQ5T4D1O', 'geometry');
var Study_area = region.geometry().area().divide(1000 * 1000);
print('Study area (km2)', Study_area);

// create road mask
var roadMask = ee.Image.constant(1).int32();
var roadMask = roadMask.paint(Roads, 0);

//////////////////////////////////////////////////////////////////////////////////////
//Using the same Image for visualizing assessments//
//////////////////////////////////////////////////////////////////////////////////////
var Image1985 = ee.ImageCollection('LANDSAT/LT5_L1T_TOA')
  .filterDate('1985-01-01', '1986-01-01')

var median1985 = Image1985.median();
// clip and mask out roads
var clipped1985 = median1985.clip(region).updateMask(roadMask);
var vizParams1985 = {bands: ['B3', 'B2', 'B1'], min: 0, max: 0.3};
Map.addLayer(clipped1985, vizParams1985, 'Image1985');

/////////////////////////////////////////////////////////////////////////////////////////
//Image and Classification//
/////////////////////////////////////////////////////////////////////////////////////////
// var Image1985 = ee.ImageCollection('LANDSAT/LT5_L1T_TOA')//.select('B4', 'B3', 'B2')
//   .filterDate('1985-01-01', '1986-01-01')
// var median1985 = Image1985.median();
// var clipped1985 = median1985.clip(region);
var training = clipped1985.sample({
    region: region,
    scale: 30,
    numPixels: 5000})
    
////////////////////////////////
//Unsupervised classification//
////////////////////////////////
var clusterer = ee.Clusterer.wekaKMeans(7).train(training)
var result1985 = clipped1985.cluster(clusterer);

Map.addLayer(result1985.randomVisualizer(), {}, 'result1985');
Map.addLayer(ee.Image().paint(region, 0, 2),{},'region');
Map.centerObject(region);
