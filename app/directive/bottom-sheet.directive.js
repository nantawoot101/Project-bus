angular.module("myApp").directive("dragHandle", function(BottomSheetService) {
  return {
    restrict: "A",
    link: function(scope, element) {
      function start(e) {
        scope.$apply(() => {
          BottomSheetService.startDrag(e);
        });
      }

      element.on("mousedown", start);
      element.on("touchstart", start);

      scope.$on("$destroy", () => {
        element.off("mousedown", start);
        element.off("touchstart", start);
      });
    }
  };
});
