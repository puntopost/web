const defaultPos = { // Coordenadas de Ciudad de México
	coords: {  
		lat: 19.4327402,
		lon: -99.1331565
	}
};
const defaultZoom = 15;
const defaultRadiusKm = 8;
const maxRadiusKm = 200;
const SHOW_DEBUG_CENTER = false; // Marcar centro y radio de cada llamada a /pudos para depuración
const icon = L.icon({
	iconUrl: 'https://www.puntopost.mx/img/PING1.svg',
	iconSize: [49, 54]
});
const iconSelected = L.icon({
	iconUrl: 'https://www.puntopost.mx/img/PING2.svg',
	iconSize: [63, 70]
});

const currentLocations = [];
let postalCodeMarker = null;
let debugCenterMarker = null;
let debugRadiusCircle = null;
let clusterGroup = null;
let mapUpdateTimeout = null;
let lastDataZoom = defaultZoom;

const showMapLoading = () => {
	const el = document.getElementById('map-loading');
	if (el) el.classList.remove('d-none');
};

const hideMapLoading = () => {
	const el = document.getElementById('map-loading');
	if (el) el.classList.add('d-none');
};

const createClusterGroup = (map) => {
	// Destruimos cualquier grupo anterior para evitar restos de DOM/animaciones.
	if (clusterGroup) {
		map.removeLayer(clusterGroup);
		clusterGroup = null;
	}

	clusterGroup = L.markerClusterGroup({
		disableClusteringAtZoom: 15,
		chunkedLoading: true,
		// Sin áreas azules ni \"spider\" de líneas al abrir un clúster
		showCoverageOnHover: false,
		spiderfyOnEveryZoom: false,
		spiderfyOnMaxZoom: false,
		zoomToBoundsOnClick: true,
		// Desactivamos animaciones internas del plugin, que también pueden
		// dejar iconos \"fantasma\" en algunos navegadores.
		animate: false,
		animateAddingMarkers: false,
		iconCreateFunction: (cluster) =>
			L.divIcon({
				html: `<div><span>${cluster.getChildCount()}</span></div>`,
				className: 'marker-cluster marker-cluster-small',
				iconSize: L.point(40, 40)
			})
	});
	map.addLayer(clusterGroup);
};

const setMap = async (lat = defaultPos.coords.lat, lon = defaultPos.coords.lon) => {
	const map = L.map('map', {
		// Evitamos animaciones de zoom y de markers que en algunos navegadores
		// dejan \"fantasmas\" de los iconos en pantalla al hacer zoom in / out.
		zoomAnimation: false,
		markerZoomAnimation: false,
		fadeAnimation: false,
		// Forzamos canvas para minimizar glitches de repintado de iconos SVG.
		preferCanvas: true
	}).setView([lat, lon], defaultZoom);

	// Pane específico para el marcador del código postal, por encima de los PUDO.
	map.createPane('postalCodePane');
	map.getPane('postalCodePane').style.zIndex = 650;

	// Pane específico para depuración (centro y radio), por encima de todo lo demás.
	map.createPane('debugCenterPane');
	map.getPane('debugCenterPane').style.zIndex = 700;

	L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
		maxZoom: 19,
		minZoom: 9,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

	// Agrupación de PUDOs: por debajo de zoom 15 se agrupan; a partir de 15 se ven sueltos.
	createClusterGroup(map);

	const initialRadiusKm = getRadiusKmForZoom(map.getZoom());
	showMapLoading();
	try {
		const pudos = await getPudos(lat, lon, null, initialRadiusKm);
		clusterGroup.clearLayers();
		currentLocations.length = 0;
		fillMarkers(map, pudos);
		lastDataZoom = map.getZoom();
		if (SHOW_DEBUG_CENTER) {
			markDebugCenterAndRadius(map, lat, lon, initialRadiusKm);
		}
	} finally {
		hideMapLoading();
	}
	setGeolocateButton(map);
	map.addEventListener('zoomend', () => scheduleMapUpdate(map));
	map.addEventListener('dragend', () => scheduleMapUpdate(map));
	map.addEventListener('popupopen', e => {
		// Cambiamos el icono del PUDO seleccionado
		toggleIcon(e.popup._source, true);
		centerPopupOnMap(map, e.popup);
		// Mientras el popup está abierto desactivamos el zoom con la rueda
		// para evitar el bug de \"PUDO fantasma\" en Firefox al hacer scroll
		// con la rueda del ratón sobre el mapa.
		if (map.scrollWheelZoom && map.scrollWheelZoom.enabled()) {
			map.scrollWheelZoom.disable();
		}
	});
	map.addEventListener('popupclose', e => {
		toggleIcon(e.popup._source, false);
		// Rehabilitamos el zoom con rueda cuando se cierra el popup.
		if (map.scrollWheelZoom && !map.scrollWheelZoom.enabled()) {
			map.scrollWheelZoom.enable();
		}
	});

	// Ya no necesitamos hacks de scroll / wheel para cerrar el popup,
	// porque el zoom con rueda queda desactivado mientras el popup está abierto.

	setCPInput(map);
};

