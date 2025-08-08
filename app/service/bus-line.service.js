app.service("BusLineService", function ($http) {
  var API_BASE = "https://bmta.forthtrack.com/tracking_resourcebmta_UAT";
  var API_BUSLINE = API_BASE + "/api/BMTA/busline";
  var API_BUSSTATION = API_BASE + "/api/BMTA/busStation/busIncoming";
  var API_CURRENT = API_BASE + "/api/BMTA/current";  

  return {
    getBusLine: function () {
      var token = localStorage.getItem("access_token"); // หรือ sessionStorage แล้วแต่คุณเก็บไว้ที่ไหน
      var config = {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      };
      return $http.get(API_BUSLINE, config);
    },

    getBusLineById: function (busLineId) {
      var token = localStorage.getItem("access_token"); // หรือ sessionStorage ตามที่คุณเก็บ
      var config = {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      };
      return $http.get(API_BUSLINE + "/" + busLineId, config);
    },


    getCurrent  : function () {
      var token = localStorage.getItem("access_token"); // หรือ sessionStorage แล้วแต่คุณเก็บไว้ที่ไหน
      var config = {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      };
      return $http.get(API_CURRENT, config);
    },

    getBusStation: function () {
      var token = localStorage.getItem("access_token"); // หรือ sessionStorage แล้วแต่คุณเก็บไว้ที่ไหน
      var config = {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      };
      return $http.post(API_BUSSTATION, config);
    },
  };
});
