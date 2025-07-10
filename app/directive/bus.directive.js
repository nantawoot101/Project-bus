app.directive('dragHandle', function() {
  return {
    restrict: 'A',
    link: function(scope, element) {
      const startHandler = function(e) {
        scope.$applyAsync(() => {
          scope.startDrag(e);
        });
      };

      element[0].addEventListener('mousedown', startHandler);
      element[0].addEventListener('touchstart', startHandler);
    }
  };
});
