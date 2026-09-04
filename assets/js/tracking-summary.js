import { API_BASE, httpFetch, showApiErrorToast } from './api.js';
import { getDirectionsURL } from './directions.js';

// El identificador viaja en el fragmento: /tracking-summary/#MX0000000000
// Sin identificador se muestra el formulario para introducirlo.
document.addEventListener('DOMContentLoaded', () => {
	const trackingId = getTrackingIdFromHash();
	if (trackingId) {
		fetchTrackingInfo(trackingId);
	} else {
		hideLoading();
		showTrackingForm('');
	}
	// Cualquier cambio del fragmento (formulario, botón atrás, edición manual)
	// recarga la página para partir de un estado limpio.
	window.addEventListener('hashchange', () => window.location.reload());
});

// Muestra el formulario de búsqueda con `value` precargado en el input.
const showTrackingForm = (value) => {
	const container = document.getElementById('tracking-form-container');
	const form = document.getElementById('tracking-form');
	const input = document.getElementById('tracking-input');
	if (!container || !form || !input) return;
	input.value = value;
	container.classList.remove('d-none');
	input.focus();
	form.addEventListener('submit', (event) => {
		event.preventDefault();
		const next = (input.value || '').trim();
		if (!next) return;
		window.location.hash = encodeURIComponent(next);
	});
};

const getTrackingIdFromHash = () => {
	const raw = window.location.hash.slice(1).trim();
	if (!raw) return '';
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
};

const hideLoading = () => {
	const el = document.getElementById('tracking-loading');
	if (el) el.classList.add('d-none');
};

const fetchTrackingInfo = async (trackingId) => {
	const url = API_BASE + '/parcels/' + encodeURIComponent(trackingId);
	const result = await httpFetch(url);
	hideLoading();
	if (!result.ok) {
		if (result.status >= 400 && result.status < 500) {
			document.getElementById('tracking-error-alert').classList.remove('d-none');
			showTrackingForm(trackingId);
		} else {
			showApiErrorToast(result.status);
		}
		return;
	}
	displayTrackingInfo(result.body.detail, trackingId);
};

const displayTrackingInfo = (data, trackingId) => {
	showStatusBadge(data.status);

	setToggleCollapseText();

	document.querySelector('.js-tracking-id').textContent = trackingId.toUpperCase();

	const showDestinationStatuses = ['created', 'in_origin_point', 'in_transit_depot', 'in_depot', 'in_transit_destination', 'in_destination_point', 'in_rerouted_point', 'delivered'];
	const showOriginStatuses = ['return_in_destination_point', 'return_in_transit_depot', 'return_in_depot', 'return_in_transit_origin', 'return_in_origin_point', 'return_in_rerouted_point', 'return_delivered'];

	if (showDestinationStatuses.includes(data.status)) {
		showLocationSection('Destino', data.destination);
	} else if (showOriginStatuses.includes(data.status)) {
		showLocationSection('Origen', data.origin);
	}
	const returnFailOriginEntry = Array.isArray(data.status_history)
		? data.status_history.find((item) => item.status === 'return_fail_in_origin_point')
		: null;
	const returnFailCutDate = returnFailOriginEntry ? new Date(returnFailOriginEntry.when) : null;

	// Construir eventos combinando status_history y movements
	const allEvents = buildTimelineEvents(data);
	const events = returnFailCutDate
		? allEvents.filter((event) => event.date < returnFailCutDate)
		: allEvents;

	// Estado actual (usamos el status global)
	const currentStatusElement = document.querySelector('.js-current-status');
	const currentStatusTimeElement = document.querySelector('.js-current-status-time');
	const isReturnFailStatus =
		typeof data.status === 'string' && data.status.startsWith('return_fail');
	currentStatusElement.textContent = isReturnFailStatus
		? 'Devolución al remitente'
		: getStatusText(data.status);

	// Buscamos la marca de tiempo del estado actual en el historial, si existe.
	// Si no existe, usamos la fecha del último estado del historial.
	let currentStatusWhen = data.created_at;
	if (Array.isArray(data.status_history) && data.status_history.length > 0) {
		if (isReturnFailStatus && returnFailOriginEntry) {
			// Para cualquier estado final return_fail*, usamos la fecha
			// de return_fail_in_origin_point como momento de "Devolución al remitente".
			currentStatusWhen = returnFailOriginEntry.when;
		} else {
			const matchingEntry = [...data.status_history]
				.reverse()
				.find((item) => item.status === data.status);
			if (matchingEntry) {
				currentStatusWhen = matchingEntry.when;
			} else {
				const latestEntry = data.status_history.reduce((latest, item) =>
					item.when > latest.when ? item : latest
				);
				currentStatusWhen = latestEntry.when;
			}
		}
	}
	currentStatusTimeElement.textContent = formatApiDate(currentStatusWhen);

	// Rellenar historial (excluimos el evento que coincide con el estado actual para no duplicar)
	const historyContainer = document.querySelector('.status-history');
	const sortedEvents = events.sort((a, b) => b.date - a.date); // recientes primero

	let skippedCurrentStatus = false;
	let historyCount = 0;
	sortedEvents.forEach((event) => {
		if (!skippedCurrentStatus && event.type === 'status' && event.status === data.status) {
			skippedCurrentStatus = true;
			return;
		}
		const tmpl = document.getElementById('status-history-tmpl').content.cloneNode(true);
		tmpl.querySelector('.js-current-status').textContent = event.label;
		tmpl.querySelector('.js-current-status-time').textContent = formatApiDate(event.rawDate);
		historyContainer.appendChild(tmpl);
		historyCount++;
	});
	if (historyCount === 0) {
		document.querySelector('.js-toggle-history').classList.add('d-none');
	}

	// Mostrar contenedor
	document.getElementById('tracking-summary-container').classList.remove('d-none');
};

