// Global Urban Extent from Landsat
// by Dr. Paolo Gamba
// https://groups.google.com/d/msg/google-earth-engine-developers/guLCR1NvNnI/wQfARABvBgAJ

// Global script multi years 2.0

// ====================================== //
//          Parameters to be set          //
// ====================================== //

// General options 
var area = "Center Asia";             // the name of the region in "Global Shape Table":
                                      //   North America, Center South America, 
                                      //   North South America, South South America,
                                      //   Europe, North Africa, Center South Africa, 
                                      //   Center Africa, Souht Africa Oceania
                                      //   Russia Japan, Center Asia, India, South Est Asia
                                      //   Indonesia, Indochina
                                      //
var convex_hull = false;              // apply the convex hull to the polygon of the chosen area   
                                      // NB: it must be true for Russia Japan and Oceania
                                      //
 
var country_name =  "Turkey";     // the name of selected country in Google "Countries of the World" table 
                                      // (set "" if you want to use the entire area instead of this country alone)

var province_name = "";               // selected province of Indonesia
                                      // (set "" if you want to use the entire Indonesia or China, not use for other countries!)

var center_on = "Istanbul";            // Name of city on which center the zoom
                                      // (set "" if you want to zoom on entire area)
  

var year = 2015;                      // starting year of the collection
var number_of_years =30;             // total number of years to analyze (MAX 30)
var step = 10;                         // step progress (e.g. 1 year in 1 year, 2 years in 2 years, ecc.)
var collection_type = "greenest";     // greenest or standard or simplecomposite
var sensor = "L8";                    // L5, L7, L8 or L45 (only before 1995!)
var cloud_cover = 1;                  // % of cloud cover
var waterfilter = true;               // enable/disable water filter in classification  
var zoom = 7;                         // level of zoom (center_on automatically set zoom+

// NDVI options
var mask_ndvi = false;                // enable/disable the ndvi mask
var th_ndvi_high = 0.5;               // 1st threshold for ndvi, put at zero all points in classification over this value
var th_ndvi_low = -0.5;               // 2st threshold for ndvi, put at zero all points in classification under this value

// Elevation options
var mask_slope = false;               // enable/disable the slope mask
var th_slope = 10;                    // threshold for slope in degrees, put at zero all points in classification over this value
var mask_dem = false;                 // enable/disable the slope mask
var th_dem = 2000;                    // threshold for slope in degrees, put at zero all points in classification over this value
var use_geometry = false;             // if false apply dem mask to all image, if true only inside the rectangle
var dem_geometry = ee.Geometry.Rectangle(106.67450,-6.79826,  107.08649,-7.11452);

// Morphology options
var morphology_on = false;             // enable/disable morphology
var operator = 'Window.min';          // 'Window.min' -> erode; 'Window.max' -> dilate
var radius1 = 400;                    // radius of the kernel closing/opening
var radius2 = 50;                     // radius of final closing;
var kernelType = 'circle';            // 'circle', 'square', 'cross', 'plus', 'octagon' or 'diamond'
var units = 'meters';                 // units of measure: 'meters' or 'pixels'
var iterations = 1;

var class_or_flag = true;             // enable/disable the new and method correction
var class_morph_radius = 7;

// Ground Truth
var GT_enable = false;                // enable/disable ground truth
var GT_region = 'Southeast Asia';     // the name of the region in Universe of cities Table:
                                      //   Eastern Asia & Pacific
                                      //   Southeast Asia
                                      //   Western Asia
                                      //   South & Central Asia
                                      //   Europe & Japan
                                      //   Northern Africa
                                      //   Sub-Saharan Africa
                                      //   Land Rich Developed Count (north america)
                                      //   Latin America & the Carib

// Classifier parameters
var ts_type = 0;                      // set the type of training set to use: 
                                      //    0 -> fusion table(s) IMPORTANT! GO TO LINE 1081 TO SET WHICH FUSION TABLES TO USE
                                      //    1 -> globcover random points
                                      //    2 -> universe of cities random points

var multiclassifier = false;          // false for single classification true for three classifiers
var multi_random = false;              // if true generate 3 random sets instead of one using the seeds of the next line
                                      // (WORKS ONLY FOR ts_type = 2)
var seeds = new Array(0,1,2);    
                                      
var classifiers = new Array(5,9,6);   // CHOOSE CLASSIFIER(S): (IMPORTANT! if multiclassifier is false only the first one is used)
                                      //    0 = "FastNaiveBayes"
                                      //    1 = "GmoMaxEnt" 
                                      //    2 = "Winnow"
                                      //    3 = "MultiClassPerceptron"
                                      //    4 = "Pegasos"
                                      //    5 = "Cart"
                                      //    6 = "RifleSerialClassifier" (aka Random Forest)
                                      //    7 = "IKPamir"
                                      //    8 = "VotingSvm"
                                      //    9 = "MarginSvm"

var compute_area = false;              // compute area of classified data
var area_scale = 300;                 // scale factor for area computation

// RANDOM POINTS TRAINING SET PARAMETERS
var num_points = 500;                 // num points to generate

// Globcover random points parameters
var lng = -48.90564;                  // coordinates of the quad
var lat = -0.890311;
var radius1 = 500;                    // radius of the kernel
var kernelType1 = 'square';           //'circle', 'square', 'cross', 'plus', 'octagon' or 'diamond'


// Universe of cities paramters:
// load universe of cities polygons (NOT CHANGE THIS LINE!)
var cities_table = ee.FeatureCollection('ft:1pQ-PrIEGrYa2Y3v9tsN1xwfYuqRIqOoDPARgpwzS');

// Choose the city or the cities to use
var selectedCities = cities_table.filter(ee.Filter.eq('MAIN_CITY', 'Istanbul')); // use this line only if there is one city!
/*var selectedCities = cities_table.filter(ee.Filter.or(ee.Filter.eq('MAIN_CITY', 'Kunming'), // use this command lines if there are more then one city
                                                      ee.Filter.eq('MAIN_CITY', 'Yuxi'),
                                                      ee.Filter.eq('MAIN_CITY', 'Qujing')));
*/
var use_all_cities = true;              // set true to use all the cities of the current provice 
                                        // instead of the selected ones

// ====================================== //
//          Loading basic data            //
// ====================================== //

// LOAD POLYGONS
// find area in the world
var shapes = ee.FeatureCollection("ft:1rYMVQMw3hTr8IC2d3Ad8nHzHmQy8iBJCqAN20l_O");
var filter = shapes.filter(ee.Filter.eq('Area', area));

// Find Countries in the world
var countries = ee.FeatureCollection('ft:1tdSwUL7MVpOauSgRzqVTOwdfy17KDbw-1d9omPw');
var country = countries.filter(ee.Filter.eq('Country', country_name));


