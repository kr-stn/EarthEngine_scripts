// Coordinates have 14 decimal places, reducing the precision can save space prior to export
// based on answer by Noel Gorelick https://groups.google.com/d/msg/google-earth-engine-developers/5PYb7xgTEc0/9F9HSy6DCgAJ

collection.map(function(f) {
    var coords = f.geometry().coordinates().flatten().flatten().map(function(n) {
      return ee.Number(n).format("%.2f")
    })
    return ee.Feature(null, f.toDictionary()).set('simple', coords)
}).aside(print)
