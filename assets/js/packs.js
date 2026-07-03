import { API_BASE, httpFetch } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
	loadPacks();
});

const loadPacks = async () => {
	const list = document.getElementById('packs-list');
	if (!list) return;

	const loading = document.getElementById('packs-loading');
	const error = document.getElementById('packs-error');

	const result = await httpFetch(API_BASE + '/packs');
	if (loading) loading.remove();

	const items = result.ok && result.body ? result.body.items : null;
	if (!Array.isArray(items) || items.length === 0) {
		if (error) error.classList.remove('d-none');
		return;
	}

	const popularIndex = items.findIndex((pack) => pack.credits === 50);
	const selectedPopularIndex = popularIndex >= 0 ? popularIndex : Math.floor(items.length / 2);
	const referenceUnitPrice = items[0].price / items[0].credits;

	const cards = items
		.map((pack, index) => renderPack(pack, index, selectedPopularIndex, referenceUnitPrice))
		.join('');
	list.insertAdjacentHTML('beforeend', cards);
};

const formatNumber = (value) => Number(value).toLocaleString('es-MX');

const escapeHtml = (value) =>
	String(value).replace(/[&<>"']/g, (char) => ({
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
	})[char]);

const perUnitLabel = (pack) => {
	const unit = pack.price / pack.credits;
	const rounded = Number.isInteger(unit) ? unit : Number(unit.toFixed(2));
	return '$' + formatNumber(rounded) + ' por guía';
};

const packBullet = (pack, index, referenceUnitPrice) => {
	if (index === 0) {
		return 'Envío puntual sin compromiso';
	}
	const saving = Math.round(pack.credits * referenceUnitPrice - pack.price);
	return 'Ahorras $' + formatNumber(saving) + ' vs. compra individual';
};

const renderPack = (pack, index, popularIndex, referenceUnitPrice) => {
	const name = escapeHtml(pack.name);
	const currency = escapeHtml(pack.currency);
	const price = formatNumber(pack.price);
	const perUnit = perUnitLabel(pack);
	const bullet = escapeHtml(packBullet(pack, index, referenceUnitPrice));

	if (index === popularIndex) {
		return `
			<div class="pack-card bg-primary text-white rounded-4 border border-primary p-4 d-flex flex-column text-start position-relative shadow">
				<span class="badge text-bg-secondary text-dark fw-bold rounded-pill position-absolute top-0 start-50 translate-middle px-3 py-2">MÁS POPULAR</span>
				<div class="mb-1">
					<span class="fw-bold fs-5">${name}</span>
				</div>
				<div class="mb-1 lh-1">
					<span class="fw-bold display-6">$${price}</span>
					<span class="fs-6 fw-medium opacity-75">${currency}</span>
				</div>
				<div class="fs-7 fw-medium opacity-75 mb-3">${perUnit}</div>
				<ul class="list-unstyled d-flex flex-column gap-2 fs-6 fw-medium mb-0">
					<li class="d-flex align-items-start gap-2">
						<i class="bi bi-check-circle-fill lh-1 mt-1"></i>
						<span>${bullet}</span>
					</li>
				</ul>
			</div>`;
	}

	return `
		<div class="pack-card bg-white rounded-4 border border-light-subtle p-4 d-flex flex-column text-start">
			<div class="mb-1">
				<span class="fw-bold fs-5">${name}</span>
			</div>
			<div class="mb-1 lh-1">
				<span class="fw-bold display-6 text-primary">$${price}</span>
				<span class="fs-6 fw-medium text-black-50">${currency}</span>
			</div>
			<div class="fs-7 fw-medium text-black-50 mb-3">${perUnit}</div>
			<ul class="list-unstyled d-flex flex-column gap-2 fs-6 fw-medium mb-0">
				<li class="d-flex align-items-start gap-2">
					<i class="bi bi-check-circle-fill text-primary lh-1 mt-1"></i>
					<span>${bullet}</span>
				</li>
			</ul>
		</div>`;
};
