// Mixture Tuned Match Filtering (MTMF) Classification (MTMF_V.1.0)
// Source: Lindsi Seegmiller & Devin (UHPSI Yale) - https://groups.google.com/d/msg/google-earth-engine-developers/aGVcwWZ6WWg/MPxf2N4NXh8J

/*This script is maintained by the UHPSI Lab (http://highplainsstewardship.com/) at Yale University's School of Forestry and Environmental 
Studies. It performs the Mixture Tuned Matched Filtering (MTMF) classification—an endmember based classification.

****Important note: This script requires a significant level of GEE processing power. I.e. It will sometimes return a 'timeout' error.
If this occurs, wait a few minutes then run the script again.*/



/*-------------------------------------------------------------------*/
// MTMF Process Overview
/*-------------------------------------------------------------------*/

/* Introduction:
For detailed background on MTMF, see: ftp://popo.jpl.nasa.gov/pub/docs/workshops/98_docs/8.pdf and/or
http://link.springer.com/article/10.1007/s101090100071

Though MTMF is normally applied to hyperspectral imagery, we have adapted this algorithm to use custom timeseries stacks of Landsat images
since current GEE hyperspectral data is limited.

The MTMF algorithm itself has two main inputs: an image and an endmember (i.e. a spectral signature collected from a spectral library, the 
field/lab, or a training region from the image). The algorithm returns two output images: a Matched Filtering score and a Mixture Tuning 
score (otherwise known as an Infeasibility Score).  

The Matched Filtering score represents how closely a pixel matches the endmember on a 0 to 1 range, where 0 is least like the endmember and 
1 indicates a strong match. Conceptuallly, this score also represents relative subpixel abundance of the endmember in each pixel, with the 
decimal value between 0 and 1 translating to a subpixel abundance percentage, e.g. an MF score of 0.23 would equate to a predicted subpixel 
endmember abundance of ≈23%, though realistically this exact relationship is not guaranteed. Note: though it is mathematically possible to 
compute MF scores that are <0 or >1, this occurrence is rare and usually indicates low spectral variance in the data. (Values <0 or >1 do not 
allow for the normal subpixel abundance interpretation.)  A general rule for MF scores that will detect a landocver is anything above the 
background distribution of MF scores across the image.

The Infeasibility Score, derived from the mixture tuning process, ranges from 0 to an indefinite maximum value. Mathematically, infeasibility 
scores are the geometric distance from a pixel's spectra to the target spectra in transformed vector space. The likelihood of a pixel's false 
positive classification increases as the infeasibility increases. Therefore, pixels with a high MF score and a low infeasibility score are 
those most likely to contain the endmember.
*/




/*-------------------------------------------------------------------*/
// MTMF Algorithm Table of Contents
/*-------------------------------------------------------------------*/

/*
1.  User Defined Options...................................................(lines 70-220)
	   1.1. Define the Study Area..........................................(lines 81-98)
	   1.2. Choose Input Data..............................................(lines 99-122)
       1.3. Spectral Subset Option.........................................(lines 123-146)
	   1.4. Band Selection for Deriving the Shift Difference Area..........(lines 147-163)
	   1.5. Define Endmember...............................................(lines 164-204)
       1.6. Define the Infeasibility Score Threshold.......................(lines 205-220)
2.  Formatting Reserves (i.e. palettes)....................................(lines 221-245)
3.  Image Preparation......................................................(lines 246-400)
4.  Homogenous Region Calculation and Selection............................(lines 401-500)
5.  Perform the Shift Difference Calculation on the Homogenous Region......(lines 501-529)
6.  Finalize the MNF Transformation........................................(lines 530-608)
7.  Display the MNF bands and chart the eigenvalues........................(lines 609-634)
8.  Transform the Endmember into MNF Space.................................(lines 635-659)
9.  Derive the MF Scores...................................................(lines 660-691)
10. Derive Infeasibility Scores............................................(lines 692-731)
Addendum 1: Optional Charts................................................(lines 732-817)
Addendum 2: Optional Context...............................................(lines 818-End)
*/




/*-------------------------------------------------------------------*/
//Section 1: User Defined Options
/*-------------------------------------------------------------------*/

