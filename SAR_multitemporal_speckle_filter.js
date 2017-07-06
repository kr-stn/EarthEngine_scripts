/***
 * Multiteporal speckle filter: image is the original image, images is the temporal collection of images
 * 
 * Version: 1.0
 * 
 * by Genadii Donchyts https://groups.google.com/d/msg/google-earth-engine-developers/umGlt5qIN1I/jQ4Scd_pAAAJ
 */
function multitemporalDespeckle(images, radius, units, opt_timeWindow) {
  var timeWindow = opt_timeWindow || { before: -3, after: 3, units: 'month' }
  
  var bandNames = ee.Image(images.first()).bandNames()
  var bandNamesMean = bandNames.map(function(b) { return ee.String(b).cat('_mean') })
  var bandNamesRatio = bandNames.map(function(b) { return ee.String(b).cat('_ratio') })
  
  // compute space-average for all images
  var meanSpace = images.map(function(i) {
    var reducer = ee.Reducer.mean()
    var kernel = ee.Kernel.square(radius, units)
    
    var mean = i.reduceNeighborhood(reducer, kernel).rename(bandNamesMean)
    var ratio = i.divide(mean).rename(bandNamesRatio)

    return i.addBands(mean).addBands(ratio)
  })

  /***
   * computes a multi-temporal despeckle function for a single image
   */
  function multitemporalDespeckleSingle(image) {
    var t = image.date()
    var from = t.advance(ee.Number(timeWindow.before), timeWindow.units)
    var to = t.advance(ee.Number(timeWindow.after), timeWindow.units)
    
    var meanSpace2 = ee.ImageCollection(meanSpace).select(bandNamesRatio).filterDate(from, to)
      .filter(ee.Filter.eq('relativeOrbitNumber_start', image.get('relativeOrbitNumber_start'))) // use only images from the same cycle
    
    var b = image.select(bandNamesMean)

    return b.multiply(meanSpace2.sum()).divide(meanSpace2.count()).rename(bandNames)
  }
  
  return meanSpace.map(multitemporalDespeckleSingle).select(bandNames)
}


/***
 * Removes low-entropy edges
 */
function maskLowEntropy(image) { 
  var bad = image.select(0).multiply(10000).toInt().entropy(ee.Kernel.circle(5)).lt(3.2)
  
  return image.updateMask(image.mask().multiply(bad.focal_max(5).not()))
} 


////////////////////////////////////////////////
//APPLY ON S1 COLLECTION 2015-2017 MALAYSIA////
//////////////////////////////////////////////
var START1 = ee.Date("2015-03-01");
var END1 = ee.Date("2017-05-31")
var pt = ee.Geometry.Point([117.39990234375,5.832293664675539])

var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
  .filterBounds(pt)
  .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
  .filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
  .filter(ee.Filter.eq('instrumentMode', 'IW'))
  .filterDate(START1,END1)
  //.map(maskLowEntropy);

print(s1.first())

var s1vv = s1.select(0)
var s1vh = s1.select(1)
  

// denoise images
var radius = 7 
var units = 'pixels'
var s1Denoised_vv = multitemporalDespeckle(s1vv, radius, units, { before: -12, after: 12, units: 'month' }) 

Map.centerObject(s1Denoised_vv,9)
Map.addLayer(ee.Image(s1Denoised_vv.first()),{min:-20,max:0})
