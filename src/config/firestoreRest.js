import { AsyncLocalStorage } from 'node:async_hooks';

const tokenStore = new AsyncLocalStorage();
const projectId = process.env.FIREBASE_PROJECT_ID || 'fsalud-server';
const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

export const withFirestoreToken = (token, callback) => tokenStore.run(token, callback);
const getToken = () => tokenStore.getStore() || process.env.FIREBASE_ID_TOKEN;

const request = async (url, options = {}) => {
  const token = getToken();
  if (!token) throw new Error('No hay Firebase ID Token disponible para Firestore REST');
  const requestOptions = {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  };
  let response;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(url, requestOptions);
      break;
    } catch (error) {
      lastError = error;
      console.warn(`[Firestore REST] ${requestOptions.method || 'GET'} conexión fallida (intento ${attempt}/3): ${error.message}`);
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  if (!response) {
    const error = new Error(`No se pudo conectar con Firestore REST: ${lastError?.message || 'error desconocido'}`);
    error.cause = lastError;
    throw error;
  }
  if (!response.ok) {
    const body = await response.text();
    console.error(`[Firestore REST] ${options.method || 'GET'} ${url} -> ${response.status}: ${body}`);
    const error = new Error(`Firestore REST ${response.status}: ${body}`);
    error.status = response.status;
    throw error;
  }
  return response.status === 204 ? null : response.json();
};

const encode = (value) => {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)])) } };
  return { stringValue: String(value) };
};

const decode = (field) => {
  if (!field) return undefined;
  if ('nullValue' in field) return null;
  if ('stringValue' in field) return field.stringValue;
  if ('booleanValue' in field) return field.booleanValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('timestampValue' in field) return field.timestampValue;
  if ('arrayValue' in field) return (field.arrayValue.values || []).map(decode);
  if ('mapValue' in field) return Object.fromEntries(Object.entries(field.mapValue.fields || {}).map(([k, v]) => [k, decode(v)]));
  return undefined;
};

const dataFromDocument = (document) => Object.fromEntries(Object.entries(document.fields || {}).map(([k, v]) => [k, decode(v)]));
const wrap = (document) => ({
  id: document.name.split('/').pop(),
  data: () => dataFromDocument(document),
  exists: () => Boolean(document),
  ref: { path: document.name }
});

export const db = {};
export const collection = (_db, name) => ({ kind: 'collection', name });
export const doc = (collectionRef, id) => ({ kind: 'doc', collection: collectionRef.kind === 'collection' ? collectionRef.name : collectionRef.collection, id });
export const documentId = () => '__name__';
export const where = (field, op, value) => ({ type: 'where', field, op, value });
export const orderBy = (field, direction = 'asc') => ({ type: 'orderBy', field, direction });
export const limit = (value) => ({ type: 'limit', value });
export const startAfter = (snapshot) => ({ type: 'startAfter', id: snapshot.id });
export const query = (ref, ...constraints) => ({ ...ref, constraints });

const toFirestoreQueryValue = (value, field) => {
  // Firestore representa el ID del documento como una referencia completa,
  // no como un string normal, cuando se usa orderBy('__name__').
  if (field === '__name__') {
    return {
      referenceValue: `projects/${projectId}/databases/(default)/documents/${value}`
    };
  }

  return encode(value);
};

const buildWhere = (constraints) => {
  const filters = constraints
    .filter((constraint) => constraint.type === 'where')
    .map((constraint) => ({
      fieldFilter: {
        field: { fieldPath: constraint.field },
        op: constraint.op === '==' ? 'EQUAL' : constraint.op,
        value: toFirestoreQueryValue(constraint.value, constraint.field)
      }
    }));

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];

  return {
    compositeFilter: {
      op: 'AND',
      filters
    }
  };
};

const getDocsFromFirestore = async (ref) => {
  const constraints = ref.constraints || [];
  const structuredQuery = {
    from: [{ collectionId: ref.name || ref.collection }]
  };

  const whereClause = buildWhere(constraints);
  if (whereClause) structuredQuery.where = whereClause;

  const orderByConstraints = constraints.filter(
    (constraint) => constraint.type === 'orderBy'
  );
  if (orderByConstraints.length > 0) {
    structuredQuery.orderBy = orderByConstraints.map((constraint) => ({
      field: { fieldPath: constraint.field },
      direction: constraint.direction === 'desc' ? 'DESCENDING' : 'ASCENDING'
    }));
  }

  const startAfterConstraint = constraints.find(
    (constraint) => constraint.type === 'startAfter'
  );
  if (startAfterConstraint) {
    structuredQuery.startAt = {
      before: false,
      values: [toFirestoreQueryValue(startAfterConstraint.id, '__name__')]
    };
  }

  const limitConstraint = constraints.find(
    (constraint) => constraint.type === 'limit'
  );
  if (limitConstraint) structuredQuery.limit = limitConstraint.value;

  const result = await request(`${baseUrl}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery })
  });

  const docs = result
    .filter((item) => item.document)
    .map((item) => wrap(item.document));

  return { docs, empty: docs.length === 0, size: docs.length };
};

async function list(collectionName) {
  let url = `${baseUrl}/${collectionName}?pageSize=1000`;
  const documents = [];
  while (url) {
    const result = await request(url);
    documents.push(...(result.documents || []));
    url = result.nextPageToken ? `${baseUrl}/${collectionName}?pageSize=1000&pageToken=${encodeURIComponent(result.nextPageToken)}` : null;
  }
  return documents;
}

export const getDoc = async (ref) => {
  try { return wrap(await request(`${baseUrl}/${ref.collection}/${encodeURIComponent(ref.id)}`)); }
  catch (error) { if (error.status === 404) return { id: ref.id, exists: () => false, data: () => undefined, ref }; throw error; }
};

export const getDocs = async (ref) => {
  return getDocsFromFirestore(ref);
};

export const addDoc = async (ref, data) => {
  const result = await request(`${baseUrl}/${ref.name}`, { method: 'POST', body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])) }) });
  return doc(ref, result.name.split('/').pop());
};
export const setDoc = async (ref, data, options = {}) => {
  const body = { fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, encode(v)])) };
  await request(`${baseUrl}/${ref.collection}/${encodeURIComponent(ref.id)}${options.merge ? '?updateMask.fieldPaths=' + Object.keys(data).map(encodeURIComponent).join('&updateMask.fieldPaths=') : ''}`, { method: 'PATCH', body: JSON.stringify(body) });
};
export const updateDoc = (ref, data) => setDoc(ref, data, { merge: true });
export const deleteDoc = (ref) => request(`${baseUrl}/${ref.collection}/${encodeURIComponent(ref.id)}`, { method: 'DELETE' });
export const runTransaction = async (_db, callback) => {
  const writes = [];
  const transaction = { get: getDoc, update: (ref, data) => writes.push(() => updateDoc(ref, data)) };
  const result = await callback(transaction);
  for (const write of writes) await write();
  return result;
};
