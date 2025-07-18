app.directive('busline', function() {
  return {
    restrict: 'E',
    templateUrl: 'app/view/map-bus/bottom-sheet/bus-line/bus-line.html',
    controller: 'BuslineController',
    scope: {}
  };
});

app.directive('busTravel', function() {
  return {
    restrict: 'E',
    templateUrl: 'app/view/map-bus/bottom-sheet/bus-travel/bus-travel.html',
    controller: 'BusController',
    scope: {}
  };
});
