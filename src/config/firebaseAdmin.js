import jwksClient from 'jwks-rsa';

/**
 * Cliente JWKS que descarga y cachea las claves públicas de Firebase/Google.
 * Estas claves se usan para verificar la firma de los ID tokens sin necesitar
 * ninguna credencial privada (service account).
 *
 * URI oficial de Google para tokens de Firebase Auth:
 * https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com
 */
const jwks = jwksClient({
  jwksUri:
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  cache: true,          // cachea las claves en memoria
  cacheMaxEntries: 5,
  cacheMaxAge: 600_000  // 10 minutos en ms
});

/**
 * Devuelve la clave pública RSA correspondiente al kid del header del JWT.
 * @param {{ kid: string }} header - Header decodificado del JWT
 * @returns {Promise<string>} Clave pública en formato PEM
 */
export const getPublicKey = (header) =>
  new Promise((resolve, reject) => {
    jwks.getSigningKey(header.kid, (err, key) => {
      if (err) return reject(err);
      resolve(key.getPublicKey());
    });
  });
