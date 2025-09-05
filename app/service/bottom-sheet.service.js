angular.module("myApp").service("BottomSheetService", [
  "$document",
  function ($document) {
    let leafletMap = null;
    let sheet = null;
    let sheetHeightVH = 30;
    let isExpanded = false;

    function setMap(map) {
      leafletMap = map;
    }

    function setSheet(elementId) {
      sheet = document.getElementById(elementId);
      if (!sheet) return false;
      sheet.style.height = sheetHeightVH + "vh";
      updateGpsButtonPosition(sheetHeightVH);
      return true;
    }

    function startDrag(event) {
      if (!sheet) {
        console.warn("Bottom sheet element not set. Call setSheet() first.");
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const isTouchEvent = event.type.startsWith("touch");
      const startY = isTouchEvent ? event.touches[0].pageY : event.pageY;
      const initialHeight = sheet.offsetHeight;
      const vh = window.innerHeight / 100;

      if (leafletMap?.dragging) leafletMap.dragging.disable();

      let currentHeightVH = initialHeight / vh;

      function onMove(e) {
        e.preventDefault();
        e.stopPropagation();

        const gpsButton = document.getElementById("gpsButton");
        if (gpsButton) gpsButton.style.display = "none";

        const moveY = e.type.startsWith("touch") ? e.touches[0].pageY : e.pageY;
        const deltaY = startY - moveY;
        currentHeightVH = (initialHeight + deltaY) / vh;

        // ปรับค่าสูงสุดเฉพาะ buslineSheet
        const maxHeight = sheet.id === "buslineSheet" ? 80 : 90;
        currentHeightVH = Math.max(30, Math.min(maxHeight, currentHeightVH));

        sheet.style.height = currentHeightVH + "vh";
        updateGpsButtonPosition(currentHeightVH);
      }

      function onEnd(e) {
        e.preventDefault();
        e.stopPropagation();

        $document.off("mousemove", onMove);
        $document.off("mouseup", onEnd);
        $document.off("touchmove", onMove);
        $document.off("touchend", onEnd);

        if (leafletMap?.dragging) leafletMap.dragging.enable();

        const snapLevels =
          sheet.id === "buslineSheet" ? [30, 60, 80] : [30, 60, 90];
        const closest = snapLevels.reduce((prev, curr) =>
          Math.abs(curr - currentHeightVH) < Math.abs(prev - currentHeightVH)
            ? curr
            : prev
        );

        sheetHeightVH = closest;
        sheet.style.height = sheetHeightVH + "vh";
        isExpanded = sheetHeightVH >= 50;

        const gpsButton = document.getElementById("gpsButton");
        if (gpsButton) {
          gpsButton.style.transition = "none";
          gpsButton.style.opacity = "1";
          gpsButton.style.display = "block";
          updateGpsButtonPosition(sheetHeightVH);
        }
      }

      $document.on("mousemove", onMove);
      $document.on("mouseup", onEnd);
      $document.on("touchmove", onMove);
      $document.on("touchend", onEnd);
    }

    function updateGpsButtonPosition(bottomSheetHeightVH) {
      const gpsButton = document.getElementById("gpsButton");
      if (!gpsButton) return;
      const vh = window.innerHeight / 100;
      const offsetY = window.innerWidth <= 767 ? -8 * vh : -4 * vh;
      gpsButton.style.bottom = bottomSheetHeightVH * vh + offsetY + "px";
    }

    return {
      setMap,
      setSheet,
      startDrag,
      updateGpsButtonPosition,
      getSheetHeight: () => sheetHeightVH,
      isExpanded: () => isExpanded,
    };
  },
]);
