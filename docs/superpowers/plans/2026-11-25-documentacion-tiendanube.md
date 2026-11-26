# Documentación de la app de Tiendanube — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página `/tiendanube-app/` con la guía de la app de PuntoPost para Tiendanube, enlazada desde `/integrations/` y `/envia/tiendas/`, con capturas reales.

**Architecture:** Página Jekyll con el layout `documentation` (índice desde `toc` del front matter), mismo marcado que `shopify-app/index.html`. Las capturas son WebP en `assets/img/`.

**Tech Stack:** Jekyll (Docker), Bootstrap 5.3, htmlhint.

**Spec:** `docs/superpowers/specs/2026-11-25-documentacion-tiendanube-design.md`

## Global Constraints

- Marca escrita «Tiendanube» (una palabra) en textos, título y alt.
- Español de México; los textos de la interfaz de la app, citados tal cual en `<em>` (lista en la Tarea 1).
- Mobile first: comprobar a 375 px de ancho, sin scroll horizontal, y a 1280 px.
- Enlace de instalación `https://www.tiendanube.com/apps/53138/authorize`: la 53138 es la única app de Tiendanube y apunta a producción (2026-11-26).
- No documentar: devoluciones, paquetes adicionales, impresión masiva desde el listado de pedidos de Tiendanube, modo solo checkout, requisitos de plan.
- Imágenes: WebP, `class="img-fluid" loading="lazy"`, alt descriptivo, sin datos personales reales.
- Commits: uno por acción y solo cuando Kevin lo pida.

## Verificación (esta web no tiene tests)

El ciclo de cada tarea es: comprobar que falla (la URL da 404 o el enlace no existe) → cambio → `make lint` limpio y comprobación en el navegador.

- Servidor: `make server` (puerto 8791). Si el checkout principal ya tiene el contenedor `puntopost-web` en marcha (`docker ps`), ese sirve otro directorio: páralo con aviso a Kevin o lanza el de este worktree con otro nombre y puerto (`docker run ... --name puntopost-web-tn -p 8792:4000 ...`, misma orden que el Makefile).
- Lint: `make lint` → sin errores (htmlhint necesita `_site/`, que genera el servidor).

## Review Focus

- Móvil a 375 px: las capturas anchas (panel del admin) no deben desbordar; `img-fluid` dentro de la caja `border rounded p-3 bg-light`.
- Anclas del índice: cada `toc.id` existe como `id` de una `<section>`; los enlaces internos `#…` apuntan a ids existentes.
- Enlaces externos con `target="_blank" rel="noopener noreferrer"`.
- La rejilla de `/envia/tiendas/` con cuatro logos no debe romperse en móvil (hoy API ocupa una fila entera y Shopify/WooCommerce media cada una).
- Ningún texto promete algo fuera de alcance (devoluciones, mapa en el checkout).

---

### Tarea 1: Página `/tiendanube-app/` con el texto, sin capturas

**Files:**
- Create: `tiendanube-app/index.html`

- [ ] **Paso 1: Comprobar que no existe.** Con el servidor en marcha, `curl -s -o /dev/null -w '%{http_code}' http://localhost:8791/tiendanube-app/` → `404`.
- [ ] **Paso 2: Crear la página.** Front matter como `shopify-app/index.html`: `layout: documentation`, `title: "PuntoPost - App Tiendanube - Documentación"`, `description` de una frase, `banner` con «App Tiendanube» / «Documentación de integración». Secciones (`id` → etiqueta del índice):
  - `introduccion` → Introducción
  - `requisitos` → Requisitos: tienda en México (MXN); cuenta de PuntoPost con usuario y contraseña de API e ID de merchant (los da el contacto de PuntoPost).
  - `instalacion` → Instalación: botón/enlace al enlace de instalación, aceptar los permisos en Tiendanube; la app se abre en el admin con las pestañas «General», «Credenciales», «Envíos». Sin credenciales, «General» muestra «Conecta tu cuenta de PuntoPost» con «Configurar credenciales».
  - `credenciales` → Configurar credenciales: «Usuario de la API», «Contraseña de la API» (vacía conserva la actual), «ID de merchant», botón «Comprobar»; muestra «Tipo de cuenta detectado» y «Admite devoluciones»; B2C pide «ID de origen (Origin ID)»; C2C pide «Nombre del remitente», «Apellido del remitente», «Correo del remitente», «Teléfono del remitente»; «Guardar». Al guardar unas credenciales válidas, la app añade PuntoPost como transportista de la tienda: no hay que configurar nada más en Tiendanube. Mensajes: «PuntoPost está activo en tu checkout.» / «PuntoPost no aparecerá en tu checkout hasta completar la configuración.»; «Quitar credenciales» hace que deje de aparecer.
  - `ajustes-checkout` → Ajustes del checkout (lista `<dl>` como Shopify): «Número de puntos que se ofrecen» (1 a 10, 10 por defecto; el máximo de Tiendanube), «Precio del envío (MXN)», «Envío gratis a partir de (MXN, opcional)». (Sin «Nombre del método de envío»: se quitó.)
  - `vista-comprador` → Vista del comprador: tras poner su código postal ve una opción de recogida por cada punto PuntoPost cercano (hasta el número configurado), con el nombre «PuntoPost - punto [horario]», la dirección y el precio. Recomendación: email y teléfono obligatorios, PuntoPost los usa para avisar al comprador.
  - `gestion-pedidos` → Gestión de pedidos: paquete creado solo al pagarse el pedido; en el pedido, link «PuntoPost - Ver envío» → «Envío del pedido» (punto, dirección, «Horario», «Estado», «Seguimiento», «Etiqueta», «Imprimir etiqueta»); «Crear envío» si no se creó, «No se pudo crear el envío.» con «Reintentar». B2C: marcar el pedido como empaquetado en Tiendanube o con «Marcar como empaquetado» avisa a PuntoPost para que pase a recogerlo («Avisado a PuntoPost»). C2C: llevar el paquete a un punto, con enlace a `/map`. Pestaña «Envíos»: filtros «Todos», «Con error», «Sin avisar a PuntoPost», selección múltiple e «Imprimir etiquetas».
  - `seguimiento` → Seguimiento: al recoger PuntoPost el paquete, la app marca el pedido como enviado con el código y el enlace de seguimiento (Tiendanube avisa al comprador); después publica «En camino», «Llegando a destino», «Listo para recoger», «Entregado». El correo con el QR de recogida lo manda PuntoPost al llegar al punto.
  - `solucion` → Solución de problemas: PuntoPost no aparece en el checkout (credenciales incompletas, dirección fuera de México, ningún punto cerca del CP); error al crear el envío («Reintentar»); «No se ha podido completar la operación. Inténtalo de nuevo en unos minutos.»; «La app no está bien instalada en esta tienda…» → desinstalar y volver a instalar.
