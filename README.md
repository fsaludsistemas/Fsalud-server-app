# AppSaludServer

API REST con Express + Firebase Firestore para gestionar:

- Dependencias
- Profesores
- DocentePeriodo

## Estructura actual

- index.js: punto de entrada y registro de rutas
- src/config/firebase.js: inicializacion de Firestore
- src/models: validaciones Zod por entidad
- src/controllers: logica CRUD y validaciones relacionales
- src/routes: rutas REST por recurso

## Relacion entre modelos

- Dependencia
	- jerarquia con padre_id y ancestros
- Profesor
	- referencia dependencia_actual con IDs de dependencia
- DocentePeriodo
	- referencia a profesor_id
	- id compuesto: profesor_id_periodo

## Endpoints CRUD

Base URL: /api

### Dependencias

- POST /dependencias
- GET /dependencias
- GET /dependencias/:id
- PUT /dependencias/:id
- DELETE /dependencias/:id

### Profesores

- POST /profesores
- GET /profesores
- GET /profesores/:id
- PUT /profesores/:id
- DELETE /profesores/:id

### Docente Periodos

- POST /docente-periodos
- GET /docente-periodos
- GET /docente-periodos/:id
- PUT /docente-periodos/:id
- DELETE /docente-periodos/:id

## Reglas de integridad incluidas

- No se crea Profesor con dependencias inexistentes.
- No se crea DocentePeriodo con profesor inexistente.
- No se elimina Dependencia si tiene hijas o profesores asociados.
- No se elimina Profesor si tiene periodos docentes asociados.
- En DocentePeriodo no se permite cambiar profesor_id ni periodo en update (se debe eliminar y recrear).

## Ejecutar proyecto

1. Instalar dependencias:

npm install

2. Iniciar en desarrollo:

npm run dev

3. Iniciar en produccion:

npm start
