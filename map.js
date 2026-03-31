// ---------------------------------------------------------------------------
//  PuntoPost Map v2 — spatial cache + incremental rendering
// ---------------------------------------------------------------------------

const API_URL = 'https://back.puntopost.mx/api/web/v1/pudos';
const DEFAULT_CENTER = [19.4327402, -99.1331565];
const DEFAULT_ZOOM = 15;
const DEBOUNCE_MS = 350;
const SPINNER_DELAY_MS = 400;
const COVERAGE_MARGIN = 1.3;
const CELL_SIZE = 0.05;                 // ~5.5 km per grid cell
const MIN_FETCH_RADIUS_KM = Math.ceil(CELL_SIZE * 111 * 1.5);
const MEXICO_BOUNDS = L.latLngBounds([14.5, -118.5], [32.8, -86.5]);

const markerIcon = L.icon({ iconUrl: '/img/PING1.svg', iconSize: [49, 54] });
const markerIconSelected = L.icon({ iconUrl: '/img/PING2.svg', iconSize: [63, 70] });

// ---- State ----------------------------------------------------------------

const markerCache = new Map();
const loadedCells = new Set();
let clusterGroup = null;
let debounceTimer = null;
let spinnerTimer = null;
let activeFetchId = 0;
let fetchQueue = Promise.resolve();

// ---- Spinner --------------------------------------------------------------

function showSpinner(immediate) {
	const el = document.getElementById('map-loading');
	if (!el) return;
	clearTimeout(spinnerTimer);
	if (immediate) {
		el.classList.remove('d-none', 'fade-out');
		return;
	}
	spinnerTimer = setTimeout(() => el.classList.remove('d-none', 'fade-out'), SPINNER_DELAY_MS);
}

function hideSpinner() {
	const el = document.getElementById('map-loading');
	if (!el) return;
	clearTimeout(spinnerTimer);
	el.classList.add('fade-out');
	setTimeout(() => el.classList.add('d-none'), 200);
}

// ---- Spatial grid ---------------------------------------------------------

function viewportRadiusKm(map) {
	const dist = map.getCenter().distanceTo(map.getBounds().getNorthEast());
	return Math.max(Math.ceil((dist / 1000) * COVERAGE_MARGIN), MIN_FETCH_RADIUS_KM);
}

function getVisibleCells(map) {
	const b = map.getBounds();
	const minR = Math.floor(b.getSouth() / CELL_SIZE);
	const maxR = Math.floor(b.getNorth() / CELL_SIZE);
	const minC = Math.floor(b.getWest() / CELL_SIZE);
	const maxC = Math.floor(b.getEast() / CELL_SIZE);
	const cells = [];
	for (let r = minR; r <= maxR; r++)
		for (let c = minC; c <= maxC; c++)
			cells.push(r + ',' + c);
	return cells;
}

function isViewportCovered(map) {
	return getVisibleCells(map).every(c => loadedCells.has(c));
}

function registerFetchedArea(lat, lng, radiusKm) {
	const deg = radiusKm / 111;
	const minR = Math.floor((lat - deg) / CELL_SIZE);
	const maxR = Math.floor((lat + deg) / CELL_SIZE);
	const minC = Math.floor((lng - deg) / CELL_SIZE);
	const maxC = Math.floor((lng + deg) / CELL_SIZE);
	for (let r = minR; r <= maxR; r++)
		for (let c = minC; c <= maxC; c++)
			loadedCells.add(r + ',' + c);
}

function uncoveredCenter(map) {
	const uncovered = getVisibleCells(map).filter(c => !loadedCells.has(c));
	if (uncovered.length === 0) return null;
	let sumLat = 0, sumLng = 0;
	for (const key of uncovered) {
		const [r, c] = key.split(',').map(Number);
		sumLat += (r + 0.5) * CELL_SIZE;
		sumLng += (c + 0.5) * CELL_SIZE;
	}
	return L.latLng(sumLat / uncovered.length, sumLng / uncovered.length);
}

// ---- API ------------------------------------------------------------------

async function fetchURL(url) {
	const res = await fetch(url);
	const data = await res.json();
	if (['VALIDATION', 'NOT_FOUND'].includes(data.type)) return null;
	return data;
}

