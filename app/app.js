var app = angular.module("myApp", [
  "ui.router",
  "ngMaterial",
  "ngAnimate",
  "ngAria",
  "ngMessages",
  "oc.lazyLoad",
]);

angular.module('myApp')
  .config(function($mdGestureProvider) {
    $mdGestureProvider.skipClickHijack(); // ✅ เปิดไว้
  });
