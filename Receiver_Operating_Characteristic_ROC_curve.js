/**
 * Receiver Operating Characteristic (ROC) curve for binary classification
 * source: https://groups.google.com/d/msg/google-earth-engine-developers/52ASlA15yLg/E3exyfyTGQAJ
 * original code by Guy Ziv
**/




// A random image
var ndvi = ee.Image("LANDSAT/LC8_L1T_TOA/LC80440342013106LGN01").normalizedDifference(['B5', 'B4']).rename('NDVI');
Map.addLayer(ndvi,{min:0, max:1}, "NDVI")

// Sample input points.
agri = ndvi.reduceRegions(agri,ee.Reducer.max().setOutputs(['ndvi']),30).map(function(x){return x.set('is_target',1);})
urban = ndvi.reduceRegions(urban,ee.Reducer.max().setOutputs(['ndvi']),30).map(function(x){return x.set('is_target',0);})
var combined = agri.merge(urban)

// Show NDVI of points
print(agri.aggregate_array('ndvi'),'Ag NDVI')
print(urban.aggregate_array('ndvi'),'Urban NDVI')

// Calculate the Receiver Operating Characteristic (ROC) curve
// -----------------------------------------------------------

// Chance these as needed
var ROC_field = 'ndvi', ROC_min = 0, ROC_max = 1, ROC_steps = 1000, ROC_points = combined

var ROC = ee.FeatureCollection(ee.List.sequence(ROC_min, ROC_max, null, ROC_steps).map(function (cutoff) {
  var target_roc = ROC_points.filterMetadata('is_target','equals',1)
  // true-positive-rate, sensitivity  
  var TPR = ee.Number(target_roc.filterMetadata(ROC_field,'greater_than',cutoff).size()).divide(target_roc.size()) 
  var non_target_roc = ROC_points.filterMetadata('is_target','equals',0)
  // true-negative-rate, specificity  
  var TNR = ee.Number(non_target_roc.filterMetadata(ROC_field,'less_than',cutoff).size()).divide(non_target_roc.size()) 
  return ee.Feature(null,{cutoff: cutoff, TPR: TPR, TNR: TNR, FPR:TNR.subtract(1).multiply(-1),  dist:TPR.subtract(1).pow(2).add(TNR.subtract(1).pow(2)).sqrt()})
}))
// Use trapezoidal approximation for area under curve (AUC)
var X = ee.Array(ROC.aggregate_array('FPR')), 
    Y = ee.Array(ROC.aggregate_array('TPR')), 
    Xk_m_Xkm1 = X.slice(0,1).subtract(X.slice(0,0,-1)),
    Yk_p_Ykm1 = Y.slice(0,1).add(Y.slice(0,0,-1)),
    AUC = Xk_m_Xkm1.multiply(Yk_p_Ykm1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0)
print(AUC,'Area under curve')
// Plot the ROC curve
print(ui.Chart.feature.byFeature(ROC, 'FPR', 'TPR').setOptions({
      title: 'ROC curve',
      legend: 'none',
      hAxis: { title: 'False-positive-rate'},
      vAxis: { title: 'True-negative-rate'},
      lineWidth: 1}))
// find the cutoff value whose ROC point is closest to (0,1) (= "perfect classification")      
var ROC_best = ROC.sort('dist').first().get('cutoff').aside(print,'best ROC point cutoff')

