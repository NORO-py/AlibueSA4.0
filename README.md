# ALIBUE — Sistema de Gestión Avícola

App web estática (HTML/CSS/JS) con sincronización en la nube vía **Firebase Firestore**.
Todos los archivos están en una sola carpeta `alibueSA/` lista para subir a GitHub Pages.

## 1) Configurar Firebase (una sola vez, GRATIS)

1. Entrá a https://console.firebase.google.com/ y creá un proyecto nuevo (cualquier nombre).
2. Dentro del proyecto, hacé clic en el ícono **Web (</>)** y registrá una app (cualquier nick).
3. Firebase te muestra un objeto `firebaseConfig` con `apiKey`, `authDomain`, etc.
   Copiá esos valores en el archivo **`firebase-config.js`** (reemplazando los `TU_...`).
4. En el menú izquierdo: **Build → Firestore Database → Crear base de datos**.
   Elegí **modo de prueba** (test mode) y la región más cercana.
5. (Recomendado) En **Firestore → Rules**, pegá estas reglas básicas y publicá:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /alibue/{doc} {
      allow read, write: if true;
    }
  }
}
```

Listo. Subí los archivos a GitHub Pages y los datos se van a sincronizar automáticamente
entre la PC, el celular y cualquier dispositivo que abra el link.

> Si dejás `firebase-config.js` sin completar, la app funciona igual pero solo guarda en
> el dispositivo donde la abriste (sin sincronización).

## 2) Subir a GitHub Pages

1. Subí toda la carpeta `alibueSA/` al repositorio.
2. En el repo: **Settings → Pages → Branch: main / root** (o `/docs`).
3. Abrí `https://TU-USUARIO.github.io/TU-REPO/alibueSA/`.

## 3) Acceso

- **Galponero**: acceso libre (botón directo).
- **Operario**: contraseña **`Alibue`**.
- **Editar/eliminar registros**: clave **`4708`** + motivo obligatorio (queda en historial).

## 4) Respaldos manuales

Desde el dashboard: **Exportar JSON** descarga `backup.json` con todos los datos.
**Importar JSON** restaura desde un archivo.
