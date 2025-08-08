app.service('BusSelectionService', function () {
  var selectedData = {
    busNumber: null,
    stop: null,
    route: null,
    isTransit: false,
    showBusSelectionModal: false
  };

  return {
    getSelectedData: function () {
      return selectedData;
    },
    setBusNumber: function (busNumber) {
      selectedData.busNumber = busNumber;
    },
    setStop: function (stop) {
      selectedData.stop = stop;
    },
    setRoute: function (route) {
      selectedData.route = route;
    },
    setTransitMode: function (isTransit) {
      selectedData.isTransit = isTransit;
    },
    setShowModal: function (value) {
      selectedData.showBusSelectionModal = value;
    },
    clear: function () {
      selectedData = {
        busNumber: null,
        stop: null,
        route: null,
        isTransit: false,
        showBusSelectionModal: false
      };
    }
  };
});
