function isIOS() {
	return ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod']
		.includes(navigator.platform)
		|| (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

export function getDirectionsURL(address, coordinate) {
	const coords = `${coordinate.latitude},${coordinate.longitude}`;
	const encoded = encodeURIComponent(address);
	if (isIOS()) return `https://maps.apple.com/?daddr=${encoded}&sll=${coords}&dirflg=d`;
	return `https://www.google.com/maps/dir/?api=1&destination=${coords}&query=${encoded}&dir_action=navigate`;
}
