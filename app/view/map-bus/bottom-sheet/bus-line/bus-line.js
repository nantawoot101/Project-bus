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
      BottomSheetService,
      BusTravelService,
      $timeout,
      $rootScope,
      $interval
    ) {
      $scope.busStations = [];
      $scope.busLines = [];
      $scope.current = [];
      $scope.selectedBusNumber = null;
      $scope.step = 1;

      // ---------- ฟังก์ชันดึงข้อมูลจาก API -------------
      // ------------------ ตัวแปรป้องกันการเรียกซ้อน ------------------
      $scope.fetchingBusStations = false;

      // ------------------ ฟังก์ชัน fetchBusStations ------------------
      $scope.fetchBusStations = function () {
        var startId = $rootScope.selectedStartlocation?.locationId || "";
        var destinationId = $rootScope.selectedEndlocation?.locationId || "";

        if ($scope.fetchingBusStations) return;
        $scope.fetchingBusStations = true;

        if (!startId || !destinationId) {
          console.warn("กรุณาเลือกต้นทางและปลายทางให้ครบ");
          $scope.fetchingBusStations = false;
          return;
        }

        BusLineService.getMergedBusIncoming(startId, destinationId)
          .then(function (mergedBuses) {
            $scope.busStations = mergedBuses;
            console.log("✅ Merged buses:", $scope.busStations);
          })
          .catch(function (error) {
            console.error("❌ Error fetching merged data:", error);
          })
          .finally(function () {
            $scope.fetchingBusStations = false;
          });
      };

      // ------------------ ใช้ $interval เรียกทุก 5 วินาที ------------------
      var fetchInterval = $interval($scope.fetchBusStations, 5000);

      // ------------------ ยกเลิก $interval เมื่อ scope ถูกทำลาย ------------------
      $scope.$on("$destroy", function () {
        $interval.cancel(fetchInterval);
      });

      // ------------------ ฟัง event จาก $rootScope ------------------
      $rootScope.$on("swapStations", function () {
        $scope.fetchBusStations();
      });

      $rootScope.$on("locationChanged", function () {
        $scope.fetchBusStations();
      });

      // ---------------------------------------------

      // ------------------- สีหลักของรถ -------------------
      const busColors = ["green", "pink", "orange"]; // สอดคล้องกับลำดับสีที่ต้องการ

      function getColorById(id) {
        id = Number(id || 0);
        if (id > 200) id = 200;
        return busColors[id % busColors.length]; // modulo 3 → 0=green,1=pink,2=orange
      }

      // ------------------- ฟังก์ชัน AngularJS -------------------
      $scope.getBusVerticalClass = function (id) {
        return `bus-connector-${getColorById(id)}`;
      };

      $scope.getBusClass = (id) => `bus-wrapper-${getColorById(id)}`;

      $scope.getBorderToStation = function (busGroupId, idx) {
        const pos =
          BusTravelService.lastKnownBusPositions[$scope.selectedBusNumber];
        let currentStationIdx = -1;

        if (pos) {
          currentStationIdx = pos.type === "station" ? pos.idx : pos.idx + 1;
        }

        return idx <= currentStationIdx
          ? "border-gray-2"
          : `border-${getColorById(busGroupId)}-2`;
      };

      $scope.getConnectorClass = function (busGroupId, idx) {
        if (!$scope.selectedBusNumber)
          return `vertical-connector-${getColorById(busGroupId)}`;

        const lastPos =
          BusTravelService.lastKnownBusPositions[$scope.selectedBusNumber];
        if (!lastPos) return `vertical-connector-${getColorById(busGroupId)}`;

        let currentStationIdx = lastPos.idx;
        const isBetweenStations = lastPos.type === "segment";

        // ถ้ารถอยู่ระหว่างสถานี currentStationIdx คือ segment ปัจจุบัน
        if (isBetweenStations) {
          return idx <= currentStationIdx
            ? "vertical-connector-gray"
            : `vertical-connector-${getColorById(busGroupId)}`;
        } else {
          // รถจอดอยู่ที่สถานี currentStationIdx
          if (idx < currentStationIdx)
            return "vertical-connector-gray"; // ผ่านไปแล้ว
          else return `vertical-connector-${getColorById(busGroupId)}`; // ปัจจุบันหรือข้างหน้า
        }
      };

      $scope.getDotColorClass = function (busGroupId, idx) {
        let currentStationIdx = -1;

        if (
          $scope.selectedBusNumber &&
          BusTravelService.lastKnownBusPositions[$scope.selectedBusNumber]
        ) {
          const pos =
            BusTravelService.lastKnownBusPositions[$scope.selectedBusNumber];
          currentStationIdx = pos.type === "station" ? pos.idx : pos.idx + 1;
        }
        return idx <= currentStationIdx
          ? "dot-gray"
          : `dot-${getColorById(busGroupId)}`;
      };

      // ------------- Bottom Sheet -------------
      $scope.sheetHeightVH = 30;
      $scope.sheetHeightVH = BottomSheetService.getSheetHeight();
      $scope.isExpanded = BottomSheetService.isExpanded();
      $timeout(function () {
        BottomSheetService.setSheet("buslineSheet");
      }, 0);

      BottomSheetService.updateGpsButtonPosition($scope.sheetHeightVH);

      // -----------------------------------------------

      $scope.loadBusLineById = function (busLineId) {
        return BusLineService.getBusLineById(busLineId).then((response) => {
          if (Array.isArray(response.data) && response.data.length > 0) {
            $scope.selectedRoute = response.data[0];
            $scope.selectedRoute.station =
              $scope.selectedRoute.busLineStations || [];
          } else {
            $scope.selectedRoute = { station: [] };
          }
          $rootScope.selectedRoute = $scope.selectedRoute;
          return $scope.selectedRoute;
        });
      };

      $scope.loadCurrentBuses = function (busLineId) {
        return BusLineService.getCurrent().then((res) => {
          const allBuses = Array.isArray(res.data.buses) ? res.data.buses : [];

          if ($scope.selectedBusNumber) {
            $scope.current = allBuses.filter(
              (bus) =>
                String(bus.vehicleName) === String($scope.selectedBusNumber)
            );
          } else {
            $scope.current = allBuses.filter(
              (bus) => String(bus.busLineId) === String(busLineId)
            );
          }

          $scope.selectedRoute = BusTravelService.mapBusesToStations(
            $scope.selectedRoute,
            $scope.current,
            $scope.step,
            $scope.selectedBusNumber
          );
          $scope.$applyAsync();
          return $scope.current;
        });
      };

      // ---------- ฟังก์ชันเปลี่ยน step -------------

      $scope.goToStep = function (step, boxId) {
        $scope.step = step;

        if (step === 2) {
          const selected = $scope.busStations.find((b) => b.boxId === boxId);
          if (!selected) {
            $scope.selectedBus = [];
            return;
          }

          $scope.selectedBusNumber = selected.vehicleName;

          $scope.loadBusLineById(selected.busLineId).then((route) => {
            $rootScope.selectedRoute = route;
            $scope.selectedBus = route.station || [];

            $scope.loadCurrentBuses(selected.busLineId).then((buses) => {
              // map buses → route
              $rootScope.selectedRoute = BusTravelService.mapBusesToStations(
                $rootScope.selectedRoute,
                buses,
                3,
                $scope.selectedBusNumber
              );

              // $rootScope.$broadcast("showBus", $scope.selectedBusNumber, false);

              $scope.selectedBus.forEach((station) => {
                station.buses_in_transit_to_next_stop =
                  station.buses_in_transit_to_next_stop || [];
              });
            });
          });
        }
      };

      $scope.goBackToStep1 = function () {
        $scope.step = 1;
      };
    }
  );
