# Documentación de la app de Tiendanube — diseño

Fecha: 2026-11-25

## Intención

Los comercios de Tiendanube en México deben tener una guía de la app de PuntoPost igual que las de Shopify (`/shopify-app/`) y WooCommerce (`/woocommerce-plugin/`): cómo instalarla, configurarla, qué ve el comprador y cómo se gestionan los pedidos. Es para usuarios. La app aún no está en la tienda de apps de Tiendanube, así que la instalación va con un enlace directo.

## Objetivos

- Página `/tiendanube-app/` con el layout `documentation`, la misma estructura y estilo que la de Shopify y capturas reales.
- Enlazarla desde `/integrations/` y desde la rejilla de plataformas de `/envia/tiendas/`, como Shopify y WooCommerce.
- Probarla en local (`make server`, puerto 8791) en móvil y escritorio antes de subir nada: `main` publica en GitHub Pages.

## Fuera de alcance

- Lo que la app no hace todavía: devoluciones, paquetes adicionales, impresión masiva desde el listado de pedidos de Tiendanube y modo solo checkout.
- Requisitos de plan de Tiendanube: no están verificados.
- Rehacer las páginas de Shopify o WooCommerce.

## Restricciones

- No se sube a `main` hasta que la app esté en producción (decisión de Kevin).
- El enlace de instalación de Tiendanube es `https://www.tiendanube.com/apps/{app_id}/authorize`: depende del id de la app, no del dominio de la app. Solo hay una app, la `53138`, y apunta a producción (2026-11-26).
- Mobile first; contenido en español de México; textos de la interfaz de la app citados tal cual.

## Enfoques

1. **Copiar la estructura de la página de Shopify — elegido.** Es la más reciente y cuidada, y la app de Tiendanube deriva de ella (credenciales, ajustes del checkout, pedidos).
2. Copiar la de WooCommerce: más antigua, con HTML menos limpio (listas dentro de `<p>`).
3. Una página genérica para todas las plataformas: rompe con las URLs existentes y mezcla flujos distintos.

## Contenido (índice)

1. **Introducción:** qué hace la app; el comprador elige el punto entre las opciones de envío del checkout.
2. **Requisitos:** tienda en México (MXN) y cuenta de PuntoPost (usuario y contraseña de API, ID de merchant).
3. **Instalación:** enlace directo, autorización en Tiendanube; la app se abre dentro del admin con las pestañas «General», «Credenciales» y «Envíos».
4. **Configurar credenciales:** campos, botón «Comprobar», B2C («ID de origen») y C2C (datos del remitente), «Guardar», «Quitar credenciales». Al guardar, PuntoPost se añade solo como transportista de la tienda.
5. **Ajustes del checkout:** número de puntos (1 a 10, 10 por defecto; el máximo de Tiendanube), precio, envío gratis a partir de. (El nombre del método se quitó el 2026-11-25: las opciones se llaman siempre «PuntoPost - punto [horario]».)
6. **Vista del comprador:** una opción por punto en un radio de 3 km del código postal, «PuntoPost - punto [horario]» con su dirección. Se documenta lo que hace la app hoy, sin hablar de planes.
7. **Gestión de pedidos:** paquete creado al pagarse el pedido; link «PuntoPost - Ver envío» (punto, estado, seguimiento, «Imprimir etiqueta»); «Crear envío» y «Reintentar»; B2C «Marcar como empaquetado»; C2C llevar el paquete a un punto; pestaña «Envíos» con filtros e «Imprimir etiquetas».
8. **Seguimiento:** la app marca el pedido como enviado con el código y el enlace de seguimiento cuando PuntoPost recoge el paquete, y publica los estados siguientes en el pedido. El correo con el QR de recogida lo manda PuntoPost.
9. **Solución de problemas:** PuntoPost no aparece en el checkout (credenciales, CP sin puntos cerca, país), error al crear el envío, mensajes de error de la app.

## Capturas

Las saca Claude con el navegador controlado desde la sesión, sobre la tienda demo (`puntoposttechnologiesinc.mitiendanube.com`) con la app de pre reinstalada; Kevin inicia sesión en el admin. Compra de prueba con el CP 03500. Formato WebP en `assets/img/puntopost-tiendanube-*.webp`, como las de Shopify, sin datos personales reales.

Capturas previstas: credenciales (vacía, B2C, C2C), ajustes del checkout, opciones de PuntoPost en el checkout, link en el pedido, «Envío del pedido», etiqueta, pestaña «Envíos», pedido con el seguimiento.

## Logo

Las tarjetas de `/envia/tiendas/` usan el logo de cada plataforma (`assets/img/shopify.webp`). Hace falta `assets/img/tiendanube.webp` a partir del logo oficial de Tiendanube.

## Lo que queda al implementador

- Textos exactos y el orden de las capturas dentro de cada sección.
- La tarjeta de `/integrations/` pasa de tres a cuatro columnas o a una rejilla 2×2.