// Find provinces in the selected country
var province = "";
var provinces_table = "";
if(country_name === "Indonesia")
{
  // find province of Indonesia
  provinces_table = ee.FeatureCollection('ft:1ep1h4bOMUOEg0jwjmmn78T-L32zLbILZotS2lwUC');
  province = provinces_table.filter(ee.Filter.eq('name', province_name));
}
else if(country_name === "China")
{
  // Find Province of China
  provinces_table = ee.FeatureCollection('ft:1h7DGU8yXMYqULLM3F4AsvLPOXiR5WTRswSgWLeHH');
  province = provinces_table.filter(ee.Filter.eq('NAME_1', province_name));
}

// load main polygon
var choosen_zone = (province==="") ? ((country_name === "") ? filter : country) : province ;
var polygon1 = choosen_zone.geometry();

if(convex_hull===true && (choosen_zone === filter))
  polygon1 = polygon1.convexHull();

// classifier types
var classifier_array = [ee.Classifier.naiveBayes(), ee.Classifier.gmoMaxEnt(), ee.Classifier.winnow(), 
                        ee.Classifier.perceptron(), ee.Classifier.pegasosLinear(),
                        ee.Classifier.cart(), ee.Classifier.randomForest(),
                        ee.Classifier.ikpamir(), ee.Classifier.svm(), ee.Classifier.svm("Margin")];
                        
// classifier names
var classifier_names = ["NaiveBayes", "GmoMaxEnt", "Winnow", "MultiClassPerceptron", "PegasosLinear",
                         "Cart", "RandomForest", "IKPamir", "Svm", "MarginSvm"];
                        
                        

// load elevation data
if(mask_slope===true || mask_dem===true)
	var dem = ee.Image("CGIAR/SRTM90_V4");

// Load ground truth data
if(GT_enable===true)
{
  var GT_regions = ee.FeatureCollection('ft:1pQ-PrIEGrYa2Y3v9tsN1xwfYuqRIqOoDPARgpwzS');
  var GT_selectedRegions = GT_regions.filter(ee.Filter.eq('REGION', GT_region));
}


if(use_all_cities === true)
{
  /*
  // Universe of cities paramters:
  // Join the two collection on their geometries if they're within 2km.
  var joinFilter = ee.Filter.intersects('geometry', null, 'geometry', null);
  var selectedCities = ee.Join.simple().apply(cities_table, province, joinFilter);
  */
  
  // Choose the city or the cities to use
  var allCities = cities_table.filter(ee.Filter.eq('COUNTRY', country_name)); 
  var allProvinceCities = allCities.map(function(f) {
      return f.set("Inside",
          ee.Algorithms.If((f.geometry()).containedIn(polygon1), true, false));
  });
  selectedCities = allProvinceCities.filterMetadata('Inside', 'equals', true);

}

// check for incorrect parameters
if(ts_type!==2)
  multi_random = false;
  
if(sensor==="L45")
  collection_type = "standard";
  

// color palette for classification
var palette_list = new Array( {palette: '000000, ff0000'},
                              {palette: '000000, ffff00'},
                              {palette: '000000, 00ff00'},
                              {palette: '000000, ff00ff'},
                              {palette: '000000, 00ffff'},
                              {palette: '000000, FFA500'},
                              {palette: '000000, 0000ff'},
                              {palette: '000000, 800000'},
                              {palette: '000000, 8A2BE2'},
                              {palette: '000000, FA8072'},
                              {palette: '000000, 32CD32'},
                              {palette: '000000, F4A460'},
                              {palette: '000000, 1E90FF'},
                              {palette: '000000, F0E68C'},
                              {palette: '000000, 228B22'},
                              {palette: '000000, FFD700'},
                              {palette: '000000, E6E6FA'},
                              {palette: '000000, A0522D'},
                              {palette: '000000, FFC0CB'},
                              {palette: '000000, 66CDAA'},
                              {palette: '000000, FF8C00'},
                              {palette: '000000, 9932CC'},
                              {palette: '000000, 7FFF00'},
                              {palette: '000000, 7FFF00'},
                              {palette: '000000, CD853F'},
                              {palette: '000000, FAEBD7'},
                              {palette: '000000, DDA0DD'},
                              {palette: '000000, 808000'},
                              {palette: '000000, FFDAB9'},
                              {palette: '000000, 4169E1'});


// task name 
var task_name = ((country_name === "") ? area : country_name) + "_from_" + year + "_to_" + (year-number_of_years) + "_" + 
                (collection_type==="greenest" ? "_L7_Annual_Greenest_TOA" : ("_" + sensor + "_TOA_cloud_cover_" + cloud_cover + "%")) +
                (multiclassifier===true ? "_3_Classifiers" : "_"+classifier_names[classifiers[0]]) + 
                (morphology_on===true ? "_with_morphology":"");

  
// ====================================== //
//              Fusion Tables             //
// ====================================== //

