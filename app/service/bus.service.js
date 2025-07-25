app.service('BusService', function($rootScope) {
  let busState = {
    selectedLine: null,
    travelInfo: null
  };

  return {
    getState: () => busState,

    setLine(line) {
      busState.selectedLine = line;
      $rootScope.$broadcast('busLineUpdated');
    },

    setTravel(info) {
      busState.travelInfo = info;
      $rootScope.$broadcast('busTravelUpdated');
    }
  };
});