const showLocationSection = (title, location) => {
	document.querySelector('.js-location-title').textContent = title;
	document.querySelector('.js-name').textContent = location.name;
	document.querySelector('.js-address').textContent = location.address.address;
	document.querySelector('.js-schedule').textContent = location.schedule;
	document.querySelector('.js-location-section').classList.remove('d-none');
	if (location.address?.coordinate) {
		const mapLink = document.querySelector('.js-map-link');
		mapLink.href = getDirectionsURL(location.address.address, location.address.coordinate);
		mapLink.target = '_blank';
		mapLink.rel = 'noopener noreferrer';
		mapLink.classList.remove('d-none');
	}
};

const setToggleCollapseText = () => {
	document.querySelector('.status-history').addEventListener('hide.bs.collapse', () => {
		document.querySelector('[data-bs-target=".status-history"]').textContent = 'Ver más';
	});
	document.querySelector('.status-history').addEventListener('show.bs.collapse', () => {
		document.querySelector('[data-bs-target=".status-history"]').textContent = 'Ver menos';
	});		
};


const buildTimelineEvents = (data) => {
	const events = [];
	const hasMovements = Array.isArray(data.movements) && data.movements.length > 0;
	const returnStartDate = getReturnStartDate(data);
	const globalOriginId = data.origin?.id;
	const globalDestinationId = data.destination?.id;

	// Eventos basados en status_history
	if (Array.isArray(data.status_history)) {
		if (!hasMovements) {
			// Sin movements: usamos el historial tal cual, como antes
			data.status_history.forEach((item) => {
				events.push({
					type: 'status',
					status: item.status,
					label: getStatusText(item.status),
					date: new Date(item.when),
					rawDate: item.when
				});
			});
		} else {
			// Con movements: solo dejamos los estados "especiales" que no se deducen de movements
			data.status_history.forEach((item) => {
				if (!shouldIncludeStatusFromHistoryWithMovements(item.status)) return;
				events.push({
					type: 'status',
					status: item.status,
					label: getStatusText(item.status),
					date: new Date(item.when),
					rawDate: item.when
				});
			});
		}
	}

	// Eventos basados en movements (detalle de trayecto)
	if (hasMovements) {
		const movements = [...data.movements].sort(
			(a, b) => new Date(a.created_at) - new Date(b.created_at)
		);

		movements.forEach((movement, index) => {
			const prev = movements[index - 1];

			// Evitar duplicar el mismo estado físico:
			// in_destination (tramo 1) + in_origin (tramo 2) en el mismo depot
			if (
				prev &&
				prev.status === 'in_destination' &&
				movement.status === 'in_origin' &&
				prev.destination &&
				movement.origin &&
				prev.destination.id === movement.origin.id
			) {
				return;
			}

			const movementDate = new Date(movement.created_at);
			const isReturn = returnStartDate && movementDate >= returnStartDate;

			const originRole =
				movement.origin && movement.origin.id === globalOriginId
					? 'origin'
					: movement.origin && movement.origin.id === globalDestinationId
						? 'destination'
						: null;

			const destinationRole =
				movement.destination && movement.destination.id === globalOriginId
					? 'origin'
					: movement.destination && movement.destination.id === globalDestinationId
						? 'destination'
						: null;

			events.push({
				type: 'movement',
				status: movement.status,
				label: getMovementText(movement, isReturn, originRole, destinationRole),
				date: movementDate,
				rawDate: movement.created_at
			});
		});
	}

	// Orden cronológico ascendente; el caller lo invertirá si hace falta
	return events.sort((a, b) => a.date - b.date);
};

