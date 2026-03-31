# PuntoPost Web

Static marketing site for [www.puntopost.mx](https://www.puntopost.mx) — a parcel pickup point service in Mexico.

## Stack

- HTML5 + CSS3 + vanilla JavaScript (ES6+)
- Bootstrap 5.3.8 (compiled CSS, no SCSS in this repo — see README for customization)
- Bootstrap Icons (CSS + WOFF)
- Google Fonts: Quicksand (300-700)
- Leaflet.js 1.7.1 (interactive map in map/)
- Bootstrap JS via CDN: `cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js`

## Structure

```
/                   → Main landing page (index.html)
/atrae/             → "Become a point" page
/envia/             → "Ship with PuntoPost" page
/map/               → Interactive map of pickup points
/find-puntopost/    → Pickup point finder
/tracking-summary/  → Package tracking
/integrations/      → Integrations hub
/shopify-app/       → Shopify plugin docs
/woocommerce-plugin/→ WooCommerce plugin docs
/join/              → Signup
/condiciones/       → Terms and conditions
/privacidad/        → Privacy policy
/img/               → Images and assets
```

Each page is a subdirectory with its own `index.html`. Bootstrap CSS files live at the root (`bootstrap.min.css`, `bootstrap-icons.min.css`) and subpages reference them with `../`.

## Deploy

GitHub Pages — push to `main` publishes automatically. Domain configured in `CNAME`.

## Backend API

`https://back.puntopost.mx/api/web/v1/` — used by map.js and tracking-summary.js.

## Language

All content is in Spanish (Mexico). `<html lang="es">`.