- [ ] **Paso 3: Verificar.** La URL da `200`; `make lint` limpio; a 375 px y 1280 px el índice y todas las anclas funcionan.
- [ ] **Paso 4: Commit** (cuando Kevin lo pida): `Documentación de la app de Tiendanube`.

### Tarea 2: Enlaces desde `/integrations/` y `/envia/tiendas/`

**Files:**
- Create: `assets/img/tiendanube.webp` (desde el scratchpad, logo ya generado, 320×80)
- Modify: `integrations/index.html` (tarjetas), `envia/tiendas/index.html:174-200` (rejilla de logos), `integrations/index.html` front matter `description` (añadir Tiendanube), `api-integration/index.html:34` (frase que lista los plugins)

- [ ] **Paso 1: Comprobar que no hay enlace.** `grep -rn tiendanube-app integrations envia api-integration` → sin resultados.
- [ ] **Paso 2: Tarjeta en `/integrations/`** «App Tiendanube», mismo marcado que la de Shopify, botón a `/tiendanube-app`. Rejilla `col-12 col-md-6 col-xl-3` para cuatro tarjetas (2×2 en tablet, una fila en pantallas grandes).
- [ ] **Paso 3: Logo en `/envia/tiendas/`.** Nueva tarjeta con `/assets/img/tiendanube.webp`, texto «Tiendanube». Columnas: API `col-12 col-md-3`, cada plataforma `col-4 col-md-3` (tres por fila en móvil).
- [ ] **Paso 4: Frase de `/api-integration/`** y `description` de `/integrations/`: incluir Tiendanube.
- [ ] **Paso 5: Verificar.** `make lint` limpio; ambas páginas a 375 px y 1280 px sin desbordes; los enlaces llevan a `/tiendanube-app/`.
- [ ] **Paso 6: Commit** (cuando Kevin lo pida): `Enlazar la documentación de Tiendanube desde integraciones y tiendas`.

### Tarea 3: Capturas (necesita a Kevin)

**Files:**
- Create: `assets/img/puntopost-tiendanube-*.webp`
- Modify: `tiendanube-app/index.html`

- [ ] **Paso 1: Preparar.** Kevin reinstala la app de pre en la demo (`puntoposttechnologiesinc.mitiendanube.com`) y entra en el admin en el navegador que controla Claude (Playwright). Credenciales de prueba de PuntoPost que dé Kevin.
- [ ] **Paso 2: Capturar** (ventana 1280 px de ancho; recortar a la zona útil; tapar datos personales):
  - `-instalacion` (pantalla de permisos de Tiendanube), `-credenciales` (vacía), `-credenciales-b2c`, `-credenciales-c2c`, `-general` (ajustes del checkout)
  - `-checkout` (opciones de PuntoPost con CP 03500), tras una compra de prueba
  - `-pedido-link` (link «PuntoPost - Ver envío» en el pedido), `-envio` («Envío del pedido»), `-etiqueta` (etiqueta impresa), `-envios` (pestaña «Envíos»), `-seguimiento` (pedido enviado con seguimiento, si da tiempo a que cambie de estado)
- [ ] **Paso 3: Convertir a WebP** (`cwebp -q 85`, por Docker como el logo) e insertarlas con el bloque `<div class="border rounded p-3 bg-light text-center mb-3"><img … class="img-fluid" loading="lazy"></div>` en su sección.
- [ ] **Paso 4: Verificar.** `make lint` limpio; ninguna imagen rota (`curl` de cada `src` → 200); 375 px sin desbordes.
- [ ] **Paso 5: Commit** (cuando Kevin lo pida): `Capturas de la documentación de Tiendanube`.

### Antes de publicar

- Rehacer las capturas que cambiaron con el paso a producción (ayuda del número de puntos; nombre de la app si en el portal pasa a «PuntoPost»).
- Revisión final de Kevin en local y PR a `main`.
