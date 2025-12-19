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
	// Historial de estados
	data.status_history.reverse(); // Recientes primero
	data.status_history.forEach((status, i) => {
		if (i === 0) { // Estado actual
			document.querySelector('.js-current-status').textContent = getStatusText(status.status);
			document.querySelector('.js-current-status-time').textContent = new Date(status.when).toLocaleString();
		} else { // Histórico
			const tmpl = document.getElementById('status-history-tmpl').content.cloneNode(true);
			tmpl.querySelector('.js-current-status').textContent = getStatusText(status.status);
			tmpl.querySelector('.js-current-status-time').textContent = new Date(status.when).toLocaleString();
			document.querySelector('.status-history').appendChild(tmpl);
		}
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
			return 'Devuelto';
		default:
			return status;
	}
};

const showStatusBadge = (status) =>
	document.querySelector(`.js-status-badge-${status}`)?.classList.remove('d-none');