const scheduleMapUpdate = (map) => {
	if (mapUpdateTimeout) {
		clearTimeout(mapUpdateTimeout);
	}
	const currentZoom = map.getZoom();

	// Siempre mostramos el spinner cuando se programa una nueva carga.
	showMapLoading();

	// Solo recreamos el grupo de clústeres inmediatamente si ha cambiado el nivel de zoom.
	if (clusterGroup && currentZoom !== lastDataZoom) {
		currentLocations.length = 0;
		createClusterGroup(map);
	}

	mapUpdateTimeout = setTimeout(() => {
		getAndPrintNewMarkers(map);
	}, 200);
};

const getAndPrintNewMarkers = async (map, cp = null) => {
	showMapLoading();
	try {
		const center = map.getCenter();
		const radiusKm = getRadiusKmForZoom(map.getZoom());
		const pudos = await getPudos(center.lat, center.lng, cp, radiusKm);
		// Siempre regeneramos el grupo para asegurarnos de que no queden restos
		// de DOM / animaciones anteriores.
		createClusterGroup(map);
		currentLocations.length = 0;
		fillMarkers(map, pudos);
		lastDataZoom = map.getZoom();
		if (SHOW_DEBUG_CENTER) {
			markDebugCenterAndRadius(map, center.lat, center.lng, radiusKm);
		}

		// Si la búsqueda es por código postal, marcamos la ubicación aproximada del CP.
		if (cp !== null) {
			// El backend puede devolver distintas claves para la coordenada de búsqueda.
			// Probamos varias y, si no existe ninguna, usamos el primer PUDO como aproximación.
			const searchCoord =
				pudos.search_coordinate ||
				pudos.center ||
				pudos.coordinate ||
				(pudos.items && pudos.items[0]
					? {
							latitude: pudos.items[0].address.coordinate.latitude,
							longitude: pudos.items[0].address.coordinate.longitude
						}
					: null);

			if (searchCoord && typeof searchCoord.latitude === 'number' && typeof searchCoord.longitude === 'number') {
				const { latitude, longitude } = searchCoord;

				// Eliminar posible marcador anterior del código postal.
				if (postalCodeMarker) {
					map.removeLayer(postalCodeMarker);
					postalCodeMarker = null;
				}

				postalCodeMarker = L.circleMarker(
					[latitude, longitude],
					{
						pane: 'postalCodePane',
						// Punto rojo pequeño y muy visible
						color: '#FF4B5C',
						fillColor: '#FF4B5C',
						fillOpacity: 1,
						radius: 5,
						weight: 2
					}
				).addTo(map);

				map.flyTo([latitude, longitude], defaultZoom, { animate: true, duration: 0.75 });
			} else if (pudos.items && pudos.items.length > 0) {
				// Fallback: centramos en el primer PUDO si no tenemos coordenada explícita del CP.
				centerMapToPudo(map, pudos.items[0]);
			}
		}
	} finally {
		hideMapLoading();
	}
};

const getPudos = async (lat, lon, cp = null, radiusKm = defaultRadiusKm) => {
	const url = 'https://back.puntopost.mx/api/web/v1/pudos';
	let params = {};
	const effectiveRadius = Math.min(radiusKm || defaultRadiusKm, maxRadiusKm);
	if (cp) {
		params = {
			postal_code: cp,
			radius_km: effectiveRadius,
			cursor: '2000-0' // limit 2000, offset 0
		};
	} else {
		params = {
			latitude: lat,
			longitude: lon,
			radius_km: effectiveRadius,
			cursor: '2000-0' // limit 2000, offset 0
		};
	}
	
	const response = await fetch(url + '?' + new URLSearchParams(params));
	const result = await response.json();
	if (['VALIDATION', 'NOT_FOUND'].includes(result.type)) {
		alert('No se encontraron PUDOs para la búsqueda realizada.');
		return {items: []};
	}
	return result;
};

const fillMarkers = (map, pudos) => {
	if (!pudos.items || !clusterGroup) return;
	pudos.items.forEach(pudo => {
		createMarker(
			pudo.address.coordinate.latitude,
			pudo.address.coordinate.longitude,
			pudo.name,
			pudo.external_id,
			pudo.address.address,
			pudo.schedule
		);
	});
};

const createMarker = (lat, lon, name, externalId, address, schedule) => {
	const marker = L.marker([lat, lon], { icon: icon });
	const popupHTML = getPopupHTML(name, externalId, address, schedule);
	marker.bindPopup(popupHTML, { offset: L.point(0, -20) });
	clusterGroup.addLayer(marker);
	currentLocations.push(marker.getLatLng());
};

const getPopupHTML = (name, externalId, address, schedule) =>
	`<div class="d-flex flex-column gap-3">
		<div class="d-flex flex-column gap-0">
  			<b class="fs-6">${name}</b>
			${externalId ? `<span class="text-body-tertiary small">${externalId}</span>` : ''}
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
			<a href="${getDirections(address)}" target="_blank" class="btn btn-outline-primary text-primary bg-light rounded-pill">
				Cómo llegar
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none">
					<path d="M9 5.45654L15.6464 12.103C15.8417 12.2983 15.8417 12.6148 15.6464 12.8101L9 19.4565" stroke="#13A590" stroke-linecap="round"/>
				</svg>
			</a>
		</div>
	</div>`;

