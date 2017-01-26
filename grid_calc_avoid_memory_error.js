/*
Calculate large area with regular grid
Avoid Memory Errors in GEE
Source: https://groups.google.com/d/msg/google-earth-engine-developers/lWHhvktjSos/yu1tCZQzAgAJ
*/

/***
 * Generates regular grid using given bounds, specified as geometry.
 */
var generateGrid = function(bounds, dx, dy) {
  var b = ee.List(bounds.coordinates().get(0));
  var xmin = ee.List(b.get(0)).get(0);
  var xmax = ee.List(b.get(1)).get(0);
  var ymin = ee.List(b.get(0)).get(1);
  var ymax = ee.List(b.get(2)).get(1);

  var xx = ee.List.sequence(xmin, xmax, dx)
  var yy = ee.List.sequence(ymin, ymax, dy)

  var cells = xx.map(function(x) {
    return yy.map(function(y) {
      var x1 = ee.Number(x).subtract(ee.Number(dx).multiply(0.5))
      var x2 = ee.Number(x).add(ee.Number(dx).multiply(0.5))
      var y1 = ee.Number(y).subtract(ee.Number(dy).multiply(0.5))
      var y2 = ee.Number(y).add(ee.Number(dy).multiply(0.5))
      
      var coords = ee.List([x1, y1, x2, y2]);
      var rect = ee.Algorithms.GeometryConstructors.Rectangle(coords);
      return ee.Feature(rect)
    })
  }).flatten();
  
  return ee.FeatureCollection(cells);
}

// ChangeDetection

/*var region = ee.FeatureCollection('ft:1OD2hOfMYyFHbQqFQIBb1VSXGdrjYIL8ACKqkSG2C','geometry')

Map.setCenter(7.603, 6, 7);
Map.addLayer(region);
*/

var region = geometry
var bounds = geometry.bounds()

var dx = 0.1
var dy = 0.1
var grid = generateGrid(bounds, dx, dy)
  .limit(100)
   .filterBounds(region);

Map.addLayer(grid)


var applyCloudScore = function(image) {
  var t = ee.Algorithms.Landsat.simpleCloudScore(image);
  var quality = t.select('cloud').lte(20);
  var maskedImage = image.mask().reduce('min').and(quality);
  return image.mask(maskedImage);
};

//addToMap(masked_image3,{},"L5_l7_L8");
// A function to add NDVI to an image with 'nir' and 'red' bands.
// This function can be applied to an individual image
// or it can be mapped over a collection to add NDVI to every image.
// (As with the map of applyCloudScore)
var addNDVI = function(image) {
  var ndvi = image.normalizedDifference(['nir', 'red']);
  return image.addBands(ndvi);
};

var collection1b = ee.ImageCollection('LANDSAT/LE7_L1T_TOA')
    .filterBounds(geometry)
    .filterDate('1999-01-01','2005-04-30')
    .filter(ee.Filter.calendarRange(270,365))
    .map(applyCloudScore)
    .select([0,1,2,3,4,6],["blue","green","red","nir","swir1","swir2"])
    ;

var masked_image1b = collection1b.select(['nir','swir1','red', 'green'])
                   .median()
                   .multiply(255)
                   .toUint8()
                   //.clip(region);

//addToMap(masked_image1b,{},"l7_only");
    
var collection1a = ee.ImageCollection('LANDSAT/LT5_L1T_TOA')
    .filterBounds(geometry)
    .filterDate('1999-01-01','2005-04-30')
    .filter(ee.Filter.calendarRange(270,365))
    .map(applyCloudScore)  
    .select([0,1,2,3,4,6],["blue","green","red","nir","swir1","swir2"])
    ;
    
var collection1 = ee.ImageCollection(collection1a.merge(collection1b));

var masked_image1 = collection1.select(['nir','swir1','red', 'green'])
                   .median()
                   .multiply(255)
                   .toUint8()
                   //.clip(region); 

var collection2a = ee.ImageCollection('LANDSAT/LC8_L1T_TOA')
    .filterBounds(geometry)
    .filterDate('2009-01-01','2015-04-30')
    
    .filter(ee.Filter.calendarRange(270,365))
    .map(applyCloudScore)
    .select([1,2,3,4,5,6],["blue","green","red","nir","swir1","swir2"])
    ;

var collection2 = ee.ImageCollection(collection1.merge(collection2a));

var masked_image2 = collection2.select(['nir','swir1','red', 'green'])
                   .median()
                   .multiply(255)
                   .toUint8()
                   //.clip(region); 

// combined masked product
var cloudArea1and2= masked_image1.mask().and(masked_image2.mask());

// apply the combined mask to both of the images
var masked_image11 = masked_image1.mask(cloudArea1and2);
var masked_image22 = masked_image2.mask(cloudArea1and2);

//Map.addLayer(masked_image22.select('nir', 'red', 'green'));
var features = ee.FeatureCollection("ft:1g6pewI94uiSxBs6dgCtI0bmikJmVaFG2uYm6tVad")
var classifier11 = masked_image11.trainClassifier({ 
  training_features: features,
  training_property: "class",
  classifier_name: "VotingSvm",
  "crs": "EPSG:4326",
        "crs_transform": [
          0.00008983152841195213,
          0,
          -180,
          0,
          -0.00008983152841195213,
          90]});

var classifier22 = masked_image22.trainClassifier({ 
  training_features: features,
  training_property: "class",
  classifier_name: "VotingSvm",
  "crs": "EPSG:4326",
        "crs_transform": [
          0.00008983152841195213,
          0,
          -180,
          0,
          -0.00008983152841195213,
          90]});
var result11 = masked_image11.classify(classifier11);
var result22 = masked_image22.classify(classifier22);

var palette = ["22e5ef","ff4217","4de41c","2b783b","fbff13"];
Map.addLayer(result11.clip(region), {palette: palette, min:1, max:5,"resolution": 10, format:"png"});
//Map.addLayer(result22, {palette: palette, min:1, max:5,"resolution": 10, format:"png"});
Map.addLayer(ee.Image().paint(region, 1, 1));
var nodata = -9999;
var Rfinal11 = result11.where(result11.mask().lte(0), nodata);
var Rfinal22 = result22.where(result22.mask().lte(0), nodata);
var gjson = JSON.stringify(region./*geometry().*/bounds().getInfo().coordinates);

/// Add reducer output to the Features in the collection.
//calculate the total area of each land cover type in hectare within the feature collections
//print(Rfinal22);
//Rfinal22 = Rfinal22.multiply(ee.Image.pixelArea()).divide(10000)

var ngasumFeatures = Rfinal22.multiply(ee.Image.pixelArea()).divide(10000).reduceRegions
                      ({
                      collection: grid,
                      reducer: ee.Reducer.sum(),
                      scale: 30,
                      });

print(ngasumFeatures.first());

// Export the FeatureCollection to a KML file.
Export.table.toDrive({
  collection: ngasumFeatures,
  description:'ND',
  fileFormat: 'KML'
});


