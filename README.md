# AppSaludServer

API REST con Express + Firebase Firestore para gestionar dependencias, profesores y usuarios de la Universidad del Valle. Protegida con autenticación Firebase (Google) y lista blanca por colección `usuarios`.

---

## Estructura del proyecto

```
index.js                        → Punto de entrada y registro de rutas
src/
  config/
    firebase.js                 → Inicialización Firestore (SDK cliente)
    firebaseAdmin.js            → Cliente JWKS para verificar tokens sin service account
  models/                       → Schemas de validación Zod por entidad
  controllers/                  → Lógica CRUD y validaciones relacionales
  routes/                       → Rutas REST por recurso
  Middlewares/
    verificarToken.js           → Middleware de autenticación Firebase + lista blanca
```

---

## Autenticación

Todos los endpoints bajo `/api/*` requieren un **Firebase ID Token** válido en el header:

```
Authorization: Bearer <idToken>
```

### Cómo obtener el token (front-end)

El login se hace **directamente con Firebase Auth en el cliente** — el servidor no expone ningún endpoint de login. El flujo es:

1. El usuario hace clic en "Iniciar sesión con Google"
2. Firebase Auth abre el popup de Google (solo permite el dominio `@correounivalle.edu.co`)
3. El cliente verifica que el email esté en la colección `usuarios` con `estado == "ACTIVO"`
4. Si está autorizado, obtiene el `idToken` y lo adjunta a todas las peticiones al servidor

```js
// authService.js (cliente)
import { loginConGoogle, logout, getIdToken } from "./auth/authService";

// Login
const { email, permiso, dependencia_actual, idToken } = await loginConGoogle();

// Obtener token fresco para una request (se renueva automáticamente)
const token = await getIdToken();

// Logout
await logout();
```

```js
// apiClient.js (cliente) — usar en vez de fetch directamente
import { apiFetch } from "./api/apiClient";

const profesores = await apiFetch("/profesores");           // GET
const nuevo = await apiFetch("/profesores", {              // POST
  method: "POST",
  body: JSON.stringify({ ... })
});
```

### Respuestas de error de autenticación

| Código | Causa |
|--------|-------|
| `401`  | No se envió token, o está expirado / malformado |
| `403`  | Email no está en la colección `usuarios` o tiene `estado != ACTIVO` |

---

## Endpoints CRUD

**Base URL:** `http://localhost:3000/api`

> Todos los endpoints requieren el header `Authorization: Bearer <idToken>`

---

### 🔐 Usuarios (lista blanca)

> Los usuarios **no se crean desde el login** — se registran manualmente en Firestore o vía este CRUD por un administrador.

#### `POST /api/usuarios`
Crea un usuario en la lista blanca.

**Body:**
```json
{
  "email": "juan.perez@correounivalle.edu.co",
  "permiso": "LECTURA",
  "estado": "ACTIVO",
  "dependencia_actual": {
    "escuela_o_oficina_id": "<id_firestore>",
    "departamento_id": "<id_firestore>",
    "seccion_id": "<id_firestore>",
    "ancestros": ["<id1>", "<id2>"]
  }
}
```

> `dependencia_actual` es **obligatorio** solo si `permiso` es `"DIRECTOR ESCUELA"` o `"DIRECTOR OFICINA"`. Para los demás permisos es opcional.

**Permisos válidos:** `ADMINISTRADOR`, `LECTURA`, `SISTEMAS`, `EDITOR`, `DIRECTOR ESCUELA`, `DIRECTOR OFICINA`

**Respuesta `201`:**
```json
{
  "id": "abc123xyz",
  "email": "juan.perez@correounivalle.edu.co",
  "permiso": "LECTURA",
  "estado": "ACTIVO",
  "dependencia_actual": { ... },
  "createdAt": "2026-08-25T15:00:00.000Z",
  "updatedAt": "2026-08-25T15:00:00.000Z",
  "lastLoginAt": "2026-08-25T15:00:00.000Z"
}
```

---

#### `GET /api/usuarios`
Retorna todos los usuarios registrados.

**Respuesta `200`:**
```json
[
  {
    "id": "abc123xyz",
    "email": "juan.perez@correounivalle.edu.co",
    "permiso": "LECTURA",
    "estado": "ACTIVO",
    ...
  }
]
```

---

#### `GET /api/usuarios/:id`
Retorna un usuario por su ID de Firestore.

**Respuesta `200`:** objeto de usuario. **`404`** si no existe.

---

#### `PUT /api/usuarios/:id`
Actualiza parcialmente un usuario. Todos los campos son opcionales.

**Body (ejemplo):**
```json
{
  "permiso": "EDITOR",
  "estado": "INACTIVO"
}
```

**Respuesta `200`:** objeto actualizado. **`404`** si no existe.

---

#### `DELETE /api/usuarios/:id`
Elimina un usuario de la lista blanca.

**Respuesta `200`:**
```json
{ "message": "Usuario eliminado correctamente" }
```

---

### 🏛️ Dependencias

Las dependencias tienen jerarquía: `ESCUELA/OFICINA → DEPARTAMENTO → SECCION`. El campo `padre_id` define el nodo padre; el servidor calcula `ancestros` automáticamente.

#### `POST /api/dependencias`
Crea una dependencia.

**Body:**
```json
{
  "nombre": "Escuela de Ingeniería de Sistemas",
  "tipo": "ESCUELA",
  "padre_id": null
}
```
```json
{
  "nombre": "Departamento de Redes",
  "tipo": "DEPARTAMENTO",
  "padre_id": "<id_escuela>"
}
```

**Tipos válidos:** `ESCUELA`, `OFICINA`, `DEPARTAMENTO`, `SECCION`

