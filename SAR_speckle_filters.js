/** Refined Lee Speckle Filter 
 * from https://code.earthengine.google.com/2ef38463ebaf5ae133a478f173fd0ab5
 * by Guido Lemoine 
 * 
 * img: ee.Image, S1 in natural units (not dB), single band?
 * 
 * Returns: S1 ee.Image with RL filter applied. 
 */
 
function RefinedLee(img) {
  // img must be in natural units, i.e. not in dB!
  // Set up 3x3 kernels 
  var weights3 = ee.List.repeat(ee.List.repeat(1,3),3);
  var kernel3 = ee.Kernel.fixed(3,3, weights3, 1, 1, false);

  var mean3 = img.reduceNeighborhood(ee.Reducer.mean(), kernel3);
  var variance3 = img.reduceNeighborhood(ee.Reducer.variance(), kernel3);

  // Use a sample of the 3x3 windows inside a 7x7 windows to determine gradients and directions
  var sample_weights = ee.List([[0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0], [0,1,0,1,0,1,0], [0,0,0,0,0,0,0], [0,1,0,1,0,1,0],[0,0,0,0,0,0,0]]);

  var sample_kernel = ee.Kernel.fixed(7,7, sample_weights, 3,3, false);

  // Calculate mean and variance for the sampled windows and store as 9 bands
  var sample_mean = mean3.neighborhoodToBands(sample_kernel); 
  var sample_var = variance3.neighborhoodToBands(sample_kernel);

  // Determine the 4 gradients for the sampled windows
  var gradients = sample_mean.select(1).subtract(sample_mean.select(7)).abs();
  gradients = gradients.addBands(sample_mean.select(6).subtract(sample_mean.select(2)).abs());
  gradients = gradients.addBands(sample_mean.select(3).subtract(sample_mean.select(5)).abs());
  gradients = gradients.addBands(sample_mean.select(0).subtract(sample_mean.select(8)).abs());

  // And find the maximum gradient amongst gradient bands
  var max_gradient = gradients.reduce(ee.Reducer.max());

  // Create a mask for band pixels that are the maximum gradient
  var gradmask = gradients.eq(max_gradient);

  // duplicate gradmask bands: each gradient represents 2 directions
  gradmask = gradmask.addBands(gradmask);

  // Determine the 8 directions
  var directions = sample_mean.select(1).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(7))).multiply(1);
  directions = directions.addBands(sample_mean.select(6).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(2))).multiply(2));
  directions = directions.addBands(sample_mean.select(3).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(5))).multiply(3));
  directions = directions.addBands(sample_mean.select(0).subtract(sample_mean.select(4)).gt(sample_mean.select(4).subtract(sample_mean.select(8))).multiply(4));
  // The next 4 are the not() of the previous 4
  directions = directions.addBands(directions.select(0).not().multiply(5));
  directions = directions.addBands(directions.select(1).not().multiply(6));
  directions = directions.addBands(directions.select(2).not().multiply(7));
  directions = directions.addBands(directions.select(3).not().multiply(8));

  // Mask all values that are not 1-8
  directions = directions.updateMask(gradmask);

  // "collapse" the stack into a singe band image (due to masking, each pixel has just one value (1-8) in it's directional band, and is otherwise masked)
  directions = directions.reduce(ee.Reducer.sum());  

  //var pal = ['ffffff','ff0000','ffff00', '00ff00', '00ffff', '0000ff', 'ff00ff', '000000'];
  //Map.addLayer(directions.reduce(ee.Reducer.sum()), {min:1, max:8, palette: pal}, 'Directions', false);

  var sample_stats = sample_var.divide(sample_mean.multiply(sample_mean));

  // Calculate localNoiseVariance
  var sigmaV = sample_stats.toArray().arraySort().arraySlice(0,0,5).arrayReduce(ee.Reducer.mean(), [0]);

  // Set up the 7*7 kernels for directional statistics
  var rect_weights = ee.List.repeat(ee.List.repeat(0,7),3).cat(ee.List.repeat(ee.List.repeat(1,7),4));

  var diag_weights = ee.List([[1,0,0,0,0,0,0], [1,1,0,0,0,0,0], [1,1,1,0,0,0,0], 
    [1,1,1,1,0,0,0], [1,1,1,1,1,0,0], [1,1,1,1,1,1,0], [1,1,1,1,1,1,1]]);

  var rect_kernel = ee.Kernel.fixed(7,7, rect_weights, 3, 3, false);
  var diag_kernel = ee.Kernel.fixed(7,7, diag_weights, 3, 3, false);

  // Create stacks for mean and variance using the original kernels. Mask with relevant direction.
  var dir_mean = img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel).updateMask(directions.eq(1));
  var dir_var = img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel).updateMask(directions.eq(1));

  dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel).updateMask(directions.eq(2)));
  dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel).updateMask(directions.eq(2)));

  // and add the bands for rotated kernels
  for (var i=1; i<4; i++) {
    dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
    dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), rect_kernel.rotate(i)).updateMask(directions.eq(2*i+1)));
    dir_mean = dir_mean.addBands(img.reduceNeighborhood(ee.Reducer.mean(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
    dir_var = dir_var.addBands(img.reduceNeighborhood(ee.Reducer.variance(), diag_kernel.rotate(i)).updateMask(directions.eq(2*i+2)));
  }

  // "collapse" the stack into a single band image (due to masking, each pixel has just one value in it's directional band, and is otherwise masked)
  dir_mean = dir_mean.reduce(ee.Reducer.sum());
  dir_var = dir_var.reduce(ee.Reducer.sum());

  // A finally generate the filtered value
  var varX = dir_var.subtract(dir_mean.multiply(dir_mean).multiply(sigmaV)).divide(sigmaV.add(1.0));

  var b = varX.divide(dir_var);

  var result = dir_mean.add(b.multiply(img.subtract(dir_mean)));
  return(result.arrayFlatten([['sum']]));
}


/**
 * GammaMap Speckle Filter conformation
 *
 * by Guido Lemoine see https://groups.google.com/forum/#!topic/google-earth-engine-developers/a9W0Nlrhoq0
 * Cf. https://github.com/senbox-org/s1tbx/blob/master/s1tbx-op-sar-processing/src/main/java/org/esa/s1tbx/sar/gpf/filtering/SpeckleFilters/GammaMap.java
 * which implements Lopes et al, IGARSS 1990, 2409-2412.
 * See: https://www.researchgate.net/publication/224270891_Maximum_A_Posteriori_Speckle_Filtering_And_First_Order_Texture_Models_In_Sar_Images.
 * This is the equivalent of the getGammaMapValue() method
 * 
 * image: A sentinel 1 ee.Image single band in linear (natural) scale
 * enl: 4.9 for IW GRD Full Resolution with 10x10 m spacing, See: https://sentinel.esa.int/web/sentinel/user-guides/sentinel-1-sar/resolutions/level-1-ground-range-detected
 * ksize: Size of kernel, ksize should be odd (typically 3, 5 or 7)
 * 
 * Returns: 3 band image in linear units with the mean filtered "pure speckle", the "low textured" filtered and the unfiltered portions
 * 
 * Example: image = GammaMap(image, 5, 7)
 */
 
function GammaMap(image, enl, ksize) {
  enl = enl || 5;
  ksize = ksize || 3;
  var nat_img = image;
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
  var cu = 1.0/Math.sqrt(enl);
  // If cu < ci < cmax the kernel lies in the low textured speckle area -> return the filtered value
  var cmax = Math.sqrt(2.0) * cu;
  var alpha = ee.Image(1.0 + cu*cu).divide(ci.multiply(ci).subtract(cu*cu));
  var b = alpha.subtract(enl + 1.0);
  var d = mean.multiply(mean).multiply(b).multiply(b).add(alpha.multiply(mean).multiply(nat_img).multiply(4.0*enl));
  var f = b.multiply(mean).add(d.sqrt()).divide(alpha.multiply(2.0));
  // If ci > cmax do not filter at all (i.e. we don't do anything, other then masking)
  // Compose a 3 band image with the mean filtered "pure speckle", the "low textured" filtered and the unfiltered portions
  var out = mean.updateMask(ci.lte(cu)).addBands(f.updateMask(ci.gt(cu).updateMask(ci.lt(cmax)))).addBands(image.updateMask(ci.gte(cmax)));
  return out.reduce(ee.Reducer.sum());
}

/**
 * Perona-Malik (anisotropic diffusion) convolution
 * 
 * by Gennadii Donchyts see https://groups.google.com/forum/#!topic/google-earth-engine-developers/a9W0Nlrhoq0
 * I(n+1, i, j) = I(n, i, j) + lambda * (cN * dN(I) + cS * dS(I) + cE * dE(I), cW * dW(I))
 * 
 * I: ee.Image single band, natural units
 * iter: Number of interations to apply filter
 * K: kernal size
 * opt_method: choose method 1 (default) or 2, DETAILS
 * 
 * Returns: single band ee.Image in natural units
 * 
 * Example: image = PeronaMalik(image, 10, 3.5, 1)
 */

function PeronaMalik(I, iter, K, opt_method) {
  iter = iter || 10;
  K = K || 3;
  method = opt_method || 1;
  // Define kernels
  var dxW = ee.Kernel.fixed(3, 3,
                           [[ 0,  0,  0],
                            [ 1, -1,  0],
                            [ 0,  0,  0]]);
  var dxE = ee.Kernel.fixed(3, 3,
                           [[ 0,  0,  0],
                            [ 0, -1,  1],
                            [ 0,  0,  0]]);
  var dyN = ee.Kernel.fixed(3, 3,
                           [[ 0,  1,  0],
                            [ 0, -1,  0],
                            [ 0,  0,  0]]);
  var dyS = ee.Kernel.fixed(3, 3,
                           [[ 0,  0,  0],
                            [ 0, -1,  0],
                            [ 0,  1,  0]]);
  var lambda = 0.2;
  var k1 = ee.Image(-1.0/K);
  var k2 = ee.Image(K).multiply(ee.Image(K));
  // Convolve
  for(var i = 0; i < iter; i++) {
    var dI_W = I.convolve(dxW);
    var dI_E = I.convolve(dxE);
    var dI_N = I.convolve(dyN);
    var dI_S = I.convolve(dyS);
  // Combine using choosen method
    switch(method) {
      case 1:
        var cW = dI_W.multiply(dI_W).multiply(k1).exp();
        var cE = dI_E.multiply(dI_E).multiply(k1).exp();
        var cN = dI_N.multiply(dI_N).multiply(k1).exp();
        var cS = dI_S.multiply(dI_S).multiply(k1).exp();
        I = I.add(ee.Image(lambda).multiply(cN.multiply(dI_N).add(cS.multiply(dI_S)).add(cE.multiply(dI_E)).add(cW.multiply(dI_W))));
        break;
      case 2:
        var cW = ee.Image(1.0).divide(ee.Image(1.0).add(dI_W.multiply(dI_W).divide(k2)));
        var cE = ee.Image(1.0).divide(ee.Image(1.0).add(dI_E.multiply(dI_E).divide(k2)));
        var cN = ee.Image(1.0).divide(ee.Image(1.0).add(dI_N.multiply(dI_N).divide(k2)));
        var cS = ee.Image(1.0).divide(ee.Image(1.0).add(dI_S.multiply(dI_S).divide(k2)));
        I = I.add(ee.Image(lambda).multiply(cN.multiply(dI_N).add(cS.multiply(dI_S)).add(cE.multiply(dI_E)).add(cW.multiply(dI_W))));
        break;
    }
  }
  return I;
};

