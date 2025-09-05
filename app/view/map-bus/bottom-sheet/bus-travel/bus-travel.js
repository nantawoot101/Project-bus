angular
  .module("myApp")
  .controller(
    "BusController",
    function (
      $scope,
      $http,
      $document,
      $rootScope,
      $mdBottomSheet,
      BusLineService,
      $interval,
      BottomSheetService,
      $timeout,
      BusTravelService
    ) {
      $scope.step = 1;
      $scope.selectedRoute = null;
      $scope.busLines = [];
      $scope.busLineStationsMap = {};
      $scope.current = [];
      $scope.selectedBusNumber = null;

      function fetchBusLines() {
        BusLineService.getAllBusLinesWithStations()
          .then((busLines) => {
            $scope.busLines = busLines;
            console.log("สายรถบัส:", $scope.busLines);
          })
          .catch((err) => {
            console.error("โหลด busLines ผิดพลาด:", err);
          });
      }

      // เรียกใช้ตอนเริ่มต้น
      fetchBusLines();

      // ---------------------------------- Bottom Sheet ----------------------------------
      $scope.sheetHeightVH = 30;
      $scope.isExpanded = BottomSheetService.isExpanded();
      $timeout(function () {
        BottomSheetService.setSheet("bottomSheet");
      }, 0);

      BottomSheetService.updateGpsButtonPosition($scope.sheetHeightVH);

      // -----------------------------------------------------------------------------------

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

      var refreshInterval = null;
      $scope.goToStep = function (step, busLineId, bus) {
        $scope.step = step;

        // ยกเลิก interval เก่าก่อน
        if (refreshInterval) {
          $interval.cancel(refreshInterval);
          refreshInterval = null;
        }

        if (step === 2) {
          $scope.selectedBusNumber = null;
          $rootScope.$broadcast("clearMap");

          // โหลด route + bus
          $scope
            .loadBusLineById(busLineId)
            .then(() => $scope.loadCurrentBuses(busLineId))
            .then(() => {
              $rootScope.$broadcast("routeSelected", $scope.selectedRoute);
            });

          // ตั้ง interval โหลดเฉพาะ bus ทุก 5 วินาที
          refreshInterval = $interval(() => {
            if ($scope.step === 2) {
              $scope.loadCurrentBuses(busLineId);
            }
          }, 5000);
        }

        if (step === 3) {
          $scope.selectedBusNumber = bus; // เลือก bus ที่ต้องการดู
          $rootScope.$broadcast("clearMap"); // clear map ตอนแรก

          // โหลด bus ครั้งแรก
          $scope.loadCurrentBuses(busLineId).then(() => {
            if ($scope.selectedRoute) {
              $rootScope.$broadcast("showBus", $scope.selectedBusNumber, false);
            }
          });

          // ตั้ง interval โหลดเฉพาะ bus ทุก 5 วินาที
          refreshInterval = $interval(() => {
            if ($scope.step === 3) {
              $scope.loadCurrentBuses(busLineId).then(() => {
                $rootScope.$emit("showBus", $scope.selectedBusNumber, true);
              });
            }
          }, 5000);
        }
      };

      $scope.goBackToStep1 = function () {
        $scope.step = 1;
        $scope.selectedRoute = null;
        $scope.selectedBusNumber = null;

        if (refreshInterval) {
          $interval.cancel(refreshInterval);
          refreshInterval = null;
        }

        $rootScope.$broadcast("clearMap");
      };

      $scope.goBackToStep2 = function (busLineId) {
        $scope.step = 2;
        $scope.selectedBusNumber = null; // เคลียร์ bus
        $rootScope.$broadcast("clearBusMap");

        const lineId =
          busLineId || ($scope.selectedRoute && $scope.selectedRoute.busLineId);

        if (lineId) {
          $scope
            .loadBusLineById(lineId)
            .then(() => $scope.loadCurrentBuses(lineId))
            .then(() => {
              $rootScope.$broadcast("routeSelected", $scope.selectedRoute);
            });
        }

        // ตั้ง interval ใหม่สำหรับ Step 2
        if (refreshInterval) {
          $interval.cancel(refreshInterval);
        }
        refreshInterval = $interval(() => {
          if ($scope.step === 2) {
            $scope.loadCurrentBuses(lineId);
          }
        }, 5000);
      };

      // --- Modal ---
      $scope.modalBusList = [];

      $scope.togglePopup = function ($event, stations, busLines, isTransit) {
        $event.stopPropagation();
        $scope.modalBusList = isTransit
          ? stations.buses_in_transit_to_next_stop
          : stations.passing_bus_numbers;
        $scope.showBusSelectionModal = true;
        $rootScope.$broadcast("hideMapBusButtons"); // 🔥 Hide GPS & search buttons
      };

      // ตอนเลือก bus
      $scope.selectBus = function (bus) {
        console.log("✅ เลือก bus:", bus); // debug ดู property จริง
        $scope.selectedBus = bus;
      };

      // ปิด modal
      $scope.closeBusSelectionModal = function () {
        $scope.showBusSelectionModal = false;
        $rootScope.$broadcast("showMapBusButtons"); // 🔥 Show GPS & search buttons
      };

      // ตอนกดยืนยัน
      $scope.confirmSelection = function () {
        if ($scope.selectedBus) {
          // ถ้า selectedBus เป็น object ให้ใช้ property ถ้ามี
          const busNumber =
            typeof $scope.selectedBus === "object"
              ? $scope.selectedBus.busNumber || $scope.selectedBus.bus_number
              : $scope.selectedBus; // ถ้าเป็น string ใช้ตรง ๆ เลย

          $scope.step = 3;
          $scope.selectedBusNumber = busNumber;
          $scope.showBusSelectionModal = false;
          $rootScope.$broadcast("clearMap");
          $rootScope.$broadcast("showBus", $scope.selectedBusNumber);
          $rootScope.$broadcast("showMapBusButtons"); // 🔥 Show GPS & search buttons
        } else {
          alert("กรุณาเลือกรถก่อนกดยืนยัน");
        }
      };

      // --- Class Helpers ---
      const busColors = ["pink", "orange", "green"];

      function getColorById(id) {
        id = Number(id || 0);
        if (id > 200) id = 200;
        return busColors[id % busColors.length]; // modulo 3 → 0=pink,1=orange,2=green
      }

      // ตัวอย่างฟังก์ชัน AngularJS
      $scope.getBorderClass = (id) => `border-${getColorById(id)}`;
      $scope.getBorderStation = (id) => `border-${getColorById(id)}-2`;
      $scope.getVerticalClass = (id) =>
        `vertical-connector-${getColorById(id)}`;
      $scope.getBusClass = (id) => `bus-wrapper-${getColorById(id)}`;
      $scope.getModalClass = (id) => `modal-body-${getColorById(id)}`;
      $scope.getModalSelectClass = (id) => `bus-select-btn-${getColorById(id)}`;
      $scope.getModalButtonClass = (id) => `button-modal-${getColorById(id)}`;

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
    }
  );
