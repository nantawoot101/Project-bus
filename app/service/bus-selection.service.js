app.service('BusSelectionService', function () {
  var selectedData = {
    busNumber: null,
    stations: null,
    busLines: null,
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
    setStation: function (stations) {
      selectedData.stations = stations;
    },
    setBusLine: function (busLines) {
      selectedData.busLines = busLines;
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
