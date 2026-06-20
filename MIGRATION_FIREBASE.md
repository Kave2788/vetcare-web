# Migrazione Supabase → Firebase

## Perché

Supabase free tier **pausa i progetti dopo 7 giorni di inattività** — i dati non si cancellavano, ma l'app diventava inaccessibile finché non si riattivava manualmente. Firebase non ha questo limite sul piano gratuito.

Secondo problema: il login Supabase usava `localStorage`, che **Safari iOS svuota dopo 7 giorni di inattività** (ITP — Intelligent Tracking Prevention). L'utente doveva rifare il login ogni settimana anche senza disconnettersi.

## Soluzione

- **Database:** Firestore (Firebase) al posto di Supabase PostgreSQL
- **Auth:** Firebase Authentication con `browserLocalPersistence` → sessione in IndexedDB, non toccata da Safari ITP
- **Offline:** `initializeFirestore` con `persistentLocalCache()` → dati cachati in IndexedDB, scritture in coda se offline

## Struttura Firebase

**Progetto:** `vetcare-8d5e7`  
**Console:** https://console.firebase.google.com/project/vetcare-8d5e7

### Collezioni Firestore

| Collezione | Equivalente Supabase | Note |
|------------|---------------------|------|
| `patients` | `patients` | Stesso schema, `id` = doc ID Firestore |
| `vitals` | `vitals` | `patient_id` = riferimento a patients |
| `therapies` | `therapies` | `patient_id`, `active: bool` |
| `echos` | `echos` | `patient_id`, `type`, `examined_at` |
| `board_notes` | `board_notes` | ID composito `{patientId}_{date}` per upsert |
| `drug_administrations` | `drug_administrations` | ID composito `{patientId}_{therapyIdx}_{hour}_{date}` |
| `exams` | `exams` | ID composito `{type}_{patientId}_{hour}_{date}` |

### Utenti Firebase Auth

- `fede@vetcare.it` — Fede (veterinaria)
- aggiungere altri operatori dalla Firebase Console → Authentication → Users

### Security Rules

```
allow read, write: if request.auth != null;
```

Tutti gli utenti autenticati vedono e modificano gli stessi dati (stessa clinica).

## File modificati

| File | Cambiamento |
|------|-------------|
| `db.js` | Riscritto completamente: Supabase client → Firebase SDK (gstatic.com CDN v10.14.1) |
| `login.html` | Nuovo file — form email/password con Firebase Auth |
| `index.html` | Auth guard + pulsante logout |
| `board.html` | Import aggiornati, tutte le query Firebase, `subscribeVitals` per real-time |
| `archive.html` | Auth guard + pulsante "Riammetti" per ripristinare pazienti dimessi |
| `patient.html` | Auth guard |
| `new/edit-patient.html` | Auth guard |
| `add/edit-vitals.html` | Auth guard |
| `add/edit-therapy.html` | Auth guard |
| `add/edit-echo.html` | Auth guard |
| `sw.js` | Cache v64, CDN Firebase escluso dall'intercettazione SW, `archive.html` aggiunto agli ASSETS |
| `style.css` | Stile pulsante logout |
| `firestore.rules` | Security rules Firestore |

## Pattern auth guard

Ogni pagina usa `requireAuth()` da `db.js`. Aspetta che Firebase ripristini la sessione da IndexedDB prima di decidere se reindirizzare — evita falsi redirect che causavano loop su Safari iOS.

```javascript
// db.js
export async function requireAuth(cb) {
  await auth.authStateReady(); // aspetta ripristino sessione IndexedDB
  if (!auth.currentUser) { window.location.href = 'login.html'; return; }
  if (cb) cb(auth.currentUser);
}

// In ogni pagina:
requireAuth(() => render());
```

## Funzionamento offline

Se Fede ha aperto l'app almeno una volta con connessione:
- I dati vengono cachati automaticamente in IndexedDB da Firestore
- Offline: legge dalla cache (pazienti, vitali, terapie visibili)
- Offline: le scritture (nuovo vitale, nota board, ecc.) vengono messe in coda e sincronizzate appena torna la rete
- Il login rimane attivo (sessione in IndexedDB, non scade offline)

## Note deploy

```bash
git add .
git commit -m "feat: migrazione Firebase"
git push
# Live in ~2 min su https://kave2788.github.io/vetcare-web/
```

Dopo il deploy, fare **Cmd+Shift+R** su tutti i dispositivi la prima volta per forzare il nuovo service worker.
