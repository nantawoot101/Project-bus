app.service("AuthenService", function ($http, $q) {
  var API_TOKEN =
    "https://bmta.forthtrack.com/tracking_authenticationBMTA_UAT/token";

  // Config สำหรับ login
  function getLoginConfig() {
    return {
      headers: {
        Authorization: "Basic Qk1UQV9BT1Q6VHJhY2tpbmcyMDI0",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    };
  }

  // ---------------- ฟังก์ชัน login ----------------
  this.login = function (username, password) {
    var deferred = $q.defer();

    var data =
      "grant_type=password&username=" +
      encodeURIComponent(username) +
      "&password=" +
      encodeURIComponent(password);

    $http.post(API_TOKEN, data, getLoginConfig()).then(
      function (response) {
        // บันทึก token ถ้าต้องการ
        localStorage.setItem("access_token", response.data.access_token);
        deferred.resolve(response.data);
      },
      function (error) {
        deferred.reject(error);
      }
    );

    return deferred.promise;
  };
});

