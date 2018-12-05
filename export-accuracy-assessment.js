/**
* Export Accuracy Assessment metrics to table
* - avoids errors in long running error matrix calculations in interactive mode
**/

// sample the training points
var reference = imageCol.sampleRegions({
  collection: referencePoints,
  properties: ["class"]
})

// split randomly into 70% train and 30% test
var ref_random = reference.randomColumn("random")

var train = ref_random.filter(ee.Filter.lt("random", 0.7))
var test = ref_random.filter(ee.Filter.gte("random", 0.7))

// create error matrix and accuracies
var testAcc = test.classify(classifier)
var confMat = testAcc.errorMatrix({
  actual: "class",
  predicted: "classification"})
// print("OA:", confMat.accuracy())
// print("PA:", confMat.producersAccuracy())
// print("UA:", confMat.consumersAccuracy())

// export accuracies as table
var accuracies = ee.FeatureCollection([
  ee.Feature(null, {
    "OA": confMat.accuracy(),
    "PA": confMat.producersAccuracy(),
    "UA": confMat.consumersAccuracy()
    })
  ])

Export.table.toDrive({
  collection: accuracies,
  description: "accuracy_metrics"
})