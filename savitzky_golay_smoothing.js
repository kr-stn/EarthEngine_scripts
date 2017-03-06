// by Guido Lemoine https://groups.google.com/d/msg/google-earth-engine-developers/9Gskpw6PyYo/lEe7hwciCgAJ
// Savitzky Golay smoothing
// 
// Transcribed from:
//
// http://www2.geog.ucl.ac.uk/~plewis/eoldas/plot_directive/savitzky_golay.py
//
// Author: Guido Lemoine - EC JRC, 2017-02-23
//

// Get some data to smooth.
// MOD09A1 (8-day composite surface reflectance) for Fuentes, Andalucia (Spain)
// Derived from colum 7 and 8 of:
// http://www2.geog.ucl.ac.uk/~plewis/eoldas/data/FuentesAndalucia_MOD09A1.txt
//
// This would normally be a time-series extracted from your favourite image collection
var y = ee.List([ 0.2848061,  0.30228013,  0.34789697,  0.32501599,  0.39469027,  0.4377276,
  0.33893395,  0.37984496,  0.39857228,  0.39573634,  0.47152728,  0.47152728,
  0.47924113,  0.39227134,  0.32331224,  0.2087859,   0.20336943,  0.20721056,
  0.19288119,  0.18133762,  0.17329094,  0.16575934,  0.16575934,  0.1612529,
  0.15125293,  0.15,        0.15096154,  0.15008432,  0.15085739,  0.13942904,
  0.14469453,  0.15195531,  0.14524043,  0.14524043,  0.15950435,  0.15972414,
  0.15228758,  0.15082444,  0.15223881,  0.14943074,  0.18042813,  0.2026749,
  0.20156897,  0.19865571,  0.19865571,  0.23084913,  0.19461078,  0.183271,
  0.21911197,  0.25281271,  0.25281271,  0.29778934,  0.33450241,  0.3513862,
  0.34829884,  0.41832669,  0.4115899,   0.49730942,  0.35539881,  0.45935484,
  0.3550206,   0.3550206,   0.46144549,  0.50094928,  0.50684932,  0.50809492,
  0.54877014,  0.49391727,  0.61421935,  0.40859525,  0.32255083,  0.33121861,
  0.33121861,  0.28408357,  0.26169539,  0.20380048,  0.20922075,  0.21085336,
  0.19551364,  0.20337553,  0.19558499,  0.19014778,  0.18839836,  0.18839836,
  0.1738367,   0.17821782,  0.19377163,  0.17986366,  0.19295371,  0.22772277,
  0.17810897,  0.26148705,  0.20528087,  0.2055958,   0.2055958,   0.2309217,
  0.21856867,  0.23418424,  0.31344284,  0.42614933,  0.40538991,  0.47488038,
  0.40963139,  0.53891941,  0.69198966,  0.58185297,  0.65561044,  0.7715852,
  0.84103434,  0.74339454,  0.74779807,  0.74779807,  0.7285576,   0.70140628,
  0.69911504,  0.53225806,  0.47955936,  0.36809138,  0.3962766,   0.3330139,
  0.37059484,  0.39720646,  0.39720646,  0.2823741,   0.24439377,  0.22083614,
  0.22766784,  0.20806634,  0.21386403,  0.2324159,   0.21760138,  0.20263202,
  0.21859436,  0.21859436,  0.18293839,  0.19146184,  0.20522388,  0.21745949,
  0.23439667,  0.21584424,  0.19299674,  0.21705724,  0.24536465,  0.19491275,
  0.19491275,  0.18128964,  0.16930257,  0.17865676,  0.22205663,  0.26136758,
  0.24858757,  0.24618878,  0.30006398,  0.292764,    0.34330794,  0.5065312,
  0.4456338,   0.43773764,  0.36156187,  0.43247269,  0.40318627,  0.40318627,
  0.38701127,  0.38603033,  0.29321534,  0.2702588,   0.2668899,  0.36302411,
  0.44280763,  0.67062193,  0.72665348,  0.58686888,  0.58686888, 0.48899756,
  0.45064205,  0.30582524,  0.27057812,  0.22242446,  0.22719914,  0.21802227,
  0.2240672,  0.21699079,  0.21996584,  0.21996584,  0.20253918,  0.20034881,
  0.19817134,  0.18880811,  0.19576508,  0.1764432,   0.2200709,   0.23420847,
  0.22808958,  0.25047081,  0.25047081,  0.19158361,  0.21023766,  0.22650104,
  0.29181355,  0.32668781])

print(y.length())

var window_size = 11
var half_window = (window_size - 1)/2
var deriv = 0

var order = 2
var order_range = ee.List.sequence(0,order)
var k_range = ee.List.sequence(-half_window, half_window)

//b = np.mat([[k**i for i in order_range] for k in range(-half_window, half_window+1)])
var b = ee.Array(k_range.map(function (k) { return order_range.map(function(o) { return ee.Number(k).pow(o)})}))

print(b)

// m = np.linalg.pinv(b).A[deriv] 
var mPI = ee.Array(b.matrixPseudoInverse())
print(mPI)

var impulse_response = (mPI.slice({axis: 0, start: deriv, end: deriv+1})).project([1])
print(impulse_response)

//firstvals = y[0] - np.abs( y[1:half_window+1][::-1] - y[0] )
var y0 = y.get(0)
var firstvals = y.slice(1, half_window+1).reverse().map(
  function(e) { return ee.Number(e).subtract(y0).abs().multiply(-1).add(y0) }
)
print(firstvals)

//lastvals = y[-1] + np.abs(y[-half_window-1:-1][::-1] - y[-1])
var yend = y.get(-1)
var lastvals = y.slice(-half_window-1,-1).reverse().map(
  function(e) { return ee.Number(e).subtract(yend).abs().add(yend) }
)
print(lastvals)

// y = np.concatenate((firstvals, y, lastvals))
var y_ext = firstvals.cat(y).cat(lastvals)

print(y_ext.length())

// np.convolve( m, y, mode='valid')
var runLength = ee.List.sequence(0, y_ext.length().subtract(window_size))

var smooth = runLength.map(function(i) {
  return ee.Array(y_ext.slice(ee.Number(i), ee.Number(i).add(window_size))).multiply(impulse_response).reduce("sum", [0]).get([0])
})

print(smooth)

// Chart
var yValues = ee.Array.cat([y, smooth], 1);

var chart = ui.Chart.array.values(yValues, 0).setSeriesNames(['Raw', 'Smoothed']).setOptions(
  {
    title: 'Fuentes, Andalucia (ES)' + ' Window: ' + window_size + ' Order: ' + order, 
    hAxis: {title: 'Time (x 8 days)'}, vAxis: {title: 'MOD09A1 NDVI'},
    legend: null,
    series: { 
      0: { lineWidth: 0},
      1: { lineWidth: 2, pointSize: 0 }}
  })
print(chart)