// Choose location to display in playground
Map.setCenter(-106.54251,44.56938, 12);

// Choose Style of background map
// Map.setStyle('satellite');


/*--------------------------------------------------------*/
// Section 1.1 Define the Study Area

// ****If you would like to import your own polygon from a fusion table, define it here...
var importedStudyArea = ee.FeatureCollection('ft:1GxT2Q22KIGDjLFY1J11IX8lTAQPIoNyvBsG2fX0');

// ****If you would you like to draw your own polygon, enter the coordinates of the vertices below...
var drawnStudyArea = ee.FeatureCollection(ee.Feature(ee.Geometry.Polygon(
                            [[-106.5120, 44.5683],
                             [-106.5065, 44.5684],
                             [-106.5066, 44.5657],
                             [-106.5124, 44.5657]])));

// ****Choose study area variable
var studyarea = importedStudyArea; // Choose either importedStudyArea or drawnStudyArea (as above)
// Map.addLayer(studyarea, {opacity:0}, 'Study Area', false);


/*--------------------------------------------------------*/
// Section 1.2 Choose Input Data

// ****Choose data from the GEE Data Catalog or load your own data from MapsEngine****

// If using a single image...
//		- Insert ID for a single image of your study area
var singleImage =  ee.Image('SAMPLES/HYPERION_SAMPLE/EO1H0210402010195110KF');

// To create a timeseries / a collection of images...
//		- Insert ID from GEE catalog and apply your desired filter dates
//		- N.B. We've selected the median pixel from each collection to filter out cloud covered pixels
var winter = ee.ImageCollection('LANDSAT/LC8_L1T_8DAY_TOA').filterBounds(studyarea).filterDate('2013-12-21', '2014-03-20').median();
var spring = ee.ImageCollection('LANDSAT/LC8_L1T_8DAY_TOA').filterBounds(studyarea).filterDate('2014-03-21', '2014-06-20').median();
var summer = ee.ImageCollection('LANDSAT/LC8_L1T_8DAY_TOA').filterBounds(studyarea).filterDate('2014-06-21', '2014-09-20').median();
var fall   = ee.ImageCollection('LANDSAT/LC8_L1T_8DAY_TOA').filterBounds(studyarea).filterDate('2014-09-21', '2014-12-20').median();

// Define the list of images on which you would like to perform the analysis
var imagecollectionlist = [winter,spring,summer,fall]; //[winter,spring,summer,fall];  or [singleImage];

// ****Input the known resolution of you dataset (in meters)***
var resolution = ee.Number(30);


/*--------------------------------------------------------*/
// Section 1.3 Spectral Subset Option
/* 
On which band range(s) would you like to perform the transformation?
    Define them, pairwise (inclusive), in the array below.

Ideally, all bands from an image would be used. However, if you're performing the analysis on imagery with many bands, 
(e.g. hyperspectral data) consider subsetting the data to lessen the computational intensity of the algorithm.

E.g.    [[1,10]] would select bands 1-10;
		
        [[2,5],
        [8,12],
        [16,20]] would select bands 2-5,8-12, and 16-20;
        
        [[1,1],
        [2,2],
        [3,3]] would select bands 1, 2, and 3;

*/

var brarray =  [[1,7]];


/*--------------------------------------------------------*/
// Section 1.4 Band Selection for Shift Difference Area
/*
Below is a separate band subset selection array used to subset bands for use in the shift difference area derivation.
Ideally, the shift difference calculation would be performed using all of the selected bands from above, but given the computational 
intensity of the calculation within GEE the script times-out if it is run on more than a few bands. The current suggestion is to select 
the true color bands. (Most analysts performing an MNF transformation would select a shift difference area by visually inspecting 
the image with these bands; as such, the true color bands for LandSat 8 appear below as the default values.)

If you would like to make changes, define them in a pairwise fashion (inclusive) in the array below.
*/
  
var noisebrarray = [[2,2],
                    [3,3],
                    [4,4]];


/*--------------------------------------------------------*/
// Section 1.5 Define Endmember

// Non-Image Based Endmembers
  // We provide options for field/lab-collected endmembers in addition to image-based endmembers. Though we do not yet 
  // include a pixel purity index to select the purest pixels for image-based endmember selection, we hope to include 
  // this in the future.

