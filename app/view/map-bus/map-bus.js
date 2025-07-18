app.controller(
  "MapBusController",
  function ($scope, $timeout, $rootScope, $state, $window, $http) {

    $scope.step = 1; // เริ่มต้นที่ step 1

    let gpsLayer; // ✅ สร้างไว้ให้สามารถเข้าถึงได้ใน goBack()

    $http
      .get("app/data/bus-travel.json")
      .then(function (response) {
        $scope.stations = response.data.stations;
        $scope.bus_arrivals = response.data.bus_arrivals;

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
            center: [13.6904, 100.7501],
            zoom: 13,
            zoomControl: false,
            layers: [roadMap],
            attributionControl: false,
            dragging: true,
            tap: false,
          });

          gpsLayer = L.layerGroup().addTo(map); // ✅ assign gpsLayer ให้ใช้งานภายนอกได้
          $scope.map = map;
          $rootScope.leafletMap = map;

          const busIcon = L.icon({
            iconUrl: "app/assets/img/bus.png",
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          });

          // ✅ แสดงเฉพาะเมื่ออยู่ใน step 2
          if ($scope.step === 2) {
            $scope.bus_arrivals.forEach((bus) => {
              L.marker([bus.latitude, bus.longitude], {
                icon: busIcon,
              }).addTo(gpsLayer);
            });
          }

          window._leafletMapInstance = map;
        }, 100);
      })
      .catch(function (error) {
        console.error("เกิดข้อผิดพลาดในการโหลด JSON", error);
      });

    $scope.Current_Position = function () {
      $timeout(() => {
        $scope.map.locate({ setView: true, maxZoom: 16 });
      }, 100);
    };

    $scope.goToSearch = function (target) {
      sessionStorage.setItem("searchTarget", target); // "start" หรือ "end"
      $state.go("search");
    };

    $scope.selectedStartStation = null;
    $scope.selectedEndStation = null;

    const start = sessionStorage.getItem("selectedStartStation");
    const end = sessionStorage.getItem("selectedEndStation");

    if (start) $scope.selectedStartStation = JSON.parse(start);
    if (end) $scope.selectedEndStation = JSON.parse(end);

    // ✅ เพิ่มเงื่อนไขให้เข้าสู่ step 2 ถ้ามีสถานีใดสถานีหนึ่ง
    if (start || end) {
      $scope.step = 2;
    }
    $scope.goBack = function () {
      $scope.step = 1;

      // ✅ ล้าง marker รถบัสออกเมื่อย้อนกลับ step
      if (gpsLayer) {
        gpsLayer.clearLayers();
      }

      // ✅ ลบข้อมูลจาก sessionStorage
      sessionStorage.removeItem("selectedStartStation");
      sessionStorage.removeItem("selectedEndStation");
      sessionStorage.removeItem("searchTarget");

      // ✅ เคลียร์ตัวแปรที่ใช้ในหน้าปัจจุบันด้วย
      $scope.selectedStartStation = null;
      $scope.selectedEndStation = null;
    };

    $scope.$on("$stateChangeSuccess", function () {
      $scope.selectedStation = $rootScope.selectedStation || null;
    });
  }
);
