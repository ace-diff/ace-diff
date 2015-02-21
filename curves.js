
function generateHappyCurve(curveFactor, startX, startY, endX, endY) {
  // midpoint
  var mpX = startX + ((endX - startX) / 2);
  var mpY = startY + ((endY - startY) / 2);

  var diffY = Math.abs(endY - startY);
  var diffX = Math.abs(endX - startX);

  // control point around which the bezier curves are computed
  var cpX = startX + ((endX - startX) / 4);


  var curveFlatline = startY + ((endY - startY) / 4);

  var cpY = curveFlatline - ((diffY / 100) * curveFactor);

  var svg = '<path d="M' + startX + ',' + startY + ' Q' + cpX + ',' + cpY + ' ' + mpX + ',' + mpY + ' T' + endX + ',' + endY + '" stroke="black" fill="transparent" />';

  return svg;
}
