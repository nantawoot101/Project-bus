app.service('LocationService', function ($http) {
  var API_BASE = "https://bmta.forthtrack.com/tracking_resourcebmta_UAT";
  var API_locations = API_BASE + "/api/locations";

  return {
    getLocations: function () {
      var token = localStorage.getItem("access_token"); // หรือ sessionStorage แล้วแต่คุณเก็บไว้ที่ไหน
      var config = {
        headers: {
          "Authorization": "Bearer " + token,
          "Accept": "application/json"
        }
      };
      return $http.get(API_locations, config);
    }
  };
});