// Jakarta
var ft1 = ee.FeatureCollection("ft:1JYib5GQkiNTMnt2rpVteos0jQeYE9jVXIhCE8_M");
ft1 = ft1.remap([100,101,102,103,104,105,106,107,108,109,200,201,202,203,204,205,206,207,208,209,210,211,212,213],
                [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Kota Bandung
var ft2 = ee.FeatureCollection("ft:1Z0VTqrovwUR0iujsgw6Y44_tLpjkFUeyivn2f2A");
ft2 = ft2.remap([100,101,102,103,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220],
                [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Kota Manado
var ft3 = ee.FeatureCollection("ft:1Dd68TvI-rYwNe9BHhDkdcUnUg17PKeLUdtwqTR4");
ft3 = ft3.remap([100,101,102,103,104,200,201,202,300,301,302,400,401,402],[1,1,1,1,1,0,0,0,0,0,0,0,0,0],"Number");

// Kuala Lumpur
var ft4 = ee.FeatureCollection("ft:1d_HFpj2iM3S8KBHubF5WEERwXaGSChraPbONdC0");
ft4 = ft4.remap([100,101,102,103,104,105,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216],
              [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");
              
// Kalimatan
var ft5 = ee.FeatureCollection("ft:1m3KKK0ApX90x1bLOy-WU_XNitj8fVtw19lXLWZU");
ft5 = ft5.remap([100,101,102,200,201,202,203,204,205,206,207,208,209,210,211],[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Surabaya
var ft6 = ee.FeatureCollection("ft:10IZ12uFHlmGZMuzgOkk3HuvAuHdM2Iu10O7MPxk");
ft6 = ft6.remap([100,101,102,103,104,105,106,107,200,201,202,203,204,205,206,207,208,209,210,211,212,213],
              [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// San Paolo
var ft7 = ee.FeatureCollection("ft:1W-iBNcXotAJt06PO0EdANfOveMX8P9Sd_zxUK-w"); 
ft7 = ft7.remap([100,101,200,300,400,500,600,700,701,800,900,901,1000,1001,1100],[1,1,0,0,1,0,0,0,0,1,0,0,0,0,1],"Number");

// Rio 
var ft8 = ee.FeatureCollection("ft:1TvLP4Xe3bJ-dwDyvxudiDxn1BUZieNmDlKelpDU");
ft8 = ft8.remap([100,101,200,201,202],[1,1,0,0,0],"Number");
                
// Recife
var ft9 = ee.FeatureCollection("ft:199COLkTjEFiYW09eF7kS6bCj6Ju-iWUk4pXwOhk");
ft9 = ft9.remap([100,101,200,201,202,203,204,205,206,207,208,209,210,211,212,213],[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");
                
//Curitiba 
var ft10 = ee.FeatureCollection("ft:1lE5JidkBcWPtOf7jDurRezkTv72Ak4ECcCFw6I8");
ft10 = ft10.remap([100,101,200,201,202,203,204,205,206,207,208,209,210,211,212,213],[1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Buonos Aires
var ft11 = ee.FeatureCollection("ft:1-z1IpdYWOQe-d3xMTkxViQmWJCNfiX7stOWSf9s"); 
ft11 = ft11.remap([100,101,102,103,200,201,202,203,204,205], [1,1,1,1,0,0,0,0,0,0],"Number");

// Mexico City
var ft12 = ee.FeatureCollection("ft:1zgrzKKI2IUU_NcCIGzfSF9-GmTepsQTknlYNHok"); 
ft12 = ft12.remap([100,101,102,200,201,202,203,204,205,206,207], [1,1,1,0,0,0,0,0,0,0,0],"Number");

// Shanghai
var ft13 = ee.FeatureCollection("ft:1DUtGpGJzKiEf63LkUjJj7imQAiK0cxvawP2YQno");
ft13 = ft13.remap([100,101,102,200,201,202,203,204,300,301,400,401],[1,1,1,0,0,0,0,0,0,0,0,0],"Number");

// Jiangsu
var ft14 = ee.FeatureCollection("ft:1h4dMswHa9OPy4pFsHva8fSOi7ZtfhbkDQgbB3UE");
ft14 = ft14.remap([100,101,200,201,300,301,302,303,400,401],[1,1,0,0,0,0,0,0,0,0],"Number");

// Cairo
var ft15 = ee.FeatureCollection("ft:1S5DPVKswvcIczNqZLZXi3-YipExJ7Ez3ySFd3FE"); 
ft15 = ft15.remap([100,101,102,200,201,202,203,204], [1,1,1,0,0,0,0,0],"Number");

// Kinshasa-Brazzaville
var ft16 = ee.FeatureCollection("ft:1VmkJ_EKhOdcNjsyeJuH7Wt7AGzjZK0Il3NKJVFE");
ft16 = ft16.remap([100,101,102,200,201,202,203,204], [1,1,1,0,0,0,0,0],"Number");

// Istambul
var ft17 = ee.FeatureCollection("ft:1SI9e9QIEg2T7ZuBpVmz06VsSbK-Zx4Y-uNnTymo"); 
ft17 = ft17.remap([100,101,102,103,104,105,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216], 
                  [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Karachi
var ft18 = ee.FeatureCollection("ft:1MXNLNoQji75DduserB14ca88O1E2u_ZqrRDAcAI"); 
ft18 = ft18.remap([100,101,102,103,200,201,202,203,204], [1,1,1,1,0,0,0,0,0],"Number");

// Londra
var ft19 = ee.FeatureCollection("ft:1-ILTTjz3lvURZ7VC8q-zA0MvSln6bDz2dyj9KTc"); 
ft19 = ft19.remap([100,101,102,103,200,201,202,203,204,205,206,207,208,209,210,211,212,213], 
                  [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Manila
var ft20 = ee.FeatureCollection("ft:1VfVvegIbUX-Goi0tqjrLV2AJMxjFR9x5zXlW51c"); 
ft20 = ft20.remap([100,101,102,200,201,202,203,204,205], [1,1,1,0,0,0,0,0,0],"Number");

// Mumbai
var ft21 = ee.FeatureCollection("ft:13IcqxzMwTjePC2cCeVcKZy6d6_sM1CqrbPWEGkY"); 
ft21 = ft21.remap([100,101,102,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216], 
                  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// New York
var ft22 = ee.FeatureCollection("ft:1zzRtyA3nIlwQJJl6en4cm6gjrjuOI3iB_N5B9qg"); 
ft22 = ft22.remap([100,101,102,200,201,202,203,204,205,206,207,208,209,210], [1,1,1,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Osaka
var ft23 = ee.FeatureCollection("ft:1gmLE5_GpE5aeamLRPaWgAcTmbzPNROXsLvexNvM");
ft23 = ft23.remap([100,101,102,103,200,201,202,203,204,205,206,207,208], [1,1,1,1,0,0,0,0,0,0,0,0,0],"Number");

// Seul
var ft24 = ee.FeatureCollection("ft:1hjcTW0AD0qApNiT9LDieZua94UbofkK6Dfd5IRg"); 
ft24 = ft24.remap([100,101,102,103,104,105,200,202,203,204,205,206,207], [1,1,1,1,1,1,0,0,0,0,0,0,0],"Number");

// Vietnam Dong Hoi
var ft25 = ee.FeatureCollection("ft:1btvyTxRJjrigjoYWt3rB8DakxRkhQPPIbRZp_xo");
ft25 = ft25.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114],[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Ca Mau
var ft26 = ee.FeatureCollection("ft:1PM7cL_rCRf3cOTzVcWijydFXgWLsnuivyX5PYHw");
ft26 = ft26.remap([100,101,102,103,104,105,106,107,108,109],[1,1,1,0,0,0,0,0,0,0],"Number");

// Vietnam sud Ca Mau
var ft27 = ee.FeatureCollection("ft:1ELY75GK8n-6qYQkh87lKrrElQAvJOKhY3s8OM84");
ft27 = ft27.remap([100,101,102,103,104,105,106,107,108,109,110],[1,1,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam confine cina
var ft28 = ee.FeatureCollection("ft:1-mKabryrKX81T86HEkOQeK9ywbnDwuUKxoPrCJY");
ft28 = ft28.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116],[1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Ho Chi Minh
var ft29 = ee.FeatureCollection("ft:1B-wKLMVl1gJPvB-LG3et4F9ydAKI5A2gghk2eU4");
ft29 = ft29.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117],[1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Da Nang
var ft30 = ee.FeatureCollection("ft:1jQKQJgEoYOKqihLXBEgkiFZ3JoA0jl238Uu4sc8");
ft30 = ft30.remap([100,101,102,103,104,105,106,107,108,109,110,111,112],[1,1,1,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Quang Tri
var ft31 = ee.FeatureCollection("ft:11INXL4EThmczTQuNvH28i33fyKNnEujsKvTxKZQ");
ft31 = ft31.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118],[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Phuroc Hoi
var ft32 = ee.FeatureCollection("ft:19tpEczaE170ez6x5ViPNDqeB7-rfoDFSv9mYVKM");
ft32 = ft32.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121],[1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Est Ho Chi Minh
var ft33 = ee.FeatureCollection("ft:1Un2B568D-aG_T30POwgWnIW6NGXFlq6wNs0XhOY");
ft33 = ft33.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113],[1,1,1,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Phan Rang
var ft34 = ee.FeatureCollection("ft:16sOtBxUs6lFjIj2426190MO79dObrr51Ksyh0WI");
ft34 = ft34.remap([100,101,102,103,104,105,106,107,108,109],[1,1,1,0,0,0,0,0,0,0],"Number");

// Vietnam Sud Hanoi
var ft35 = ee.FeatureCollection("ft:14TVtC6AD5SVoZF0PlHFS0eV-21BvfBgRbzEx1jQ");
ft35= ft35.remap([100,101,102,103,104,105,106,107,108,109,110,111,112],[1,1,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Ho Chi Minh 2
var ft36 = ee.FeatureCollection("ft:1amd1UCF4ZYYFv7wipfM7P8c1jtcnC3CKlus23a0");
ft36 = ft36.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115],[1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Vietnam Hanoi
var ft37 = ee.FeatureCollection("ft:1lnHpA_ZlFoJ1ADqvLRno1PJV31PlTlsUXU9zwVQ");
ft37 = ft37.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115],[1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Africa
var ft38 = ee.FeatureCollection("ft:1Kh31mKZjrcJWXzG1MEQA00mW0-GJ8qyW4jGhlmw");
ft38 = ft38.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,
                   118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,
                   136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153],
                  [1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                   0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Dallas
var ft39 = ee.FeatureCollection("ft:10VY57FR5fcevkinyMiYvhv-bfzu-1w7bAWuV59XS");
ft39 = ft39.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
                   122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142],
                  [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Los Angeles
var ft40 = ee.FeatureCollection("ft:1xTuZ0Cja5BvyEysVGU36rTQolhk_Ad31-UWrD8a5");
ft40 = ft40.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
                   122,123,124,125,126,127,128,129,130,131,132],
                  [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Toronto 1998
var ft41 = ee.FeatureCollection("ft:15h2EZU85KFxcnGCgAQq0S39g7Z-ea8iO0h5GJegi");
ft41 = ft41.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
                   122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137],
                  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Toronto 1999
var ft42 = ee.FeatureCollection("ft:1lxJbARYUw5AV_ULv_Qd9aYswHdWGJQ8fJ4j31Nor");
ft42 = ft42.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
                   122,123,124,125,126,127,128,129,130,131,132,133,134,135],
                  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");
                  
// Vancouver 1999
var ft43 = ee.FeatureCollection("ft:1ln312_c7nvpPMoA648yqqzNJDR0HCKLr9gj7PKUx");
ft43 = ft43.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,
                   123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,
                   146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163],
                  [1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                   0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");
                  
// Vancouver 2009
var ft44 = ee.FeatureCollection("ft:1ln312_c7nvpPMoA648yqqzNJDR0HCKLr9gj7PKUx");
ft44 = ft44.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,
                   123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139],
                  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Dakar - Senegal 2009
var ft45 = ee.FeatureCollection("ft:1KgybS5ROczVfioCUnxNVXZL1wUHVTuejCmQDeXTs");
ft45 = ft45.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113],[1,1,1,0,0,0,0,0,0,0,0,0,0,0],"Number");

// Lagos - Nigeria 2009
var ft46 = ee.FeatureCollection("ft:1PVyuUjUMpaYIBQqhHSAl9_KG32hStLv_-8g0Z8wE");
ft46 = ft46.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,
                   121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,
                   142,143,144,145,146,147,148,149,150,151,152],
                   [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                    0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Bangui - Repubblica Centro Africana 2009
var ft47 = ee.FeatureCollection("ft:1vNMbsMDdhdmLuy39PFMnzicD11PFCyfScF6UeTTw");
ft47 = ft47.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,
                   122,123,124,125,126,127],
                  [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Addis Abeba - Etiopia 2009
var ft48 = ee.FeatureCollection("ft:1AujUNqTt7yZBzlkHZmk0JCZyRxShE6HnO_4pJdDu");
ft48 = ft48.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117],
                  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");
                  
// Nairobi - Kenya 2009
var ft49 = ee.FeatureCollection("ft:1VTTiG4F3uiKhbMKbdjCe41So2Hgk5c7OKls9P4hZ");
ft49 = ft49.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,
                   121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141],
                   [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Luanda - Angola 2009
var ft50 = ee.FeatureCollection("ft:1wAFG1OyRRugDsBcIiGl6e3m1k60Syggf9PbQjvwC");
ft50 = ft50.remap([100,101,102,103,104,105,106,107,108,109,110,111], [1,1,0,0,0,0,0,0,0,0,0,0], "Number");

// Antanananarivo - Madagascar 2009
var ft51 = ee.FeatureCollection("ft:1BUB0WKrrgj8oEa4Ct6PXynxlV86JemV55f1-2Mgm");
ft51 = ft51.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,], 
                  [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");
                  
// Casablanca - Marocco 2009
var ft52 = ee.FeatureCollection("ft:1w1xp3taWI5lXmrN96PkVvNgU8p8nPSx_MnJS26ey");
ft52 = ft52.remap([100,101,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,
                   121,122,123,124,125,126,127,128,129,130,131,132,133,134],
                   [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Tamanrasset - Algeria 2009
var ft53 = ee.FeatureCollection("ft:1F5i8QzejxFjH3o4xmiKD1b5CF9EhtYLzgEYFL5-R");
ft53 = ft53.remap([101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119],
                  [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");
                  
// Hurgada - Egypt  2009                
var ft54 = ee.FeatureCollection("ft:1RwW2jFBdUEtxlFWQRIM0R1jneXHlXYRlS_k0dCSu");
ft54 = ft54.remap([101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116],
                  [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Sirte - Lybia  2009                
var ft55= ee.FeatureCollection("ft:1H8wOhLPCIWYXayXjcwcQu8PDv3m-_tQd-ZN4L6M1");
ft55 = ft55.remap([101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116],
                  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Cercle de Dire - Mali  2009                
var ft56= ee.FeatureCollection("ft:1bkRPcvqxJoEQupltGhx1XSH0sKsivXIH_152-EFF");
ft56 = ft56.remap([101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121],
                  [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");
  
// Maputo - Mozambico  2009                
var ft57 = ee.FeatureCollection("ft:1U6j_VE9vGNk6C4tg1wrEV2Hh7KNIB4EjBUIjmJti");
ft57 = ft57.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,
                   121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138],
                  [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Harare - Zimbawe  2009                
var ft58 = ee.FeatureCollection("ft:1x4nBwW3-Hn-PVexdWk3nPN49aH8Usd8l0ljJRsa0");
ft58 = ft58.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,
                   123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144],
                  [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");


// Johannesburg - South Africa  2009                
var ft59 = ee.FeatureCollection("ft:1Ye-K6RsCf4ixpUgwQ4r1OSuPFQ0xjB6CVniZ0NIA");
ft59 = ft59.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,
                   123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141],
                  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");


// Durban - South Africa  2009                
var ft60 = ee.FeatureCollection("ft:1fSLrnYRnBmMkZxdrSnIeQr9_TdbKifI-7HPrDk9u");
ft60 = ft60.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,
                   123,124,125,126,127,128,129],
                  [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");


// Cape Town - South Africa  2009                
var ft61 = ee.FeatureCollection("ft:1om0_icjG1Wz90_ACpOUU4E50IHZgU9-57HH_dNAS");
ft61 = ft61.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,
                   123,124,125,126,127,128,129,130,131,132,133,134],
                  [1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0], "Number");

// Tranining set Andres
var ftA4 = ee.FeatureCollection("ft:1YZfa286rC-MiQLdGGanFfvoOFcaACq79D_guqeB2");
ftA4 = ftA4.remap([100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,
               121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142],
              [1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
              "Number");

var ftA6 = ee.FeatureCollection("ft:1E_sQ9l7-uQbuEfGgCcuHlp-fWB6MQJqgFFb0KQqo");
ftA6 = ftA6.remap([100,101,102,103,104,200,201,202,300,301,302,400,401,402],
                [1,1,1,1,1,0,0,0,0,0,0,0,0,0],"Number");


// India FT66 Test punti
var ft66 = ee.FeatureCollection("ft:1w65fJ11u4BeJuX0xQDsWCloB5Y1_ZF-h2Cc0qciz");
ft66 = ft66.remap([100,200,300,400,500,600,700,800,900,1000,1100,1200],
                  [1,0,0,0,0,0,0,0,0,0,0,0], "Number");

// ====================================== //
//             General Functions          //
// ====================================== //

// autocenter map
function autoCenterMap(polygon, zoom)
{                                
  var centroid = polygon.centroid().getInfo().coordinates;
  
  Map.setCenter(centroid[0],centroid[1],zoom);
}

// create a quad polygon from lat and lon
function getPoly(lng, lat)
{
  var poly = ee.Geometry.Polygon([[lng-1, lat-1],
                                  [lng-1, lat+1],
                                  [lng+1, lat+1],
                                  [lng+1, lat-1] ]);
  return poly;                                  
}


// Return an image in flag is 0 or the median of a collection if flag is 1
function img_or_collection(input, flag)
{
  if(flag===0)
    return input;
  else if(flag===1)
    return input.median();
}


// Return an image in flag is 0 or the median of a collection if flag is 1
function input_selector(year, collection_type, sensor, cloud_cover, polygon)
{
  
  var collection, collection1, collection2, collection3;
  var coll;
  
  if(collection_type === "greenest")
  {
    coll = (sensor==='L5') ? 'LT5_L1T_ANNUAL_GREENEST_TOA/' : 
           ((sensor==='L7') ? 'LE7_L1T_ANNUAL_GREENEST_TOA/' : 'LC8_L1T_ANNUAL_GREENEST_TOA/');

    return ee.Image(coll + year).clip(polygon);
  }
  else if(collection_type === "standard")
  {
    coll = (sensor==='L5' || sensor==='L45') ? 'LT5_L1T_TOA' : ((sensor==='L7') ? 'LE7_L1T_TOA' : 'LC8_L1T_TOA');
    
          // check for combo L4-L5
      if(sensor==='L45')
      {
        collection1 = ee.ImageCollection("LT5_L1T_TOA").filterDate(new Date(year+"-01-01"), new Date(year+"-12-31"))
                                                       .filterMetadata('catalog_cloud_cover', 'less_than', cloud_cover)
                                                       .filterBounds(polygon);
        
        collection2 = ee.ImageCollection("LT4_L1T_TOA").filterDate(new Date(year+"-01-01"), new Date(year+"-12-31"))
                                                       .filterMetadata('catalog_cloud_cover', 'less_than', cloud_cover)
                                                       .filterBounds(polygon);

        collection = ee.ImageCollection(collection1.merge(collection2));
        return collection.median().clip(polygon);
                                                           
      }
      else
      {
        collection = ee.ImageCollection(coll).filterDate(new Date(year+"-01-01"), new Date(year+"-12-31"))
                                             .filterMetadata('catalog_cloud_cover', 'less_than', cloud_cover)
                                             .filterBounds(polygon);
        return collection.median().clip(polygon);
      }
    
  } 
  else if(collection_type === "simplecomposite")
  {
    coll = (sensor==='L5') ? 'LT5_L1T' : ((sensor==='L7') ? 'LE7_L1T' : 'LC8_L1T');

    collection = ee.ImageCollection(coll).filterDate(new Date(year+"-01-01"), new Date(year+"-12-31"))
                   //.filterMetadata('catalog_cloud_cover', 'less_than', cloud_cover)
                   .filterBounds(polygon);
    var simpleComp = ee.Algorithms.Landsat.simpleComposite(collection, 50, 10);
    return simpleComp.clip(polygon);

  }
}

// ====================================== //
//           Morphology Functions         //
// ====================================== //

// launch matematical morphology
function morphology(image, operator, radius, kernelType, units, iterations)
{
  var morph;

  if(image.getInfo().bands[0].data_type.precision == 'int')
  {
    morph = ee.call(operator, image, radius, kernelType, units, iterations);
  }
  else if(image.getInfo().bands[0].data_type.precision == 'float' || image.getInfo().bands[0].data_type.precision == 'double')
  {
    morph = ee.call(operator, image.multiply(255).toInt(), radius, kernelType, units, iterations);
  }

  return morph;
  
}

// opening function
function opening(image, radius, kernelType, units)
{
  var erode = morphology(image, 'Window.min', radius, kernelType, units, 1);
  var open = morphology(erode, 'Window.max', radius, kernelType, units, 1);
  return open;
}

// closing function
function closing(image, radius, kernelType, units)
{
  var dilate = morphology(image, 'Window.max', radius, kernelType, units, 1);
  var closure = morphology(dilate, 'Window.min', radius, kernelType, units, 1);
  return closure;
}

// Morphology adjustment
function morph_adjustment(img1, radius1, radius2, kernelType)
{
  // Opening
  var morph = closing(img1, radius1, kernelType, "meters");
  morph = opening(morph, radius1, kernelType, "meters");
  //Map.addLayer(ee.Image(0).mask(morph), {palette: '000000, 77ff00'}, 'Classified + clos-op', false);

  // And
  var result = img1.and(morph);
  result = closing(result, radius2, kernelType, "meters");

  return result;
}

// ====================================== //
//               NDVI Functions           //
// ====================================== //

// NDVI computing
function NDVI(image)
{
  return image.expression('((b("B4") - b("B3")) / (b("B4") + b("B3")))');
}


// ====================================== //
//               NDSV Functions           //
// ====================================== //

// NDSV computing
function NDSV(image, b1, b2)
{
  //print('((b(\"' + b2 + '\") - b(\"' + b1 + '\")) / (b(\"' + b2 + '\") + b(\"'+ b1 + '\"))) ');
  return image.expression(
    '((b(\"' + b2 + '\") - b(\"' + b1 + '\")) / (b(\"' + b2 + '\") + b(\"'+ b1 + '\"))) ');
}


// Compute all the 15 bands of NDSV
function create_ndsv_img_15(image)
{
  image = image.float();
  
  //print("NDSV for L5 or L7");
  
  var band_1_2_image = NDSV(image,'B1','B2');
  var band_1_3_image = NDSV(image,'B1','B3');
  var band_1_4_image = NDSV(image,'B1','B4');
  var band_1_5_image = NDSV(image,'B1','B5');
  var band_1_7_image = NDSV(image,'B1','B7');
  
  var band_2_3_image = NDSV(image,'B2','B3');
  var band_2_4_image = NDSV(image,'B2','B4');
  var band_2_5_image = NDSV(image,'B2','B5');
  var band_2_7_image = NDSV(image,'B2','B7');
  
  var band_3_4_image = NDSV(image,'B3','B4');
  var band_3_5_image = NDSV(image,'B3','B5');
  var band_3_7_image = NDSV(image,'B3','B7');
  
  var band_4_5_image = NDSV(image,'B4','B5');
  var band_4_7_image = NDSV(image,'B4','B7');
  var band_5_7_image = NDSV(image,'B5','B7');
  
  band_1_2_image = band_1_2_image.addBands(band_1_3_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_1_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_1_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_1_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_3_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_3_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_3_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_3_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_4_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_4_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_5_7_image,null,false);

  var bandnames = ["ndsv_1_2", "ndsv_1_3", "ndsv_1_4", "ndsv_1_5", "ndsv_1_7", "ndsv_2_3", "ndsv_2_4", "ndsv_2_5", "ndsv_2_7", "ndsv_3_4", "ndsv_3_5", "ndsv_3_7", "ndsv_4_5", "ndsv_4_7", "ndsv_5_7"];
  var ndsv = band_1_2_image.select(['.*'], bandnames);
  
  return ndsv;

}

// Compute all the 15 bands of NDSV for Landsat8
function create_ndsv_img_15_L8(image)
{
  image = image.float();
  //print("NDSV for L8");
  var band_1_2_image = NDSV(image,'B2','B3');
  var band_1_3_image = NDSV(image,'B2','B4');
  var band_1_4_image = NDSV(image,'B2','B5');
  var band_1_5_image = NDSV(image,'B2','B6');
  var band_1_7_image = NDSV(image,'B2','B7');
  
  var band_2_3_image = NDSV(image,'B3','B4');
  var band_2_4_image = NDSV(image,'B3','B5');
  var band_2_5_image = NDSV(image,'B3','B6');
  var band_2_7_image = NDSV(image,'B3','B7');
  
  var band_3_4_image = NDSV(image,'B4','B5');
  var band_3_5_image = NDSV(image,'B4','B6');
  var band_3_7_image = NDSV(image,'B4','B7');
  
  var band_4_5_image = NDSV(image,'B5','B6');
  var band_4_7_image = NDSV(image,'B5','B7');
  
  var band_5_7_image = NDSV(image,'B6','B7');
  
  band_1_2_image = band_1_2_image.addBands(band_1_3_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_1_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_1_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_1_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_3_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_3_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_3_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_3_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_4_5_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_4_7_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_5_7_image,null,false);

  var bandnames = ["ndsv_1_2", "ndsv_1_3", "ndsv_1_4", "ndsv_1_5", "ndsv_1_7", "ndsv_2_3", "ndsv_2_4", "ndsv_2_5", "ndsv_2_7", "ndsv_3_4", "ndsv_3_5", "ndsv_3_7", "ndsv_4_5", "ndsv_4_7", "ndsv_5_7"];
  var ndsv = band_1_2_image.select(['.*'], bandnames);
  
  return ndsv;

}

// Compute all the 6 bands of NDSV
function create_ndsv_img_6(image)
{
  image = image.float();
  var band_1_2_image = 0;
  var band_1_3_image = 0;
  var band_1_4_image = 0;
  
  var band_2_3_image = 0;
  var band_2_4_image = 0;
    
  var band_3_4_image = 0;
  
  if(image.getInfo().bands[0].id == 1)
  {
    band_1_2_image = NDSV(image,'1','2');
    band_1_3_image = NDSV(image,'1','3');
    band_1_4_image = NDSV(image,'1','4');
  
    band_2_3_image = NDSV(image,'2','3');
    band_2_4_image = NDSV(image,'2','4');
    
    band_3_4_image = NDSV(image,'3','4');
  }
  else if(image.getInfo().bands[0].id == 4){
    
    band_1_2_image = NDSV(image,'4','5');
    band_1_3_image = NDSV(image,'4','6');
    band_1_4_image = NDSV(image,'4','7');
  
    band_2_3_image = NDSV(image,'5','6');
    band_2_4_image = NDSV(image,'5','7');
    
    band_3_4_image = NDSV(image,'6','7');

  }
  
  band_1_2_image = band_1_2_image.addBands(band_1_3_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_1_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_3_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_2_4_image,null,false);
  band_1_2_image = band_1_2_image.addBands(band_3_4_image,null,false);

  var bandnames = ["ndsv_1_2", "ndsv_1_3", "ndsv_1_4", "ndsv_2_3", "ndsv_2_4", "ndsv_3_4"];
  var ndsv = band_1_2_image.select(['.*'], bandnames);
  
  return ndsv;

}

// Compute all the bands of NDSV depending on the image
function create_ndsv_img(image)
{
  if(sensor==='L8')
    return create_ndsv_img_15_L8(image);
  else if(sensor==='L7' || sensor==='L5' || sensor === 'L45')
    return create_ndsv_img_15(image);
  else
    return create_ndsv_img_6(image);

}

// ====================================== //
//               Classifier               //
// ====================================== //

// generate training set of random points (Universe of cities)
function ts_generator(poly, numPoints, selectedCities,seed)
{
  seed = (seed === undefined) ? 0 : seed;
  var random_points = ee.FeatureCollection.randomPoints(poly, numPoints, seed);

  var geom = ee.Feature(selectedCities.geometry());
  
  var training_set = random_points.map(function (feature) {
    return feature.set("Number",
        ee.Algorithms.If(feature.containedIn(geom), 1, 0));
  });
  
  var numPoints_NotUrban = training_set.filter(ee.Filter.eq("Number", 0)).getInfo().features.length;
  //print("not urban: " + numPoints_NotUrban);
  var numPoints_Urban = training_set.filter(ee.Filter.eq("Number", 1)).getInfo().features.length;
  //print("urban: " + numPoints_Urban);
  var numPoits_toAdd = (numPoints_NotUrban-numPoints_Urban)/2;
  random_points = ee.FeatureCollection.randomPoints(selectedCities, numPoits_toAdd);
  var urban_points = random_points.map(function (feature) {
        return feature.set("Number",1);
  });

  training_set = training_set.merge(urban_points);
  
  return training_set;
  
}


// return random point inside a polygon
function getPoints(polygon, num)
{

  var random_points = ee.FeatureCollection.randomPoints(polygon, num);

  var input_train_img = ee.Image('ESA/GLOBCOVER_L4_200901_200912_V2_3').select("1");

  var blank = ee.Image(0); 
  var output = blank.where(input_train_img, 1);
  var mask_img = output.where(input_train_img.lt(190).or(input_train_img.gt(190)),0);

  var x = mask_img.clip(polygon);

  var x_erode  = morphology(x, 'Window.min', radius1, kernelType1, 'meters', 1);
  var x_dilate = morphology(x, 'Window.max', radius1, kernelType1, 'meters', 1);

  var morph = x_erode.add(x_dilate);
  //Map.addLayer(morph, null, 'Input data morph');
  
  var trainingImage_ =  ee.Image.cat(ee.Image(0), morph);
  
  var trainingPoints = ee.apply("ReduceToVectors",{
      image: trainingImage_,
      reducer: ee.Reducer.mean(),  // The particular reducer doesn't matter, since it is a point geometry.
      geometry: random_points,
      scale: 30,                   // Scale at which the image is sampled.
      geometryType: 'centroid'     // The output will be a point. 
  });
  
  trainingPoints = trainingPoints.filter(ee.Filter.neq("mean", 1));
  trainingPoints = trainingPoints.remap([0,2],[0,1],"mean");

  var renamed_points = trainingPoints.map(function (feature) {
      return feature.set("Number", feature.get("mean"));
  });

  return renamed_points;

}

// select and create the fusion tables
function training_selector(ft_array)
{ 
  var index;
  var merge_ft = ft_array[0];
  for (index = 1; index < ft_array.length; index++) 
  {
    merge_ft = merge_ft.merge(ft_array[index]);
  }
    
  return merge_ft;
}

// classificiation
function classifier(img, ft, c, crs)
{
  crs = (crs === undefined) ? "EPSG:4326" : crs;
  var training = img.sampleRegions( ft, ["Number"], null, 
                                    ee.Projection(crs, [8.9831528411952135e-05, 0, -180, 0, -8.9831528411952135e-05, 90]));
  var trained = c.train(training, "Number", img.bandNames());
  
  /* OLD INSTRUCTION
  var y = ee.apply("ClassifyImage",{
                   "image": img,
                   "classifierImage": training
  });
  */
  
  // NEW INSTRUCTION
  var classified = img.classify(trained);
  
  return classified;
}

// Choose classification type: single classifier (multi = false) or three and median (multi = true)
function multi_classifier(img, ft, multiseed, multiclass, watermask, type)
{
  
  var name = multiclass===true ? classifier_array[type[0]] : ee.Classifier.cart();  
  var water = ee.Image("MOD44W/MOD44W_005_2000_02_24").select(["water_mask"]);
  var classified, classified1, classified2, classified3;

  if(multiseed===true)
  {
    classified1 = classifier(img, ft[0], name);
    //Map.addLayer(classified1, {palette: '000000, ff0000'}, 'Classified1', false);
    classified2 = classifier(img, ft[1], name);
    //Map.addLayer(classified2, {palette: '000000, ff00ff'}, 'Classified2', false);
    classified3 = classifier(img, ft[2], name);
    //Map.addLayer(classified3, {palette: '000000, 00ff00'}, 'Classified3', false);
    classified = ee.ImageCollection([classified1, classified2, classified3]).median();
  }
  else
    classified = classifier(img, ft, name);

  if(multiclass===true) // multi classifiers
  {    
    var tmp1, tmp2, tmp3;

    tmp1 = classified;
    Map.addLayer(ee.Image(0).mask(tmp1), {palette: '000000, ff0000'}, classifier_names[type[0]],false);
    tmp2 = classifier(img, ft, classifier_array[type[1]]);
    Map.addLayer(ee.Image(0).mask(tmp2), {palette: '000000, 00ff00'}, classifier_names[type[1]],false);
    tmp3 = classifier(img, ft, classifier_array[type[2]]);
    Map.addLayer(ee.Image(0).mask(tmp3), {palette: '000000, ff00ff'}, classifier_names[type[2]],false);
    classified =  ee.ImageCollection([tmp1, tmp2, tmp3]).median();

  }
  
  if(watermask===true)
  {
    classified = classified.where(water,0);
  }
  
  return classified;
}

// Mask the image with slope
function slope_mask(imgIn, th)
{
  var slope = ee.Algorithms.Terrain(dem);
  return imgIn.where(slope.select("slope").gt(th),0);
  
}

// Mask the image with dem
function dem_mask(imgIn, th)
{
  if(use_geometry === true)
    return imgIn.where(dem.clip(dem_geometry).select("elevation").gt(th), 0);
  else
    return imgIn.where(dem.select("elevation").gt(th), 0);
}

/***********************************************/
/*      MAIN IMAGE CLASSIFICATION FUNCTION     */
/***********************************************/
function image_classification(image_base, ft, year)
{
  /*** NDSV ***/
  var ndsv_img = create_ndsv_img(image_base);
  
  //launch single or multi classification
  var classified1 = multi_classifier(ndsv_img, ft, multi_random, multiclassifier, waterfilter, classifiers);
  //Map.addLayer(classified1, {palette: '000000, ff8800'}, 'Classified ' + year, false);
  
  if(mask_ndvi === true)
  {
    var ndvi = 0;
    
    if(collection_type === "greenest")
      ndvi = image_base.select("greenness");
    else
      ndvi = NDVI(image_base);
  
    classified1 = classified1.where(ndvi.gt(th_ndvi_high), 0);
    classified1 = classified1.where(ndvi.lte(th_ndvi_low), 0);
    
    //Map.addLayer(ee.Image(0).mask(classified1), {palette: '000000, efef00'}, 'NDVI Masked');
    
  }
  
  // Slope filtering
  if(mask_slope === true)
  {
    classified1 = slope_mask(classified1, th_slope);
    //Map.addLayer(ee.Image(0).mask(classified1), {palette: '000000, 00ef00'}, 'Slope Masked');
  }
  
  // Dem filtering
  if(mask_dem === true)
  {
    classified1 = dem_mask(classified1, th_dem);
    //Map.addLayer(ee.Image(0).mask(classified1), {palette: '000000, ef00ef'}, 'Dem Masked');
  }
  
  
  // launch morphology
  if(morphology_on === true)
  {
    var tmp = classified1.where(classified1.eq(0.5), classified1.add(0.5)).toInt().clamp(0,1);
    classified1 = morph_adjustment(tmp, radius1, radius2, kernelType);
  }

  return classified1;
  
}

// compute the area of the classification
function computeArea(input_img, polygon, year)
{
  // Calculate area
  var areaImage = input_img.multiply(ee.Image.pixelArea());
  var stats = areaImage.reduceRegion(
    {
      'reducer': ee.Reducer.sum(),
      'geometry': polygon,
      'maxPixels': 5e9,
      'scale': area_scale,
      'bestEffort': true
    });
  print('Area ' + year + ': ' + (stats.getInfo().classification/10e5) + ' KM^2');
}

// ===================================== //
//             Main function             //
// ===================================== //

var img_min = (collection_type==='simplecomposite') ? '3': '0.038';
var img_max = (collection_type==='simplecomposite') ? '63': '0.23';
var red = sensor==="L8" ? 'B4' : 'B3';
var green = sensor==="L8" ? 'B3' : 'B2';
var blue = sensor==="L8" ? 'B2' : 'B1';

// load the basic image
var image_base = input_selector(year, collection_type, sensor, cloud_cover, polygon1);
Map.addLayer(image_base.select(red,green,blue),{min: img_min, max: img_max},'Year '+ year);


/*** Ground Truth ***/
if(GT_enable===true)
  Map.addLayer(GT_selectedRegions, {color: '900000'}, 'Ground Truth');

/*** Training set initilization ***/
var ft = 0;

if(ts_type===0) // Fusion table ts
{
  var tables_array = new Array(ft17); // INSERT THE CODE(S) OF THE FUSION TABLE(S) TO USE
  ft = training_selector(tables_array);
  
}
else if(ts_type===1) // Globcover ts
{
  // random training set
  var trainingPoints = getPoints(getPoly(lng,lat), num_points);
  Map.addLayer(trainingPoints, {color: '00ffff'}, 'Random Points');
  ft = ft.merge(trainingPoints);
}
else if(ts_type===2) // Universe of cities TS
{
  // visualize cities
  Map.addLayer(selectedCities, {color: '900000'}, 'Cities',false);
  // generate training set
    // generate training set
  if(multi_random===true)
  {
    var ft_1 = ts_generator(polygon1, num_points, selectedCities, seeds[0]);
    var ft_2 = ts_generator(polygon1, num_points, selectedCities, seeds[1]);
    var ft_3 = ts_generator(polygon1, num_points, selectedCities, seeds[2]);
    ft = new Array(ft_1, ft_2, ft_3);
  }else  
    ft = ts_generator(polygon1, num_points, selectedCities);
}
if(multi_random===true)
{
  Map.addLayer(ft[0], {color:"00ffff"}, 'Features Points seed1', false);
  Map.addLayer(ft[1], {color:"00ff00"}, 'Features Points seed2', false);
  Map.addLayer(ft[2], {color:"ff00ff"}, 'Features Points seed3', false);
}
else
  Map.addLayer(ft, {color:"00ffff"}, 'Features Points', false);

/*** array of classifications ***/
var class_array = [];

/*** first classification ***/
var classified = image_classification(image_base, ft, year);
Map.addLayer(ee.Image(0).mask(classified), palette_list[0], 'Classified Mask '+ year);
class_array.push(classified);
if(compute_area===true)
  computeArea(classified, polygon1, year);

/*** Loop on all the years ***/
var classified_tmp;
var classified_collection_tmp;
var palette_index = 1;
var global_mask = classified;
var classified_collection;


for(var i=step; i<number_of_years; i+=step)
{
  var x = 0;
  while(x<=step)
  {
    if(year-i>=2013)
    {
      sensor = 'L8';
    }
    if(year-i<2013 && year-i>2000)
    {
      sensor = 'L7';
    }
    else if (year-i<=2000 && year-i>1995)
    {
      sensor = 'L5';
    }
    else
    {
      sensor = 'L45';
      collection_type = 'standard';
    }

    image_base = input_selector((year-i), collection_type, sensor, cloud_cover, polygon1);
  
    if(image_base.getInfo().bands.length !== 0)
    {

      classified_tmp = image_classification(image_base, ft, (year-i));
      
      if(class_or_flag===true)
      {
        class_array.push(classified_tmp);
        global_mask = global_mask.or(classified_tmp);
        
      }else
      {
        // logical AND with the previous year classification
        classified = classified_tmp.and(classified);
        if(compute_area===true)
          computeArea(classified, polygon1, year-i);
        Map.addLayer(ee.Image(0).mask(classified), palette_list[palette_index], 'Classified AND Mask '+ (year-i));
      }
      x = step+1;
      palette_index++;
    }
    else
    {
      x++;
      i++;
    }

  }
}

if(class_or_flag===true)
{
  // update global mask
  global_mask = global_mask.and(closing(class_array[0], class_morph_radius, kernelType, units));
  // visualize the corrected classified images
  var dim = class_array.length;
  for(var j=1; j<dim; j++)
  {
    classified = class_array[j].and(global_mask);
    Map.addLayer(ee.Image(0).mask(classified), palette_list[j], 'Classified AND Mask '+ (year-(step*j)));
    if(compute_area===true)
      computeArea(classified, polygon1, year-(step*j));
  }

}

// autocenter map
if(center_on === "")
  autoCenterMap(polygon1, zoom);
else
  autoCenterMap(cities_table.filter(ee.Filter.eq('MAIN_CITY', center_on)).geometry(), zoom+4);

/*
// download
exportImage(result_morph, task_name, 
{
  'crs':'EPSG:4326', 
  'scale':30, 
  'region':JSON.stringify(polygon1.getInfo().coordinates),
  'maxPixels':13000000000, 
  'driveFolder':'prova'
});
*/
