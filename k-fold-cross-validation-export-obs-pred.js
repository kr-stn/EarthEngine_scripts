/*

== k-fold cross-validation implementation by Devin Routh ==
Source: https://groups.google.com/d/msg/google-earth-engine-developers/Dyphj4exIH8/6iq3lwqaCQAJ
Script: https://code.earthengine.google.com/e0bd2992c08ec1a26c31a9fdea5cfc59

This implementation of k-fold cross-validation accepts a feature collection of sample points
with a property of interest then models that property with a chosen classifier/regressor. 
It exports a CSV of every sampled point's observed value and predicted fold value.
*/

// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Prepare example data

// Work with Switzerland's geometry
var switzerlandGeo = lsib.filter(ee.Filter.inList('country_na', ['Switzerland'])).geometry();
// print('Switzerland',switzerlandGeo);
Map.centerObject(switzerlandGeo, 7);

// Create an example feature collection of points
var exampleFC = ee.FeatureCollection.randomPoints(switzerlandGeo, 100).randomColumn('PoI');
// print('Example FC', exampleFC);
Map.addLayer(exampleFC, {}, 'Example Samples');

// Grab some satellite data for the area of interest
// print('NBAR 3 Year Mosaic',nbar3Year);
var switzerlandImage = ee.Image(nbar3Year.filterBounds(switzerlandGeo).filterMetadata('system:index', 'equals', '2016')
                       .toList(1)
                       .get(0))
                       .clip(switzerlandGeo);
// print('Switzerland Image',switzerlandImage);
// Map.addLayer(switzerlandImage, {}, 'Composite Image Clipped', false);




// ——————————————————————————————————————————————————————————————————————————————————————————————————
// Input the explicit parameters for the future function

var inputtedFeatureCollection = exampleFC;

var imageToClassify = switzerlandImage;

var k = 5;

var classifierOfChoice = ee.Classifier.randomForest(10).setOutputMode('REGRESSION');

var propertyToPredictAsString = 'PoI';

var scaleToSample = 10000;



