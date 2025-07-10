angular
  .module("myApp")
  .controller(
    "BusController",
    function ($scope, $http, $document, $rootScope, $mdBottomSheet) {
      $scope.transportation_routes = []; // เปลี่ยนชื่อให้ตรงกับโครงสร้าง

      $http
        .get("app/data/bus-travel.json")
        .then(function (response) {
          $scope.transportation_routes = response.data.transportation_routes;
          $scope.stations = response.data.stations;
          $scope.bus_lines_metadata = response.data.bus_lines_metadata;
        })
        .catch(function (error) {
          console.error("เกิดข้อผิดพลาดในการโหลด JSON", error);
        });

      $scope.getStationName = function (station_id) {
        const station = ($scope.stations || []).find(
          (s) => s.station_id === station_id
        );
        return station ? station.name : "ไม่พบสถานี";
      };

      $scope.getBusNumber = function (bus_id) {
        const bus = ($scope.bus_lines_metadata || []).find(
          (b) => b.bus_id === bus_id
        );
        return bus ? bus.bus_number : "ไม่ทราบหมายเลขรถ";
      };

      // คืน class สีของ border ตามประเภทการเดินทาง
      $scope.getBorderClass = function (route_name) {
        const name = (route_name || "").trim().toUpperCase();

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

      $scope.startDrag = function (event) {
        event.preventDefault();
        event.stopPropagation();

        const isTouchEvent = event.type.startsWith("touch");
        const sheet = document.getElementById("bottomSheet");
        const startY = isTouchEvent ? event.touches[0].pageY : event.pageY;
        const initialHeight = sheet.offsetHeight;
        const vh = window.innerHeight / 100;

        if ($rootScope.leafletMap?.dragging) {
          $rootScope.leafletMap.dragging.disable();
        }

        let currentHeightVH = initialHeight / vh;

        function onMove(e) {
          e.preventDefault();
          e.stopPropagation();

          const moveY = e.type.startsWith("touch")
            ? e.touches[0].pageY
            : e.pageY;
          const deltaY = startY - moveY;

          currentHeightVH = (initialHeight + deltaY) / vh;
          currentHeightVH = Math.max(30, Math.min(60, currentHeightVH));
          sheet.style.height = currentHeightVH + "vh";

          updateGpsButtonPosition(currentHeightVH);
        }

        function onEnd(e) {
          e.preventDefault();
          e.stopPropagation();

          $document.off("mousemove", onMove);
          $document.off("mouseup", onEnd);
          $document.off("touchmove", onMove);
          $document.off("touchend", onEnd);

          if ($rootScope.leafletMap?.dragging) {
            $rootScope.leafletMap.dragging.enable();
          }

          // ✅ Snap ไปที่ระดับใกล้สุด: 30, 45, 60
          const snapLevels = [30, 45, 60];
          const closest = snapLevels.reduce((prev, curr) =>
            Math.abs(curr - currentHeightVH) < Math.abs(prev - currentHeightVH)
              ? curr
              : prev
          );

          sheet.style.height = closest + "vh";
          updateGpsButtonPosition(closest);

          $scope.isExpanded = closest >= 45;
          $scope.$apply();
        }

        $document.on("mousemove", onMove);
        $document.on("mouseup", onEnd);
        $document.on("touchmove", onMove);
        $document.on("touchend", onEnd);
      };

      window.startDrag = $scope.startDrag;

      updateGpsButtonPosition(20);
      function updateGpsButtonPosition(bottomSheetHeightVH) {
        const gpsButton = document.getElementById("gpsButton");
        if (!gpsButton) return;

        const vh = window.innerHeight / 100;
        const offsetY = 4 * vh;
        const bottomPx = bottomSheetHeightVH * vh + offsetY;

        gpsButton.style.bottom = bottomPx + "px";
      }

      //ส่วนแบ่ง Step
      $scope.currentStep = 1;

      $scope.selectedRoute = null;

      $scope.goToStep = function (step, route) {
        $scope.currentStep = step;
        // ถ้าเข้าสต็ป 2 ให้เก็บ station ที่เลือกไว้
        if (step === 2 && route) {
          $scope.selectedRoute = route;
        }
      };

      $scope.goBackToStep1 = function () {
        $scope.currentStep = 1;
        $scope.selectedRoute = null; // reset ค่า
      };

      // ส่วนจัดการ Step 2

      $scope.getBorderStation = function (route_name) {
        const name = (route_name || "").trim().toUpperCase();

        if (name === "EXPRESS") return "border-pink-2";
        if (name === "B LINE") return "border-orange-2";
        if (name === "F LINE") return "border-green-2";

        return "";
      };

      $scope.getBusClass = function (route_name) {
        const name = (route_name || "").trim().toUpperCase();

        if (name === "EXPRESS") return "bus-wrapper-pink";
        if (name === "B LINE") return "bus-wrapper-orange";
        if (name === "F LINE") return "bus-wrapper-green";

        return "";
      };
    }
  );
