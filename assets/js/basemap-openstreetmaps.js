// OpenStreetMap basemap (OpenFreeMap "positron" style, free and keyless),
// restyled like CARTO Positron and with Spanish labels. The changes are applied
// before the first render, so the original style never flashes on screen.

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const ATTRIBUTION =
	'<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> '
	+ '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> '
	+ 'Datos de <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

const NAME = ['coalesce', ['get', 'name:es'], ['get', 'name']];   // Spanish, else local name
const GREEN = 'rgba(234, 241, 233, 0.5)';
const z = (...stops) => ['interpolate', ['linear'], ['zoom'], ...stops];
const text = (color, halo) => ({ 'text-color': color, 'text-halo-color': halo, 'text-halo-width': 1, 'text-halo-blur': 0 });
const road = (size) => ({ layout: { 'text-size': size }, paint: text('#838383', '#fff') });
const water = { layout: { 'text-size': z(13, 9, 17, 13), 'text-letter-spacing': 0 }, paint: text('#7a96a0', '#f5f5f3') };
const place = (size, layout) => ({
	layout: { 'text-font': ['Noto Sans Bold'], 'text-size': size, 'text-transform': 'uppercase', ...layout },
	paint: text('#697b89', 'rgba(255,255,255,0.5)')
});
const casing = { paint: { 'line-color': '#ddd' } };

// Changes per OpenFreeMap layer id, with CARTO Positron values.
const OVERRIDES = {
	background: { paint: { 'background-color': '#fafaf8' } },
	water: { paint: { 'fill-color': '#d4dadc' } },
	waterway: { paint: { 'line-color': '#d1dbdf' } },
	// "park" also covers historic districts (the whole Centro): keep only nature areas.
	park: { filter: ['match', ['get', 'class'], ['national_park', 'nature_reserve'], true, false], paint: { 'fill-color': GREEN } },
	landuse_residential: { paint: { 'fill-color': 'rgba(237, 237, 237, 0.35)' } },
	landcover_wood: { paint: { 'fill-color': GREEN } },
	building: { paint: { 'fill-color': '#ededed', 'fill-outline-color': '#dfdfdf' } },
	highway_minor: { paint: { 'line-color': '#e6e6e6', 'line-opacity': 1, 'line-width': z(13, 0.5, 14, 2, 15, 3, 16, 4.3, 17, 10, 18, 14) } },
	highway_major_casing: casing,
	highway_motorway_casing: casing,
	highway_motorway_bridge_casing: casing,
	tunnel_motorway_casing: casing,
	boundary_2: { paint: { 'line-color': '#ebd6d8' } },
	boundary_3: { paint: { 'line-color': '#e1c5c7' } },
	waterway_line_label: water,
	water_name_point_label: water,
	water_name_line_label: water,
	'highway-name-path': road(9),
	'highway-name-minor': road(z(15, 9, 18, 11)),
	'highway-name-major': road(z(13, 10, 16, 11, 18, 12)),
	label_other: { minzoom: 12, ...place(z(12, 9, 16, 13), { 'text-font': ['Noto Sans Regular'] }) },
	label_village: place(z(10, 9, 16, 13), { 'text-transform': 'none' }),
	label_town: place(z(8, 10, 14, 15), { 'text-transform': 'none' }),
	label_state: place(z(5, 12, 7, 14), { 'text-letter-spacing': 0 }),
	label_city: place(z(8, 12, 10, 14, 14, 20)),
	label_city_capital: place(z(8, 14, 10, 16, 14, 22)),
	label_country_1: place(z(3, 11, 6, 14)),
	label_country_2: place(z(3, 10, 8, 14)),
	label_country_3: place(z(3, 10, 8, 14))
};

// Layers CARTO has and OpenFreeMap doesn't, inserted after the given layer id.
const EXTRA_LAYERS = {
	landuse_residential: {   // parks and gardens in green
		id: 'landcover_grass', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', minzoom: 7,
		filter: ['==', ['get', 'class'], 'grass'],
		paint: { 'fill-color': GREEN }
	},
	highway_minor: {   // white street fill from zoom 16
		id: 'highway_minor_inner', type: 'line', source: 'openmaptiles', 'source-layer': 'transportation', minzoom: 15.7,
		filter: ['all', ['==', ['geometry-type'], 'LineString'], ['match', ['get', 'class'], ['minor', 'service'], true, false]],
		layout: { 'line-cap': 'round', 'line-join': 'round' },
		paint: { 'line-color': '#fdfdfd', 'line-width': z(15.7, 3, 16, 4, 17, 8, 18, 12) }
	},
	'highway-name-major': {   // names of parks, plazas and landmarks
		id: 'poi_park', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi', minzoom: 15,
		filter: ['match', ['get', 'class'], ['park', 'attraction', 'stadium', 'cemetery'], true, false],
		layout: { 'text-field': NAME, 'text-font': ['Noto Sans Bold'], 'text-size': z(15, 8, 18, 10), 'text-transform': 'uppercase', 'text-max-width': 8 },
		paint: text('#7d9c83', '#f5f5f3')
	}
};

function restyle(_previous, style) {
	const layers = style.layers.filter((layer) => !layer.id.includes('shield')).flatMap((layer) => {
		const { layout = {}, paint = {}, ...rest } = OVERRIDES[layer.id] ?? {};
		const next = { ...layer, ...rest, layout: { ...layer.layout, ...layout }, paint: { ...layer.paint, ...paint } };
		if (next.layout['text-field']) next.layout['text-field'] = NAME;
		if (layer['source-layer'] === 'place') delete next.layout['icon-image'];   // no city dots
		return EXTRA_LAYERS[layer.id] ? [next, EXTRA_LAYERS[layer.id]] : [next];
	});
	return { ...style, layers };
}

// Adds the basemap to a Leaflet map (needs maplibre-gl and maplibre-gl-leaflet).
export function addBasemap(map) {
	const layer = L.maplibreGL({
		style: { version: 8, sources: {}, layers: [] },
		// The plugin hands customAttribution to Leaflet's control and keeps MapLibre's off.
		attributionControl: { customAttribution: ATTRIBUTION }
	}).addTo(map);
	layer.getMaplibreMap().setStyle(STYLE_URL, { transformStyle: restyle });
	return layer;
}