const shouldIncludeStatusFromHistoryWithMovements = (status) =>
	status === 'created' ||
	status === 'delivered' ||
	status === 'incidence' ||
	status === 'cancelled' ||
	status === 'returned' ||
	// Devolución: solo estados "especiales" que no se solapan con movements
	status === 'return_in_destination_point' || // Entrega fallida, inicio proceso de devolución
	status === 'return_delivered' || // Devolución entregada
	status.startsWith('return_fail'); // Estados finales de devolución fallida (aunque luego cortemos por fecha)

const getReturnStartDate = (data) => {
	if (!Array.isArray(data.status_history)) return null;

	const returnStatuses = [
		'return_in_destination_point',
		'return_in_transit_depot',
		'return_in_depot',
		'return_in_transit_origin',
		'return_in_origin_point',
		'return_delivered',
		'returned'
	];

	const returnEntries = data.status_history.filter((item) =>
		returnStatuses.includes(item.status)
	);

	if (returnEntries.length === 0) return null;

	// Tomamos la fecha más antigua en la que el envío entra en estado de devolución
	const firstReturnWhen = returnEntries.reduce(
		(min, item) => (item.when < min ? item.when : min),
		returnEntries[0].when
	);

	return new Date(firstReturnWhen);
};

const formatPlaceName = (place, role, isReturn) => {
	if (!place) return '';

	if (place.type === 'pudo') {
		if (isReturn) {
			// En devolución no marcamos origen/destino, solo el PuntoPost.
			return `PuntoPost ${place.name}`;
		}

		if (role === 'origin') return `PuntoPost origen ${place.name}`;
		if (role === 'destination') return `PuntoPost destino ${place.name}`;
		return `PuntoPost ${place.name}`;
	}

	if (place.type === 'logistic') return ` ${place.name}`;

	return place.name;
};

const capitalizeFirst = (text) => {
	if (!text) return text;
	return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatApiDate = (isoString) => {
	if (!isoString) return '';
	const [datePart, timeAndOffset] = isoString.split('T');
	if (!timeAndOffset) return isoString;

	const [timePart] = timeAndOffset.split(/[+-]/); // antes del offset
	const [year, month, day] = datePart.split('-');

	const d = Number(day);
	const m = Number(month);

	return `${d}/${m}/${year}, ${timePart}`;
};

const getMovementText = (movement, isReturn, originRole, destinationRole) => {
	const originName = formatPlaceName(movement.origin, originRole, isReturn);
	const destinationName = formatPlaceName(movement.destination, destinationRole, isReturn);

	const prefix = isReturn ? 'Devolución ' : '';

	switch (movement.status) {
		case 'in_origin':
			return originName
				? capitalizeFirst(`${prefix}en ${originName}`)
				: capitalizeFirst(`${prefix}en origen`);
		case 'in_transit':
			return destinationName
				? capitalizeFirst(`${prefix}en camino a ${destinationName}`)
				: capitalizeFirst(`${prefix}en camino`);
		case 'in_destination':
			return destinationName
				? capitalizeFirst(`${prefix}en ${destinationName}`)
				: capitalizeFirst(`${prefix}en destino`);
		default:
			return capitalizeFirst((movement.status || '').replace(/_/g, ' '));
	}
};

const getStatusText = (status) => {
	switch (status) {
		case 'created':
			return 'QR generado para tu envío';
		case 'in_origin_point':
			return 'Recibido en punto de origen';
		case 'in_transit_depot':
			return 'En camino al almacén';
		case 'in_depot':
			return 'En almacén';
		case 'in_transit_destination':
			return 'En ruta hacia el punto de entrega';
		case 'in_destination_point':
			return 'Disponible en punto de entrega';
		case 'delivered':
			return 'Entregado';
		case 'return_in_destination_point':
			return 'Entrega fallida, inicio proceso de devolución';
		case 'return_in_transit_depot':
			return 'Devolución en camino al almacén';
		case 'return_in_depot':
			return 'Devolución en almacén';
		case 'return_in_transit_origin':
			return 'Devolución en ruta hacia el punto de entrega';
		case 'return_in_origin_point':
			return 'Devolución disponible en punto de entrega';
		case 'return_delivered':
			return 'Devolución entregada';
		case 'incidence':
			return 'Incidencia detectada, revisando';
		case 'cancelled':
			return 'Cancelado';
		case 'returned':
			return 'Devolución completada';
		case 'lost':
			return 'Siniestrado';
		default:
			return status;
	}
};

const showStatusBadge = (status) =>
	document.querySelector(`.js-status-badge-${status}`)?.classList.remove('d-none');
