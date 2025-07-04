var app = angular.module('myApp', ['ui.router', 'ngMaterial']);

app.config(function($stateProvider, $urlRouterProvider, $locationProvider) {
    $locationProvider.hashPrefix('!');
    $urlRouterProvider.otherwise('/map');

    $stateProvider
      .state('map', {
        url: '/map',
        templateUrl: 'app/view/map-bus/map-bus.html',
        controller: 'MapBusController'
      });
});