// ****If using a an image-based endmember (from a training region)...input 1 below
// ****If using a custom endmember....................................input 2 below

var endmemberchoice = 1;
// ****If you chose 1, proceed to line 179. If you chose 2, proceed to line 197.


// If you would like to import your own polygon from a fusion table, define it here...
var importedTrainingRegion = ee.FeatureCollection('ft:1zsmCtvfmAag_0A27MwXkEA6e3474yUm3uEp_oUIp');

// If you would you like to draw your own polygon to generate an endmember, enter the coordinates of the vertices below...
var drawnTrainingRegion = ee.FeatureCollection(ee.Feature(ee.Geometry.Polygon(
                                                [[-106.5120, 44.5683],
                                                 [-106.5065, 44.5684],
                                                 [-106.5066, 44.5657],
                                                 [-106.5124, 44.5657]])));

// ****Choose training region variable as indicated above
var trainingregion = importedTrainingRegion;  // Choose either importedTrainingRegion or drawnTrainingRegion (as above)


// ****If you chose 2...
// Input the reflectance values of the endmember in the list below. Be sure to match the number and order 
// of the input data bands from the imagery or the algorithm will not operate correctly.

var customEndmember = ee.Array([0.1,0.2,0.3,0.4,0.5,0.6,0.7, 	  // Endmember reflectance values at each band from first image
                       			0.1,0.2,0.3,0.4,0.5,0.6,0.7, 	  // Endmember reflectance values at each band from next image
                       		    0.1,0.2,0.3,0.4,0.5,0.6,0.7, 	  // Etc.
                       		    0.1,0.2,0.3,0.4,0.5,0.6,0.7,]);   // Etc.
// Note: the number of formatted rows in this list should correspond to the number of images being used; the number of values in each 
// formatted line should correspond to the number of bands selected for the analysis.


/*--------------------------------------------------------*/
// Section 1.6 Define the Infeasibility Score Threshold

// What's your desired infeasibility score threshold?
      /*This number may vary greatly between different data and classifications. The default below corresponds with 
      the default image and endmember inputs. Typically, the threshold can range from close to zero to ≈20. The UHPSI 
      lab is in the midst of developing an automatic threshold selection algorithm, which would operate regardless of 
      the data inputs and without any additional user knowledge, to help achieve the best results in identifying presence 
      and abundance of the endmember. Until this algorithm is completed, adjust the infeasibility threshold according to the results
      that are masked (displayed in the corresponding layer after the script has been run).*/

var userinfthreshold = 0.50;




/*-------------------------------------------------------------------*/
// Section 2: Formatting Reserves
/*-------------------------------------------------------------------*/
// Preferred color schemes can be designed here for later use

var paletteRMS = ['3366FF','000033','ffffff','3366CC','000000'];

var palette_blue2purp = ['ff00ff','006eff','00ffd0','459619'];

var MFpalette = ['8c2a04','800000', 'ff0000', 'ffA500','ffff00', '808000','008000','00ff00'];




////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
///////////////////////NO USER INPUT AFTER THIS POINT///////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////




/*-------------------------------------------------------------------*/
// Section 3: Image Preparation
/*-------------------------------------------------------------------*/

var collection = ee.ImageCollection.fromImages(imagecollectionlist);
// Map.addLayer(collection, {}, 'Input Data', true);

                               
// This function performs the band range selection using the arrays defined in the section above.
var bandrangecat = function(inputarray){
  
  var openlist = [];
  
  var numofranges = inputarray.length-1;
  
  for (var i = 0; i <= numofranges; i++){
    
    var start = inputarray[i][0];
    var end = inputarray[i][1];
    
    for (var j = start; j <= end; j++){
      openlist.push(j); 
    }
}
return openlist};

// Use the helper function from above to form a concatenated list of image bands.
var catbands = bandrangecat(brarray);

// Format the concatenated list of image bands as an array.
var catbandsarray = ee.Array(catbands).subtract(1).toList();

// Use the helper function from above to form a concatenated list of noise bands.
var catnoisebands = bandrangecat(noisebrarray);

// Format the concatenated list of noise bands as an array.
var catnoisebandsarray = ee.Array(catnoisebands).subtract(1).toList();


