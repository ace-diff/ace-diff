
function getCurve(curveFactor, startX, startY, endX, endY) {

  // midpoint
  var mpX = startX + ((endX - startX) / 2);
  var mpY = startY + ((endY - startY) / 2);

  var diffY = Math.abs(endY - startY);
  var diffX = Math.abs(endX - startX);

  // control point around which the bezier curves are computed
  var cpX = startX + ((endX - startX) / 4);
  var curveFlatline = startY + ((endY - startY) / 4);
  var cpY = curveFlatline - ((diffY / 100) * curveFactor);

  var curve = 'M' + startX + ',' + startY + ' Q' + cpX + ',' + cpY + ' ' + mpX + ',' + mpY + ' T' + endX + ',' + endY;

  return curve;
}

function getCurve2(startX, startY, endX, endY) {
  var w = endX - startX;
  var halfWidth = (w / 2) + startX;

  // position it at the initial x,y coords
  var curve = "M " + startX + " " + startY +

    // now create the curve
    " C " + halfWidth + "," + startY + " " + halfWidth + "," + endY + " " + endX + "," + endY;

  return curve;
}


/*
function bezier(x1, y1, x2, y2, epsilon) {

  var curveX = function(t){
    var v = 1 - t;
    return 3 * v * v * t * x1 + 3 * v * t * t * x2 + t * t * t;
  };

  var curveY = function(t){
    var v = 1 - t;
    return 3 * v * v * t * y1 + 3 * v * t * t * y2 + t * t * t;
  };

  var derivativeCurveX = function(t){
    var v = 1 - t;
    return 3 * (2 * (t - 1) * t + v * v) * x1 + 3 * (- t * t * t + 2 * v * t) * x2;
  };

  return function(t) {
    var x = t, t0, t1, t2, x2, d2, i;

    // First try a few iterations of Newton's method -- normally very fast.
    for (t2 = x, i = 0; i < 8; i++){
      x2 = curveX(t2) - x;
      if (Math.abs(x2) < epsilon) return curveY(t2);
      d2 = derivativeCurveX(t2);
      if (Math.abs(d2) < 1e-6) break;
      t2 = t2 - x2 / d2;
    }

    t0 = 0, t1 = 1, t2 = x;

    if (t2 < t0) return curveY(t0);
    if (t2 > t1) return curveY(t1);

    // Fallback to the bisection method for reliability.
    while (t0 < t1){
      x2 = curveX(t2);
      if (Math.abs(x2 - x) < epsilon) return curveY(t2);
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * .5 + t0;
    }

    // Failure
    return curveY(t2);

  };

};
*/
