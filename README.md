# BodyTracker

Pequeña app web (GitHub Pages) para registrar el peso del día y ver la evolución.
Los datos viven en tu **Google Sheet**; la app solo lee y agrega registros a través de un Web App de Apps Script.

```
Navegador (esta página)  ──fetch──▶  Apps Script (/exec)  ──▶  hoja "Datos"
```

## Archivos

- `index.html` — estructura
- `styles.css` — diseño
- `app.js` — lógica (fetch + gráfico SVG + historial)
- `config.js` — la URL del script y el token compartido

## Configuración

Todo lo que hay que ajustar está en `config.js`:

```js
window.BT_CONFIG = {
  SCRIPT_URL: ".../exec",
  TOKEN: "bt_...",
};
```

- **SCRIPT_URL**: la URL `/exec` del Web App de Apps Script.
- **TOKEN**: debe coincidir con `WEB_SECRET` en el script.

> La página es pública y lleva la URL + el token a la vista. Alcanza para uso personal (evita que terceros escriban por accidente). No la uses para datos sensibles de terceros.

## Publicar en GitHub Pages

1. Subir estos archivos a un repo.
2. Settings → Pages → Source: `main` / `/ (root)`.
3. Queda en `https://<usuario>.github.io/<repo>/`.
