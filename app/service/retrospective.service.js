angular.module('myApp').service('retrospectiveService', function($window) {
    this.goBack = function () {
        $window.history.back();
    };
});