angular
  .module("myApp")
  .controller(
    "BuslineController",
    function (
      $scope,
      $http,
      $document,
      $rootScope,
      $mdBottomSheet,
      BusLineService,
      $q
    ) {
      $scope.busStations = [];
      $scope.step = 1;

      // ✅ ฟังก์ชันดึงข้อมูลจาก API
      function fetchBusStations() {
        var startId = $rootScope.selectedStartlocation
          ? $rootScope.selectedStartlocation.locationId
          : "";
        var destinationId = $rootScope.selectedEndlocation
          ? $rootScope.selectedEndlocation.locationId
          : "";

        if (!startId || !destinationId) {
          console.warn("กรุณาเลือกต้นทางและปลายทางให้ครบ");
          return;
        }

        BusLineService.getBusStation(startId, destinationId)
          .then(function (response) {
            var busIncoming = response.data.busIncomings || [];
            console.log("Fetched busIncoming:", busIncoming);

            return BusLineService.getCurrent().then(function (currentResponse) {
              var currentBuses = currentResponse.data.buses || [];
              console.log("Fetched current buses:", currentBuses);

              // merge เฉพาะรถที่ boxId ตรงกัน
              var mergedBuses = busIncoming.map(function (incomingBus) {
                var match = currentBuses.find(
                  (currentBus) => currentBus.boxId === incomingBus.boxId
                );

                if (match) {
                  // merge ข้อมูล + แทน currentStationName ด้วย currentStation
                  return Object.assign({}, incomingBus, match, {
                    currentStationName: match.currentStation,
                  });
                } else {
                  return incomingBus;
                }
              });

              $scope.busStations = mergedBuses;
              console.log("✅ Merged and matched buses:", $scope.busStations);

              // เลือก bus ปัจจุบัน
              if (mergedBuses.length > 0) {
                $scope.selectedBus = [mergedBuses[0]];
                console.log("Selected bus:", $scope.selectedBus);
              } else {
                $scope.selectedBus = [];
              }
            });
          })
          .catch(function (error) {
            console.error(
              "❌ Error fetching bus stations or current data:",
              error
            );
          });
      }

      fetchBusStations();

      $scope.getBusVerticalClass = function (groupBusLineId) {
        const id = parseInt(groupBusLineId, 10);
        if (isNaN(id) || id < 1 || id > 150) return "";

        const colors = [
          "bus-connector-green",
          "bus-connector-pink",
          "bus-connector-orange",
        ];
        const index = (id - 1) % colors.length; // ทำให้วนรอบ 3 สี
        return colors[index];
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
          const gpsButton = document.getElementById("gpsButton");
          if (gpsButton) {
            gpsButton.style.display = "none";
          }
          const moveY = e.type.startsWith("touch")
            ? e.touches[0].pageY
            : e.pageY;
          const deltaY = startY - moveY;
          currentHeightVH = (initialHeight + deltaY) / vh;
          currentHeightVH = Math.max(30, Math.min(80, currentHeightVH));
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
          const snapLevels = [30, 60, 80];
          const closest = snapLevels.reduce((prev, curr) =>
            Math.abs(curr - currentHeightVH) < Math.abs(prev - currentHeightVH)
              ? curr
              : prev
          );
          $scope.sheetHeightVH = closest;
          sheet.style.height = $scope.sheetHeightVH + "vh";
          const gpsButton = document.getElementById("gpsButton");
          if (gpsButton) {
            gpsButton.style.transition = "none";
            gpsButton.style.opacity = "1";
            gpsButton.style.display = "block";
            buslineGpsButtonPosition($scope.sheetHeightVH);
          }
          $scope.isExpanded = $scope.sheetHeightVH >= 50;
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
        const screenWidth = window.innerWidth;
        let offsetY;
        if (screenWidth <= 767) {
          offsetY = -8 * vh;
        } else {
          offsetY = -4 * vh;
        }
        const bottomPx = bottomSheetHeightVH * vh + offsetY;
        gpsButton.style.bottom = bottomPx + "px";
      }

      $rootScope.$on("swapStations", function () {
        fetchBusStations();
      });

      $rootScope.$on("locationChanged", function () {
        fetchBusStations();
      });

      $scope.goToStep = function (step, boxId) {
        $scope.step = step;
        if (step === 2) {
          const selected = $scope.busStations.find((b) => b.boxId === boxId);
          $scope.selectedBus = selected ? [selected] : []; // เก็บเป็น array
        }
      };

      $scope.goBackToStep1 = function () {
        $scope.step = 1;
        fetchBusStations();
      };
    }
  );
