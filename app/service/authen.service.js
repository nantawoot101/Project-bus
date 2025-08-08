app.service('AuthenService', function ($http, $q) {
    var API_TOKEN = "https://bmta.forthtrack.com/tracking_authenticationBMTA_UAT/token";
    var API_USERINFO = "https://bmta.forthtrack.com/tracking_resourcebmta_UAT/api";
    var basicAuth = "Basic Qk1UQV9BT1Q6VHJhY2tpbmcyMDI0";

    // ฟังก์ชัน login
   this.login = function (username, password) {
    var deferred = $q.defer();

    var data = "grant_type=password&username=" + encodeURIComponent(username) + "&password=" + encodeURIComponent(password);

    var config = {
        headers: {
            "Authorization": basicAuth,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    };

    $http.post(API_TOKEN, data, config).then(function (response) {
        deferred.resolve(response.data);
    }, function (error) {
        deferred.reject(error);
    });

    return deferred.promise;
};


});
