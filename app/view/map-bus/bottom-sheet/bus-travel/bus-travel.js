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
      BusSelectionService,
      BusLineService,
      $stateParams
    ) {
      $scope.sheetHeightVH = 30;
      $scope.step = 1;
      $scope.selectedRoute = null;
      $scope.busLines = [];
      $scope.busLineStationsMap = {};
      $scope.current = [];
      $scope.selectedBusNumber = null;

      // --- โหลด busLines และ stations ---
      BusLineService.getBusLine()
        .then((response) => {
          $scope.busLines = response.data;

          let promises = $scope.busLines.map((line) => {
            return BusLineService.getBusLineById(line.busLineId).then((res) => {
              let stations = Array.isArray(res.data)
                ? res.data
                : res.data.busLineStations || [];

              if (stations.length > 0 && stations[0].busLineStations) {
                stations = stations[0].busLineStations;
              }

              $scope.busLineStationsMap[line.busLineId] = stations;
              line.busLineStations = stations;
              line.endLocationName =
                stations.length > 0
                  ? stations[stations.length - 1].locationName
                  : "ไม่พบข้อมูลปลายทาง";
            });
          });

          Promise.all(promises).then(() => {
            if (!$scope.$$phase) $scope.$apply();
            console.log("Updated busLines:", $scope.busLines);
          });
        })
        .catch((error) => {
          console.error("Error loading busLines:", error);
        });

      // --- Drag Bottom Sheet ---
      $scope.startDrag = function (event) {
        event.preventDefault();
        event.stopPropagation();
        const isTouchEvent = event.type.startsWith("touch");
        const sheet = document.getElementById("bottomSheet");
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
          currentHeightVH = Math.max(30, Math.min(90, currentHeightVH));
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
          if ($scope.leafletMap?.dragging) {
            $scope.leafletMap.dragging.enable();
          }
          const snapLevels = [30, 60, 90];
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
            updateGpsButtonPosition($scope.sheetHeightVH);
          }
          $scope.isExpanded = $scope.sheetHeightVH >= 50;
          $scope.$apply();
        }
        $document.on("mousemove", onMove);
        $document.on("mouseup", onEnd);
        $document.on("touchmove", onMove);
        $document.on("touchend", onEnd);
      };
      window.startDrag = $scope.startDrag;
      function updateGpsButtonPosition(bottomSheetHeightVH) {
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

      // --- Map buses to stations ---
      function mapBusesToStations() {
        if (!$scope.selectedRoute || !$scope.selectedRoute.busLineStations)
          return;

        const distanceThreshold = 0.0005;

        $scope.selectedRoute.busLineStations.forEach((station, index, arr) => {
          station.passing_bus_numbers = [];
          station.buses_in_transit_to_next_stop = [];
        });

        $scope.current.forEach((bus) => {
          // ดึงค่าพิกัด
          const busLat =
            bus.latitude ||
            bus.lat ||
            (bus.gps && (bus.gps.latitude || bus.gps.lat));
          const busLng =
            bus.longitude ||
            bus.lng ||
            (bus.gps && (bus.gps.longitude || bus.gps.lng));

          if (busLat == null || busLng == null) return;

          // กรองเฉพาะ Step 3 ถ้ามี bus เลือก
          if ($scope.step === 3 && $scope.selectedBusNumber) {
            if (String(bus.vehicleName) !== String($scope.selectedBusNumber))
              return;
          }

          let assigned = false; // flag สำหรับรถคันนี้

          $scope.selectedRoute.busLineStations.forEach(
            (station, index, arr) => {
              if (assigned) return; // ถ้า assign แล้ว ข้าม

              const latDiff = Math.abs(busLat - station.latitude);
              const lngDiff = Math.abs(busLng - station.longitude);

              if (
                latDiff <= distanceThreshold &&
                lngDiff <= distanceThreshold
              ) {
                // รถจอดตรงสถานี
                station.passing_bus_numbers.push(bus.vehicleName);
                assigned = true; // assign แล้ว
              } else if (!assigned && index < arr.length - 1) {
                // รถอยู่ระหว่างสถานี
                const nextStation = arr[index + 1];
                const distanceToLine = distanceToSegment(
                  busLat,
                  busLng,
                  station.latitude,
                  station.longitude,
                  nextStation.latitude,
                  nextStation.longitude
                );
                if (distanceToLine <= distanceThreshold) {
                  station.buses_in_transit_to_next_stop.push(bus.vehicleName);
                  assigned = true; // assign แล้ว
                }
              }
            }
          );
        });

        console.log(
          "Stations after mapping:",
          $scope.selectedRoute.busLineStations
        );

      }

      function distanceToSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1,
          B = py - y1,
          C = x2 - x1,
          D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        const param = len_sq !== 0 ? dot / len_sq : -1;
        let xx, yy;
        if (param < 0) {
          xx = x1;
          yy = y1;
        } else if (param > 1) {
          xx = x2;
          yy = y2;
        } else {
          xx = x1 + param * C;
          yy = y1 + param * D;
        }
        return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2);
      }

      $scope.loadBusLineAndCurrent = function (busLineId) {
        $scope.selectedRoute = null; // ✅ เคลียร์ก่อนโหลด
        $rootScope.selectedRoute = null;

        return Promise.all([
          BusLineService.getBusLineById(busLineId).then((response) => {
            if (Array.isArray(response.data) && response.data.length > 0) {
              $scope.selectedRoute = response.data[0];
              // ให้ station ชี้ไปที่ busLineStations
              $scope.selectedRoute.station =
                $scope.selectedRoute.busLineStations || [];
            } else {
              $scope.selectedRoute = { station: [] };
            }
            $rootScope.selectedRoute = $scope.selectedRoute;
          }),

          BusLineService.getCurrent().then((res) => {
            const allBuses = Array.isArray(res.data.buses)
              ? res.data.buses
              : [];
            if ($scope.step === 3 && $scope.selectedBusNumber) {
              $scope.current = allBuses.filter(
                (bus) =>
                  String(bus.vehicleName) === String($scope.selectedBusNumber)
              );
            } else {
              $scope.current = allBuses.filter(
                (bus) => String(bus.busLineId) === String(busLineId)
              );
            }
            mapBusesToStations();
            $scope.$applyAsync();
          }),
        ]);
      };

      // --- Step change ---
      $scope.goToStep = function (step, busLineId, bus) {
        $scope.step = step;
      

        if (step === 2 && busLineId) {
          $scope.loadBusLineAndCurrent(busLineId).then(() => {
            $rootScope.$broadcast("routeSelected", $scope.selectedRoute);
            $rootScope.$broadcast("clearMap");
          });
        }

        if (step === 3 && busLineId) {
          $rootScope.$broadcast("clearMap");
          $scope.loadBusLineAndCurrent(busLineId).then(() => {
            if (
              $scope.selectedRoute &&
              Array.isArray($scope.selectedRoute.station)
            ) {
              $rootScope.$broadcast("showBus", $scope.selectedBusNumber);
            } else {
              console.warn("❌ ไม่มีข้อมูลสถานีใน selectedRoute");
            }
          });
        }
      };

      $scope.goBackToStep1 = function () {
        $scope.step = 1;
        $scope.selectedRoute = null;
        $scope.selectedBusNumber = null;
        $rootScope.$broadcast("clearMap");
      };

      $scope.goBackToStep2 = function (busLineId) {
        $scope.step = 2;
        $scope.selectedBusNumber = null;
        $rootScope.$broadcast("clearBusMap");
        $rootScope.$broadcast("routeSelected", $scope.selectedRoute);
        };

      // --- Modal ---
      $scope.modalBusList = [];
      $scope.togglePopup = function ($event, stations, busLines, isTransit) {
        $event.stopPropagation();
        $scope.modalBusList = isTransit
          ? stations.buses_in_transit_to_next_stop
          : stations.passing_bus_numbers;
        BusSelectionService.setStation(stations);
        BusSelectionService.setBusLine(busLines);
        BusSelectionService.setTransitMode(!!isTransit);
        BusSelectionService.setShowModal(true);
        $scope.showBusSelectionModal = true;
      };
      $scope.selectBus = function (bus) {
        BusSelectionService.setBusNumber(bus);
      };
      $scope.confirmSelection = function () {
        const selected = BusSelectionService.getSelectedData();
        if (selected.busNumber) {
          $scope.showBusSelectionModal = false;
          $scope.step = 3;
          $scope.selectedBusNumber = selected.busNumber;
          $rootScope.$broadcast("clearMap");

          if ($scope.selectedRoute && $scope.selectedRoute.busLineId) {
            $scope
              .loadBusLineAndCurrent($scope.selectedRoute.busLineId)
              .then(() => {
                if (
                  $scope.selectedRoute &&
                  Array.isArray($scope.selectedRoute.busLineStations)
                ) {
                  $rootScope.$broadcast("showBus", $scope.selectedBusNumber);
                } else {
                  console.warn("❌ ไม่มีข้อมูลสถานีใน selectedRoute");
                }
              });
          }
        } else {
          alert("กรุณาเลือกรถก่อนกดยืนยัน");
        }
      };

      $scope.closeBusSelectionModal = function () {
        $scope.showBusSelectionModal = false;
        BusSelectionService.setShowModal(false);
      };

      // --- Class Helpers ---
      const busClassMap = {
        11: "pink",
        21: "orange",
        31: "green",
      };

      $scope.getBorderClass = (id) =>
        busClassMap[id?.trim()] ? `border-${busClassMap[id]}` : "border-gray";
      $scope.getBorderStation = (id) =>
        busClassMap[id?.trim()] ? `border-${busClassMap[id]}-2` : "";
      $scope.getVerticalClass = (id) =>
        busClassMap[id?.trim()] ? `vertical-connector-${busClassMap[id]}` : "";
      $scope.getBusClass = (id) =>
        busClassMap[id?.trim()] ? `bus-wrapper-${busClassMap[id]}` : "";
      $scope.getDotColorClass = (id) =>
        busClassMap[id?.trim()] ? `dot-${busClassMap[id]}` : "";
      $scope.getBorderStep3_Station = (id) =>
        busClassMap[id?.trim()] ? `border-${busClassMap[id]}-2` : "";
      $scope.getModalClass = (id) =>
        busClassMap[id?.trim()] ? `modal-body-${busClassMap[id]}` : "";
      $scope.getModalSelectClass = (id) =>
        busClassMap[id?.trim()] ? `bus-select-btn-${busClassMap[id]}` : "";
      $scope.getModalButtonClass = (id) =>
        busClassMap[id?.trim()] ? `button-modal-${busClassMap[id]}` : "";

      $scope.getConnectorClass = function (route) {
        // ป้องกัน error passedCurrent undefined
        var passedCurrent = route && route.passedCurrent ? true : false;
        var passedNext = route && route.passedNext ? true : false;

        if (passedCurrent && passedNext) {
          return "vertical-connector-gray";
        }

        var busGroupId = (route && route.busGroupId ? route.busGroupId : "")
          .trim()
          .toUpperCase();

        if (busGroupId === "11") return "vertical-connector-pink";
        if (busGroupId === "21") return "vertical-connector-orange";
        if (busGroupId === "31") return "vertical-connector-green";

        return "";
      };
    }
  );
