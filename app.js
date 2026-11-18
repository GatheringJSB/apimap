const GEOCODING_URL = "https://nominatim.openstreetmap.org/search";
const ROUTING_URL = "https://router.project-osrm.org/route/v1/driving";
const GEOCODING_INTERVAL = 1100;

const locations = {
  origin: null,
  destination: null,
};

let lastGeocodingRequestAt = 0;
let geocodingQueue = Promise.resolve();
let routeRequestId = 0;

const elements = {
  measureButton: document.querySelector("#measure-button"),
  routeStatus: document.querySelector("#route-status"),
  routeResult: document.querySelector("#route-result"),
  distanceValue: document.querySelector("#distance-value"),
  durationValue: document.querySelector("#duration-value"),
  mapLink: document.querySelector("#map-link"),
};

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function geocode(query) {
  const runRequest = async () => {
    const delay = Math.max(
      0,
      lastGeocodingRequestAt + GEOCODING_INTERVAL - Date.now(),
    );
    if (delay > 0) await wait(delay);
    lastGeocodingRequestAt = Date.now();

    const url = new URL(GEOCODING_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "5");

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }

    return response.json();
  };

  const request = geocodingQueue.then(runRequest, runRequest);
  geocodingQueue = request.catch(() => {});
  return request;
}

function updateMeasureButton() {
  elements.measureButton.disabled = !(
    locations.origin && locations.destination
  );
}

function clearRoute() {
  routeRequestId += 1;
  elements.routeResult.hidden = true;
  elements.routeStatus.textContent = "";
}

function selectLocation(kind, location, status, results, input) {
  locations[kind] = location;
  status.textContent = location.display_name;
  results.replaceChildren();
  input.value = location.display_name.split(",")[0];
  clearRoute();
  updateMeasureButton();
}

function renderResults(kind, matches, status, results, input) {
  results.replaceChildren();
  if (matches.length === 0) {
    status.textContent = "검색 결과가 없습니다. 다른 이름으로 검색해 보세요.";
    return;
  }

  status.textContent = "정확한 장소를 선택해 주세요.";
  for (const location of matches) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "result-option";
    option.textContent = location.display_name;
    option.addEventListener("click", () =>
      selectLocation(kind, location, status, results, input),
    );
    results.append(option);
  }
}

function setupSearch(kind) {
  const form = document.querySelector(`#${kind}-form`);
  const input = document.querySelector(`#${kind}-query`);
  const status = document.querySelector(`#${kind}-status`);
  const results = document.querySelector(`#${kind}-results`);
  const button = form.querySelector("button[type='submit']");
  let searchId = 0;

  input.addEventListener("input", () => {
    locations[kind] = null;
    status.textContent = "";
    results.replaceChildren();
    clearRoute();
    updateMeasureButton();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    const currentSearchId = ++searchId;
    locations[kind] = null;
    clearRoute();
    updateMeasureButton();
    results.replaceChildren();
    status.textContent = "장소를 찾고 있습니다...";
    button.disabled = true;

    try {
      const matches = await geocode(query);
      if (currentSearchId === searchId) {
        renderResults(kind, matches, status, results, input);
      }
    } catch (error) {
      if (currentSearchId === searchId) {
        status.textContent =
          error instanceof TypeError
            ? "네트워크 오류로 장소를 검색하지 못했습니다."
            : error.message;
      }
    } finally {
      if (currentSearchId === searchId) {
        button.disabled = false;
      }
    }
  });
}

function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters).toLocaleString("ko-KR")} m`;
  }
  return `${(meters / 1000).toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  })} km`;
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `예상 운전 시간 약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes
    ? `예상 운전 시간 약 ${hours}시간 ${remainingMinutes}분`
    : `예상 운전 시간 약 ${hours}시간`;
}

async function findRoute() {
  const { origin, destination } = locations;
  if (!origin || !destination) return;

  const currentRequestId = ++routeRequestId;
  elements.measureButton.disabled = true;
  elements.routeResult.hidden = true;
  elements.routeStatus.textContent = "이동 경로를 계산하고 있습니다...";

  const coordinates = `${origin.lon},${origin.lat};${destination.lon},${destination.lat}`;
  const url = `${ROUTING_URL}/${coordinates}?overview=false&steps=false`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("경로를 계산하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes?.length) {
      throw new Error("두 장소 사이의 자동차 경로를 찾을 수 없습니다.");
    }
    if (currentRequestId !== routeRequestId) return;

    const route = data.routes[0];
    elements.distanceValue.textContent = formatDistance(route.distance);
    elements.durationValue.textContent = formatDuration(route.duration);

    const mapUrl = new URL("https://www.openstreetmap.org/directions");
    mapUrl.searchParams.set("engine", "fossgis_osrm_car");
    mapUrl.searchParams.set(
      "route",
      `${origin.lat},${origin.lon};${destination.lat},${destination.lon}`,
    );
    elements.mapLink.href = mapUrl.toString();
    elements.routeResult.hidden = false;
    elements.routeStatus.textContent = "";
  } catch (error) {
    if (currentRequestId === routeRequestId) {
      elements.routeStatus.textContent =
        error instanceof TypeError
          ? "네트워크 오류로 경로를 계산하지 못했습니다."
          : error.message;
    }
  } finally {
    if (currentRequestId === routeRequestId) {
      updateMeasureButton();
    }
  }
}

setupSearch("origin");
setupSearch("destination");
elements.measureButton.addEventListener("click", findRoute);