function buildFirstURL(lat, lng, radiusKm, cp) {
	const params = cp
		? { postal_code: cp, radius_km: radiusKm, cursor: '2000-0' }
		: { latitude: lat, longitude: lng, radius_km: radiusKm, cursor: '2000-0' };
	return API_URL + '?' + new URLSearchParams(params);
}

async function fetchAllPages(firstURL, fetchId, onPage) {
	let url = firstURL;
	while (url) {
		const data = await fetchURL(url);
		if (fetchId !== activeFetchId || !data) return;
		onPage(data);
		url = data.next || null;
	}
}

// ---- Markers --------------------------------------------------------------

function createMarkerObj(pudo) {
	const { latitude, longitude } = pudo.address.coordinate;
	const marker = L.marker([latitude, longitude], { icon: markerIcon });
	marker.bindPopup(buildPopupHTML(pudo), { offset: L.point(0, -20) });
	return marker;
}

function mergeMarkers(pudos) {
	if (!pudos.items || !clusterGroup) return;
	const toAdd = [];
	for (const pudo of pudos.items) {
		if (markerCache.has(pudo.external_id)) continue;
		const marker = createMarkerObj(pudo);
		markerCache.set(pudo.external_id, marker);
		toAdd.push(marker);
	}
	if (toAdd.length) clusterGroup.addLayers(toAdd);
}

function clearAllMarkers() {
	if (clusterGroup) clusterGroup.clearLayers();
	markerCache.clear();
	loadedCells.clear();
}

function buildPopupHTML(pudo) {
	const { name, external_id, address: { address }, schedule } = pudo;
	return `<div class="d-flex flex-column gap-3">
		<div class="d-flex flex-column gap-0">
			<b class="fs-6">${name}</b>
			${external_id ? `<span class="text-body-tertiary small">${external_id}</span>` : ''}
		</div>
		<div class="d-flex align-items-center gap-2">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
				<path d="M19 10C19 13.866 15.866 21 12 21C8.13401 21 5 13.866 5 10C5 6.13401 8.13401 3 12 3C15.866 3 19 6.13401 19 10Z" stroke="#868C8D"/>
				<path d="M15 9C15 10.6569 13.6569 12 12 12C10.3431 12 9 10.6569 9 9C9 7.34315 10.3431 6 12 6C13.6569 6 15 7.34315 15 9Z" stroke="#868C8D"/>
			</svg>
			<div class="text-body-tertiary fs-7">${address}</div>
		</div>
		<div class="d-flex align-items-center gap-2">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
				<path d="M12 21H5C3.89543 21 3 20.1046 3 19V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V12" stroke="#868C8D" stroke-linecap="round"/>
				<ellipse cx="18.0005" cy="18" rx="4" ry="4" stroke="#868C8D"/>
				<path d="M18 17V19L19 19.5" stroke="#868C8D" stroke-linecap="round" stroke-linejoin="round"/>
				<path d="M3 9H21M16 2V6.5M8 2V6.5" stroke="#868C8D" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
			<b class="text-body-tertiary fs-7">${schedule}</b>
		</div>
		<div class="d-flex justify-content-end align-items-center">
			<a href="${getDirectionsURL(address)}" target="_blank" class="btn btn-outline-primary text-primary bg-light rounded-pill">
				Cómo llegar
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
					<path d="M9 5.45654L15.6464 12.103C15.8417 12.2983 15.8417 12.6148 15.6464 12.8101L9 19.4565" stroke="#13A590" stroke-linecap="round"/>
				</svg>
			</a>
		</div>
	</div>`;
}

// ---- Viewport loading -----------------------------------------------------

async function loadViewport(map, cp) {
	if (!cp && isViewportCovered(map)) {
		hideSpinner();
		return;
	}

	if (cp) {
		clearAllMarkers();
		++activeFetchId;
	}

	const fetchId = activeFetchId;
	showSpinner(cp != null);

	const maxFetches = cp ? 1 : 5;
	let fetchCount = 0;
	let handledCP = false;

	while (fetchCount < maxFetches) {
		if (fetchId !== activeFetchId) return;

		const center = (cp && fetchCount === 0)
			? map.getCenter()
			: (uncoveredCenter(map) || map.getCenter());
		const radiusKm = viewportRadiusKm(map);

		registerFetchedArea(center.lat, center.lng, radiusKm);

		const url = buildFirstURL(center.lat, center.lng, radiusKm, cp);
		let gotData = false;

		await fetchAllPages(url, fetchId, (page) => {
			gotData = true;
			mergeMarkers(page);
			if (!handledCP && cp) {
				handledCP = true;
				handlePostalCodeResult(map, page);
			}
			hideSpinner();
		});

		if (!gotData && fetchCount === 0) {
			showToast('No se encontraron PUDOs para la búsqueda realizada.', 'warning');
			break;
		}

		fetchCount++;
		if (isViewportCovered(map)) break;
	}

	hideSpinner();
}