var kFoldCrossValidation = function(inputtedFeatureCollection, imageToClassify, k, classifierOfChoice, propertyToPredictAsString, scaleToSample) {
	/*
	Arguments:
	inputtedFeatureCollection: an ee.FeatureCollection() of sample points object with a property of interest
	imageToClassify: the image used to classify/regress the point samples
	k: the number of folds
	classifierOfChoice: the classifier/regressor of choice
	propertyToPredictAsString: the name of the property to predict as a string object
	scaleToSample: the scale at which to sample the image
	*/
	
	// ———————————————————————————————————————————————————————————————
	// The sections below are the function's code, beginning with
	// preparation of the inputted feature collection of sample points


	var collLength = inputtedFeatureCollection.size();
	// print('Number of Sample Points',collLength);

	var sampleSeq = ee.List.sequence(1, collLength);
	// print('Sample Sequence',sampleSeq);

	var inputtedFCWithRand = inputtedFeatureCollection.randomColumn('Rand_Num', 42).sort('Rand_Num').toList(collLength);
	// print('Total FC with Random Column',inputtedFCWithRand);

	// Prep the feature collection with random fold assignment numbers
	var preppedListOfFeats = sampleSeq.map(function(numberToSet) {
		return ee.Feature(inputtedFCWithRand.get(ee.Number(numberToSet).subtract(1))).set('Fold_ID', ee.Number(numberToSet));
	});
	// print('Prepped FC', preppedListOfFeats);




	// ———————————————————————————————————————————————————————————————
	// This section divides the feature collection into the k folds


	var averageFoldSize = collLength.divide(k).floor();
	// print('Average Fold Size',averageFoldSize);

	var remainingSampleSize = collLength.mod(k);
	// print('Remaining Sample Size', remainingSampleSize);

	var foldSequenceWithoutRemainder = ee.List.sequence(0, k - 1).map(function(fold) {
		var foldStart = ee.Number(fold).multiply(averageFoldSize).add(1);
		var foldEnd = ee.Number(foldStart).add(averageFoldSize.subtract(1));
		var foldNumbers = ee.List.sequence(foldStart, foldEnd);
		return ee.List(foldNumbers);
	});
	// print('Fold Sequence Without Remaining Samples',foldSequenceWithoutRemainder);

	var remainingFoldSequence = ee.List.sequence(ee.Number(ee.List(foldSequenceWithoutRemainder.get(foldSequenceWithoutRemainder.length().subtract(1))).get(averageFoldSize.subtract(1))),
		ee.Number(ee.List(foldSequenceWithoutRemainder.get(foldSequenceWithoutRemainder.length().subtract(1))).get(averageFoldSize.subtract(1))).add(ee.Number(remainingSampleSize).subtract(1)));
	// print('Remaining Fold Sequence',remainingFoldSequence);

	// This is a list of lists describing which features will go into each fold
	var listsWithRemaindersAdded = foldSequenceWithoutRemainder.zip(remainingFoldSequence).map(function(list) {
		return ee.List(list).flatten();
	});
	// print('Lists with Remainders Added',listsWithRemaindersAdded);

	var finalFoldLists = listsWithRemaindersAdded.cat(foldSequenceWithoutRemainder.slice(listsWithRemaindersAdded.length()));
	// print('Final Fold Lists Formatted',finalFoldLists);

	var mainFoldList = ee.List.sequence(0, k - 1);
	// print('Main Fold List',mainFoldList);


	// Compute the collected training data
	var trainingData = mainFoldList.map(function(foldNumber) {
		var listWithoutFold = finalFoldLists.get(foldNumber);
		var foldListOfLists = ee.FeatureCollection(preppedListOfFeats).filter(ee.Filter.inList('Fold_ID', listWithoutFold).not()).toList(collLength);
		return foldListOfLists;
	});
	// print('Training Data Folds', trainingData);


	// Compute the validation folds
	var validationData = mainFoldList.map(function(foldNumber) {
		var listWithoutFold = finalFoldLists.get(foldNumber);
		var foldListOfLists = ee.FeatureCollection(preppedListOfFeats).filter(ee.Filter.inList('Fold_ID', listWithoutFold)).toList(collLength);
		return foldListOfLists;
	});
	// print('Validation Data Folds', validationData);




	// ———————————————————————————————————————————————————————————————
	// Train the data and retrieve the values at the sample points


	// Classify the images based on the training folds
	var classifiedImages = mainFoldList.map(function(foldNumber) {
		var trainingFold = imageToClassify.sampleRegions(ee.FeatureCollection(ee.List(trainingData.get(foldNumber))));
		var trainedClassifier = classifierOfChoice.train(trainingFold, propertyToPredictAsString);
		var classifiedImages = imageToClassify.classify(trainedClassifier).rename(ee.String(propertyToPredictAsString).cat('_Classification'));
		return classifiedImages;
	});
	// print('Classified Images', classifiedImages);


	// Retrieve the validation data from the validation folds
	var validationResults = mainFoldList.map(function(foldNumber) {
		var imageToSample = ee.Image(classifiedImages.get(foldNumber));
		var validationFoldSamples = ee.List(validationData.get(foldNumber)).map(function(feat) {
			return ee.Feature(feat).set('Fold_Number', foldNumber);
		});
		var validationResults = imageToSample.sampleRegions({
			collection: ee.FeatureCollection(validationFoldSamples).select([propertyToPredictAsString, 'Fold_Number', 'Fold_ID', 'Sample_Num']),
			scale: scaleToSample
		}).toList(collLength);
		return validationResults;
	});
	// print('Validation Results',validationResults);

	var validationResultsFlattened = ee.FeatureCollection(ee.List(validationResults.flatten()));
	// print('Validation Results Flattened and Formatted',validationResultsFlattened);

	return validationResultsFlattened;

};


var kFoldCVResults = kFoldCrossValidation(inputtedFeatureCollection, imageToClassify, k, classifierOfChoice, propertyToPredictAsString, scaleToSample);
// print('k-Fold Cross Validation Results', kFoldCVResults);

// Export the results
Export.table.toDrive(kFoldCVResults);
