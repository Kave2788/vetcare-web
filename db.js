import { initializeApp, getApps, getApp } from './firebase/firebase-app.js';
import {
  getFirestore,
  collection, query, where,
  getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
  doc, onSnapshot
} from './firebase/firebase-firestore.js';
import {
  getAuth, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, setPersistence, browserLocalPersistence
} from './firebase/firebase-auth.js';

// ── Firebase config ───────────────────────────────────────────────────────────
// Sostituisci con i valori del tuo progetto Firebase (Project Settings → Your apps → Web app)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACvefcH7JCKvf8XbUACvW8Iy8m1_I5qoI",
  authDomain: "vetcare-8d5e7.firebaseapp.com",
  projectId: "vetcare-8d5e7",
  storageBucket: "vetcare-8d5e7.firebasestorage.app",
  messagingSenderId: "808687985400",
  appId: "1:808687985400:web:b67697b64c2b603ff2910d"
};

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
export const fdb = getFirestore(app);
export const auth = getAuth(app);

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signIn(email, password) {
  // Imposta persistenza prima del login — garantisce sessione in IndexedDB
  await setPersistence(auth, browserLocalPersistence);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function logout() {
  await signOut(auth);
}

export { onAuthStateChanged };

// ── Auth Guard ────────────────────────────────────────────────────────────────
// Aspetta che la sessione sia ripristinata da IndexedDB, poi chiama cb(user)
// oppure redirige a login.html. Evita redirect falsi durante il ripristino.
export async function requireAuth(cb) {
  await auth.authStateReady();
  if (!auth.currentUser) { window.location.href = 'login.html'; return; }
  if (cb) cb(auth.currentUser);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function docToObj(snap) {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

function snapToArr(querySnap) {
  return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Pazienti ──────────────────────────────────────────────────────────────────

export async function loadPatients() {
  const [patSnap, thrSnap] = await Promise.all([
    getDocs(collection(fdb, 'patients')),
    getDocs(query(collection(fdb, 'therapies'), where('active', '==', true)))
  ]);
  const therapies = snapToArr(thrSnap);
  return snapToArr(patSnap)
    .sort((a, b) => (b.admitted_at || '').localeCompare(a.admitted_at || ''))
    .map(p => ({ ...p, therapies: therapies.filter(t => t.patient_id === p.id) }));
}

export async function loadPatient(id) {
  const snap = await getDoc(doc(fdb, 'patients', id));
  if (!snap.exists()) throw new Error('Paziente non trovato');
  return docToObj(snap);
}

export async function addPatient(patient) {
  const data = { ...patient, admitted_at: patient.admitted_at || new Date().toISOString() };
  const ref = await addDoc(collection(fdb, 'patients'), data);
  return { id: ref.id, ...data };
}

export async function updatePatientStatus(id, status) {
  await updateDoc(doc(fdb, 'patients', id), { status });
}

export async function updatePatientFields(id, fields) {
  await updateDoc(doc(fdb, 'patients', id), fields);
}

export async function deletePatient(id) {
  await deleteDoc(doc(fdb, 'patients', id));
}

// ── Parametri vitali ──────────────────────────────────────────────────────────

export async function loadVitals(patientId) {
  const snap = await getDocs(
    query(collection(fdb, 'vitals'), where('patient_id', '==', patientId))
  );
  return snapToArr(snap).sort((a, b) => (b.recorded_at || '').localeCompare(a.recorded_at || ''));
}

export async function addVital(vital) {
  const ref = await addDoc(collection(fdb, 'vitals'), vital);
  return ref.id;
}

export async function loadTodayVitals(patientIds) {
  if (!patientIds.length) return [];
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const startISO = start.toISOString();
  const snap = await getDocs(
    query(collection(fdb, 'vitals'), where('patient_id', 'in', patientIds.slice(0, 30)))
  );
  return snapToArr(snap).filter(v => (v.recorded_at || '') >= startISO);
}

export async function loadLatestWeights(patientIds) {
  if (!patientIds.length) return {};
  const snap = await getDocs(
    query(collection(fdb, 'vitals'), where('patient_id', 'in', patientIds.slice(0, 30)))
  );
  const map = {};
  snapToArr(snap).forEach(v => {
    if (v.weight != null) {
      if (!map[v.patient_id] || (v.recorded_at || '') > (map[v.patient_id].recorded_at || '')) {
        map[v.patient_id] = v;
      }
    }
  });
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.weight]));
}

export async function loadVital(id) {
  const snap = await getDoc(doc(fdb, 'vitals', id));
  if (!snap.exists()) throw new Error('Rilevazione non trovata');
  return docToObj(snap);
}

export async function updateVital(id, fields) {
  await updateDoc(doc(fdb, 'vitals', id), fields);
}

export async function deleteVital(id) {
  await deleteDoc(doc(fdb, 'vitals', id));
}

// ── Ecografie ─────────────────────────────────────────────────────────────────

export async function loadEchos(patientId) {
  const snap = await getDocs(
    query(collection(fdb, 'echos'), where('patient_id', '==', patientId))
  );
  return snapToArr(snap).sort((a, b) => (b.examined_at || '').localeCompare(a.examined_at || ''));
}

export async function loadEchosForPatients(patientIds) {
  if (!patientIds.length) return [];
  const snap = await getDocs(
    query(collection(fdb, 'echos'), where('patient_id', 'in', patientIds.slice(0, 30)))
  );
  return snapToArr(snap);
}

export async function addEcho(echo) {
  await addDoc(collection(fdb, 'echos'), { ...echo, created_at: new Date().toISOString() });
}

export async function loadEcho(id) {
  const snap = await getDoc(doc(fdb, 'echos', id));
  if (!snap.exists()) throw new Error('Ecografia non trovata');
  return docToObj(snap);
}

export async function updateEcho(id, fields) {
  await updateDoc(doc(fdb, 'echos', id), fields);
}

export async function deleteEcho(id) {
  await deleteDoc(doc(fdb, 'echos', id));
}

// ── Terapie ───────────────────────────────────────────────────────────────────

export async function loadTherapies(patientId) {
  const snap = await getDocs(
    query(collection(fdb, 'therapies'), where('patient_id', '==', patientId))
  );
  return snapToArr(snap).sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
}

export async function addTherapy(therapy) {
  await addDoc(collection(fdb, 'therapies'), therapy);
}

export async function stopTherapy(id) {
  await updateDoc(doc(fdb, 'therapies', id), { active: false });
}

export async function updateTherapy(id, fields) {
  await updateDoc(doc(fdb, 'therapies', id), fields);
}

export async function deleteTherapy(id) {
  await deleteDoc(doc(fdb, 'therapies', id));
}

// ── Board Notes ───────────────────────────────────────────────────────────────

export async function loadBoardNotes(patientIds, date) {
  try {
    if (!patientIds.length) return [];
    const snap = await getDocs(
      query(collection(fdb, 'board_notes'),
        where('patient_id', 'in', patientIds.slice(0, 30)),
        where('date', '==', date))
    );
    return snapToArr(snap);
  } catch(e) {
    return [];
  }
}

export async function saveBoardNote(patientId, date, content) {
  try {
    const id = `${patientId}_${date}`;
    await setDoc(doc(fdb, 'board_notes', id), {
      patient_id: patientId, date, content,
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch(e) {
    console.warn('saveBoardNote error:', e);
  }
}

// ── Drug Administrations (board) ──────────────────────────────────────────────

export async function loadDrugAdministrations(patientIds, date) {
  if (!patientIds.length) return [];
  const snap = await getDocs(
    query(collection(fdb, 'drug_administrations'),
      where('patient_id', 'in', patientIds.slice(0, 30)),
      where('date', '==', date))
  );
  return snapToArr(snap);
}

export async function saveDrugAdministration(patientId, therapyIndex, hour, date) {
  const id = `${patientId}_${therapyIndex}_${hour}_${date}`;
  await setDoc(doc(fdb, 'drug_administrations', id), {
    patient_id: patientId, therapy_index: therapyIndex, hour, date, completed: true
  });
}

export async function deleteDrugAdministration(patientId, therapyIndex, hour, date) {
  const id = `${patientId}_${therapyIndex}_${hour}_${date}`;
  await deleteDoc(doc(fdb, 'drug_administrations', id));
}

// ── Exams — eco/prelievi da board ─────────────────────────────────────────────

export async function loadExams(patientIds, date) {
  if (!patientIds.length) return [];
  const snap = await getDocs(
    query(collection(fdb, 'exams'),
      where('patient_id', 'in', patientIds.slice(0, 30)),
      where('date', '==', date))
  );
  return snapToArr(snap);
}

export async function saveExam(type, patientId, hour, date, data) {
  const id = `${type}_${patientId}_${hour}_${date}`;
  await setDoc(doc(fdb, 'exams', id), { type, patient_id: patientId, hour, date, data });
}

export async function deleteExam(type, patientId, hour, date) {
  const id = `${type}_${patientId}_${hour}_${date}`;
  await deleteDoc(doc(fdb, 'exams', id));
}

// ── Realtime vitals (board) ───────────────────────────────────────────────────
// Ritorna la funzione unsubscribe. Salta il primo snapshot (già caricato da render).
export function subscribeVitals(patientIds, onChange) {
  if (!patientIds.length) return () => {};
  let firstSnap = true;
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  return onSnapshot(
    query(collection(fdb, 'vitals'), where('patient_id', 'in', patientIds.slice(0, 30))),
    snap => {
      if (firstSnap) { firstSnap = false; return; }
      snap.docChanges().forEach(change => {
        const v = { id: change.doc.id, ...change.doc.data() };
        if (new Date(v.recorded_at) < todayStart) return;
        onChange(change.type, v);
      });
    },
    err => console.error('subscribeVitals error:', err)
  );
}

// ── Utils ─────────────────────────────────────────────────────────────────────

export function daysSince(iso) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const admitted = new Date(iso); admitted.setHours(0, 0, 0, 0);
  return Math.round((today - admitted) / 86_400_000);
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('it-IT');
}

export function fmtDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT') + ' — ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

export const STATUS_LABEL = { stable: 'Stabile', critical: 'Critico', discharged: 'Dimesso' };
export const STATUS_COLOR = { stable: '#10B981', critical: '#EF4444', discharged: '#6B7280' };
export const SPECIES_EMOJI = { Cane: '🐕', Gatto: '🐈' };

export const ROUTE_LABELS  = { oral:'Orale', iv:'Endovenosa', im:'Intramuscolo', sc:'Sottocutanea', topical:'Topica', other:'Altra' };
export const FREQ_LABELS   = { mattina:'Mattina', sera:'Sera', sid:'1×/die', bid:'2×/die', tid:'3×/die', qid:'4×/die', q8h:'Ogni 8 h', q6h:'Ogni 6 h', prn:'Al bisogno', once:'Dose unica' };
export const RESP_LABELS   = { eupnea:'Eupnea', dyspnea_insp:'Dispnea (inspiratoria)', dyspnea_esp:'Dispnea (espiratoria)', dyspnea_mixed:'Dispnea (mista)', dyspnea_restr:'Dispnea (pattern restrittivo)', dyspnea_obstr:'Dispnea (pattern ostruttivo)', orthopnea:'Ortopnea', tachypnea:'Tachipnea', bradypnea:'Bradipnea', polypnea:'Polipnea' };
export const DEHYD_LABELS  = { lt5:'<5%', p5:'5%', p6:'6%', p7:'7%', p8:'8%', p9:'9%', p10:'10%' };
export const SENS_LABELS   = { normale:'Normale', depresso:'Depresso', eccitato:'Eccitato' };
export const MUC_LABELS    = { rosee:'Rosee', rosee_pallide:'Rosee-pallide', cianotiche:'Cianotiche', congeste:'Congeste', pallide:'Pallide', pigmentate:'Pigmentate', subitteriche:'Subitteriche', itteriche:'Itteriche', polso_quinck:'Polso di Quinck' };
export const FECES_LABELS  = { si:'Sì', no:'No', diarrea:'Diarrea', diarrea_emor:'Diarrea emorragica', ematochezia:'Ematochezia', melena:'Melena' };
export const URINE_LABELS  = { si:'Sì', no:'No', stranguria:'Stranguria', ematuria:'Ematuria', itteriche:'Urine itteriche' };
export const WATER_LABELS  = { si:'Sì', no:'No', a_disposizione:'A disposizione', digiuno_forzato:'Digiuno forzato', digiuno_acqua:'Digiuno forzato anche acqua' };
export const FOOD_LABELS   = { si:'Sì', no:'No', a_disposizione:'A disposizione', digiuno_forzato:'Digiuno forzato', digiuno_acqua:'Digiuno forzato anche acqua' };