function enqueueViewportLoad(map, cp) {
	fetchQueue = fetchQueue.then(() => loadViewport(map, cp));
}

function scheduleViewportLoad(map) {
	clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => enqueueViewportLoad(map), DEBOUNCE_MS);
}

// ---- Postal code ----------------------------------------------------------

function handlePostalCodeResult(map, pudos) {
	const coord = pudos.coordinate;
	if (!coord) return;
	map.flyTo([coord.latitude, coord.longitude], DEFAULT_ZOOM, { animate: true, duration: 0.75 });
}

// ---- Utilities ------------------------------------------------------------

function getDirectionsURL(address) {
	const encoded = encodeURIComponent(address);
	if (isIOS()) return `https://maps.apple.com/?daddr=${encoded}&dirflg=d`;
	return `https://www.google.com/maps/dir/?api=1&destination=${encoded}&dir_action=navigate`;
}

function isIOS() {
	return ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod']
		.includes(navigator.platform)
		|| (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

// ---- Input ----------------------------------------------------------------

function setupCPInput(map) {
	const cpInput = document.getElementById('find-pudos-input');
	const btn = document.querySelector('.js-find-pudos');
	if (!btn || !cpInput) return;

	const mask = IMask(cpInput, { mask: '00000', lazy: true, placeholderChar: '_' });

	cpInput.addEventListener('focus', () => mask.updateOptions({ lazy: false }));
	cpInput.addEventListener('blur', () => {
		if (!mask.unmaskedValue) mask.updateOptions({ lazy: true });
	});

	const submit = () => {
		const cp = mask.unmaskedValue;
		if (cp.length !== 5) {
			showToast('Ingresa un código postal de 5 dígitos.', 'warning');
			cpInput.focus();
			return;
		}
		enqueueViewportLoad(map, cp);
	};

	cpInput.addEventListener('keypress', e => { if (e.key === 'Enter') submit(); });
	btn.addEventListener('click', submit);
}

// ---- Geolocate ------------------------------------------------------------

function setupGeolocate(map) {
	const btn = document.querySelector('.js-geolocate');
	if (!btn) return;
	btn.addEventListener('click', () => {
		if (!('geolocation' in navigator)) return;
		navigator.geolocation.getCurrentPosition(pos => {
			map.flyTo([pos.coords.latitude, pos.coords.longitude], DEFAULT_ZOOM, { animate: true, duration: 0.75 });
		});
	});
}

// ---- Init -----------------------------------------------------------------

(function init() {
	const map = L.map('map', {
		maxBounds: MEXICO_BOUNDS.pad(0.1),
		maxBoundsViscosity: 0.8
	}).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

	L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png', {
		maxZoom: 19,
		minZoom: 9,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

	clusterGroup = L.markerClusterGroup({
		disableClusteringAtZoom: 15,
		chunkedLoading: true,
		chunkInterval: 100,
		chunkDelay: 10,
		maxClusterRadius: 60,
		showCoverageOnHover: false,
		spiderfyOnEveryZoom: false,
		spiderfyOnMaxZoom: false,
		zoomToBoundsOnClick: true,
		iconCreateFunction: cluster =>
			L.divIcon({
				html: `<div><span>${cluster.getChildCount()}</span></div>`,
				className: 'marker-cluster marker-cluster-small',
				iconSize: L.point(40, 40)
			})
	});
	map.addLayer(clusterGroup);

	map.on('popupopen', e => {
		if (e.popup._source) e.popup._source.setIcon(markerIconSelected);
		const px = map.project(e.popup._latlng);
		px.y -= e.popup._container.clientHeight / 1.5;
		map.panTo(map.unproject(px), { animate: true });
	});
	map.on('popupclose', e => {
		if (e.popup._source) e.popup._source.setIcon(markerIcon);
	});

	map.on('moveend', () => scheduleViewportLoad(map));
	loadViewport(map);
	setupCPInput(map);
	setupGeolocate(map);
})();
