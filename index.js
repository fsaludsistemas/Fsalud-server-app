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

app.use(cors())
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

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})
