angular
  .module("myApp")
  .controller("SearchMapController", function ($scope, $http, $state) {
    $scope.searchQuery = "";
    $scope.stations = [];
    $scope.filteredStations = [];

    // โหลดข้อมูลจาก JSON
    $http.get("app/data/bus-travel.json").then(function (response) {
      $scope.stations = response.data.stations;
    });

    // ฟังก์ชันค้นหา
    $scope.filterStations = function () {
      const keyword = $scope.searchQuery.toLowerCase().trim();
      if (!keyword) {
        $scope.filteredStations = [];
        return;
      }

      $scope.filteredStations = $scope.stations.filter(function (station) {
        return station.name.toLowerCase().includes(keyword);
      });
    };

    // เคลียร์ช่องค้นหา
    $scope.clearSearch = function () {
      $scope.searchQuery = "";
      $scope.filteredStations = [];
    };

    // ย้อนกลับไปหน้า map
    $scope.goBack = function () {
      $state.go("map"); // หรือ retrospectiveService.goBack() หากจำเป็น
    };

    // เลือกสถานีแล้วส่งกลับ
    $scope.selectStation = function (station) {
      const target = sessionStorage.getItem("searchTarget"); // "start" หรือ "end"

      if (target === "start") {
        sessionStorage.setItem("selectedStartStation", JSON.stringify(station));
      } else if (target === "end") {
        sessionStorage.setItem("selectedEndStation", JSON.stringify(station));
      }

      $state.go("map"); // กลับไปหน้า map
    };
  });
