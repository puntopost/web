const defaultPos = { // Coordenadas de Ciudad de México
	coords: {  
		lat: 19.4327402,
		lon: -99.1331565
	}
};
const defaultZoom = 15;
const defaultRadiusKm = 10;
const icon = L.icon({
	iconUrl: 'https://www.puntopost.mx/img/PING1.svg',
	iconSize: [49, 54]
});
const iconSelected = L.icon({
	iconUrl: 'https://www.puntopost.mx/img/PING2.svg',
	iconSize: [63, 70]
});

const currentLocations = [];

const setMap = async (lat = defaultPos.coords.lat, lon = defaultPos.coords.lon) => {
	const map = L.map('map').setView([lat, lon], defaultZoom);

	L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
		maxZoom: 19,
		minZoom: 9,
		attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
	}).addTo(map);

	const pudos = await getPudos(lat, lon);
	fillMarkers(map, pudos);
	setGeolocateButton(map);
	map.addEventListener('zoomend', async () => getAndPrintNewMarkers(map));
	map.addEventListener('dragend', async () => getAndPrintNewMarkers(map));
	map.addEventListener('popupopen', e => {
		toggleIcon(e.popup._source, true);
		centerPopupOnMap(map, e.popup);
	});
	map.addEventListener('popupclose', e => toggleIcon(e.popup._source, false));
	setCPInput(map);
};

const getAndPrintNewMarkers = async (map, cp = null) => {
	const center = map.getCenter();
	removeOutOfSightMarkers(map);
	const pudos = await getPudos(center.lat, center.lng, cp);
	fillMarkers(map, pudos);
	if (cp !== null && pudos.items.length > 0) {
		centerMapToPudo(map, pudos.items[0]);
	}
};

const getPudos = async (lat, lon, cp = null) => {
	const url = 'https://back.puntopost.mx/api/web/v1/pudos';
	let params = {};
	if (cp) {
		params = {
			postal_code: cp,
			radius_km: defaultRadiusKm
		};
	} else {
		params = {
			latitude: lat,
			longitude: lon,
			radius_km: defaultRadiusKm
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

const removeOutOfSightMarkers = (map) => {
	map.eachLayer(layer => {
		if (layer instanceof L.Marker && !map.getBounds().contains(layer.getLatLng())) {
			map.removeLayer(layer);
			const index = currentLocations.findIndex(loc => loc.equals(layer.getLatLng()));
			if (index !== -1) {
				currentLocations.splice(index, 1);
			}
		}
	});
};

const fillMarkers = (map, pudos) => {
	pudos.items.forEach(pudo => {
		const lat = pudo.address.coordinate.latitude;
		const lon = pudo.address.coordinate.longitude;
		if (currentLocations.some(loc => loc.equals(L.latLng([lat, lon])))) return; // Evitar duplicados
		createMarker(
			map,
			pudo.address.coordinate.latitude,
			pudo.address.coordinate.longitude,
			pudo.name,
			pudo.address.address,
			pudo.schedule
		);
	});
};

const createMarker = (map, lat, lon, name, address, schedule) => {
	const marker = L.marker([lat, lon], {icon: icon}).addTo(map);
	const popupHTML = getPopupHTML(name, address, schedule);
	marker.bindPopup(popupHTML, {offset: L.point(0, -20)});
	currentLocations.push(marker.getLatLng());
};

const getPopupHTML = (name, address, schedule) =>
	`<div class="d-flex flex-column gap-3">
  	<b class="fs-6">${name}</b>
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
