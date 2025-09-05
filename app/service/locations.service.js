app.service("LocationService", function ($http) {
  var API_BASE = "https://bmta.forthtrack.com/tracking_resourcebmta_UAT";
  var API_locations = API_BASE + "/api/locations";

  function getConfig() {
    var token = localStorage.getItem("access_token");
    return {
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
      },
    };
  }
  this.getLocations = function () {
    return $http.get(API_locations, getConfig());
  };
});
