# Turnos (nombre provisorio)

Página de turnos online para profesionales de la salud, empezando por la **Dra. Cintia Chavez (Pediatría)**.

- **Página para las familias:** `https://servicellemma-commits.github.io/TURNOS/#dra-chavez`
- **App del consultorio (para la doctora):** `https://servicellemma-commits.github.io/TURNOS/app/`

## Cómo está armado

| Parte | Dónde vive | Qué guarda |
|---|---|---|
| Página y app | GitHub (este repositorio) | Solo el código. Ningún dato de pacientes. |
| Datos | Firebase (Firestore) | Configuración del profesional, turnos, fichas. Protegido con `firestore.rules`. |

Actualizar el código **no borra datos**: los datos están en Firebase, separados.

## Puesta en marcha (una sola vez)

1. **Firebase → Configuración del proyecto → Tus apps → App web:** copiá el bloque `firebaseConfig` y pegalo en `js/firebase-config.js`.
2. **Firebase → Authentication → Método de acceso:** activá **Anónimo** y **Google**.
3. **Firebase → Authentication → Configuración → Dominios autorizados:** agregá `servicellemma-commits.github.io`.
4. **Firebase → Firestore Database → Reglas:** pegá el contenido de `firestore.rules`, cambiá `emmatissera674@gmail.com` por tu mail y tocá **Publicar**.
5. En `js/firebase-config.js` poné el mismo mail en `ADMINS`.
6. Entrá a la **app del consultorio** con tu Google (administrador) y creá el profesional: link `dra-chavez` y el Gmail de la doctora.
7. La doctora entra a la app con su Gmail y desde Chrome toca **⋮ → Agregar a pantalla de inicio** para tenerla como app.

## Más adelante

- **Código por SMS:** activar el plan Blaze en Firebase, habilitar **Teléfono** en Authentication y poner `VERIFICAR_SMS = true`.
- **Recordatorios por WhatsApp:** requiere cuenta de WhatsApp Business verificada.
- **Recetas y pedidos:** se hacen en una plataforma inscripta en ReNaPDiS; la app solo copia los datos del paciente.