const toggleIcon = (marker, isSelected) => {
	if (isSelected) {
		marker.setIcon(iconSelected);
	} else {
		marker.setIcon(icon);
	}
};

const centerPopupOnMap = (map, popup) => {
	const px = map.project(popup._latlng);
	px.y -= popup._container.clientHeight/1.5;
	map.panTo(map.unproject(px),{animate: true});
};

const centerMapToPudo = (map, pudo) => {
	map.flyTo(
		[
			pudo.address.coordinate.latitude,
			pudo.address.coordinate.longitude
		],
		defaultZoom,
		{animate: true, duration: 0.75}
	);
};

const getRadiusKmForZoom = (zoom) => {
	if (zoom >= 17) return 2;
	if (zoom >= 16) return 3;
	if (zoom >= 15) return 5;
	if (zoom >= 14) return 12;
	if (zoom >= 13) return 20;
	if (zoom >= 12) return 40;
	if (zoom >= 11) return 100;
	if (zoom >= 10) return 200;
	if (zoom >= 9) return 400;
	return maxRadiusKm; // 200 km para zoom < 9
};

const markDebugCenterAndRadius = (map, lat, lon, radiusKm) => {
	const zoom = map.getZoom();

	// Eliminar marcadores de depuración anteriores
	if (debugCenterMarker) {
		map.removeLayer(debugCenterMarker);
		debugCenterMarker = null;
	}
	if (debugRadiusCircle) {
		map.removeLayer(debugRadiusCircle);
		debugRadiusCircle = null;
	}

	// Punto azul pequeño en el centro de la llamada
	debugCenterMarker = L.circleMarker(
		[lat, lon],
		{
			pane: 'debugCenterPane',
			color: '#007AFF',
			fillColor: '#007AFF',
			fillOpacity: 0.9,
			radius: 4,
			weight: 1
		}
	).addTo(map);

	const label = `z${zoom} r${radiusKm || defaultRadiusKm}km`;
	debugCenterMarker.bindTooltip(label, {
		permanent: true,
		direction: 'top',
		offset: [0, -8],
		className: 'debug-center-tooltip'
	});

	// Círculo mostrando el radio en km de la llamada
	debugRadiusCircle = L.circle(
		[lat, lon],
		{
			pane: 'debugCenterPane',
			color: '#007AFF',
			fillOpacity: 0,
			weight: 1,
			radius: (radiusKm || defaultRadiusKm) * 1000 // Leaflet usa metros
		}
	).addTo(map);
};

const centerMapToLocation = (map, lat, lon) => {
	
};

const getDirections = address => {
	if (isIOS()) {
		return `https://maps.apple.com/?daddr=${address}&dirflg=d`;
	}
	return `https://www.google.com/maps/dir/?api=1&destination=${address}&dir_action=navigate`;
};
const isIOS = () => 
	[
    'iPad Simulator',
    'iPhone Simulator',
    'iPod Simulator',
    'iPad',
    'iPhone',
    'iPod'
  ].includes(navigator.platform)
  // iPad on iOS 13 detection
  || (navigator.userAgent.includes("Mac") && "ontouchend" in document);

const setCPInput = (map) => {
	const cpInput = document.getElementById('find-pudos-input');
	const btn = document.querySelector('.js-find-pudos');
	if (!btn || !cpInput) return;
	cpInput.addEventListener('keypress', async (event) => {
		if (event.key === 'Enter') {
			const cp = cpInput.value.trim();
			if (cp.length === 0) return;
			getAndPrintNewMarkers(map, cp);
		}
	});
	btn.addEventListener('click', async () => {
		const cp = cpInput.value.trim();
		if (cp.length === 0) return;
		getAndPrintNewMarkers(map, cp);
	});
};

const setGeolocateButton = (map) => {
	const geoBtn = document.querySelector('.js-geolocate');
	if (!geoBtn) return;
	geoBtn.addEventListener('click', async () => {
		if ("geolocation" in navigator) { // Ir a la posición, marcarla y buscar PUDOs cercanos
			navigator.geolocation.getCurrentPosition(
				position => {
					map.flyTo([position.coords.latitude, position.coords.longitude], defaultZoom, {animate: true, duration: 0.75});
					map.eachLayer(layer => { // Eliminar posible posición anterior
						if (layer instanceof L.Circle) {
							map.removeLayer(layer);
						}
					});
					const circle = L.circle([position.coords.latitude, position.coords.longitude], { // Marcar posición actual
						color: 'blue',
						fillColor: 'blue',
						fillOpacity: 0.4,
						radius: 70,
						weight: 1
					}).addTo(map);
					getAndPrintNewMarkers(map);
				}
			);
		}
	});
};

setMap();
