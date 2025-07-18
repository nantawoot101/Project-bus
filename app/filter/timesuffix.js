app.filter('addTimeSuffix', function() {
  return function(input) {
    if (!input) return '';
    return input + ' น.';
  };
});