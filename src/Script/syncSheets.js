import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import { ProfesorSchema, createProfesor } from '../models/ProfesorModel.js';
import { db } from '../config/firebase.js';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

// ==========================================
// CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ==========================================
// Estas variables vendrán de los "Secrets" en GitHub Actions
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;

// Función auxiliar para separar nombres y apellidos (Asume: últimos 2 siempre son apellidos)
function separarNombre(nombreCompleto) {
  if (!nombreCompleto) return { nombres: 'Desconocido', apellidos: 'Desconocido' };
  
  const partes = nombreCompleto.trim().split(/\s+/);
  if (partes.length <= 2) {
    return { nombres: partes[0] || 'Desconocido', apellidos: partes[1] || 'Sin Apellido' };
  }
  
  // Los últimos dos elementos son los apellidos, el resto son nombres
  const apellidos = partes.slice(-2).join(' ');
  const nombres = partes.slice(0, -2).join(' ');
  
  return { nombres, apellidos };
}

// Función para obtener todas las dependencias y mapearlas por su nombre
async function getDependenciasMap() {
  const dependenciasMap = new Map();
  try {
    const depSnapshot = await getDocs(collection(db, 'dependencias'));
    depSnapshot.forEach((doc) => {
      const data = doc.data();
      // Guardamos mapeando el nombre a su ID en minúsculas/sin espacios extra para evitar errores
      if (data.nombre) {
        dependenciasMap.set(data.nombre.trim().toLowerCase(), doc.id);
      }
    });
  } catch (error) {
    console.error('Error cargando dependencias:', error);
  }
  return dependenciasMap;
}

async function syncProfesores() {
  console.log('Iniciando sincronización con Google Sheets...');
  
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !SPREADSHEET_ID) {
    throw new Error('Faltan variables de entorno para conectar con Google Sheets.');
  }

  // 1. Autenticación con Google
  const auth = new JWT({
    email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: GOOGLE_PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const docSheet = new GoogleSpreadsheet(SPREADSHEET_ID, auth);

  // 2. Cargar el documento y dependencias
  await docSheet.loadInfo(); 
  const sheet = docSheet.sheetsByIndex[0]; // Asume que los datos están en la primera pestaña
  
  console.log(`Cargando mapa de dependencias desde Firestore...`);
  const dependenciasMap = await getDependenciasMap();

  console.log(`Hoja cargada: ${sheet.title}. Obteniendo filas...`);
  const rows = await sheet.getRows();

  let insertados = 0;
  let errores = 0;

  // 3. Procesar cada fila
  for (const row of rows) {
    try {
      // Extraer datos usando los nombres de las columnas exactos que mencionaste
      const escuela = row.get('Escuela');
      const departamento = row.get('Departamento');
      const seccion = row.get('Sección / Programa');
      const cedula = row.get('cedula');
      const nombreCompleto = row.get('Profesor');
      const celular = row.get('Celular');
      
      // Lógica de correos: Si 'Correo-e' está vacío, usamos 'Correo-e2'
      const correo1 = row.get('Correo-e');
      const correo2 = row.get('Correo-e2');
      const correoFinal = (correo1 && correo1.trim() !== '') ? correo1 : correo2;

      // Separar nombres y apellidos
      const { nombres, apellidos } = separarNombre(nombreCompleto);

      // Función helper para buscar el id ignorando mayúsculas
      const findDepId = (nombreDep) => {
        if (!nombreDep) return undefined;
        return dependenciasMap.get(nombreDep.trim().toLowerCase());
      };

      // Buscar IDs en el mapa
      const escuelaId = findDepId(escuela);
      const departamentoId = findDepId(departamento);
      const seccionId = findDepId(seccion);

      // Construir arreglo de ancestros (solo incluye los que se encontraron)
      const ancestros = [escuelaId, departamentoId, seccionId].filter(Boolean);

      const dependencia_actual = {
        escuela_o_oficina_id: escuelaId || 'NO_ENCONTRADA_O_NO_ASIGNADA', 
        departamento_id: departamentoId,
        seccion_id: seccionId,
        ancestros
      };

      // 4. Preparar el objeto para Zod
      const profesorData = {
        tipo_identificacion: 'CEDULA', // Asumimos cédula por defecto
        numero_identificacion: cedula ? cedula.toString() : '',
        nombres,
        apellidos,
        email_institucional: correoFinal,
        telefono: celular ? celular.toString() : undefined,
        dependencia_actual
      };

      // 5. Validar con Zod (createProfesor ya ejecuta ProfesorSchema.parse)
      const profesorValidado = createProfesor(profesorData);

      // 6. Guardar en Base de Datos (Firestore)
      if (profesorValidado.numero_identificacion) {
        const profesorRef = doc(db, 'profesores', profesorValidado.numero_identificacion);
        await setDoc(profesorRef, profesorValidado);
      } else {
        throw new Error('No se pudo determinar el numero_identificacion (cédula)');
      }

      insertados++;
      console.log(`✅ Procesado: ${nombres} ${apellidos}`);

    } catch (error) {
      console.error(`❌ Error procesando fila (Cédula: ${row.get('cedula')}):`, error.message);
      errores++;
    }
  }

  console.log(`\nSincronización terminada. Exitosos: ${insertados} | Errores: ${errores}`);
}

// Ejecutar la función
syncProfesores().catch(console.error);
