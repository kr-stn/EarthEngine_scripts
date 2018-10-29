/**
* Export each Image in ImageCollection with image data as name
* based on GIS.SE Answer: https://gis.stackexchange.com/a/300554/39299
**/

var size = collection.size().getInfo()
var collection_list = collection.toList(size)

for (var n=0; n<size; n++) {
  var image = ee.Image(collection_list.get(n))
  var date = ee.Date(image.get('system:time_start')).format('YYYY-MM-DD');
  date = date.getInfo();
  Export.image.toDrive({
    image: image,
    description: date,
    fileNamePrefix: date, // use date as export name
    folder: 'Output-Folder',
    scale: 10,
    region: exportRegion,
    maxPixels: 1e13,
  })
};