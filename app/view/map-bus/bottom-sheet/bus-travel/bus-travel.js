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
      $stateParams,
      $interval
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

      // --- Bottom Sheet ---
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

      updateGpsButtonPosition(30);
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

      // --- Map buses to stations --- //
      function haversineDistance(lat1, lon1, lat2, lon2) {
        function toRad(x) {
          return (x * Math.PI) / 180;
        }
        const R = 6371000;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      }

      function haversineDistanceToSegment(px, py, x1, y1, x2, y2) {
        function toRad(x) {
          return (x * Math.PI) / 180;
        }
        function latLngToXYZ(lat, lng) {
          lat = toRad(lat);
          lng = toRad(lng);
          const R = 6371000;
          return [
            R * Math.cos(lat) * Math.cos(lng),
            R * Math.cos(lat) * Math.sin(lng),
            R * Math.sin(lat),
          ];
        }
        const p = latLngToXYZ(px, py);
        const a = latLngToXYZ(x1, y1);
        const b = latLngToXYZ(x2, y2);

        const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
        const ab_ap = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2];
        const ab_ab = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
        let t = ab_ab === 0 ? 0 : ab_ap / ab_ab;
        t = Math.max(0, Math.min(1, t));
        const closest = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
        const dx = p[0] - closest[0];
        const dy = p[1] - closest[1];
        const dz = p[2] - closest[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
      }

      const lastKnownBusPositions = {};

      function mapBusesToStations() {
        if (!$scope.selectedRoute || !$scope.selectedRoute.busLineStations)
          return;

        const stationProximityMeters = 100;
        const segmentProximityMeters = 500;

        $scope.selectedRoute.busLineStations.forEach((station) => {
          station.passing_bus_numbers = [];
          station.buses_in_transit_to_next_stop = [];
        });

        $scope.current.forEach((bus) => {
          const busLat =
            bus.latitude ||
            bus.lat ||
            (bus.gps && (bus.gps.latitude || bus.gps.lat));
          const busLng =
            bus.longitude ||
            bus.lng ||
            (bus.gps && (bus.gps.longitude || bus.gps.lng));

          if (busLat == null || busLng == null) return;

          if ($scope.step === 3 && $scope.selectedBusNumber) {
            if (String(bus.vehicleName) !== String($scope.selectedBusNumber))
              return;
          }

          let closestStationIdx = -1;
          let minStationDist = Infinity;
          let closestSegmentIdx = -1;
          let minSegmentDist = Infinity;

          $scope.selectedRoute.busLineStations.forEach((station, idx, arr) => {
            const distToStation = haversineDistance(
              busLat,
              busLng,
              station.latitude,
              station.longitude
            );
            if (distToStation < minStationDist) {
              minStationDist = distToStation;
              closestStationIdx = idx;
            }
            if (idx < arr.length - 1) {
              const nextStation = arr[idx + 1];
              const distToSegment = haversineDistanceToSegment(
                busLat,
                busLng,
                station.latitude,
                station.longitude,
                nextStation.latitude,
                nextStation.longitude
              );
              if (distToSegment < minSegmentDist) {
                minSegmentDist = distToSegment;
                closestSegmentIdx = idx;
              }
            }
          });

          let busSpeed = bus.speed || (bus.gps && bus.gps.speed);
          let isStationary = busSpeed == null || Number(busSpeed) < 1;
          let assigned = false;

          // ดึงตำแหน่งล่าสุด (ถ้ามี)
          let lastKnown = lastKnownBusPositions[bus.vehicleName];

          // 🟢 จำกัด candidate station/segment ไม่ให้โดดข้าม
          function isValidNextStation(idx) {
            if (!lastKnown) return true; // ถ้าเพิ่งเริ่ม -> ยอมทุกที่
            return Math.abs(idx - lastKnown.idx) <= 2; // ห่างไม่เกิน 2 สถานี
          }
          function isValidNextSegment(idx) {
            if (!lastKnown) return true;
            return Math.abs(idx - lastKnown.idx) <= 2;
          }

          if (
            isStationary &&
            closestStationIdx !== -1 &&
            isValidNextStation(closestStationIdx)
          ) {
            const station =
              $scope.selectedRoute.busLineStations[closestStationIdx];
            if (!station.passing_bus_numbers.includes(bus.vehicleName)) {
              station.passing_bus_numbers.push(bus.vehicleName);
            }
            lastKnownBusPositions[bus.vehicleName] = {
              type: "station",
              idx: closestStationIdx,
            };
            assigned = true;
          } else if (
            minStationDist <= stationProximityMeters &&
            isValidNextStation(closestStationIdx)
          ) {
            const station =
              $scope.selectedRoute.busLineStations[closestStationIdx];
            if (!station.passing_bus_numbers.includes(bus.vehicleName)) {
              station.passing_bus_numbers.push(bus.vehicleName);
            }
            lastKnownBusPositions[bus.vehicleName] = {
              type: "station",
              idx: closestStationIdx,
            };
            assigned = true;
          } else if (
            closestSegmentIdx !== -1 &&
            minSegmentDist <= segmentProximityMeters &&
            isValidNextSegment(closestSegmentIdx)
          ) {
            const station =
              $scope.selectedRoute.busLineStations[closestSegmentIdx];
            if (
              !station.buses_in_transit_to_next_stop.includes(bus.vehicleName)
            ) {
              station.buses_in_transit_to_next_stop.push(bus.vehicleName);
            }
            lastKnownBusPositions[bus.vehicleName] = {
              type: "segment",
              idx: closestSegmentIdx,
            };
            assigned = true;
          }

          // fallback
          if (!assigned && lastKnown) {
            if (lastKnown.type === "station") {
              const station =
                $scope.selectedRoute.busLineStations[lastKnown.idx];
              if (
                station &&
                !station.passing_bus_numbers.includes(bus.vehicleName)
              ) {
                station.passing_bus_numbers.push(bus.vehicleName);
              }
            } else if (lastKnown.type === "segment") {
              const station =
                $scope.selectedRoute.busLineStations[lastKnown.idx];
              if (
                station &&
                !station.buses_in_transit_to_next_stop.includes(bus.vehicleName)
              ) {
                station.buses_in_transit_to_next_stop.push(bus.vehicleName);
              }
            }
          }
        });


      }

      let refreshInterval = null;

      $scope.loadBusLineAndCurrent = function (busLineId, loadRoute = true) {
        const promises = [];

        if (loadRoute) {
          promises.push(
            BusLineService.getBusLineById(busLineId).then((response) => {
              if (Array.isArray(response.data) && response.data.length > 0) {
                $scope.selectedRoute = response.data[0];
                $scope.selectedRoute.station =
                  $scope.selectedRoute.busLineStations || [];
              } else {
                $scope.selectedRoute = { station: [] };
              }
              $rootScope.selectedRoute = $scope.selectedRoute;
            })
          );
        }

        promises.push(
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
          })
        );

        return Promise.all(promises);
      };

      $scope.goToStep = function (step, busLineId, bus) {
        $scope.currentStep = step; // เก็บว่าอยู่สเต็ปไหน
        $scope.step = step;

        if (refreshInterval) {
          $interval.cancel(refreshInterval);
          refreshInterval = null;
        }

        if (step === 2 && busLineId) {
          // เรียก clearMap แค่ตอนแรก
          $rootScope.$broadcast("clearMap");

          // โหลด route + bus ครั้งแรก
          $scope.loadBusLineAndCurrent(busLineId, true).then(() => {
            $rootScope.$broadcast("routeSelected", $scope.selectedRoute);
          });

          // ตั้ง interval โหลดเฉพาะ bus ทุก 5 วินาที
          refreshInterval = $interval(() => {
            $scope.$applyAsync(() => {
              if ($scope.currentStep === 2) {
                // loadRoute = false -> ไม่แก้ route
                $scope.loadBusLineAndCurrent(busLineId, false);
              }
            });
          }, 5000);
        }

        if (step === 3 && busLineId) {
          $scope.selectedBusNumber = bus;

          $rootScope.$broadcast("clearMap"); // เรียกแค่ตอนแรก

          // โหลดข้อมูลครั้งแรกแล้ววาดเส้นทางพร้อมรถบัส
          $scope.loadBusLineAndCurrent(busLineId, false).then(() => {
            if ($scope.selectedRoute) {
              $rootScope.$broadcast("showBus", $scope.selectedBusNumber, false); // false = ไม่ใช่แค่ update
            }
          });

          // ตั้ง interval โหลดเฉพาะตำแหน่ง bus และสถานี (ไม่โหลด route ใหม่)
          refreshInterval = $interval(() => {
            $scope.$applyAsync(() => {
              if ($scope.currentStep === 3) {
                $scope.loadBusLineAndCurrent(busLineId, false);
                $rootScope.$emit("showBus", $scope.selectedBusNumber, true); 
              }
            });
          }, 5000);
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
        $scope.selectedBusNumber = null; // ✅ เคลียร์ค่าก่อน
        $rootScope.$broadcast("clearBusMap");

        // ✅ ถ้าไม่มี busLineId ที่ส่งเข้ามา → ใช้จาก selectedRoute
        const lineId =
          busLineId || ($scope.selectedRoute && $scope.selectedRoute.busLineId);

        if (lineId) {
          $scope.loadBusLineAndCurrent(lineId).then(() => {
            $rootScope.$broadcast("routeSelected", $scope.selectedRoute);
          });
        }
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

      $scope.getModalClass = (id) =>
        busClassMap[id?.trim()] ? `modal-body-${busClassMap[id]}` : "";
      $scope.getModalSelectClass = (id) =>
        busClassMap[id?.trim()] ? `bus-select-btn-${busClassMap[id]}` : "";
      $scope.getModalButtonClass = (id) =>
        busClassMap[id?.trim()] ? `button-modal-${busClassMap[id]}` : "";

      $scope.getBorderStep3_Station = function (busGroupId, idx) {
        let currentStationIdx = -1;

        if (
          $scope.selectedBusNumber &&
          lastKnownBusPositions[$scope.selectedBusNumber]
        ) {
          const pos = lastKnownBusPositions[$scope.selectedBusNumber];
          if (pos.type === "station") {
            currentStationIdx = pos.idx; // ถึงสถานีนี้แล้ว
          } else if (pos.type === "segment") {
            currentStationIdx = pos.idx + 1; // กำลังจะไปสถานีถัดไป
          }
        }

        // สถานีที่ผ่านไปแล้ว / กำลังไป / ถึงแล้ว → เทา
        if (idx <= currentStationIdx) {
          return "border-gray-2";
        }

        busGroupId = String(busGroupId || "").trim();
        if (busGroupId === "11") return "border-pink-2";
        if (busGroupId === "21") return "border-orange-2";
        if (busGroupId === "31") return "border-green-2";

        return "";
      };

      $scope.getConnectorClass = function (busGroupId, idx) {
        let currentStationIdx = -1;

        if (
          $scope.selectedBusNumber &&
          lastKnownBusPositions[$scope.selectedBusNumber]
        ) {
          const pos = lastKnownBusPositions[$scope.selectedBusNumber];
          if (pos.type === "station") {
            currentStationIdx = pos.idx; // ถึงสถานีนี้แล้ว
          } else if (pos.type === "segment") {
            currentStationIdx = pos.idx + 1; // กำลังจะไปสถานีถัดไป
          }
        }
        if (idx < currentStationIdx) {
          return "vertical-connector-gray";
        }

        // กำหนด busGroupId
        busGroupId = String(busGroupId || "").trim();
        if (busGroupId === "11") return "vertical-connector-pink";
        if (busGroupId === "21") return "vertical-connector-orange";
        if (busGroupId === "31") return "vertical-connector-green";
      };

      $scope.getDotColorClass = function (busGroupId, idx) {
        let currentStationIdx = -1;

        if (
          $scope.selectedBusNumber &&
          lastKnownBusPositions[$scope.selectedBusNumber]
        ) {
          const pos = lastKnownBusPositions[$scope.selectedBusNumber];
          if (pos.type === "station") {
            currentStationIdx = pos.idx;
          } else if (pos.type === "segment") {
            currentStationIdx = pos.idx + 1;
          }
        }

        if (idx < currentStationIdx) {
          return "dot-gray";
        }

        busGroupId = String(busGroupId || "").trim();
        if (busGroupId === "11") return "dot-pink";
        if (busGroupId === "21") return "dot-orange";
        if (busGroupId === "31") return "dot-green";
        return "";
      };
    }
  );
