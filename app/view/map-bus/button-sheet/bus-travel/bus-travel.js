angular
  .module("myApp")
  .controller(
    "BusController",
    function ($scope, $mdBottomSheet, $http, $document) {
      $scope.station = [];
      $scope.transportation = [];

      $http
        .get("app/data/bus-travel.json")
        .then(function (response) {
          $scope.station = response.data.station;
          $scope.transportation = response.data.transportation;
        })
        .catch(function (error) {
          console.error("เกิดข้อผิดพลาดในการโหลด JSON", error);
        });

      // คืน class สีของ border ตามประเภทการเดินทาง
      $scope.getBorderClass = function (transportation) {
        const name = (transportation || "").trim().toUpperCase();

        if (name === "EXPRESS") return "border-pink";
        if (name === "B LINE") return "border-orange";
        if (name === "F LINE") return "border-green";

        return "";
      };

      $scope.isExpanded = false;

      $scope.listItemClick = function ($index) {
        var clickedItem = $scope.items[$index];
        $mdBottomSheet.hide(clickedItem);
      };

      $scope.startDrag = function (event) {
        event.preventDefault();

        const sheet = document.getElementById("bottomSheet");
        const startY = event.pageY || event.touches?.[0].pageY;
        const initialHeight = sheet.offsetHeight;
        const vh = window.innerHeight / 100;

        function onMove(e) {
          const currentY = e.pageY || e.touches?.[0].pageY;
          const deltaY = startY - currentY;
          let newHeightVH = (initialHeight + deltaY) / vh;

          newHeightVH = Math.max(20, Math.min(60, newHeightVH));
          sheet.style.height = newHeightVH + "vh";
        }

        function onEnd() {
          $document.off("mousemove touchmove", onMove);
          $document.off("mouseup touchend", onEnd);
        }

        $document.on("mousemove touchmove", onMove);
        $document.on("mouseup touchend", onEnd);
      };

      //ส่วนแบ่ง Step
      $scope.currentStep = 1;

$scope.selectedStation = null;

$scope.goToStep = function(step, station) {
  $scope.currentStep = step;

  // ถ้าเข้าสต็ป 2 ให้เก็บ station ที่เลือกไว้
  if (step === 2 && station) {
    $scope.selectedStation = station;
  }
};

      // ส่วนจัดการ Step 2
      $scope.getBorderStation = function (station) {
        if (!station || !station.transportation) return "";

        const transportation = $scope.transportation.find(
          (t) => t.id === station.transportation
        );
        if (!transportation) return "";

        switch (transportation.name) {
          case "EXPRESS":
            return "border-pink-2";
          case "B LINE":
            return "border-orange-2";
          case "F LINE":
            return "border-green-2";
          default:
            return "";
        }
      };
    }
  );
