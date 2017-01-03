// export metadata for each image in a collection to a table

var collection = ee.ImageCollection('COPERNICUS/S1_GRD').sort('system:index', false);

var info = collection.map(function(image) {
  return ee.Feature(image)
    .select(['system:index'], null, false);
});

print(info)

Export.table.toDrive(info, "Sentinel-1_sceneIDs")
