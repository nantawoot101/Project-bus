var app = angular.module("myApp", [
  "ui.router",
  "ngMaterial",
  "ngAnimate",
  "ngAria",
  "ngMessages",
  "oc.lazyLoad",
  "ngTouch"
]);

angular.module('myApp')
  .config(function($mdGestureProvider) {
    $mdGestureProvider.skipClickHijack(); // ✅ เปิดไว้
    
  });

app.run(function ($rootScope, AuthenService) {
    var defaultUsername = "test_frontend";
    var defaultPassword = "Test1234!";

    var today = new Date().toISOString().split('T')[0]; 
    var lastLoginDate = localStorage.getItem("login_date");

    if (lastLoginDate !== today || !localStorage.getItem("access_token")) {
        // login ใหม่
        AuthenService.login(defaultUsername, defaultPassword).then(function (data) {
            console.log("🎉 Token ใหม่: ", data.access_token);

           
            $rootScope.token = data.access_token;
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("login_date", today);
        }, function (error) {
            console.error("❌ Login Failed: ", error);
        });
    } else {
        // ใช้ token เดิม
        $rootScope.token = localStorage.getItem("access_token");
        console.log("Token: ", $rootScope.token);
    }
});

