import jwt from 'jsonwebtoken';
import { collection, getDocs, query, where, withFirestoreToken } from '../config/firestoreRest.js';
import { getPublicKey } from '../config/firebaseAdmin.js';
const db = {};

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;

/**
 * Middleware de autenticación con Firebase ID Token + lista blanca.
 *
 * Flujo:
 * 1. Extrae el Bearer token del header Authorization
 * 2. Decodifica el header del JWT para obtener el kid (key ID)
 * 3. Descarga la clave pública RSA de Google (cacheada) y verifica la firma
 * 4. Comprueba issuer, audience y expiración del token
 * 5. Busca el email en la colección "usuarios" con estado ACTIVO (lista blanca)
 * 6. Adjunta req.usuario para uso en los controllers
 *
 * No requiere service account ni firebase-admin.
 */
export const verificarToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[AUTH] ${req.method} ${req.originalUrl} sin Bearer token`);
    return res.status(401).json({ message: 'Token de autenticación requerido' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    // 1. Decodificar header del JWT para obtener el kid
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded) {
      console.warn(`[AUTH] ${req.method} ${req.originalUrl} token no decodificable`);
      return res.status(401).json({ message: 'Token inválido' });
    }

    // 2. Obtener la clave pública RSA de Google (por kid)
    const publicKey = await getPublicKey(decoded.header);

    // 3. Verificar firma, issuer y audience
    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID
    });

    const { uid, email } = payload;
    if (!email) {
      return res.status(401).json({ message: 'El token no contiene un correo electrónico' });
    }

    // 4. Verificar lista blanca en Firestore
    const snap = await withFirestoreToken(idToken, () => getDocs(
      query(
        collection(db, 'usuarios'),
        where('email', '==', email.toLowerCase()),
        where('estado', '==', 'ACTIVO')
      )
    ));

    if (snap.empty) {
      console.warn(`[AUTH] ${req.method} ${req.originalUrl} usuario no autorizado: ${email}`);
      return res.status(403).json({
        message: 'Acceso denegado. Tu cuenta no está autorizada para usar esta aplicación.'
      });
    }

    const usuarioDoc = snap.docs[0];
    const usuarioData = usuarioDoc.data();

    // 5. Adjuntar datos del usuario a req para uso en controllers
    req.usuario = {
      uid,
      email,
      permiso: usuarioData.permiso,
      dependencia_actual: usuarioData.dependencia_actual ?? null,
      usuarioId: usuarioDoc.id
    };
    req.firebaseIdToken = idToken;

    return withFirestoreToken(idToken, () => next());
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.warn(`[AUTH] ${req.method} ${req.originalUrl} token expirado`);
      return res.status(401).json({ message: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      console.warn(`[AUTH] ${req.method} ${req.originalUrl} token inválido: ${error.message}`);
      return res.status(401).json({ message: 'Token inválido o malformado' });
    }
    if (error.status === 401 || error.status === 403) {
      console.error('[verificarToken] Firestore rechazó el token:', error.message);
      return res.status(error.status).json({ message: 'Firestore rechazó la autenticación del token' });
    }
    console.error('[verificarToken]', error);
    return res.status(500).json({ message: 'Error al verificar autenticación' });
  }
};
