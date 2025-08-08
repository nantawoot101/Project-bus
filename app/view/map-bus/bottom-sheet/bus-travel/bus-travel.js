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
      
      $scope.sheetHeightVH = 30; // ✅ เพิ่มตัวแปรเก็บความสูงล่าสุดของ bottomSheet

      $scope.busLines = [];

      // $scope.transportation_routes = [];
      // $http
      //   .get("app/data/bus-travel.json")
      //   .then(function (response) {
      //     $scope.transportation_routes = response.data.transportation_routes;
      //     $scope.stations = response.data.stations;
      //     $scope.bus_lines_metadata = response.data.bus_lines_metadata;
      //   })
      //   .catch(function (error) {
      //     console.error("เกิดข้อผิดพลาดในการโหลด JSON", error);
      //   });

      // $scope.getStationName = function (station_id) {
      //   const station = ($scope.stations || []).find(
      //     (s) => s.station_id === station_id
      //   );
      //   return station ? station.name : "ไม่พบสถานี";
      // };

      // $scope.getBusNumber = function (bus_id) {
      //   const bus = ($scope.bus_lines_metadata || []).find(
      //     (b) => b.bus_id === bus_id
      //   );
      //   return bus ? bus.bus_number : "ไม่ทราบหมายเลขรถ";
      // };

      BusLineService.getBusLine()
        .then(function (response) {
          $scope.busLines = response.data;
          console.log("Bus Lines loaded:", $scope.busLines);
        })
        .catch(function (error) {
          console.error("เกิดข้อผิดพลาดในการโหลด bus Lines", error);
        });

      $scope.busLine = {}; // สำหรับเก็บข้อมูลที่ได้จาก API
      var busLineId = $stateParams.busLineId;

      BusLineService.getBusLineById(busLineId)
        .then(function (response) {
          $scope.busLine = response.data;

          if (
            $scope.busLine &&
            Array.isArray($scope.busLine.busLineStations) &&
            $scope.busLine.busLineStations.length > 0
          ) {
            $scope.startStation = $scope.busLine.busLineStations[0];
            $scope.endStation =
              $scope.busLine.busLineStations[
                $scope.busLine.busLineStations.length - 1
              ];
          } else {
            console.warn("busLineStations ว่างหรือไม่ใช่ array");
          }
        })
        .catch(function (error) {
          console.error("โหลดข้อมูลสายรถเมล์ล้มเหลว", error);
        });

      $scope.current = [];

      BusLineService.getCurrent()
        .then(function (response) {
          const allBuses = response.data.buses; // ✅ ดึง array จริง ๆ ออกมา

          if (!Array.isArray(allBuses)) {
            console.error("❌ response.data.buses ไม่ใช่ array:", allBuses);
            return;
          }

          const selectedBusLineId = $scope.selectedBusLineId;

          $scope.current = allBuses.filter(function (bus) {
            return bus.busLineId === selectedBusLineId;
          });

          console.log("Bus current filtered:", $scope.current);
        })
        .catch(function (error) {
          console.error("เกิดข้อผิดพลาดในการโหลด current", error);
        });

        

      $scope.getBorderClass = function (busGroupId) {
        busGroupId = (busGroupId || "").trim().toUpperCase();

        if (busGroupId === "11") return "border-pink";
        if (busGroupId === "21") return "border-orange";
        if (busGroupId === "31") return "border-green";
        if (busGroupId === "") return "border-gray";

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

          // ✅ Snap ไปที่ระดับใกล้สุด
          const snapLevels = [30, 50, 80];
          const closest = snapLevels.reduce((prev, curr) =>
            Math.abs(curr - currentHeightVH) < Math.abs(prev - currentHeightVH)
              ? curr
              : prev
          );

          $scope.sheetHeightVH = closest; // ✅ เก็บค่าความสูงไว้ใน scope
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

      $scope.step = 1;
      $scope.selectedRoute = null;


       $scope.goToStep = function (step, route, bus) {
        $scope.step = step;

        // ✅ ตั้งความสูง sheet ทุกครั้งหลังเปลี่ยน step (ใช้ค่าที่จำไว้)
        setTimeout(() => {
          const sheet = document.getElementById("bottomSheet");
          if (sheet) {
            sheet.style.height = $scope.sheetHeightVH + "vh";
            updateGpsButtonPosition($scope.sheetHeightVH);
          }
        }, 100);

        if (step === 2 && route) {
          $scope.selectedRoute = route;
          $rootScope.selectedRoute = route;
          $rootScope.$broadcast("routeSelected", route);
        }

        if (step === 3) {
          $scope.selectedBusNumber = bus;
          $scope.busTabOpen = null;
          $rootScope.$broadcast("showBus", bus);
          $rootScope.$broadcast("clearMap");
        }
      };

      // $scope.goToStep = function (step, busLineId, bus) {
      //   $scope.step = step;

      //   setTimeout(() => {
      //     const sheet = document.getElementById("bottomSheet");
      //     if (sheet) {
      //       sheet.style.height = $scope.sheetHeightVH + "vh";
      //       updateGpsButtonPosition($scope.sheetHeightVH);
      //     }
      //   }, 100);

      //   if (step === 2 && busLineId) {
      //     const route = $scope.busLines.find(
      //       (line) => line.busLineId === busLineId
      //     );
      //     if (route) {
      //       $scope.selectedRoute = route;
      //       $rootScope.selectedRoute = route;
      //       $rootScope.$broadcast("routeSelected", route);
      //     } else {
      //       console.warn("ไม่พบ route สำหรับ busLineId:", busLineId);
      //     }
      //   }

      //   if (step === 3) {
      //     $scope.selectedBusNumber = bus;
      //     $scope.busTabOpen = null;
      //     $rootScope.$broadcast("showBus", bus);
      //     $rootScope.$broadcast("clearMap");
      //   }
      // };

      $scope.goBackToStep1 = function () {
        $scope.step = 1;
        $scope.selectedRoute = null;
        $scope.busTabOpen = null;
        $rootScope.$broadcast("clearMap");
      };

      $scope.goBackToStep2 = function () {
        $scope.step = 2;
        $scope.selectedBusNumber = null;
        $rootScope.$broadcast("clearBusMap");
        $rootScope.$broadcast("routeSelected", $scope.selectedRoute);
      };

      $scope.getBorderStation = function (busGroupId) {
        busGroupId = (busGroupId || "").trim().toUpperCase();

        if (busGroupId === "11") return "border-pink-2";
        if (busGroupId === "21") return "border-orange-2";
        if (busGroupId === "31") return "border-green-2";

        return "";
      };

      $scope.getVerticalClass = function (route_name) {
        const name = (route_name || "").trim().toUpperCase();
        if (name === "EXPRESS") return "vertical-connector-pink";
        if (name === "B LINE") return "vertical-connector-orange";
        if (name === "F LINE") return "vertical-connector-green";

        return "";
      };

      $scope.getBusClass = function (route_name) {
        const name = (route_name || "").trim().toUpperCase();

        if (name === "EXPRESS") return "bus-wrapper-pink";
        if (name === "B LINE") return "bus-wrapper-orange";
        if (name === "F LINE") return "bus-wrapper-green";

        return "";
      };

      $scope.getDotColorClass = function (route_name) {
        const name = (route_name || "").trim().toUpperCase();

        if (name === "EXPRESS") return "dot-pink";
        if (name === "B LINE") return "dot-orange";
        if (name === "F LINE") return "dot-green";

        return "";
      };

      $scope.getLastBusStopOrder = function (route) {
        let lastOrder = 0;
        route.stops.forEach((stop) => {
          const isInPassing =
            stop.passing_bus_numbers &&
            stop.passing_bus_numbers.includes($scope.selectedBusNumber);
          const isInTransit =
            stop.buses_in_transit_to_next_stop &&
            stop.buses_in_transit_to_next_stop.includes(
              $scope.selectedBusNumber
            );

          if (isInPassing || isInTransit) {
            if (stop.stop_order > lastOrder) {
              lastOrder = stop.stop_order;
            }
          }
        });
        return lastOrder;
      };

      $scope.isPassedStation = function (stop, route) {
        const lastOrder = $scope.getLastBusStopOrder(route);
        return stop.stop_order <= lastOrder;
      };

      $scope.getBorderStep3_Station = function (route, stop) {
        if ($scope.isPassedStation(stop, route)) {
          return "border-gray-2";
        }

        const name = (route.route_name || "").trim().toUpperCase();

        if (name === "EXPRESS") return "border-pink-2";
        if (name === "B LINE") return "border-orange-2";
        if (name === "F LINE") return "border-green-2";

        return "";
      };

      $scope.getConnectorClass = function (route, stopIndex) {
        const stops = route.stops;

        const currentStop = stops[stopIndex];
        const nextStop = stops[stopIndex + 1];

        const passedCurrent = $scope.isPassedStation(currentStop, route);
        const passedNext = $scope.isPassedStation(nextStop, route);

        if (passedCurrent && passedNext) {
          return "vertical-connector-gray";
        }

        const name = (route.route_name || "").trim().toUpperCase();
        if (name === "EXPRESS") return "vertical-connector-pink";
        if (name === "B LINE") return "vertical-connector-orange";
        if (name === "F LINE") return "vertical-connector-green";

        return "";
      };

      $scope.modalBusList = [];
      $scope.togglePopup = function ($event, stop, route, isTransit) {
        $event.stopPropagation();

        $scope.modalBusList = isTransit
          ? stop.buses_in_transit_to_next_stop
          : stop.passing_bus_numbers;

        BusSelectionService.setStop(stop);
        BusSelectionService.setRoute(route);
        BusSelectionService.setTransitMode(!!isTransit);
        BusSelectionService.setShowModal(true); // <-- บันทึก state modal

        $scope.showBusSelectionModal = true;
      };

      $scope.selectBus = function (bus) {
        BusSelectionService.setBusNumber(bus);
      };

      $scope.confirmSelection = function () {
        const selected = BusSelectionService.getSelectedData();
        if (selected.busNumber) {
          $scope.showBusSelectionModal = false;
          $scope.step = 3; // ไป step 3
        } else {
          alert("กรุณาเลือกรถก่อนกดยืนยัน");
        }
      };

      $scope.closeBusSelectionModal = function () {
        $scope.showBusSelectionModal = false;
        BusSelectionService.setShowModal(false); // <-- ปิด modal จาก service
      };
    }
  );
