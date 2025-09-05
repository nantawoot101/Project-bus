app.service("BusTravelService", function ($q) {
  this.lastKnownBusPositions = {};

  // Haversine distance ระหว่าง 2 จุด (lat, lon)
  function haversineDistance(lat1, lon1, lat2, lon2) {
    function toRad(x) {
      return (x * Math.PI) / 180;
    }
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Haversine distance ถึง segment (สถานี → สถานีถัดไป)
  function haversineDistanceToSegment(px, py, x1, y1, x2, y2) {
    function toRad(x) {
      return (x * Math.PI) / 180;
    }
    function latLngToXYZ(lat, lng) {
      lat = toRad(lat);
      lng = toRad(lng);
      const R = 6371000;
      return [
        R * Math.cos(lat) * Math.cos(lng),
        R * Math.sin(lat) * Math.sin(lng),
        R * Math.sin(lat),
      ];
    }
    const p = latLngToXYZ(px, py);
    const a = latLngToXYZ(x1, y1);
    const b = latLngToXYZ(x2, y2);

    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const ab_ap = ab[0] * ap[0] + ab[1] * ap[1] + ab[2] * ap[2];
    const ab_ab = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    let t = ab_ab === 0 ? 0 : ab_ap / ab_ab;
    t = Math.max(0, Math.min(1, t));
    const closest = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
    const dx = p[0] - closest[0];
    const dy = p[1] - closest[1];
    const dz = p[2] - closest[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // ----------------- ฟังก์ชันใข้สำหรับจัดการรถที่จอดอยู่ในสถานีและรถที่อยู่ในระหว่างเดินทาง -----------------
  this.mapBusesToStations = function (route, buses, step, selectedBusNumber) {
    if (!route || !route.busLineStations) return route;

    const stationProximityMeters = 100;
    const segmentProximityMeters = 500;

    // reset
    route.busLineStations.forEach((station) => {
      station.passing_bus_numbers = [];
      station.buses_in_transit_to_next_stop = [];
    });

    buses.forEach((bus) => {
      const busLat =
        bus.latitude ||
        bus.lat ||
        (bus.gps && (bus.gps.latitude || bus.gps.lat));
      const busLng =
        bus.longitude ||
        bus.lng ||
        (bus.gps && (bus.gps.longitude || bus.gps.lng));

      if (busLat == null || busLng == null) return;

      if (step === 3 && selectedBusNumber) {
        if (String(bus.vehicleName) !== String(selectedBusNumber)) return;
      }

      let closestStationIdx = -1;
      let minStationDist = Infinity;
      let closestSegmentIdx = -1;
      let minSegmentDist = Infinity;

      route.busLineStations.forEach((station, idx, arr) => {
        const distToStation = haversineDistance(
          busLat,
          busLng,
          station.latitude,
          station.longitude
        );
        if (distToStation < minStationDist) {
          minStationDist = distToStation;
          closestStationIdx = idx;
        }
        if (idx < arr.length - 1) {
          const nextStation = arr[idx + 1];
          const distToSegment = haversineDistanceToSegment(
            busLat,
            busLng,
            station.latitude,
            station.longitude,
            nextStation.latitude,
            nextStation.longitude
          );
          if (distToSegment < minSegmentDist) {
            minSegmentDist = distToSegment;
            closestSegmentIdx = idx;
          }
        }
      });

      let busSpeed = bus.speed || (bus.gps && bus.gps.speed);
      let isStationary = busSpeed == null || Number(busSpeed) < 1;
      let assigned = false;

      // ตำแหน่งล่าสุด (ถ้ามี)
      let lastKnown = this.lastKnownBusPositions[bus.vehicleName];

      function isValidNextStation(idx) {
        if (!lastKnown) return true;
        return Math.abs(idx - lastKnown.idx) <= 2;
      }
      function isValidNextSegment(idx) {
        if (!lastKnown) return true;
        return Math.abs(idx - lastKnown.idx) <= 2;
      }

      if (
        isStationary &&
        closestStationIdx !== -1 &&
        isValidNextStation(closestStationIdx)
      ) {
        const station = route.busLineStations[closestStationIdx];
        if (!station.passing_bus_numbers.includes(bus.vehicleName)) {
          station.passing_bus_numbers.push(bus.vehicleName);
        }
        this.lastKnownBusPositions[bus.vehicleName] = {
          type: "station",
          idx: closestStationIdx,
        };
        assigned = true;
      } else if (
        minStationDist <= stationProximityMeters &&
        isValidNextStation(closestStationIdx)
      ) {
        const station = route.busLineStations[closestStationIdx];
        if (!station.passing_bus_numbers.includes(bus.vehicleName)) {
          station.passing_bus_numbers.push(bus.vehicleName);
        }
        this.lastKnownBusPositions[bus.vehicleName] = {
          type: "station",
          idx: closestStationIdx,
        };
        assigned = true;
      } else if (
        closestSegmentIdx !== -1 &&
        minSegmentDist <= segmentProximityMeters &&
        isValidNextSegment(closestSegmentIdx)
      ) {
        const station = route.busLineStations[closestSegmentIdx];
        if (!station.buses_in_transit_to_next_stop.includes(bus.vehicleName)) {
          station.buses_in_transit_to_next_stop.push(bus.vehicleName);
        }
        this.lastKnownBusPositions[bus.vehicleName] = {
          type: "segment",
          idx: closestSegmentIdx,
        };
        assigned = true;
      }

      // fallback
      if (!assigned && lastKnown) {
        if (lastKnown.type === "station") {
          const station = route.busLineStations[lastKnown.idx];
          if (
            station &&
            !station.passing_bus_numbers.includes(bus.vehicleName)
          ) {
            station.passing_bus_numbers.push(bus.vehicleName);
          }
        } else if (lastKnown.type === "segment") {
          const station = route.busLineStations[lastKnown.idx];
          if (
            station &&
            !station.buses_in_transit_to_next_stop.includes(bus.vehicleName)
          ) {
            station.buses_in_transit_to_next_stop.push(bus.vehicleName);
          }
        }
      }
    });

    return route;
  };
});