> `padre_id` es `null` para raíces (ESCUELA u OFICINA). El campo `ancestros` **no se envía** — el servidor lo calcula solo.

**Respuesta `201`:**
```json
{
  "id": "dep789",
  "nombre": "Departamento de Redes",
  "tipo": "DEPARTAMENTO",
  "padre_id": "esc001",
  "ancestros": ["esc001"],
  "createdAt": "2026-08-25T15:00:00.000Z"
}
```

---

#### `GET /api/dependencias`
Retorna todas las dependencias.

**Respuesta `200`:** array de dependencias.

---

#### `GET /api/dependencias/:id`
Retorna una dependencia por ID.

**Respuesta `200`:** objeto. **`404`** si no existe.

---

#### `PUT /api/dependencias/:id`
Actualiza parcialmente una dependencia. Si se actualiza `padre_id`, el servidor recalcula `ancestros`.

**Body (ejemplo):**
```json
{
  "nombre": "Departamento de Redes y Comunicaciones"
}
```

**Respuesta `200`:** objeto actualizado.

---

#### `DELETE /api/dependencias/:id`
Elimina una dependencia.

> ⚠️ **Falla con `409`** si:
> - Tiene dependencias hijas (`padre_id` apunta a esta)
> - Hay profesores adscritos a ella

**Respuesta `200`:**
```json
{ "message": "Dependencia eliminada correctamente" }
```

**Respuesta `409`:**
```json
{ "message": "No se puede eliminar: existen dependencias hijas asociadas" }
```

---

### 👨‍🏫 Profesores

#### `POST /api/profesores`
Crea un profesor. El `numero_identificacion` debe ser único.

**Body:**
```json
{
  "tipo_identificacion": "CEDULA",
  "numero_identificacion": "1234567890",
  "nombres": "Juan Carlos",
  "apellidos": "Pérez Gómez",
  "email_institucional": "juan.perez@correounivalle.edu.co",
  "lugar_nacimiento": "Cali",
  "fecha_nacimiento": "1985-03-15",
  "telefono": "3001234567",
  "fecha_vinculacion": "2010-01-01",
  "foto_url": "https://...",
  "dependencia_actual": {
    "escuela_o_oficina_id": "<id_escuela>",
    "departamento_id": "<id_departamento>",
    "seccion_id": "<id_seccion>",
    "ancestros": ["<id1>", "<id2>"]
  },
  "estado": "ACTIVO"
}
```

> Campos opcionales: `lugar_nacimiento`, `fecha_nacimiento`, `telefono`, `fecha_vinculacion`, `foto_url`, `dependencia_actual.departamento_id`, `dependencia_actual.seccion_id`

> **Tipos de identificación válidos:** `CEDULA`, `PASAPORTE`, `TARJETA_IDENTIDAD`

**Respuesta `201`:** objeto del profesor creado con su `id` de Firestore.

**Respuesta `409`:**
```json
{ "message": "Ya existe un profesor con ese numero de identificacion" }
```

---

#### `GET /api/profesores`
Retorna todos los profesores.

**Respuesta `200`:** array de profesores.

---

#### `GET /api/profesores/:id`
Retorna un profesor por su ID de Firestore.

**Respuesta `200`:** objeto. **`404`** si no existe.

---

#### `PUT /api/profesores/:id`
Actualiza parcialmente un profesor. Todos los campos son opcionales.

**Body (ejemplo):**
```json
{
  "telefono": "3109876543",
  "estado": "INACTIVO"
}
```

**Respuesta `200`:** objeto actualizado con `updatedAt` renovado.

---

#### `DELETE /api/profesores/:id`
Elimina un profesor.

> ⚠️ **Falla con `409`** si tiene periodos docentes asociados.

**Respuesta `200`:**
```json
{ "message": "Profesor eliminado correctamente" }
```

---

## Respuestas de error comunes

| Código | Causa |
|--------|-------|
| `400`  | Validación fallida (Zod) — la respuesta incluye `errors[]` con detalle |
| `400`  | IDs de dependencia referenciados no existen en Firestore |
| `400`  | No se enviaron campos para actualizar |
| `401`  | Token ausente, expirado o inválido |
| `403`  | Usuario no en lista blanca o inactivo |
| `404`  | Recurso no encontrado |
| `409`  | Conflicto de integridad referencial |
| `500`  | Error interno del servidor |

**Formato de error de validación (`400`):**
```json
{
  "message": "Error de validacion",
  "errors": [
    {
      "path": ["email"],
      "message": "Debe ser un correo valido"
    }
  ]
}
```

---

## Relación entre modelos

```
Dependencia (ESCUELA/OFICINA)
  └── Dependencia (DEPARTAMENTO)  [padre_id → Escuela]
        └── Dependencia (SECCION) [padre_id → Departamento]

Profesor
  └── dependencia_actual → { escuela_o_oficina_id, departamento_id, seccion_id, ancestros }

DocentePeriodo
  └── profesor_id → Profesor
```

## Reglas de integridad

- No se crea `Profesor` si los IDs en `dependencia_actual` no existen en Firestore.
- No se crea `DocentePeriodo` con `profesor_id` inexistente.
- No se elimina `Dependencia` si tiene hijas o profesores asociados.
- No se elimina `Profesor` si tiene periodos docentes asociados.
- En `DocentePeriodo` no se puede cambiar `profesor_id` ni `periodo` en update (eliminar y recrear).

---

## Ejecutar el proyecto

```bash
# Instalar dependencias
npm install

# Desarrollo (con hot reload)
npm run dev

# Producción
npm start
```

El servidor queda disponible en `http://localhost:3000`.
