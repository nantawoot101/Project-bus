app.controller(
  "MapBusController",
  function (
    $scope,
    $timeout,
    $rootScope,
    $state,
    $window,
    $http,
    BusSelectionService
  ) {
    $scope.step = 1;
    let gpsLayer;
    $scope.routeControl = null;
    $scope.mapStations = [];
    $scope.busMarkers = [];

    // ตัวจัดการซ่อนตข้อมูลบางส่วน เมื่อ modal ถูกเปิดขึ้น
    const selectedData = BusSelectionService.getSelectedData();
    $scope.showBusSelectionModal = selectedData.showBusSelectionModal;

    $scope.$watch(
      function () {
        return BusSelectionService.getSelectedData().showBusSelectionModal;
      },
      function (newVal) {
        $scope.showBusSelectionModal = newVal;

        if (newVal) {
          $scope.selectedBusData = BusSelectionService.getSelectedData();
        }
      }
    );
    //===============================================================================

    $http.get("app/data/bus-travel.json").then(function (response) {
      $scope.transportation_routes = response.data.transportation_routes;
      $scope.stations = response.data.stations;
      $scope.bus_lines_metadata = response.data.bus_lines_metadata;
      $scope.bus_arrivals = response.data.bus_arrivals; // Load bus arrival data

      $rootScope.stations = response.data.stations; // 📌 ให้ Map ใช้ร่วมได้

      $timeout(() => {
        if (window._leafletMapInstance) {
          window._leafletMapInstance.remove();
          window._leafletMapInstance = null;
        }

        const roadMap = L.tileLayer(
          "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=th",
          {
            maxZoom: 20,
            subdomains: ["mt0", "mt1", "mt2", "mt3"],
          }
        );

        const map = L.map("map", {
          center: [13.7563, 100.5018],
          zoom: 16,
          zoomControl: false,
          layers: [roadMap],
          attributionControl: false,
          dragging: true,
          tap: false,
        });

        gpsLayer = L.layerGroup().addTo(map);
        $scope.map = map;
        $rootScope.leafletMap = map;


        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            function (position) {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;

              // สร้าง div icon
              const gpsIcon = L.divIcon({
                className: "gps-icon",
                html: '<div class="gps-dot"></div>', // HTML ที่ใช้เป็น icon
                iconSize: [24, 24],
                iconAnchor: [12, 12],
              });

              // สร้าง marker
              const gpsMarker = L.marker([lat, lng], { icon: gpsIcon });
              gpsMarker.addTo(gpsLayer);

              // เลื่อนแผนที่ไปตำแหน่งผู้ใช้
              map.setView([lat, lng], 16);
            },
            function (error) {
              console.error("ไม่สามารถดึงตำแหน่งได้", error);
            }
          );
        }

        const startStationIcon = L.divIcon({
          className: "",
          html: `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div class='station-marker'>
        <img src='app/assets/icon/current-location.svg' width='20' height='20'>
      </div>
      <div class='station-name'>${
        $scope.selectedStartlocation?.locationName || ""
      }</div>
    </div>
  `,
          iconSize: [30, 52],
          iconAnchor: [15, 52],
        });

        const endStationIcon = L.divIcon({
          className: "",
          html: `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <div class='station-marker'>
        <img src='app/assets/icon/location-pin.svg' width='20' height='20'>
      </div>
      <div class='station-name'>${
        $scope.selectedEndlocation?.locationName || ""
      }</div>
    </div>
  `,
          iconSize: [30, 52],
          iconAnchor: [15, 52],
        });

        // Add start marker
        if ($scope.selectedStartlocation) {
          const start = [
            $scope.selectedStartlocation.latitude,
            $scope.selectedStartlocation.longitude,
          ];
          L.marker(start, { icon: startStationIcon }).addTo(gpsLayer);
        }

        // Add end marker
        if ($scope.selectedEndlocation) {
          const end = [
            $scope.selectedEndlocation.latitude,
            $scope.selectedEndlocation.longitude,
          ];
          L.marker(end, { icon: endStationIcon }).addTo(gpsLayer);
        }

        // Draw route
        if ($scope.selectedStartlocation && $scope.selectedEndlocation) {
          const start = [
            $scope.selectedStartlocation.latitude,
            $scope.selectedStartlocation.longitude,
          ];
          const end = [
            $scope.selectedEndlocation.latitude,
            $scope.selectedEndlocation.longitude,
          ];

          if ($scope.routeControl) {
            map.removeControl($scope.routeControl);
          }

          $scope.routeControl = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            lineOptions: {
              styles: [
                { color: "#00bfae", weight: 10, opacity: 1 },
                { color: "#9ce8e2", weight: 5, opacity: 1 },
              ],
            },
            createMarker: () => null,
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            show: false,
          }).addTo(map);
        }

        $rootScope.$on("routeSelected", function (event, route) {
          if (!route || !route.stops) {
            console.warn("route หรือ route.stops ไม่พร้อมใช้งาน:", route);
            return; // ออกจาก handler ก่อน ไม่ทำงานต่อ
          }

          const stationIds = route.stops.map((stop) => stop.station_id);
          const allStations = $rootScope.stations || [];
          $scope.mapStations = allStations.filter((s) =>
            stationIds.includes(s.station_id)
          );

          drawStationsOnMap($scope.mapStations, route.route_name);
        });

        $rootScope.$on("clearMap", function () {
          if ($scope.markersLayer) {
            $scope.markersLayer.clearLayers(); // ลบ markers ทั้งหมด
          }

          // ลบ routeControl ถ้ามี
          if ($scope.routeControl && $rootScope.leafletMap) {
            $rootScope.leafletMap.removeControl($scope.routeControl);
            $scope.routeControl = null;
          }

          // ลบ routingControl ถ้าใช้ชื่อนี้อีก
          if ($scope.routingControl && $rootScope.leafletMap) {
            $rootScope.leafletMap.removeControl($scope.routingControl);
            $scope.routingControl = null;
          }
        });

        // ✅ ฟังก์ชันที่กำหนดการทำงานของสถานีบนแผนที่
        function drawStationsOnMap(stations, routeName) {
          if (!$rootScope.leafletMap) return;

          if (!$scope.markersLayer) {
            $scope.markersLayer = L.layerGroup().addTo($rootScope.leafletMap);
          }

          $scope.markersLayer.clearLayers();

          if ($scope.routingControl) {
            $rootScope.leafletMap.removeControl($scope.routingControl);
            $scope.routingControl = null;
          }

          stations.forEach((station, index) => {
            if (
              station.latitude !== undefined &&
              station.longitude !== undefined &&
              !isNaN(station.latitude) &&
              !isNaN(station.longitude)
            ) {
              const marker = L.marker([station.latitude, station.longitude], {
                icon: L.divIcon({
                  className: "",
                  html: `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div class='station-marker' style="color: white;">${index + 1}</div>
          <div class='station-name' style="font-size: 12px; margin-top: 2px; text-align: center; max-width: 80px;">
            ${station.name}
          </div>
        </div>`,
                  iconSize: [30, 52],
                  iconAnchor: [15, 52],
                }),
              });

              $scope.markersLayer.addLayer(marker);
            } else {
              console.warn("🚨 สถานีมีพิกัดไม่ถูกต้อง:", station);
            }
          });

          const waypoints = stations
            .filter(
              (station) =>
                station.latitude !== undefined &&
                station.longitude !== undefined &&
                !isNaN(station.latitude) &&
                !isNaN(station.longitude)
            )
            .map((station) => L.latLng(station.latitude, station.longitude));

          function getColorByRouteName(name) {
            switch (name) {
              case "EXPRESS":
                return "#f1b0c6";
              case "B LINE":
                return "#f6c770"; // orange
              case "F LINE":
                return "#9ce8e2";
              default:
                return "gray";
            }
          }

          function getColorByRouteNameBorder(name) {
            switch (name) {
              case "EXPRESS":
                return "#e91e63";
              case "B LINE":
                return "#FFA500"; // orange
              case "F LINE":
                return "#00bfae";
              default:
                return "gray";
            }
          }

          if (waypoints.length >= 2) {
            $scope.routingControl = L.Routing.control({
              waypoints: waypoints,
              router: L.Routing.osrmv1({
                serviceUrl: "https://router.project-osrm.org/route/v1",
              }),
              lineOptions: {
                styles: [
                  {
                    color: getColorByRouteNameBorder(routeName),
                    weight: 10,
                    opacity: 1,
                  }, // ขอบดำ
                  {
                    color: getColorByRouteName(routeName),
                    weight: 5,
                    opacity: 1,
                  }, // เส้นสีหลัก
                ],
              },
              createMarker: () => null,
              routeWhileDragging: false,
              addWaypoints: false,
              show: false,
            }).addTo($rootScope.leafletMap);
          }
        }

        // 📌 รับคำสั่งให้แสดงรถบัส

        $rootScope.$on("showBus", function (event, busNumber) {
          if (!$scope.selectedRoute || !busNumber) return;

          // ลบ marker รถบัสเก่า
          if ($scope.busMarker) {
            $rootScope.leafletMap.removeLayer($scope.busMarker);
            $scope.busMarker = null;
          }

          // ลบ routing control เก่า (เส้นทาง)
          if ($scope.busRoutingControl) {
            $rootScope.leafletMap.removeControl($scope.busRoutingControl);
            $scope.busRoutingControl = null;
          }

          // ลบ marker สถานีเก่า
          if ($scope.busStationMarkers && $scope.busStationMarkers.length > 0) {
            $scope.busStationMarkers.forEach((m) =>
              $rootScope.leafletMap.removeLayer(m)
            );
            $scope.busStationMarkers = [];
          } else {
            $scope.busStationMarkers = [];
          }

          // หา index สถานีที่รถบัสอยู่จาก selectedRoute.stops
          const currentStopIndex = $scope.selectedRoute.stops.findIndex(
            (stop) =>
              (stop.passing_bus_numbers &&
                stop.passing_bus_numbers.includes(busNumber)) ||
              (stop.buses_in_transit_to_next_stop &&
                stop.buses_in_transit_to_next_stop.includes(busNumber))
          );

          if (currentStopIndex === -1) {
            console.warn("🚨 ไม่พบสถานีของรถบัส:", busNumber);
            return;
          }

          const routeStops = $scope.selectedRoute.stops;

          // สร้างรายการสถานีจาก stops (โดยจับคู่กับ stations)
          const routeStations = routeStops
            .map((stop) =>
              $scope.stations.find((s) => s.station_id === stop.station_id)
            )
            .filter((s) => s && !isNaN(s.latitude) && !isNaN(s.longitude));

          if (routeStations.length < 2) return;

          const currentStation = routeStations[currentStopIndex];

          // สร้าง marker รถบัส
          $scope.busMarker = L.marker(
            [currentStation.latitude, currentStation.longitude],
            {
              icon: L.icon({
                iconUrl: "app/assets/img/bus.png",
                iconSize: [30, 30],
                iconAnchor: [15, 15],
              }),
            }
          ).addTo($rootScope.leafletMap);

          // สร้าง marker สถานีตามสถานะ (ผ่าน, ปัจจุบัน, ยังไม่ถึง)
          routeStations.forEach((station, index) => {
            const isPassed = index < currentStopIndex;
            const isCurrent = index === currentStopIndex;

            let markerHtml;
            if (isPassed || isCurrent) {
              markerHtml = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div class='station-marker-gray'>
            ${index + 1}
          </div>
          <div class='station-name' style="font-size: 12px; margin-top: 2px; text-align: center; max-width: 80px;">
            ${station.name}
          </div>
        </div>`;
            } else {
              markerHtml = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div class='station-marker' style="color: white;">
            ${index + 1}
          </div>
          <div class='station-name' style="font-size: 12px; margin-top: 2px; text-align: center; max-width: 80px;">
            ${station.name}
          </div>
        </div>`;
            }

            const marker = L.marker([station.latitude, station.longitude], {
              icon: L.divIcon({
                className: "",
                html: markerHtml,
                iconSize: [30, 52],
                iconAnchor: [15, 52],
              }),
            });

            marker.addTo($rootScope.leafletMap);
            $scope.busStationMarkers.push(marker);
          });

          // ฟังก์ชันกำหนดสีเส้นตามชื่อเส้นทาง
          function getColorByRouteName2(name) {
            switch ((name || "").trim().toUpperCase()) {
              case "EXPRESS":
                return "#f1b0c6";
              case "B LINE":
                return "#f6c770";
              case "F LINE":
                return "#9ce8e2";
              default:
                return "gray";
            }
          }
          function getBorderColor2(name) {
            switch ((name || "").trim().toUpperCase()) {
              case "EXPRESS":
                return "#e91e63";
              case "B LINE":
                return "#FFA500";
              case "F LINE":
                return "#00bfae";
              default:
                return "gray";
            }
          }

          // ลบเส้นทางเก่า (ถ้ามี)
          if ($scope.busRouteLines && $scope.busRouteLines.length > 0) {
            $scope.busRouteLines.forEach((line) => {
              if ($rootScope.leafletMap.hasLayer(line)) {
                $rootScope.leafletMap.removeLayer(line);
              }
              if (line && typeof line.remove === "function") {
                line.remove();
              }
            });
            $scope.busRouteLines = [];
          } else {
            $scope.busRouteLines = [];
          }

          // สร้าง waypoints ทั้งหมดจากสถานี
          const waypoints = routeStations.map((s) =>
            L.latLng(s.latitude, s.longitude)
          );

          // สร้าง routing control เส้นเดียวต่อเนื่อง
          const routingControl = L.Routing.control({
            waypoints: waypoints,
            router: L.Routing.osrmv1({
              serviceUrl: "https://router.project-osrm.org/route/v1",
            }),
            lineOptions: {
              styles: [
                {
                  color: getBorderColor2($scope.selectedRoute.route_name),
                  weight: 10,
                  opacity: 1,
                },
                {
                  color: getColorByRouteName2($scope.selectedRoute.route_name),
                  weight: 5,
                  opacity: 1,
                },
              ],
            },
            createMarker: () => null,
            addWaypoints: false,
            draggableWaypoints: false,
            fitSelectedRoutes: false,
            show: false,
            routeWhileDragging: false,
          }).addTo($rootScope.leafletMap);

          $scope.busRouteLines.push(routingControl);
        });

        //ตัวเคลียร์เส้นทาง สถานี และ รถบัส
        $rootScope.$on("clearBusMap", function () {
          // 🔸 1. ลบ marker รถบัส
          if ($scope.busMarker && $rootScope.leafletMap) {
            $rootScope.leafletMap.removeLayer($scope.busMarker);
            $scope.busMarker = null;
          }

          // 🔸 2. ลบเส้นทาง polyline ที่วาดด้วย L.polyline (ถ้ามี)
          if ($scope.busRouteLines && $scope.busRouteLines.length > 0) {
            $scope.busRouteLines.forEach((line) => {
              if ($rootScope.leafletMap.hasLayer(line)) {
                $rootScope.leafletMap.removeLayer(line);
              }
              // ถ้าเป็น Routing control
              if (line && typeof line.remove === "function") {
                line.remove();
              }
            });
            $scope.busRouteLines = [];
          } else {
            $scope.busRouteLines = [];
          }

          // 🔸 3. ลบ marker สถานีของ bus (ถ้ามี)
          if ($scope.busStationMarkers && $scope.busStationMarkers.length > 0) {
            $scope.busStationMarkers.forEach((marker) => {
              if ($rootScope.leafletMap.hasLayer(marker)) {
                $rootScope.leafletMap.removeLayer(marker);
              }
            });
            $scope.busStationMarkers = [];
          }

          // 🔸 4. ลบ routingControl (ถ้าใช้ Leaflet Routing Machine)
          if ($scope.busRoutingControl) {
            $rootScope.leafletMap.removeControl($scope.busRoutingControl);
            $scope.busRoutingControl = null;
          }
        });

        window._leafletMapInstance = map;
      }, 100);
    });

    $scope.goToSearch = function (target) {
      $rootScope.searchTarget = target;
      $state.go("search");
    };

    $scope.selectedStartlocation = $rootScope.selectedStartlocation || null;
    $scope.selectedEndlocation = $rootScope.selectedEndlocation || null;

    if ($scope.selectedStartlocation || $scope.selectedEndlocation) {
      $scope.step = 2;
    }

   $scope.goBack = function () {
  $scope.step = 1;

  if (gpsLayer) {
    gpsLayer.clearLayers();
  }

  if ($scope.routeControl) {
    $scope.map.removeControl($scope.routeControl);
    $scope.routeControl = null;
  }

  // ล้างข้อมูลตำแหน่งเริ่มต้นและสิ้นสุด
  $rootScope.selectedStartlocation = null;
  $rootScope.selectedEndlocation = null;
};


    // ฟังก์ชันสำหรับจัดการสลับตำแหน่งสถานี
    $scope.swapStations = function () {
      const temp = $scope.selectedStartlocation;
      $scope.selectedStartlocation = $scope.selectedEndlocation;
      $scope.selectedEndlocation = temp;

      $rootScope.selectedStartlocation = $scope.selectedStartlocation;
      $rootScope.selectedEndlocation = $scope.selectedEndlocation;

      // รีเฟรช marker และเส้นทางบนแผนที่
      $timeout(function () {
        if (gpsLayer) {
          gpsLayer.clearLayers();
        }
        if ($scope.routeControl && $scope.map) {
          $scope.map.removeControl($scope.routeControl);
          $scope.routeControl = null;
        }

        // วาด marker สถานีใหม่ (ตำแหน่งสลับกัน)
        const startStationIcon = L.divIcon({
          className: "",
          html: `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div class='station-marker'>
            <img src='app/assets/icon/current-location.svg' width='20' height='20'>
          </div>
          <div class='station-name'>${
            $scope.selectedStartlocation?.locationName || ""
          }</div>
        </div>
      `,
          iconSize: [30, 52],
          iconAnchor: [15, 52],
        });

        const endStationIcon = L.divIcon({
          className: "",
          html: `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div class='station-marker'>
            <img src='app/assets/icon/location-pin.svg' width='20' height='20'>
          </div>
          <div class='station-name'>${
            $scope.selectedEndlocation?.locationName || ""
          }</div>
        </div>
      `,
          iconSize: [30, 52],
          iconAnchor: [15, 52],
        });

        // Add start station marker
        if ($scope.selectedStartlocation) {
          const start = [
            $scope.selectedStartlocation.latitude,
            $scope.selectedStartlocation.longitude,
          ];
          L.marker(start, { icon: startStationIcon }).addTo(gpsLayer);
        }

        // Add end station marker
        if ($scope.selectedEndlocation) {
          const end = [
            $scope.selectedEndlocation.latitude,
            $scope.selectedEndlocation.longitude,
          ];
          L.marker(end, { icon: endStationIcon }).addTo(gpsLayer);
        }

        // วาดเส้นทางระหว่างสถานีที่เลือกใหม่
        if ($scope.selectedStartlocation && $scope.selectedEndlocation) {
          const start = [
            $scope.selectedStartlocation.latitude,
            $scope.selectedStartlocation.longitude,
          ];
          const end = [
            $scope.selectedEndlocation.latitude,
            $scope.selectedEndlocation.longitude,
          ];

          $scope.routeControl = L.Routing.control({
            waypoints: [L.latLng(start[0], start[1]), L.latLng(end[0], end[1])],
            lineOptions: {
              styles: [
                { color: "#00bfae", weight: 10, opacity: 1 },
                { color: "#9ce8e2", weight: 5, opacity: 1 },
              ],
            },
            createMarker: () => null,
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            show: false,
          }).addTo($scope.map);
        }
      }, 0);
    };
  }
);
