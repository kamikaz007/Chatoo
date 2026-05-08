/**
 * js/map.js
 * Leaflet Map — Venues from Firestore + Geolocation
 */

window.ChatooMap = (() => {
  let map = null, darkLayer = null, satLayer = null;
  let currentLayer = "dark";
  let userMarker = null;
  let markers = [];

  function init() {
    if (map) { map.invalidateSize(); return; }
    const center = CHATOO_CONFIG.map.defaultCenter;

    map = L.map("map-container", {
      center, zoom: CHATOO_CONFIG.map.defaultZoom,
      zoomControl: false, attributionControl: false
    });

    darkLayer = L.tileLayer(CHATOO_CONFIG.map.darkTileLayer, { maxZoom: 19 });
    satLayer  = L.tileLayer(CHATOO_CONFIG.map.satelliteLayer,  { maxZoom: 19 });
    darkLayer.addTo(map);

    loadVenues();
    locateMe();
    addLegend();
  }

  async function loadVenues() {
    let venues = [];
    try {
      venues = await FirebaseService.getVenues();
    } catch {}

    // Fallback demo venues if Firestore empty
    if (!venues.length) {
      venues = [
        { name: "Café Tunis",      lat: 36.8190, lon: 10.1658, status: "live",   type: "cafe"       },
        { name: "Haj Mostapha",    lat: 36.8665, lon: 10.1647, status: "active", type: "restaurant" },
        { name: "Café Bizerte",    lat: 37.2744, lon: 9.8739,  status: "sync",   type: "cafe"       },
        { name: "Beach Club Hammamet", lat: 36.3985, lon: 10.5732, status: "live", type: "club"    }
      ];
    }

    renderMarkers(venues);
    renderRadar(venues);
    renderMarquee(venues);
  }

  function renderMarkers(venues) {
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    venues.forEach(venue => {
      const color = venue.status === "live" ? "#00ff88" : venue.status === "sync" ? "#ffd700" : "#8257e5";
      const icon = L.divIcon({
        html: `
          <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:30px;height:30px;border:2px solid ${color};border-radius:50%;animation:pulseRing 2s infinite;opacity:0.7;"></div>
            <div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid rgba(0,0,0,0.5);box-shadow:0 0 10px ${color};"></div>
          </div>`,
        className: "", iconSize: [40, 40], iconAnchor: [20, 20]
      });

      const typeEmoji = { cafe: "☕", restaurant: "🍽️", club: "🎵", shop: "🛍️" }[venue.type] || "📍";

      const m = L.marker([venue.lat, venue.lon], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="text-align:center;padding:6px;min-width:140px;">
            <div style="font-size:22px;">${typeEmoji}</div>
            <b style="font-size:14px;">${venue.name}</b>
            <div style="font-size:11px;color:${color};margin:4px 0;">${venue.status?.toUpperCase()}</div>
            <button onclick="ChatooChat.open('${venue.name}');map.closePopup();"
              style="background:#8257e5;border:none;color:#fff;padding:8px 16px;border-radius:20px;cursor:pointer;font-weight:bold;font-size:12px;width:100%;margin-top:4px;">
              💬 دخول الغرفة
            </button>
          </div>
        `);
      markers.push(m);
    });
  }

  function renderRadar(venues) {
    const radar = document.getElementById("radar-list");
    if (!radar) return;
    radar.innerHTML = venues.map(v => {
      const color = v.status === "live" ? "#00ff88" : v.status === "sync" ? "#ffd700" : "#8257e5";
      return `
        <div class="venue-node" onclick="ChatooChat.open('${v.name}')">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};flex-shrink:0;"></div>
            <b style="font-size:13px;">${v.name}</b>
          </div>
          <div style="font-size:10px;opacity:0.5;">${v.status?.toUpperCase()} · ${v.type || "venue"}</div>
        </div>
      `;
    }).join("");
  }

  function renderMarquee(venues) {
    const marquee = document.getElementById("marquee-content");
    if (!marquee) return;
    const live = venues.filter(v => v.status === "live");
    marquee.textContent = live.length
      ? `🔴 LIVE: ${live.map(v => v.name).join("  •  ")}  —  ${venues.length} أماكن قريبة متاحة`
      : `${venues.length} أماكن متاحة  •  مرحباً بك في Chatoo Ultra Pro`;
  }

  function locateMe() {
    if (!map) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lon } = pos.coords;
        map.setView([lat, lon], 15);
        if (userMarker) map.removeLayer(userMarker);
        userMarker = L.circleMarker([lat, lon], {
          radius: 10, fillColor: "#8257e5", fillOpacity: 1,
          color: "#fff", weight: 3
        }).addTo(map).bindPopup("📍 أنت هنا");
        ChatooUI.toast("تم تحديد موقعك ✓", "success");
      },
      () => ChatooUI.toast("تعذر تحديد الموقع", "warn")
    );
  }

  function zoomIn()  { if (map) map.zoomIn(); }
  function zoomOut() { if (map) map.zoomOut(); }

  function toggleLayer() {
    if (!map) return;
    if (currentLayer === "dark") {
      map.removeLayer(darkLayer); satLayer.addTo(map); currentLayer = "sat";
      document.getElementById("layer-toggle-btn").textContent = "🗺️";
    } else {
      map.removeLayer(satLayer); darkLayer.addTo(map); currentLayer = "dark";
      document.getElementById("layer-toggle-btn").textContent = "🛰️";
    }
  }

  function addLegend() {
    const container = document.getElementById("map-container");
    if (!container || document.querySelector(".map-legend")) return;
    const div = document.createElement("div");
    div.className = "map-legend";
    div.innerHTML = `
      <div style="margin-bottom:4px;"><span class="legend-dot live"></span> LIVE</div>
      <div style="margin-bottom:4px;"><span class="legend-dot active"></span> ACTIVE</div>
      <div><span class="legend-dot sync"></span> SYNC</div>
    `;
    container.appendChild(div);
  }

  return { init, locateMe, zoomIn, zoomOut, toggleLayer };
})();
