/*
DOY-Series-by-Regions aka. time-series over polygons
based on answered question by Nick Clinton: https://groups.google.com/forum/#!topic/google-earth-engine-developers/Ci5WK1VIqC4
mimicks the behaviour of Chart.image.doySeriesByRegion but allows direct export to CSV
*/

/*
example ROI - MKD
*/
var roi = /* color: 0B4A8B */ee.Geometry.Polygon(
        [[[104.39967317142975, 8.648797299726574],
          [104.97136816724105, 8.42750154669911],
          [105.44386722890897, 8.433739470974832],
          [106.66892316475673, 9.522314436594979],
          [107.25187226402818, 10.336446225915548],
          [106.80624398899499, 11.138468981755926],
          [104.38860737239793, 10.944315053122876]]]);

var regions = ee.FeatureCollection([poly1, poly2, poly3, poly4]);  // polygons to extract the time-series from

/*
IMAGE SELECTION
Sentinel-1 A, 2015, Descending
*/
// Load the Sentinel-1 ImageCollection.
var sentinel1 = ee.ImageCollection('COPERNICUS/S1_GRD');

// Filter VH, IW
var vh = sentinel1
  // Filter to get images with VV and VH dual polarization.
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
  // Filter to get images collected in interferometric wide swath mode.
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  // reduce to VH polarization
  .select('VH')
  // filter 10m resolution
  .filter(ee.Filter.eq('resolution_meters', 10));
// Filter to orbitdirection Descending
var vhDescending = vh.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'));
// Filter time 2015
var vhDesc2015 = vhDescending.filterDate(ee.Date('2015-01-01'), ee.Date('2015-12-31'));
// Filter to roi
var s1_mkd = vhDesc2015.filterBounds(regions);

// print(Chart.image.doySeriesByRegion({
//   imageCollection: s1_mkd,
//   bandName: "VH",
//   regions: regions,
//   regionReducer: ee.Reducer.mean(),
//   scale: 10
// }));


var days = ee.List.sequence(1, 365);

var means = ee.ImageCollection(days.map(function(day) {
  var images = s1_mkd.filter(ee.Filter.calendarRange(day, day));
  return images.mean().set({
    n: images.size(),
    doy: day
  });
})).filterMetadata('n', 'greater_than', 0);

var features = means.map(function(image) {
  // Get the image values onto the regions as properties.
  var reduction = image.reduceRegions({
    collection: regions, 
    reducer: ee.Reducer.mean(), 
    scale: 10, 
    crs: 'EPSG:4326'
  });
  // Get a list of names.
  var names = reduction.reduceColumns({
    reducer: ee.Reducer.toList(), 
    selectors: ['name'],
  }).get('list');
  // Get a list of means.
  var means = reduction.reduceColumns({
    reducer: ee.Reducer.toList(), 
    selectors: ['mean'],
  }).get('list');
  // Return a feature, using the lists to create a dictionary.
  return ee.Feature(null, ee.Dictionary.fromLists(names, means))
      .set('doy', image.get('doy'));
});

print(regions);

Export.table.toDrive({
  collection: features, 
  description: 'doySeriesByRegion', 
  fileFormat: 'CSV'
});


