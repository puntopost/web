Create a new page for the PuntoPost site.

Ask the user:
1. Directory name (e.g. "contacto", "faq")
2. Page title

Then create a subdirectory with an `index.html` following the project's standard structure:

- `<!DOCTYPE html>` with `<html lang="es">`
- Meta charset UTF-8, viewport
- Favicon: `/favicon.ico`
- Google Fonts Quicksand (preconnect + link)
- Bootstrap CSS: `../bootstrap.min.css`
- Bootstrap Icons: `../bootstrap-icons.min.css`
- Header with navbar (copy exactly from `/index.html` lines 63-101, using absolute URLs with `https://www.puntopost.mx/`)
- `<main>` with a basic container for content
- Footer (copy exactly from `/index.html` lines 271-280)
- Bootstrap JS via CDN: `https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js`

IMPORTANT: Read `/index.html` before creating the page to copy the current exact navbar and footer.
