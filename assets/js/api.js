const API_BASE = 'https://back.puntopost.mx/api/web/v1';
const API_ERROR_MSG = 'Tuvimos un problema al cargar la información. Por favor, inténtalo de nuevo más tarde.';

async function httpFetch(url) {
	try {
		const res = await fetch(url);
		const body = await res.json().catch(() => null);
		return { ok: res.ok, status: res.status, body };
	} catch {
		return { ok: false, status: 0, body: null };
	}
}

function matchStatus(status, pattern) {
	const s = String(status);
	if (s.length !== pattern.length) return false;
	for (let i = 0; i < s.length; i++) {
		if (pattern[i] !== 'x' && pattern[i] !== s[i]) return false;
	}
	return true;
}

function showApiErrorToast(status, warnings = {}, duration = 4000) {
	const msg = Object.entries(warnings).find((entry) => matchStatus(status, String(entry[0])));
	if (msg) {
		showToast(msg[1], 'warning', duration);
	} else {
		showToast(API_ERROR_MSG, 'error', duration);
	}
}
