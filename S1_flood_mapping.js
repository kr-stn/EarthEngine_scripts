/*
Sentinel-1 based flood mapping
script from Tyler Erickson
https://docs.google.com/presentation/d/1GDr7mt658-UKo9hz4VWjuDMeBYWwwvs2R_mM3_pqQ5s/edit#slide=id.g14ee5af603_0_162
*/

// Chennai flooding, India, November 2015

function db(image) {
  var bands = image.select("..").bandNames();
  var bias = ee.Image.constant(bands.map(function(pol) {
    return image.get(ee.String(pol).cat('_log_bias'));
  }));
  var gains = ee.Image.constant(bands.map(function(pol) {
    return image.get(ee.String(pol).cat('_log_gain'));
  }));
  var toDecibels = image.addBands(image.select(bands).subtract(bias).divide(gains).float(), null, true);
  return toDecibels.addBands(image.select('angle').resample('bicubic'), null, true);
}

var before = db(ee.Image('COPERNICUS/S1_GRD_INT/S1A_IW_GRDH_1SDV_20151112T003120_20151112T003149_008564_00C241_37E8')).select(0);
var after = db(ee.Image('COPERNICUS/S1_GRD_INT/S1A_IW_GRDH_1SDV_20151124T003120_20151124T003149_008739_00C723_AB80')).select(0);
//var later = db(ee.Image('COPERNICUS/S1_GRD_INT/S1A_IW_GRDH_1SDV_20160111T003118_20160111T003147_009439_00DAE7_EF8F')).select(0);

var srtm = ee.Image('USGS/SRTMGL1_003');

before = before.updateMask(srtm.gt(0));
after = after.updateMask(srtm.gt(0));
//later = later.updateMask(srtm.gt(0));

//Map.setCenter(80.1, 12.98, 11);
Map.addLayer(before, {min:-30,max:0}, 'Nov 12 (before flooding)');
Map.addLayer(after, {min:-30,max:0}, 'Nov 24 (after flooding)');
//Map.addLayer(later, {min:-30,max:0}, 'Jan 11', 0);
Map.addLayer(after.subtract(before), {min:-10,max:10}, 'After - before', 0);

// Threshold smoothed radar intensities to identify "flooded" areas 
var SMOOTHING_RADIUS = 100;
var DIFF_UPPER_THRESHOLD = -3;
var NORMAL_WATER_THRESHOLD = 0.05; // Anything that occurs >5% of the time

var diff_smoothed = after.focal_median(SMOOTHING_RADIUS,'circle','meters')
    .subtract(before.focal_median(SMOOTHING_RADIUS,'circle','meters'));
Map.addLayer(
  diff_smoothed,
  {min:-10,max:10}, 'diff smoothed', 0);
var diff_thresholded = diff_smoothed.lt(DIFF_UPPER_THRESHOLD);
Map.addLayer(
  diff_thresholded.updateMask(diff_thresholded),
  {min:0,max:1, palette:"blue"}, 'potentially flooded areas (w/0 expected water removed) - red');
