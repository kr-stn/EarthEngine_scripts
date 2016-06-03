/*
Gamma MAP Filter by Guido Lemoin
from: https://groups.google.com/d/msg/google-earth-engine-developers/a9W0Nlrhoq0/tnGMC45jAgAJ
*/

// GammaMap Speckle Filter conform

function toDB(image) { return image.log10().multiply(10.0); }

function GammaMap(image, enl, ksize) {
  // Cf. https://github.com/senbox-org/s1tbx/blob/master/s1tbx-op-sar-processing/src/main/java/org/esa/s1tbx/sar/gpf/filtering/SpeckleFilters/GammaMap.java
  // which implements Lopes et al, IGARSS 1990, 2409-2412.
  // See: https://www.researchgate.net/publication/224270891_Maximum_A_Posteriori_Speckle_Filtering_And_First_Order_Texture_Models_In_Sar_Images.
  // This is the equivalent of the getGammaMapValue() method
  
  // Convert image from dB to natural values
  var nat_img = ee.Image(10.0).pow(image.divide(10.0));

  // Square kernel, ksize should be odd (typically 3, 5 or 7)
  var weights = ee.List.repeat(ee.List.repeat(1,ksize),ksize);
  
  // ~~(ksize/2) does integer division in JavaScript
  var kernel = ee.Kernel.fixed(ksize,ksize, weights, ~~(ksize/2), ~~(ksize/2), false);

  // Get mean and variance
  var mean = nat_img.reduceNeighborhood(ee.Reducer.mean(), kernel);
  var variance = nat_img.reduceNeighborhood(ee.Reducer.variance(), kernel);

  // "Pure speckle" threshold
  var ci = variance.sqrt().divide(mean);  // square root of inverse of enl

  // If ci <= cu, the kernel lies in a "pure speckle" area -> return simple mean
  var cu = 1.0/Math.sqrt(enl)
  
  // If cu < ci < cmax the kernel lies in the low textured speckle area -> return the filtered value
  var cmax = Math.sqrt(2.0) * cu

  var alpha = ee.Image(1.0 + cu*cu).divide(ci.multiply(ci).subtract(cu*cu));
  var b = alpha.subtract(enl + 1.0)
  var d = mean.multiply(mean).multiply(b).multiply(b).add(alpha.multiply(mean).multiply(nat_img).multiply(4.0*enl));
  var f = b.multiply(mean).add(d.sqrt()).divide(alpha.multiply(2.0));
  
  // If ci > cmax do not filter at all (i.e. we don't do anything, other then masking)
  
  // Compose a 3 band image with the mean filtered "pure speckle", the "low textured" filtered and the unfiltered portions
  return toDB(mean.updateMask(ci.lte(cu))).addBands(toDB(f.updateMask(ci.gt(cu)).updateMask(ci.lt(cmax)))).addBands(image.updateMask(ci.gte(cmax)));
}

var caslav = ee.Geometry.Point(15.39597, 49.90934); // Center around the CZ city of Caslav

var collection = ee.ImageCollection('COPERNICUS/S1_GRD').filterMetadata('instrumentMode', 'equals', 'IW').
filter(ee.Filter.eq('transmitterReceiverPolarisation', 'VV')).select(['VV', 'angle']).filterBounds(caslav);

// Get some selections for a nice time stack
var img1 = ee.Image(collection.select(0).filterDate('2015-04-01', '2015-04-30').first());
var img2 = ee.Image(collection.select(0).filterDate('2015-05-01', '2015-05-31').first());
var img3 = ee.Image(collection.select(0).filterDate('2015-06-01', '2015-06-30').first());

Map.centerObject(caslav, 14);  // Zoom level 14 gets the 10m pixel spacing. Note how speckle filtering "blurs" lower resolution layers.

// GMAP filter each of the selected images. 
// ENL = 4.9 for IW GRD Full Resolution with 10x10 m spacing
// See: https://sentinel.esa.int/web/sentinel/user-guides/sentinel-1-sar/resolutions/level-1-ground-range-detected

var gmap1 = GammaMap(img1, 5, 7);
var gmap2 = GammaMap(img2, 5, 7);
var gmap3 = GammaMap(img3, 5, 7);

// Here are some example visualizations:
// Display partial filtering results separately
Map.addLayer(gmap1.select(0), {min:-25, max:0}, 'Mean Filtered', false);
Map.addLayer(gmap1.select(1), {min:-25, max:0}, 'GMAP Filtered', false);
Map.addLayer(gmap1.select(2), {min:-25, max:0}, 'Unfiltered', false);
// And assembled into one image:
Map.addLayer(gmap1.reduce(ee.Reducer.sum()), {min:-25, max:0}, 'Composed', false);

// Show the time stack as a composition
Map.addLayer(img1.select(0).addBands(img2.select(0)).addBands(img3.select(0)), {min:-25, max:0}, 'Original time series', false);
// idem, for GMAP filtered version
Map.addLayer(gmap1.reduce(ee.Reducer.sum()).addBands(gmap2.reduce(ee.Reducer.sum())).addBands(gmap3.reduce(ee.Reducer.sum())), {min:-25, max:0}, 'GMAP filtered time series', false);
// Van Gogh would have loved this!
