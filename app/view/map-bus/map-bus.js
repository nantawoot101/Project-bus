var app = angular.module("myApp");

app.controller("MapBusController", function ($scope, $timeout) {
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

    // var openStreenMap = L.tileLayer(
    //   "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    //   {
    //     attribution: "<a>OpenStreetMap</a>",
    //     maxZoom: 20,
    //   }
    // );

    // var forthMapPath = "https://maps.forthtrack.com/geoserver/gwc/service/wms";

    // var forthMap = L.tileLayer.wms(forthMapPath, {
    //   authkey: "d2de9772-5ad5-4faa-9ef7-2d784cbc59b2",
    //   layers: "forth:thai",
    //   format: "image/png",
    //   transparent: true,
    //   attribution: "&copy; Forth Tracking System Co.,Ltd",
    //   maxZoom: 20,
    // });

    var roadMap = L.tileLayer(
      "https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=th",
      {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }
    );

    // var satelliteMap = L.tileLayer(
    //   "https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}&hl=th",
    //   {
    //     maxZoom: 20,
    //     subdomains: ["mt0", "mt1", "mt2", "mt3"],
    //   }
    // );

    // var trafficMap = L.tileLayer(
    //   "https://mstraffic1.longdo.com/mmmap/tile.php?zoom={z}&x={x}&y={y}&mode=trafficoverlay&key=demokeyfortestingonly&proj=epsg3857",
    //   {
    //     maxZoom: 20,
    //   }
    // );

    const map = L.map("map", {
      center: [13.7563, 100.5018],
      zoom: 13,
      zoomControl: false,
      layers: [roadMap],
      attributionControl: false,
    });

    const gpsLayer = L.layerGroup().addTo(map);

    // const baseLayers = {
    //   OpenStreetMap: openStreenMap,
    //   "แผนที่ถนน (Google)": roadMap,
    //   แผนที่ดาวเทียม: satelliteMap,
    //   forthMap: forthMap,
    // };

    // const overlayLayers = {
    //   ตำแหน่งของฉัน: gpsLayer,
    //   จราจร: trafficMap,
    // };

    // L.control.layers(baseLayers, overlayLayers, { collapsed: true }).addTo(map);

    $scope.map = map;

    const userLocationIcon = L.divIcon({
      className: "google-user-location-icon",
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15],
      html: '<div class="blue-dot-halo"></div>',
    });

    map.locate({ setView: true, maxZoom: 16 });

    map.on("locationfound", function (e) {
      gpsLayer.clearLayers();

      L.marker(e.latlng, { icon: userLocationIcon }).addTo(gpsLayer);

      L.circle(e.latlng, e.accuracy / 2).addTo(gpsLayer);
    });

    map.on("locationerror", function () {
      alert("ไม่สามารถระบุตำแหน่งของคุณได้");
    });

    window._leafletMapInstance = map; // เก็บ instance ของ map ไว้เพื่อลบในครั้งถัดไปถ้าจำเป็น
  }, 100);




  $scope.isSearching = false;

  // ข้อความค้นหาเริ่มต้นว่าง
  $scope.searchQuery = '';

  // ฟังก์ชันเปิดกล่องค้นหา
  $scope.openSearch = function() {
    $scope.isSearching = true;
  };

  // ฟังก์ชันล้างการค้นหา และปิดกล่องค้นหา
  $scope.closeSearch = function() {
    $scope.searchQuery = '';
    $scope.isSearching = false;
  };

  // ถ้าต้องการ ฟังก์ชันสำหรับกรองข้อมูลตาม searchQuery
  $scope.filterResults = function(items) {
    if (!$scope.searchQuery) return items;
    var query = $scope.searchQuery.toLowerCase();
    return items.filter(function(item) {
      return item.name.toLowerCase().includes(query);
    });
  };
});