/*--------------------------------------------------------*/
// Subset and clip the input data

var bandsCollection = collection.map(
  function(chosenimage){
// Spectrally subset input data
var originalImage = chosenimage.select(catbandsarray).clip(studyarea.geometry());
  return originalImage;
  }
  );

// Use a map function to format a list of the band names for the image
var bandList = ee.List.sequence(1,ee.List(imagecollectionlist).length());
var images = bandList.map(function(n) {
  return ee.String('Image ').cat(ee.Number(n).int());
});

// var ic = ee.ImageCollection("LANDSAT/LC8_L1T_8DAY_RAW")
var list = bandsCollection.toList(30);

var rename_bands = function (img) {
  img = ee.Image(img);
  var names = img.bandNames();
  var prefix = ee.String(img.get("system:index")).cat("_");
  var new_names = names.map(function(b) {
    return prefix.cat(b); });
  return img.select(names, new_names);
};

var endList = list.map(rename_bands);

var cat = function(a, b) {
  return ee.Image(b).addBands(a);
};

var originalImage = ee.Image(endList.slice(1).iterate(cat, endList.get(0)));
// Map.addLayer(originalImage,{},"Original Image");

var numberofbands = originalImage.bandNames().length();


/*--------------------------------------------------------*/
// Subset and clip the noise input data

var noiseCollection = collection.map(
  function(noiseimage){
// Spectrally subset input data
var noiseImage = noiseimage.select(catnoisebandsarray).clip(studyarea.geometry());
  return noiseImage;
  }
  );

// Use a map function to format a list of the band names for the image
var noisebandList = ee.List.sequence(1,ee.List(imagecollectionlist).length());
var noiseimages = noisebandList.map(function(n) {
  return ee.String('Image ').cat(ee.Number(n).int());
});

var noiselist = noiseCollection.toList(30);

var noise_rename_bands = function (img) {
  img = ee.Image(img);
  var names = img.bandNames();
  var prefix = ee.String(img.get("system:index")).cat("_");
  var new_names = names.map(function(b) {
    return prefix.cat(b); });
  return img.select(names, new_names);
};

var noiseendList = noiselist.map(noise_rename_bands);

var noisecat = function(a, b) {
  return ee.Image(b).addBands(a);
};

var SubsetNoiseImage = ee.Image(noiseendList.slice(1).iterate(cat, noiseendList.get(0)));


/*--------------------------------------------------------*/
// Subset and clip the endmember data

// Spectral subset of each endmember image in the input collection
var endmemberCollection = collection.map(
  function(emimage){
var emImage = emimage.select(catbandsarray).clip(trainingregion.geometry());
  return emImage;
  }
  );

var endmemberlist = endmemberCollection.toList(30);

var endmember_rename_bands = function (img) {
  img = ee.Image(img);
  var names = img.bandNames();
  var prefix = ee.String(img.get("system:index")).cat("_");
  var new_names = names.map(function(b) {
    return prefix.cat(b); });
  return img.select(names, new_names);
};

var endmemberendList = endmemberlist.map(endmember_rename_bands);

var noisecat = function(a, b) {
  return ee.Image(b).addBands(a);
};

var imageEnd = ee.Image(endmemberendList.slice(1).iterate(cat, endmemberendList.get(0)));

var imageEndArray = imageEnd.reduceRegion('mean', trainingregion.geometry(), resolution).toArray();

// Call on the user’s choice of whether to use field or image-based endmember.
var finalprep = ee.Algorithms.If(endmemberchoice==1,imageEndArray,customEndmember);




/*-------------------------------------------------------------------*/
// Section 4: Homogenous Region Calculation and Selection
/*-------------------------------------------------------------------*/

// Format a kernel to use when finding the homogenous area
var square_kernel = ee.Kernel.square(resolution.multiply(3), "meters");

// Find standard deviation for each pixel and its determined neighborhood
var stdDev = SubsetNoiseImage.reduceNeighborhood(ee.Reducer.stdDev(), square_kernel);

// Compute the quadratic mean (root mean square / RMS) of the neighborhood standard deviation through all bands for each pixel
// and then sum these values for each pixel
var RMS = stdDev.multiply(stdDev).reduce(ee.Reducer.sum()).divide(SubsetNoiseImage.bandNames().length()).sqrt();

