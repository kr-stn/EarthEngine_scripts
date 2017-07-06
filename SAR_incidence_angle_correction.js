/***
 * Incidence Angle Correction to Gamma0
 * 
 * by Guido Lemoine https://groups.google.com/forum/#!msg/google-earth-engine-developers/QCWykrLLvZ0/e_AC1v1ICAAJ
 */
var collection =  ee.ImageCollection('COPERNICUS/S1_GRD')
.filter(ee.Filter.eq('orbitProperties_pass', 'DESCENDING'))
.filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'HH'))
.filter(ee.Filter.eq('instrumentMode', 'IW'));

print(Math.PI/180.0);

function toGamma0(image) {
  return image.select(0).subtract(image.select('angle').multiply(Math.PI/180.0).cos().log10().multiply(10.0));
}

var before = collection.filterDate('2015-11-01', '2015-11-30').select(0).mean()
var after = collection.filterDate('2016-01-01', '2016-01-31').select(0).mean()

var before_gamma0 = collection.filterDate('2015-11-01', '2015-11-30').map(toGamma0).mean()
var after_gamma0 = collection.filterDate('2016-01-01', '2016-01-31').map(toGamma0).mean()

Map.setCenter(-74.39, 0.85);
Map.addLayer(before, {min:-30,max:0}, 'Sigma_0 Nov 2015');
Map.addLayer(after, {min:-30,max:0}, 'Sigma_0 Jan 2016');

Map.addLayer(before_gamma0, {min:-30,max:0}, 'Gamma_0 Nov 2015');
Map.addLayer(after_gamma0, {min:-30,max:0}, 'Gamma_0 Jan 2016');

