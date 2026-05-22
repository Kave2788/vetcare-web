import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://rwhucgatmrphmakrwwma.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ3aHVjZ2F0bXJwaG1ha3J3d21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjcyNTYsImV4cCI6MjA5NTA0MzI1Nn0.0ZD56yAIGO9f4VgsMeWheBOIRSShGY92-hOeN7EQrYg';

export const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Pazienti ────────────────────────────────────────────────────────────────

export async function loadPatients() {
  const { data, error } = await db
    .from('patients')
    .select('*, therapies(id, active)')
    .order('admitted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function loadPatient(id) {
  const { data, error } = await db
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function addPatient(patient) {
  const { data, error } = await db
    .from('patients')
    .insert(patient)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePatientStatus(id, status) {
  const { error } = await db
    .from('patients')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function updatePatientFields(id, fields) {
  const { error } = await db
    .from('patients')
    .update(fields)
    .eq('id', id);
  if (error) throw error;
}

export async function deletePatient(id) {
  const { error } = await db.from('patients').delete().eq('id', id);
  if (error) throw error;
}

// ── Parametri vitali ─────────────────────────────────────────────────────────

export async function loadVitals(patientId) {
  const { data, error } = await db
    .from('vitals')
    .select('*')
    .eq('patient_id', patientId)
    .order('recorded_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addVital(vital) {
  const { data, error } = await db.from('vitals').insert(vital).select('id').single();
  if (error) throw error;
  return data.id;
}

export async function loadTodayVitals(patientIds) {
  const start = new Date(); start.setHours(0,0,0,0);
  const { data, error } = await db
    .from('vitals').select('*')
    .in('patient_id', patientIds)
    .gte('recorded_at', start.toISOString());
  if (error) throw error;
  return data;
}

export async function loadVital(id) {
  const { data, error } = await db.from('vitals').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateVital(id, fields) {
  const { error } = await db.from('vitals').update(fields).eq('id', id);
  if (error) throw error;
}

// ── Terapie ──────────────────────────────────────────────────────────────────

export async function loadTherapies(patientId) {
  const { data, error } = await db
    .from('therapies')
    .select('*')
    .eq('patient_id', patientId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addTherapy(therapy) {
  const { error } = await db.from('therapies').insert(therapy);
  if (error) throw error;
}

export async function stopTherapy(id) {
  const { error } = await db.from('therapies').update({ active: false }).eq('id', id);
  if (error) throw error;
}

export async function updateTherapy(id, fields) {
  const { error } = await db.from('therapies').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deleteTherapy(id) {
  const { error } = await db.from('therapies').delete().eq('id', id);
  if (error) throw error;
}

// ── Utils ────────────────────────────────────────────────────────────────────

export function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
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

export const ROUTE_LABELS = { oral:'Orale', iv:'Endovenosa', im:'Intramuscolo', sc:'Sottocutanea', topical:'Topica', other:'Altra' };
export const FREQ_LABELS   = { sid:'1×/die', bid:'2×/die', tid:'3×/die', qid:'4×/die', q8h:'Ogni 8 h', q6h:'Ogni 6 h', prn:'Al bisogno', once:'Dose unica' };
export const RESP_LABELS   = { eupnea:'Eupnea', dyspnea_insp:'Dispnea (inspiratoria)', dyspnea_esp:'Dispnea (espiratoria)', dyspnea_mixed:'Dispnea (mista)', dyspnea_restr:'Dispnea (pattern restrittivo)', dyspnea_obstr:'Dispnea (pattern ostruttivo)', orthopnea:'Ortopnea', tachypnea:'Tachipnea', bradypnea:'Bradipnea', polypnea:'Polipnea' };
export const DEHYD_LABELS  = { lt5:'<5%', p5:'5%', p6:'6%', p7:'7%', p8:'8%', p9:'9%', p10:'10%' };
export const SENS_LABELS   = { normale:'Normale', depresso:'Depresso', eccitato:'Eccitato' };
export const MUC_LABELS    = { rosee:'Rosee', rosee_pallide:'Rosee-pallide', cianotiche:'Cianotiche', congeste:'Congeste', pallide:'Pallide', pigmentate:'Pigmentate', subitteriche:'Subitteriche', itteriche:'Itteriche', polso_quinck:'Polso di Quinck' };
export const FECES_LABELS  = { si:'Sì', no:'No', diarrea:'Diarrea', diarrea_emor:'Diarrea emorragica', ematochezia:'Ematochezia', melena:'Melena' };
export const URINE_LABELS  = { si:'Sì', no:'No', stranguria:'Stranguria', ematuria:'Ematuria', itteriche:'Urine itteriche' };
export const WATER_LABELS  = { si:'Sì', no:'No', a_disposizione:'A disposizione', digiuno_forzato:'Digiuno forzato', digiuno_acqua:'Digiuno forzato anche acqua' };
export const FOOD_LABELS   = { si:'Sì', no:'No', a_disposizione:'A disposizione', digiuno_forzato:'Digiuno forzato', digiuno_acqua:'Digiuno forzato anche acqua' };
