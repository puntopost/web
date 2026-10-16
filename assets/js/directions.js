// Google Maps universal URL: on iOS/Android it opens the app if installed,
// otherwise the browser. Apple Maps resolved daddr=<address> unreliably for
// Mexican addresses, so we use coordinates and Google Maps everywhere.
export function getDirectionsURL(coordinate) {
	const coords = `${coordinate.latitude},${coordinate.longitude}`;
	return `https://www.google.com/maps/dir/?api=1&destination=${coords}&dir_action=navigate`;
}
