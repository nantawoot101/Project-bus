var app = angular.module("myApp");

app.controller("MapBusController", function ($scope, $timeout, $rootScope) {
  if (window.isMapInitialized) {
    return; // ถ้า map เคยสร้างแล้ว ให้ skip
  }
  window.isMapInitialized = true;
  $timeout(() => {
    // ลบแผนที่เดิมถ้ามี (ป้องกันซ้อนทับ)
    if (window._leafletMapInstance) {
      window._leafletMapInstance.remove();
      window._leafletMapInstance = null;
    }

    var roadMap = L.tileLayer(
      "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=th",
      {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }
    );

    const map = L.map("map", {
      center: [13.7563, 100.5018],
      zoom: 13,
      zoomControl: false,
      layers: [roadMap],
      attributionControl: false,
      dragging: true,
      tap: false,
    });

    const gpsLayer = L.layerGroup().addTo(map);

    $scope.map = map;
    $rootScope.leafletMap = map; // **เพิ่มบรรทัดนี้: ทำให้ map instance เข้าถึงได้ทั่วถึง**

    const userLocationIcon = L.divIcon({
      className: "google-user-location-icon",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
      html: '<div class="blue-dot-halo"></div>',
    });

    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        if (result.state === "granted") {
          map.locate({ setView: true, maxZoom: 16 });
        } else {
          console.log("ต้องรอให้ผู้ใช้คลิกก่อนถึงจะขอตำแหน่งได้");
        }
      });
    }

    map.on("locationfound", function (e) {
      gpsLayer.clearLayers();

      L.marker(e.latlng, { icon: userLocationIcon }).addTo(gpsLayer);

      L.circle(e.latlng, e.accuracy / 2).addTo(gpsLayer);
    });

    map.on("locationerror", function () {
      alert("ไม่สามารถระบุตำแหน่งของคุณได้");
    });

    window._leafletMapInstance = map;
  }, 100);



  //ส่วนที่ใช้ติดตามตำแหน่ง GPS

  $scope.Current_Position = function () {
    $timeout(() => {
      $scope.map.locate({ setView: true, maxZoom: 16 });
    }, 100);
  };



  //ส่วนฟังค์ชั่นของการค้นหา

  $scope.isSearching = false;

  // ข้อความค้นหาเริ่มต้นว่าง
  $scope.searchQuery = "";

  // ฟังก์ชันเปิดกล่องค้นหา
  $scope.openSearch = function () {
    $scope.isSearching = true;
  };

  // ฟังก์ชันล้างการค้นหา และปิดกล่องค้นหา
  $scope.closeSearch = function () {
    $scope.searchQuery = "";
    $scope.isSearching = false;
  };

  // ถ้าต้องการ ฟังก์ชันสำหรับกรองข้อมูลตาม searchQuery
  $scope.filterResults = function (items) {
    if (!$scope.searchQuery) return items;
    var query = $scope.searchQuery.toLowerCase();
    return items.filter(function (item) {
      return item.name.toLowerCase().includes(query);
    });
  };
});
