# PuntoPost Web

Static marketing site for [www.puntopost.mx](https://www.puntopost.mx) — a parcel pickup point service in Mexico.

## Stack

- **Jekyll** — static site generator, deployed via GitHub Pages
- HTML5 + CSS3 + vanilla JavaScript (ES6+)
- Bootstrap 5.3.8 (compiled CSS, no SCSS in this repo)
- Bootstrap Icons (CSS + WOFF)
- Google Fonts: Quicksand (300-700)
- Leaflet.js 1.7.1 (interactive map)

## Jekyll structure

```
_config.yml       → Site configuration
_layouts/         → Page layouts (default, map)
_includes/        → Reusable partials (head, nav, footer)
```

Pages use Jekyll front matter to select a layout and inject content into the shared structure.

## Local development

Requires **Docker**.

```bash
# Start the dev server (port 8791 by default)
make server

# Stop the server
make stop

# Use a custom port
make server PORT=4001
```

The server watches for file changes and rebuilds automatically.

## Customizing Bootstrap

To change Bootstrap colors or variables:

1. Download Bootstrap source files from https://getbootstrap.com/docs/5.3/getting-started/download/#source-files
2. Edit `scss/_variables.scss` with your custom colors
3. Run `npm start` and `npm run dist` from the Bootstrap directory
4. Copy the generated `dist/css/bootstrap.min.css` to this repo's root

## Deploy

GitHub Pages — push to `main` publishes automatically. Domain configured in `CNAME`.
