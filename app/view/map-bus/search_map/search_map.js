angular
  .module("myApp")
  .controller(
    "SearchMapController",
    function ($scope, $http, $state, $rootScope, LocationService) {
      $scope.searchQuery = "";
      $scope.locations = [];
      $scope.filteredLocations = [];

      // ดึงข้อมูลจาก LocationService
      LocationService.getLocations()
        .then(function (response) {
          $scope.locations = response.data;
        })
        .catch(function (error) {
          console.error("Error loading locations:", error);
        });

      // ฟังก์ชันค้นหา location
      $scope.filterLocations = function () {
        const keyword = $scope.searchQuery.toLowerCase().trim();
        if (!keyword) {
          $scope.filteredLocations = [];
          return;
        }

        $scope.filteredLocations = $scope.locations
          .filter(function (location) {
            // รองรับตัวอักษรไทยและอังกฤษ
            return (location.locationName || "")
              .toLowerCase()
              .includes(keyword);
          })
          .sort(function (a, b) {
            // เรียงตามอักษรไทย (ใช้ localeCompare)
            return (a.locationName || "").localeCompare(b.locationName || "", 'th');
          });
      };

      // เคลียร์ช่องค้นหา
      $scope.clearSearch = function () {
        $scope.searchQuery = "";
        $scope.filteredLocations = [];
      };

      // ย้อนกลับไปหน้าแผนที่
      $scope.goBack = function () {
        $state.go("map");
      };

      // เลือก location แล้วส่งกลับ
      $scope.selectLocation = function (location) {
        if ($rootScope.searchTarget === "start") {
          $rootScope.selectedStartlocation = location;
        } else if ($rootScope.searchTarget === "end") {
          $rootScope.selectedEndlocation = location;
        }

        console.log("Selected location:", location);

        $state.go("map"); // กลับไปหน้า map
      };
    }
  );