// Find and store the minimum and maximum variance values (and their range) within the area of interest
var RMSDict = RMS
  .reduceRegion({
  reducer: ee.Reducer.minMax(),
  geometry: studyarea.geometry(), 
  scale: resolution
});

var dictrmsmax = ee.Number(RMSDict.get('sum_max'));
var dictrmsmin = ee.Number(RMSDict.get('sum_min'));
var dictrange = dictrmsmax.subtract(dictrmsmin);


/*--------------------------------------------------------*/
// Find the area with the lowest variance

// Display the quadratic mean layer using the computed minimum and maximum
var RMS_vis = RMS.visualize({min:dictrmsmin, max:dictrmsmax, palette:palette_blue2purp});
// Map.addLayer(RMS_vis,{},'RMS Full Range');

// Define the threshold of how much variance is acceptable for consideration for a shift difference area
var desiredpercentage = 0.5;
var percentofrange = dictrange.multiply(desiredpercentage);
var bottompercent = dictrmsmin.add(percentofrange);
var threshold = RMS.select(['sum']).lt(bottompercent);

// Display pixels that have variance below the defined threshold
var lowRMS = threshold.mask(threshold);
// Map.addLayer(lowRMS, {min:0, max:1, palette:palette_blue2purp}, 'Pixels with low RMS', false);


/*--------------------------------------------------------*/
// Make each area an island

// Define the kernel used in the connectedComponents() call
var kernel_fixed = ee.Kernel.fixed(3, 3,[[1,1,1],
                                        [1,0,1],
                                        [1,1,1]]);

// Connect all pixels that meet the threshold defined above
var connected = lowRMS.connectedComponents(kernel_fixed,256);

// Determine the minimum number of pixels in the areas of interest
var pixelmin = ee.Algorithms.If(numberofbands.lte(50),ee.Number(50),numberofbands);

// Compute the number of connected pixels in each island
var count = connected.connectedPixelCount(ee.Array(pixelmin).multiply(4), true);

// Reproject the layer and disregard all areas below the minimum pixel threshold
var precount = count.reproject(
  originalImage.projection().crs(),
  null,
  resolution).gt(ee.Number(pixelmin));

// Run a mask to leave only the islands of interest then restore the bands
var countFV = precount.mask(precount);
var RTV = countFV.addBands(countFV);

// Turn each island into a vector feature and filter out islands that do not
// meet the minimum area requirement
var islandsprep = RTV.reduceToVectors({
  reducer: ee.Reducer.first(),
  geometry: studyarea.geometry(), 
  geometryType: 'polygon',
  scale: resolution, 
  bestEffort: true 
  });

var islandsWithArea = islandsprep.map(function(f) {
return f.set('area', f.geometry().area(5))});

var islands = islandsWithArea.filterMetadata('area', 'greater_than', resolution.multiply(resolution).multiply(numberofbands));


/*--------------------------------------------------------*/
// Sum each region's variance then sort the regions

//Find the total variance within each island and choose the island with the least variance
var buffvariance = RMS.reduceRegions(islands, ee.Reducer.sum(), resolution);

// Select the buffered area with the lowest variance to get the shift difference area
var buffvarImage = buffvariance.limit(1, 'sum', true);




/*-------------------------------------------------------------------*/
// Section 5: Perform the Shift Difference Calculation
/*-------------------------------------------------------------------*/

// Clip the image to the computed shift difference area
var kernelarea = originalImage.clip(buffvarImage.geometry());

// Define kernels that link a pixel to its neighbors immediately above and to the left of it
var kernel_left = ee.Kernel.fixed(3, 3, [[0,0,0],
                                        [1,0,0],
                                        [0,0,0]]);

var kernel_up   = ee.Kernel.fixed(3, 3, [[0,1,0],
                                        [0,0,0],
                                        [0,0,0]]);


// Create a layer stack of neighboring pixel values in order to perform math between pixel values
var kernelimage_left = kernelarea.neighborhoodToBands(kernel_left);
var kernelimage_up = kernelarea.neighborhoodToBands(kernel_up);
var diff_left = kernelimage_left.subtract(kernelarea);
var diff_up = kernelimage_up.subtract(kernelarea);

