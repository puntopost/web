document.addEventListener('DOMContentLoaded', () => {
	const params = new URLSearchParams(window.location.search);
	const trackingId = params.get('trackingid');
	if (trackingId) fetchTrackingInfo(trackingId);
});

const fetchTrackingInfo = async (trackingId) => {
	const url = 'https://back.puntopost.mx/api/web/v1/parcels/' + encodeURIComponent(trackingId);
	const response = await fetch(url);
	const result = await response.json();
	if (['NOT_FOUND', 'BAD_REQUEST'].includes(result.type)) {
		document.getElementById('tracking-error-alert').classList.remove('d-none');
		return;
	}
	displayTrackingInfo(result.detail);
};

const displayTrackingInfo = (data) => {
	showStatusBadge(data.status);

	setToggleCollapseText();

	// Destino
	document.querySelector('.js-tracking-id').textContent = data.tracking;
	document.querySelector('.js-name').textContent = data.destination.name;
	document.querySelector('.js-address').textContent = data.destination.address.address;
	document.querySelector('.js-schedule').textContent = data.destination.schedule;

	// Construir eventos combinando status_history y movements
	const events = buildTimelineEvents(data);

	// Estado actual (usamos el status global)
	const currentStatusElement = document.querySelector('.js-current-status');
	const currentStatusTimeElement = document.querySelector('.js-current-status-time');
	currentStatusElement.textContent = getStatusText(data.status);

	// Buscamos la marca de tiempo del estado actual en el historial, si existe
	const currentHistoryEntry = Array.isArray(data.status_history)
		? [...data.status_history].reverse().find((item) => item.status === data.status)
		: null;
	const currentStatusDate = currentHistoryEntry
		? new Date(currentHistoryEntry.when)
		: new Date(data.created_at);
	currentStatusTimeElement.textContent = currentStatusDate.toLocaleString();

	// Rellenar historial (excluimos el evento que coincide con el estado actual para no duplicar)
	const historyContainer = document.querySelector('.status-history');
	const sortedEvents = events.sort((a, b) => b.date - a.date); // recientes primero

	let skippedCurrentStatus = false;
	sortedEvents.forEach((event) => {
		if (!skippedCurrentStatus && event.type === 'status' && event.status === data.status) {
			skippedCurrentStatus = true;
			return;
		}
		const tmpl = document.getElementById('status-history-tmpl').content.cloneNode(true);
		tmpl.querySelector('.js-current-status').textContent = event.label;
		tmpl.querySelector('.js-current-status-time').textContent = event.date.toLocaleString();
		historyContainer.appendChild(tmpl);
	});

	// Mostrar contenedor
	document.getElementById('tracking-summary-container').classList.remove('d-none');
};

const setToggleCollapseText = () => {
	document.querySelector('.status-history').addEventListener('hide.bs.collapse', () => {
		document.querySelector('[data-bs-target=".status-history"]').textContent = 'Ver más';
	});
	document.querySelector('.status-history').addEventListener('show.bs.collapse', () => {
		document.querySelector('[data-bs-target=".status-history"]').textContent = 'Ver menos';
	});		
};

const rtfDate = (date) => { // Tiempo relativo. De momento no lo usamos
	const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
	const now = new Date();
	const diff = date - now;
	const seconds = Math.round(diff / 1000);
	const minutes = Math.round(seconds / 60);
	const hours = Math.round(minutes / 60);
	const days = Math.round(hours / 24);
	if (Math.abs(days) > 0) return rtf.format(days, 'day');
	if (Math.abs(hours) > 0) return rtf.format(hours, 'hour');
	if (Math.abs(minutes) > 0) return rtf.format(minutes, 'minute');
	return rtf.format(seconds, 'second');
};

const buildTimelineEvents = (data) => {
	const events = [];
	const hasMovements = Array.isArray(data.movements) && data.movements.length > 0;
	const returnStartDate = getReturnStartDate(data);

	// Eventos basados en status_history
	if (Array.isArray(data.status_history)) {
		if (!hasMovements) {
			// Sin movements: usamos el historial tal cual, como antes
			data.status_history.forEach((item) => {
				events.push({
					type: 'status',
					status: item.status,
					label: getStatusText(item.status),
					date: new Date(item.when)
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
					date: new Date(item.when)
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

			events.push({
				type: 'movement',
				status: movement.status,
				label: getMovementText(movement, isReturn),
				date: movementDate
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
	status.startsWith('return_');

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

const formatPlaceName = (place) => {
	if (!place) return '';
	if (place.type === 'pudo') return `punto ${place.name}`;
	if (place.type === 'logistic') return `almacén ${place.name}`;
	return place.name;
};

const capitalizeFirst = (text) => {
	if (!text) return text;
	return text.charAt(0).toUpperCase() + text.slice(1);
};

const getMovementText = (movement, isReturn) => {
	const originName = formatPlaceName(movement.origin);
	const destinationName = formatPlaceName(movement.destination);

	const prefix = isReturn ? 'Devolución ' : '';

	switch (movement.status) {
		case 'in_origin':
			return originName
				? capitalizeFirst(`${prefix}en ${originName}`)
				: capitalizeFirst(`${prefix}en origen`);
		case 'in_transit':
			return originName && destinationName
				? capitalizeFirst(
						`${prefix}en tránsito de ${originName} a ${destinationName}`
					)
				: capitalizeFirst(`${prefix}en tránsito`);
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
			return 'Registrado en el sistema';
		case 'in_origin_point':
			return 'Recolectado';
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
			return 'Devolución recolectada';
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
		default:
			return status;
	}
};

const showStatusBadge = (status) =>
	document.querySelector(`.js-status-badge-${status}`)?.classList.remove('d-none');