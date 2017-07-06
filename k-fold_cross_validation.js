/*
K-fold cross validation
Source: Noel Gorelick https://groups.google.com/d/msg/google-earth-engine-developers/wyF83C1diPk/Ydl0b0L2AQAJ
*/

// From https://developers.google.com/earth-engine/classification

// Use these bands for prediction.
var bands = ['B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B10', 'B11'];

// Load an image over a portion of southern California, USA.
var image = ee.Image('LC8_L1T_TOA/LC80400372013318LGN00').select(bands);

// Load training polygons from a Fusion Table.
// The 'class' property stores known class labels.
var polygons = ee.FeatureCollection('ft:1vYn7-uO80vAVpZxi81yXzx55jgtztsZaLxG5TWYH');

// Get the values for all pixels in each polygon in the training.
var training = image.sampleRegions({
  // Get the sample from the polygons FeatureCollection.
  collection: polygons,
  // Keep this list of properties from the polygons.
  properties: ['class'],
  // Set the scale to get Landsat pixels in the polygons.
  scale: 30
})

// Create and apply 10 classifiers
var c = ee.List.sequence(1, 10).map(function(seed) {
  // Use a random 80% of the training data.
  var subsample = training.randomColumn("random", seed)
      .filter(ee.Filter.lt("random", 0.8));
  var classifier = ee.Classifier.cart().train(subsample, "class", bands);
  return image.classify(classifier);
})
c = ee.ImageCollection(c);

// Create a palette to display the classes.
var palette =['006400', '32CD32', 'EEE8AA',
              '8B4513', '98FB98', '00FA9A',
              '90EE90', '00008B', 'FF8C00',
              'ADFF2F', '808080'];

// Display the classification result and the input image.
Map.setCenter(-117.3, 33.30, 9);
Map.addLayer(image, {bands: ['B4', 'B3', 'B2'], max: 0.5, gamma: 2});

Map.addLayer(c, {min: 0, max: 10, palette: palette}, 'Vegetation Type');
Map.addLayer(c.reduce(ee.Reducer.variance()), {min: 0, max: 10}, 'Vegetation Type');