// Find average difference between pixels for the whole shift difference area
var diff = diff_left.add(diff_up).divide(2).clip(kernelarea.geometry());




/*-------------------------------------------------------------------*/
// Section 6: Finalize the MNF Transformation
/*-------------------------------------------------------------------*/

// Find the covariance matrix of the finalized shift difference area
var covardict = diff.toArray().reduceRegion(ee.Reducer.covariance(), null, resolution, null, null, false, 800000000);

// Convert the covariance matrix into an array
var noisecovariancematrix = ee.Array(covardict.get('array'));

// Decompose the matrix into eigenvalues and eigenvectors
var eigendecomplist = noisecovariancematrix.eigen();


/*--------------------------------------------------------*/
// MNF Process Required Matrices

// Use the results of the decomposition to formulate the required matrices for the subsequent mathematics
var eigenvalues = eigendecomplist.slice(1, 0, 1);
var eigenvectors = eigendecomplist.slice(1, 1);
var matrixr = eigenvalues.sqrt().pow(-1).matrixToDiag();
var matrixcmnf = eigenvalues.pow(-1).matrixToDiag();


/*--------------------------------------------------------*/
// Noise-whiten the dataset

// Convert the image to an array
var arrayimage = originalImage.toArray();

// Find the mean value of the bands in the whole image
var meanimage = originalImage.reduceRegion('mean', studyarea.geometry(), resolution, null, null, false, 800000000);

// Make an array from the image’s band means for each band
var meanarray = ee.Array(meanimage.values());

// Mean correct the image
var meancenteredimage = arrayimage.subtract(meanarray);

// Multiply the mean centered image by the noise eigenvectors then scale the data by the noise standard deviation values
var nwarrayimage = meancenteredimage.arrayRepeat(1,1).arrayTranspose()
                    .matrixMultiply(eigenvectors.transpose())
                    .matrixMultiply(matrixr);

// Derive the covariance matrix from the noise whitened image
var nwcovardict = nwarrayimage.arrayProject([1]).reduceRegion(ee.Reducer.covariance(), studyarea.geometry(), resolution, null, null, false, 800000000);

// Eigendecompose the covariance matrix
var nwcovariancematrix = ee.Array(nwcovardict.get('array'));
var nweigendecomplist = nwcovariancematrix.eigen();

// Retrieve the eigenvalues and eigenvectors for each MNF transformed band
var nweigenvectors = nweigendecomplist.slice(1, 1);
var nweigenvalues = nweigendecomplist.slice(1, 0, 1);

// Finalize the MNF Transformation by multiplying the second eigenvector matrix by the noise-whitened data
var mnfdata = nwarrayimage.matrixMultiply(nweigenvectors.transpose());

// **End of the MNF Transformation**

var mnfcovardict = mnfdata.arrayProject([1]).reduceRegion(ee.Reducer.covariance(), null, resolution, null, null, false, 3000000000);
var mnfcovariance = ee.Array(mnfcovardict.get('array'));
// print(mnfcovariance);
var mnfeigendecomp = mnfcovariance.eigen();
var mnfeigenvalues = mnfeigendecomp.slice(1, 0, 1);

// Use a map function to retrieve the band names for the image
var bl = ee.List.sequence(1, numberofbands, 1);
var fbands = bl.map(function(n) {
  return ee.String('Band ').cat(ee.Number(n).int());
});

// Flatten the array image back into a normal image and add the results to the map
var mnfimage = mnfdata.arrayFlatten([['MNF Transformed'],fbands]," ");
// Map.addLayer(mnfimage, {min:0, max:10}, "MNF Transformed Data");




/*-------------------------------------------------------------------*/
// Section 7: Display MNF bands and chart the eigenvalues
/*-------------------------------------------------------------------*/
 
var eigenValueArray = ee.Array(mnfeigenvalues).repeat(0,1);

var charty = Chart.array.values(eigenValueArray, 0, bl).setSeriesNames(["Eigen Values"]);
charty = charty.setOptions({
  title: 'Eigenvalues For MNF Bands',
  hAxis: {
    title: 'MNF Bands'
  },
  vAxis: {
    title: 'Eigenvalue'
  },
  lineWidth: 1,
  pointSize: 4,
  series: {
    0: {color: 'darkgreen'}
  }
});
print(charty);




