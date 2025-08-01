angular
  .module("myApp")
  .controller(
    "BuslineController",
    function ($scope, $http, $document, $rootScope, $mdBottomSheet) {
      $http
        .get("app/data/bus-travel.json")
        .then(function (response) {
          $scope.stations = response.data.stations;
          $scope.bus_arrivals = response.data.bus_arrivals;
        })
        .catch(function (error) {
          console.error("เกิดข้อผิดพลาดในการโหลด JSON", error);
        });

      $scope.getStationNameById = function (stationId) {
        const station = $scope.stations.find((s) => s.station_id === stationId);
        return station ? station.name : "ไม่พบข้อมูลสถานี";
      };

      $scope.getBusVerticalClass = function (route_id) {
        const name = (route_id || "").trim().toUpperCase();
        if (name === "EXP") return "bus-connector-pink";
        if (name === "B") return "bus-connector-orange";
        if (name === "F") return "bus-connector-green";
        return "";
      };


    

      $scope.listItemClick = function ($index) {
        var clickedItem = $scope.items[$index];
        $mdBottomSheet.hide(clickedItem);
      };

      $scope.buslineStartDrag = function (event) {
        event.preventDefault();
        event.stopPropagation();

        const isTouchEvent = event.type.startsWith("touch");
        const sheet = document.getElementById("buslineSheet");
        const startY = isTouchEvent ? event.touches[0].pageY : event.pageY;
        const initialHeight = sheet.offsetHeight;
        const vh = window.innerHeight / 100;

        if ($scope.leafletMap?.dragging) {
          $scope.leafletMap.dragging.disable();
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

          buslineGpsButtonPosition(currentHeightVH);
        }

        function onEnd(e) {
          e.preventDefault();
          e.stopPropagation();

          $document.off("mousemove", onMove);
          $document.off("mouseup", onEnd);
          $document.off("touchmove", onMove);
          $document.off("touchend", onEnd);

          if ($scope.leafletMap?.dragging) {
            $scope.leafletMap.dragging.enable();
          }

          // ✅ Snap ไปที่ระดับใกล้สุด: 30, 45, 60
          const snapLevels = [30, 45, 60];
          const closest = snapLevels.reduce((prev, curr) =>
            Math.abs(curr - currentHeightVH) < Math.abs(prev - currentHeightVH)
              ? curr
              : prev
          );

          sheet.style.height = closest + "vh";
          buslineGpsButtonPosition(closest);

          $scope.isExpanded = closest >= 45;
          $scope.$apply();
        }

        $document.on("mousemove", onMove);
        $document.on("mouseup", onEnd);
        $document.on("touchmove", onMove);
        $document.on("touchend", onEnd);

      };

      window.buslineStartDrag = $scope.buslineStartDrag;

      buslineGpsButtonPosition(30);
      function buslineGpsButtonPosition(bottomSheetHeightVH) {
        const gpsButton = document.getElementById("gpsButton");
        if (!gpsButton) return;

        const vh = window.innerHeight / 100;

        // เช็คว่าเป็นมือถือหรือแท็บเล็ต (iPad)
        const screenWidth = window.innerWidth;
        let offsetY;

        if (screenWidth <= 767) {
          // โทรศัพท์มือถือ
          offsetY = -8 * vh;
        } else {
          // ไอแพดหรือหน้าจอใหญ่กว่า
          offsetY = -4 * vh;
        }

        const bottomPx = bottomSheetHeightVH * vh + offsetY;
        gpsButton.style.bottom = bottomPx + "px";
      }

      
    }
  );
