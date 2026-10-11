# BodyTracker

App web (GitHub Pages) para registrar el peso del día y ver la evolución.
Corre sobre el backend reutilizable **`bds`** (ver el repo `backend-bds`):
los datos viven en un Google Sheet (dominio `pesos`) y la app lee/escribe a
través de un Web App de Apps Script.

```
Navegador (esta página) ──bt-core.js──▶ MOTOR bds (/exec) ──▶ Google Sheet del dominio "pesos"
```

## Acceso

- Lo maneja **`bt-core.js`** (común a todas las apps): la **primera vez** te pide
  **crear una contraseña**; en cada **dispositivo nuevo** la pide **una vez** y
  guarda una clave en el navegador. Como todas las apps comparten origen, se pide
  una sola vez por dispositivo.
- El repo **no guarda ningún secreto**.

## Archivos

- `index.html` — estructura (el acceso lo inyecta `bt-core.js`)
- `styles.css` — diseño (concepto "plotter")
- `app.js` — lógica de la vista (formulario, gráfico SVG, historial)
- `bt-core.js` — cliente común del backend bds (acceso + llamadas)
- `config.js` — sólo la URL del Web App

## Configuración

```js
window.BT_CONFIG = { SCRIPT_URL: ".../exec" };
```

## Publicar en GitHub Pages

1. Subir estos archivos al repo.
2. Settings → Pages → Source: `main` / `/ (root)`.
3. Queda en `https://joacomedel.github.io/bodytracker/`.

> El Web App de Apps Script queda **fijado a la versión desplegada**: si cambiás el
> motor (`Code.gs`), hay que sacar una **Nueva versión** del deploy.