/*-------------------------------------------------------------------*/
// Section 8: Transform the Endmember into MNF Space
/*-------------------------------------------------------------------*/

/*Note: the endmember array and the mean array must be adjusted so as to have 
the appropriate dimensions in order for the linear algebra to operate correctly.*/

// Make the unidimensional endmember array a two dimensional array.
var endmember = ee.Array(finalprep).repeat(1,1);

//Mean center the endmember
var meancenteredendmember = endmember.subtract(meanarray.repeat(1,1));

//Noise whiten the endmember
var nwendmember = meancenteredendmember
                    .transpose()
                    .matrixMultiply(eigenvectors.transpose())
                    .matrixMultiply(matrixr);

//Finalize the MNF transformation by multiplying the endmember array with the noise-whitened image eigenvectors
var targetspectra = nwendmember.matrixMultiply(nweigenvectors.transpose()).transpose();




/*-------------------------------------------------------------------*/
// Section 9: Derive MF Scores
/*-------------------------------------------------------------------*/

//Find the covariance matrix of the MNF transformed data
var mnfcovardict = mnfdata.toArray().arrayProject([1])
                  .reduceRegion(ee.Reducer.covariance(), 
                  studyarea.geometry(), resolution, null, null, false, 800000000);

//Decompose the matrix into eigenvalues and eigenvectors 
var mnfcovariancematrix = ee.Array(mnfcovardict.get('array'));
var mnfeigendecomplist = mnfcovariancematrix.eigen();
var mnfeigenvalues = mnfeigendecomplist.slice(1, 0, 1);

//Derive the diagonal matrix of MNF eigenvalues for the MF calculation
var matrixcmnf = mnfeigenvalues.pow(-1).matrixToDiag();


// Perform the final calculations to compute MF scores at each pixel
var mfscores =  mnfdata.matrixMultiply(matrixcmnf
                          .matrixMultiply(targetspectra)
                          .divide(targetspectra.transpose()
                            .matrixMultiply(matrixcmnf)
                            .matrixMultiply(targetspectra)
                            .get([0,0])));

Map.addLayer(mfscores.arrayProject([0]).arrayFlatten([["MF Score"]]), 
          {min:-1, max: 1, palette:MFpalette}, "MF Scores");




/*-------------------------------------------------------------------*/
// Section 10: Derive Infeasibility Scores for each pixel
/*-------------------------------------------------------------------*/

// Perform the calculations to compute Infeasibility scores at each pixel
var inffinal = mnfdata.subtract(mfscores.matrixMultiply(targetspectra.transpose()))
                  .matrixMultiply(mnfdata.subtract(mfscores.matrixMultiply(targetspectra.transpose()))
                  .arrayTranspose())
                  .sqrt()
                  .arrayProject([0])
                  .arrayFlatten([["Infeasibility"]])
                  .clip(studyarea.geometry())
                  .divide(mfscores.matrixMultiply(mnfeigenvalues.sqrt().subtract(
                  ee.Array.identity(numberofbands)
                  .matrixDiagonal())
                  .transpose())
                  .multiply(-1)
                  .add(mnfeigenvalues.sqrt().transpose()).pow(2).matrixMultiply(mfscores.matrixMultiply(mnfeigenvalues.sqrt().subtract(
                  ee.Array.identity(numberofbands)
                  .matrixDiagonal())
                  .transpose())
                  .multiply(-1)
                  .add(mnfeigenvalues.sqrt().transpose()).pow(2).arrayTranspose())
                  .sqrt()
                  .arrayProject([0])
                  .arrayFlatten([[" "]])
                  .clip(studyarea.geometry()));

Map.addLayer(inffinal, {min:0, max:0.2, palette:['b6f430','0c1744']}, "Infeasibility Scores", false);

// Threshold out high infeasibility scores, which indicate a potential false positive
var infThreshold = inffinal.gt(userinfthreshold);

// Create a mask to cover all of the false positives
var lowInf = infThreshold.mask(infThreshold);
Map.addLayer(lowInf, {min:0, max:1, palette:['b6f430','491010']}, 'Pixels deemed False Positives');




