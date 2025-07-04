angular
  .module("myApp")
  .controller(
    "BusController",
    function ($scope, $mdBottomSheet, $http, $document) {
      $scope.station = [];
      $scope.transportation = [];

      $http
        .get("app/data/bus-travel.json")
        .then(function (response) {
          $scope.station = response.data.station;
          $scope.transportation = response.data.transportation;

          // 🧠 สร้าง Map เพื่อ lookup ชื่อ transportation
          $scope.transportationMap = {};
          $scope.transportation.forEach(function (t) {
            $scope.transportationMap[t.id] = t.name;
          });
        })
        .catch(function (error) {
          console.error("เกิดข้อผิดพลาดในการโหลด JSON", error);
        });

      $scope.getTransportationName = function (transportation_id) {
        return $scope.transportationMap[transportation_id] || "ไม่พบข้อมูล";
      };

      $scope.getBorderClass = function (transportation_id) {
        const name = ($scope.transportationMap[transportation_id] || "")
          .trim()
          .toUpperCase();

        if (name === "EXPRESS") return "border-pink";
        if (name === "B LINE") return "border-orange";
        if (name === "F LINE") return "border-green";

        return "";
      };

      $scope.isExpanded = false;

      $scope.listItemClick = function ($index) {
        var clickedItem = $scope.items[$index];
        $mdBottomSheet.hide(clickedItem);
      };

      $scope.sheetHeight = 20;
      let rafId = null;

      $scope.startDrag = function (event) {
        event.preventDefault();

        const startY = event.pageY || event.touches[0].pageY;
        const initialHeight = $scope.sheetHeight;

        function onMove(e) {
          const currentY = e.pageY || e.touches[0].pageY;
          const deltaY = startY - currentY;

          let newHeight = initialHeight + (deltaY / window.innerHeight) * 100;
          newHeight = Math.max(20, Math.min(60, newHeight)); // จำกัดไว้ระหว่าง 20–80vh

          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            $scope.$apply(() => {
              $scope.sheetHeight = newHeight;
            });
          });
        }

        function onEnd() {
          $document.off("mousemove touchmove", onMove);
          $document.off("mouseup touchend", onEnd);
        }

        $document.on("mousemove touchmove", onMove);
        $document.on("mouseup touchend", onEnd);
      };
    }
  );
