app.service("BusLineService", function ($http, $q) {
  var API_BASE = "https://bmta.forthtrack.com/tracking_resourceBMTA_UAT";
  var API_BUSLINE = API_BASE + "/api/BMTA/busline";
  var API_BUSSTATION = API_BASE + "/api/BMTA/busStation/busIncoming";
  var API_CURRENT = API_BASE + "/api/BMTA/current";

  function getConfig() {
    var token = localStorage.getItem("access_token");
    return {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    };
  }

  // ----------------------- API แยก  -----------------------
  this.getBusLine = function () {
    return $http.get(API_BUSLINE, getConfig());
  };

  this.getBusLineById = function (busLineId) {
    return $http.get(API_BUSLINE + "/" + busLineId, getConfig());
  };

  this.getCurrent = function () {
    return $http.get(API_CURRENT, getConfig());
  };

  this.getBusStation = function (startId, destinationId) {
    var data = {
      busStationStartId: startId,
      busStationDestinationId: destinationId,
    };
    return $http.post(API_BUSSTATION, data, getConfig());
  };

  // -------------------------------------------------------

  // -------- ส่วนที่ใช้ดึงข้อมูลรถบัสจากที่ผ่านเส้นทางต้นทางปลายทาง --------
  this.mergeBusData = function (busIncoming, currentBuses) {
    return busIncoming.map(function (incomingBus) {
      var match = currentBuses.find(
        (currentBus) => currentBus.boxId === incomingBus.boxId
      );
      return match
        ? Object.assign({}, incomingBus, match, {
            currentStationName: match.currentStation,
          })
        : incomingBus;
    });
  };

  // ฟังก์ชันรวมข้อมูล
  this.getMergedBusIncoming = function (startId, destinationId) {
    var deferred = $q.defer();

    $q.all([
      this.getBusStation(startId, destinationId),
      this.getCurrent(),
    ]).then(
      (responses) => {
        var busIncoming = responses[0].data.busIncomings || [];
        var currentBuses = responses[1].data.buses || [];
        var merged = busIncoming.length
          ? this.mergeBusData(busIncoming, currentBuses)
          : [];
        deferred.resolve(merged);
      },
      (err) => {
        deferred.reject(err);
      }
    );

    return deferred.promise;
  };
  // -------------------------------------------------------

 
 
 
  // ----------------- ส่วนที่ใช้จัดการสถานี โดยการสร้างสถานีปลายทางสุดท้าย -----------------

  // ดึงสถานีของ busLineId เดียวและตั้งค่า endLocationName เพื่อให้ได้สถานีปลายทาง
  this.getBusLineByIdWithStations = function (busLineId) {
    return this.getBusLineById(busLineId).then((res) => {
      let stations = Array.isArray(res.data)
        ? res.data
        : res.data.busLineStations || [];

      // กรณีข้อมูลซ้อน array อีกชั้น
      if (stations.length > 0 && stations[0].busLineStations) {
        stations = stations[0].busLineStations;
      }

      return {
        busLineId: busLineId,
        busLineStations: stations,
        endLocationName:
          stations.length > 0
            ? stations[stations.length - 1].locationName
            : "ไม่พบข้อมูลปลายทาง",
      };
    });
  };

  // ดึงทุกสายพร้อมสถานีปลายทาง (matching)
  this.getAllBusLinesWithStations = function () {
    return this.getBusLine().then((res) => {
      var busLines = res.data || [];

      var promises = busLines.map((line) => {
        return this.getBusLineByIdWithStations(line.busLineId).then(
          (lineWithStations) => {
            // matching: merge สถานีกลับเข้า line เดิม
            line.busLineStations = lineWithStations.busLineStations;
            line.endLocationName = lineWithStations.endLocationName;
            return line;
          }
        );
      });

      return $q.all(promises).then(() => busLines);
    });
  };

  // -------------------------------------------------------











});
