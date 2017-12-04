/*
Landsat-7 SLC-off gap-filling algorithm
by: Genadii Donchyts, based on adaption of USGS algorithm to GEE by Noel Gorelick
source: https://groups.google.com/d/msg/google-earth-engine-developers/GS3WfOsFqQo/qmZqS4hNEgAJ
*/


print(Map.getCenter())
Map.setCenter(-122.28, 38.14, 12)

var MIN_SCALE = 1/3;
var MAX_SCALE = 3;
var MIN_NEIGHBORS = 144;

/* Apply the USGS L7 Phase-2 Gap filling protocol, using a single kernel size. */
var GapFill = function(src, fill, kernelSize, upscale) {
  var kernel = ee.Kernel.square(kernelSize * 30, "meters", false)
  
  // Find the pixels common to both scenes.
  var common = src.mask().and(fill.mask())
  var fc = fill.updateMask(common)
  var sc = src.updateMask(common)
  Map.addLayer(common.select(0).mask(common.select(0)), {palette:['000000']}, 'common mask (both exist)', false)

  // Find the primary scaling factors with a regression.
  // Interleave the bands for the regression.  This assumes the bands have the same names.
  var regress = fc.addBands(sc)

  regress = regress.select(regress.bandNames().sort())

  var ratio = 5
  
  if(upscale) {
    var fit = regress
      .reduceResolution(ee.Reducer.median(), false, 500)
      .reproject(regress.select(0).projection().scale(ratio, ratio))
      .reduceNeighborhood(ee.Reducer.linearFit().forEach(src.bandNames()), kernel, null, false)
      .unmask()
      .reproject(regress.select(0).projection().scale(ratio, ratio))
  } else {
    var fit = regress
      .reduceNeighborhood(ee.Reducer.linearFit().forEach(src.bandNames()), kernel, null, false)
  }

  var offset = fit.select(".*_offset")
  var scale = fit.select(".*_scale")

  Map.addLayer(scale.select('B1_scale'), {min:-2, max:2}, 'scale B1', false)
  
  // Find the secondary scaling factors using just means and stddev
  var reducer = ee.Reducer.mean().combine(ee.Reducer.stdDev(), null, true)

  if(upscale) {
    var src_stats = src
      .reduceResolution(ee.Reducer.median(), false, 500)
      .reproject(regress.select(0).projection().scale(ratio, ratio))
      .reduceNeighborhood(reducer, kernel, null, false)
      .reproject(regress.select(0).projection().scale(ratio, ratio))

    var fill_stats = fill
      .reduceResolution(ee.Reducer.median(), false, 500)
      .reproject(regress.select(0).projection().scale(ratio, ratio))
      .reduceNeighborhood(reducer, kernel, null, false)
      .reproject(regress.select(0).projection().scale(ratio, ratio))
  } else {
    var src_stats = src
      .reduceNeighborhood(reducer, kernel, null, false)

    var fill_stats = fill
      .reduceNeighborhood(reducer, kernel, null, false)
  }

  var scale2 = src_stats.select(".*stdDev").divide(fill_stats.select(".*stdDev"))
  var offset2 = src_stats.select(".*mean").subtract(fill_stats.select(".*mean").multiply(scale2))

  var invalid = scale.lt(MIN_SCALE).or(scale.gt(MAX_SCALE))
  Map.addLayer(invalid.select(0).mask(invalid.select(0)), {palette:['550000']}, 'invalid1', false)
  scale = scale.where(invalid, scale2)
  offset = offset.where(invalid, offset2)

  // When all else fails, just use the difference of means as an offset.  
  var invalid2 = scale.lt(MIN_SCALE).or(scale.gt(MAX_SCALE))
  Map.addLayer(invalid2.select(0).mask(invalid2.select(0)), {palette:['552020']}, 'invalid2', false)
  scale = scale.where(invalid2, 1)
  offset = offset.where(invalid2, src_stats.select(".*mean").subtract(fill_stats.select(".*mean")))

  // Apply the scaling and mask off pixels that didn't have enough neighbors.
  var count = common.reduceNeighborhood(ee.Reducer.count(), kernel, null, true, "boxcar")
  var scaled = fill.multiply(scale).add(offset)
      .updateMask(count.gte(MIN_NEIGHBORS))

  return src.unmask(scaled, true)
}

var source = ee.Image("LANDSAT/LE7_L1T/LE70440342016075EDC00")
var fill = ee.Image("LANDSAT/LE7_L1T/LE70440342016027EDC00")

Map.addLayer(fill, {min:0, max:200, bands:["B7", "B5", "B2"]}, "fill", true)
Map.addLayer(source, {min:0, max:200, bands:["B7", "B5", "B2"]}, "destination", true)

var result = GapFill(source, fill, 10, false);
Map.addLayer(result, {min:0, max:200, bands:["B7", "B5", "B2"]}, "filled", true)

var result = GapFill(source, fill, 10, true);
Map.addLayer(result, {min:0, max:200, bands:["B7", "B5", "B2"]}, "filled (upscaled)", true)
