angular.module("myApp").config(function ($stateProvider, $urlRouterProvider, $locationProvider) {
  $locationProvider.hashPrefix("!");
  $urlRouterProvider.otherwise("/map");

  $stateProvider
    .state("map", {
      url: "/map",
      templateUrl: "app/view/map-bus/map-bus.html",
      controller: "MapBusController",
      resolve: {
        loadTracking: [
          "$ocLazyLoad",
          function ($ocLazyLoad) {
            return $ocLazyLoad.load([
              "app/view/map-bus/map-bus.js",
              "app/view/map-bus/bottom-sheet/bus-travel/bus-travel.js",
              "app/view/map-bus/bottom-sheet/bus-line/bus-line.js"
            ]);
          },
        ],
      },
    })
    .state("search", {
      url: "/search",
      templateUrl: "app/view/map-bus/search_map/search_map.html",
      controller: "SearchMapController",
      resolve: {
        loadTracking: [
          "$ocLazyLoad",
          function ($ocLazyLoad) {
            return $ocLazyLoad.load([
              "app/view/map-bus/search_map/search_map.js"
            ]);
          },
        ],
      },
    });
});
