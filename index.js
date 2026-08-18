import express from 'express'
import cors from 'cors'
import config from 'dotenv/config'
import profesoresRoutes from './src/routes/profes.route.js'
import dependenciasRoutes from './src/routes/dependencias.route.js'
import docentePeriodosRoutes from './src/routes/docentePeriodos.route.js'


const app = express()


app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
    res.send('API AppSaludServer operativa')
})

app.use('/api/profesores', profesoresRoutes)
app.use('/api/dependencias', dependenciasRoutes)
app.use('/api/docente-periodos', docentePeriodosRoutes)

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})