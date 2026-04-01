/**
 * Lightweight toast notifications using Bootstrap 5 toast component.
 * Usage: showToast('Mensaje', 'warning')
 * Types: 'info' (default), 'success', 'warning', 'error'
 */
const showToast = (() => {
	let container = null;

	const TYPES = {
		info:    { bg: 'bg-primary',   icon: 'bi-info-circle-fill' },
		success: { bg: 'bg-success',   icon: 'bi-check-circle-fill' },
		warning: { bg: 'bg-warning',   icon: 'bi-exclamation-triangle-fill' },
		error:   { bg: 'bg-danger',    icon: 'bi-x-circle-fill' }
	};

	function getContainer() {
		if (container) return container;
		container = document.createElement('div');
		container.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
		container.style.zIndex = '1090';
		document.body.appendChild(container);
		return container;
	}

	return function showToast(message, type = 'info', duration = 4000) {
		const { bg, icon } = TYPES[type] || TYPES.info;
		const textColor = type === 'warning' ? 'text-dark' : 'text-white';

		const toastEl = document.createElement('div');
		toastEl.className = `toast align-items-center border-0 ${bg} ${textColor}`;
		toastEl.style.maxWidth = '500px';
		toastEl.style.width = '100%';
		toastEl.setAttribute('role', 'alert');
		toastEl.innerHTML =
			`<div class="d-flex">
				<div class="toast-body d-flex align-items-center gap-2">
					<i class="bi ${icon}"></i>
					<span>${message}</span>
				</div>
				<button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
			</div>`;

		getContainer().appendChild(toastEl);
		const toast = new bootstrap.Toast(toastEl, { delay: duration });
		toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
		toast.show();
	};
})();
