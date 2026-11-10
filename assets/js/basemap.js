// Basemap: OpenFreeMap "positron" restyled to look like CARTO Positron, which
// we used before, with labels forced to Spanish. Free, no key, no limits.
// The tweaks are applied to the style JSON before the first render, so the
// original look (or English names) never flashes on screen.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

const ATTRIBUTION =
	'<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> '
	+ '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> '
	+ 'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

// Spanish name, falling back to the local OSM name (already Spanish in Mexico).
const NAME = ['coalesce', ['get', 'name:es'], ['get', 'name']];

const GREEN = 'rgba(234, 241, 233, 0.5)';
const PLACE = '#697b89';
const ROAD_CASE = '#ddd';
const zoom = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops];

const placeLabel = (font, size, extra = {}) => ({
	layout: { 'text-font': [font], 'text-size': size, 'text-transform': 'uppercase', 'icon-image': '', ...extra },
	paint: { 'text-color': PLACE, 'text-halo-color': 'rgba(255,255,255,0.5)', 'text-halo-width': 1, 'text-halo-blur': 0 }
});
const roadLabel = (size) => ({
	layout: { 'text-size': size },
	paint: { 'text-color': '#838383', 'text-halo-color': '#fff', 'text-halo-width': 1, 'text-halo-blur': 0 }
});
const waterLabel = {
	layout: { 'text-size': zoom(13, 9, 17, 13), 'text-letter-spacing': 0 },
	paint: { 'text-color': '#7a96a0', 'text-halo-color': '#f5f5f3', 'text-halo-width': 1 }
};

// Per-layer overrides, keyed by OpenFreeMap layer id. Values taken from CARTO Positron.
const OVERRIDES = {
	background: { paint: { 'background-color': '#fafaf8' } },
	water: { paint: { 'fill-color': '#d4dadc' } },
	waterway: { paint: { 'line-color': '#d1dbdf' } },
	// In OpenFreeMap "park" also covers historic districts (the whole Centro), so
	// keep only real nature areas, like CARTO.
	park: {
		filter: ['match', ['get', 'class'], ['national_park', 'nature_reserve'], true, false],
		paint: { 'fill-color': GREEN }
	},
	landuse_residential: { paint: { 'fill-color': 'rgba(237, 237, 237, 0.35)' } },
	landcover_wood: { paint: { 'fill-color': GREEN } },
	building: { paint: { 'fill-color': '#ededed', 'fill-outline-color': '#dfdfdf' } },
	highway_minor: { paint: { 'line-color': '#e6e6e6', 'line-opacity': 1, 'line-width': zoom(13, 0.5, 14, 2, 15, 3, 16, 4.3, 17, 10, 18, 14) } },
	highway_major_casing: { paint: { 'line-color': ROAD_CASE } },
	highway_motorway_casing: { paint: { 'line-color': ROAD_CASE } },
	highway_motorway_bridge_casing: { paint: { 'line-color': ROAD_CASE } },
	tunnel_motorway_casing: { paint: { 'line-color': ROAD_CASE } },
	boundary_2: { paint: { 'line-color': '#ebd6d8' } },
	boundary_3: { paint: { 'line-color': '#e1c5c7' } },
	waterway_line_label: waterLabel,
	water_name_point_label: waterLabel,
	water_name_line_label: waterLabel,
	'highway-name-path': roadLabel(9),
	'highway-name-minor': roadLabel(zoom(15, 9, 18, 11)),
	'highway-name-major': roadLabel(zoom(13, 10, 16, 11, 18, 12)),
	label_other: { minzoom: 12, ...placeLabel('Noto Sans Regular', zoom(12, 9, 16, 13)) },
	label_village: placeLabel('Noto Sans Bold', zoom(10, 9, 16, 13), { 'text-transform': 'none' }),
	label_town: placeLabel('Noto Sans Bold', zoom(8, 10, 14, 15), { 'text-transform': 'none' }),
	label_state: placeLabel('Noto Sans Bold', zoom(5, 12, 7, 14), { 'text-letter-spacing': 0 }),
	label_city: placeLabel('Noto Sans Bold', zoom(8, 12, 10, 14, 14, 20)),
	label_city_capital: placeLabel('Noto Sans Bold', zoom(8, 14, 10, 16, 14, 22)),
	label_country_1: placeLabel('Noto Sans Bold', zoom(3, 11, 6, 14)),
	label_country_2: placeLabel('Noto Sans Bold', zoom(3, 10, 8, 14)),
	label_country_3: placeLabel('Noto Sans Bold', zoom(3, 10, 8, 14))
};

// Layers CARTO has and OpenFreeMap doesn't.
const EXTRA_LAYERS = {
	// Parks and gardens (green), drawn right above the residential fill.
	landuse_residential: {
		id: 'landcover_grass', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', minzoom: 7,
		filter: ['==', ['get', 'class'], 'grass'],
		paint: { 'fill-color': GREEN }
	},
	// White street fill over the grey line, from zoom 16 like CARTO.
	highway_minor: {
		id: 'highway_minor_inner', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 15.7,
		filter: ['all', ['==', ['geometry-type'], 'LineString'], ['match', ['get', 'class'], ['minor', 'service'], true, false]],
		layout: { 'line-cap': 'round', 'line-join': 'round' },
		paint: { 'line-color': '#fdfdfd', 'line-width': zoom(15.7, 3, 16, 4, 17, 8, 18, 12) }
	},
	// Names of parks, plazas and landmarks (Alameda Central, Plaza de la Constitución...).
	'highway-name-major': {
		id: 'poi_park', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi', minzoom: 15,
		filter: ['match', ['get', 'class'], ['park', 'attraction', 'stadium', 'cemetery'], true, false],
		layout: { 'text-field': NAME, 'text-font': ['Noto Sans Bold'], 'text-size': zoom(15, 8, 18, 10), 'text-transform': 'uppercase', 'text-max-width': 8 },
		paint: { 'text-color': '#7d9c83', 'text-halo-color': '#f5f5f3', 'text-halo-width': 1 }
	}
};

function restyle(_previous, style) {
	const layers = [];
	for (const layer of style.layers) {
		if (layer.id.includes('shield')) continue;   // CARTO shows no road shields
		const override = OVERRIDES[layer.id] ?? {};
		const next = {
			...layer,
			...override,
			layout: { ...layer.layout, ...override.layout },
			paint: { ...layer.paint, ...override.paint }
		};
		if (next.layout['text-field']) next.layout['text-field'] = NAME;
		if (next.layout['icon-image'] === '') delete next.layout['icon-image'];
		layers.push(next);
		if (EXTRA_LAYERS[layer.id]) layers.push(EXTRA_LAYERS[layer.id]);
	}
	return { ...style, layers };
}

// Adds the basemap to a Leaflet map (needs maplibre-gl and maplibre-gl-leaflet).
export function addBasemap(map) {
	const layer = L.maplibreGL({
		style: { version: 8, sources: {}, layers: [] },
		attributionControl: false,   // Leaflet already renders the attribution
		attribution: ATTRIBUTION
	}).addTo(map);
	layer.getMaplibreMap().setStyle(STYLE_URL, { transformStyle: restyle });
	return layer;
}
