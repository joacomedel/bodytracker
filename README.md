# BodyTracker

Pequeña app web (GitHub Pages) para registrar el peso del día y ver la evolución.
Los datos viven en tu **Google Sheet**; la app lee y agrega registros a través de un Web App de Apps Script.

```
Navegador (esta página)  ──fetch POST──▶  Apps Script (/exec)  ──▶  hoja "Datos"
```

## Acceso

- La **primera vez** te pide **crear una contraseña**.
- En cada **dispositivo nuevo** te pide la contraseña **una vez**; el dispositivo recibe una **clave única** que se guarda en su navegador y no vuelve a pedir nada.
- Todas las operaciones requieren una clave de dispositivo válida.
- El repo **no guarda ningún secreto** (la contraseña se valida y guarda hasheada del lado de Apps Script).

## Archivos

- `index.html` — estructura (incluye la pantalla de acceso)
- `styles.css` — diseño
- `app.js` — lógica (acceso, fetch y gráfico SVG)
- `config.js` — solo la URL del Web App

## Configuración

```js
window.BT_CONFIG = {
  SCRIPT_URL: ".../exec",
};
```

- **SCRIPT_URL**: la URL `/exec` del Web App de Apps Script.

## Publicar en GitHub Pages

1. Subir estos archivos a un repo.
2. Settings → Pages → Source: `main` / `/ (root)`.
3. Queda en `https://<usuario>.github.io/<repo>/`.

> El Web App de Apps Script queda **fijado a la versión desplegada**: si cambiás `Code.gs`, hay que sacar una **Nueva versión** del deploy para que la página lo use.
