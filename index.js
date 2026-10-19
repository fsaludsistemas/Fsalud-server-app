import express from 'express'
import cors from 'cors'
import config from 'dotenv/config'
import profesoresRoutes from './src/routes/profes.route.js'
import dependenciasRoutes from './src/routes/dependencias.route.js'
import docentePeriodosRoutes from './src/routes/docentePeriodos.route.js'
import periodosRoutes from './src/routes/periodos.route.js'
import usuariosRoutes from './src/routes/usuarios.route.js'
import asignacionesRoutes from './src/routes/asignaciones.route.js'
import credencialesRoutes from './src/routes/credenciales.route.js'
import storageRoutes from './src/routes/storage.route.js'
import estadisticasRoutes from './src/routes/estadisticas.route.js'
import { verificarToken } from './src/Middlewares/verificarToken.js'


const app = express()

// Trazabilidad básica de solicitudes API. No registra tokens ni cuerpos sensibles.
app.use((req, res, next) => {
    const startedAt = Date.now()
    res.on('finish', () => {
        if (req.path.startsWith('/api')) {
            console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`)
        }
    })
    next()
})

// El frontend se sirve desde Vercel y envía Authorization, por lo que el
// navegador realiza un preflight OPTIONS antes de las peticiones protegidas.
// Mantener CORS antes de cualquier middleware de autenticación es importante:
// OPTIONS no contiene un Bearer token.
const normalizeOrigin = origin => origin.trim().replace(/\/$/, '')
const allowedOrigins = new Set([
    'https://docentes-fsalud.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...(process.env.FRONTEND_URL || '').split(',').map(normalizeOrigin).filter(Boolean),
    ...(process.env.CORS_ORIGINS || '').split(',').map(normalizeOrigin).filter(Boolean)
])

app.use(cors({
    origin: (origin, callback) => {
        // Permite llamadas sin Origin (curl, health checks y solicitudes del servidor).
        if (!origin || allowedOrigins.has(normalizeOrigin(origin))) return callback(null, true)
        return callback(new Error('Origen no permitido por CORS'))
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
}))
app.use(express.json())

app.get('/', (req, res) => {
    res.send('API AppSaludServer operativa')
})

// Todas las rutas /api/* requieren token válido + lista blanca
app.use('/api', verificarToken)

app.use('/api/profesores', profesoresRoutes)
app.use('/api/dependencias', dependenciasRoutes)
app.use('/api/docente-periodos', docentePeriodosRoutes)
app.use('/api/asignaciones', asignacionesRoutes)
app.use('/api/periodos', periodosRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/credenciales', credencialesRoutes)
app.use('/api/storage', storageRoutes)
app.use('/api/estadisticas', estadisticasRoutes)

// Vercel importa la aplicación como función serverless; en local se mantiene
// el servidor HTTP tradicional para `npm start`/`npm run dev`.
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })
}

export default app