/*--------------------------------------------------------*/
// Addendum 1: Optional Charts
/*--------------------------------------------------------*/

/*This section takes sample points from different landcover types around the study site and plots their spectral profiles onto 
a chart alongside the profiles of the image- or custom-endmember options.  The charts only show bands used in the 
classification after the image has been spectrally subset.  In the future, these spectral profiles could be averages of 
several points or the average reflectance values of polygonal training regions either drawn in real time or uploaded from 
field-collected shapefiles.*/ 

// Create random points across study area (default)...
var randomPoints = ee.FeatureCollection.randomPoints(studyarea, 3);
//Map.addLayer(randomPoints, null, 'Random Chart Points');

// Manually select points to chart....
//		N.B. To manually select points from certain locations in the study site, click the inspector, click on a point on the map,
//		and copy and paste the coordinates from the console into the three lines below.
var landcoverOne = ee.Feature(ee.Geometry.Point(-106.5184, 44.6161),{'label': 'One'});
var landcoverTwo = ee.Feature(ee.Geometry.Point(-106.5083, 44.5747),{'label': 'Two'});
var landcoverThree = ee.Feature(ee.Geometry.Point(-106.5060, 44.5777),{'label': 'Three'});

// Cast the sample points into a Feature Collection.
var manualPoints = ee.FeatureCollection([landcoverOne, landcoverTwo, landcoverThree]);
//Map.addLayer(manualPoints, null, 'Maual Chart Points');

//****Choose chart points variable
var chartPoints = randomPoints; // Choose either randomPoints or manualPoints

// Make a list of reflectance values of the points
var collectionList = [originalImage, originalImage];
var chartCollection = ee.ImageCollection.fromImages(collectionList);
var info = chartCollection.getRegion(chartPoints, resolution);
// print(info);

// Format the data into lists in order to chart values pulled from the image with values from
// the endmember feature collection.
var bandList = ee.List(info.get(0)).slice(4);
// print('Band Names', bandList);

var wavelengthList=  ee.List.sequence(1, bandList.length());
var wavelengthArray = ee.Array(wavelengthList).repeat(1,1);
// print('Wavelength List', wavelengthArray);

var oneList = ee.List(info.get(5)).slice(4);
var oneArray = ee.Array(oneList).repeat(1,1);
// print('Landcover one', oneArray);

var twoList = ee.List(info.get(1)).slice(4);
var twoArray = ee.Array(twoList).repeat(1,1);
// print('Landcover two', twoArray);

var threeList = ee.List(info.get(3)).slice(4);
var threeArray = ee.Array(threeList).repeat(1,1);
// print('Landcover three', threeArray);

// Concatenate the lists of each cover type and cast them into an array.
var arraysconcat = ee.Array.cat([oneArray,twoArray,threeArray,endmember],1);
// print("Concatenated Arrays", arraysconcat);

// Chart the values.
var arrayChart = Chart.array.values(
    arraysconcat,0, wavelengthArray).setSeriesNames(["landcoverOne","landcoverTwo","landcoverThree","Endmember"]);
arrayChart = arrayChart.setOptions({
  title: 'Spectral Profiles at three points in the study area',
  hAxis: {
    title: 'Stacked Image Bands'
  },
  vAxis: {
    title: 'Reflectance Value'
  },
  lineWidth: 2,
  pointSize: 1,
  series: {
    0: {color: 'darkgreen'},
    1: {color: 'lightgreen'},
    2: {color: 'lightblue'},
    3: {color: 'red'},
  }
});
print(arrayChart);
print('If you would like to manually select the');
print('location of the above points, see line 742.');




/*-------------------------------------------------------------------*/
// Addendum 2: Optional Context
/*-------------------------------------------------------------------*/

// Insert and display option contextual polygons, such as an outline of the study area, training regions used for
// endmember selection, or ground truth plots.

// Paint an outline of the study area
var paintImage = ee.Image(0).mask(0);
Map.addLayer(paintImage.paint(studyarea, '3300ff', 2), null, 'Outline of Study Area');

// Optional display of the training regions used for image based endmember
Map.addLayer(trainingregion, {opacity:0}, 'Endmember Training Region(s)', false);