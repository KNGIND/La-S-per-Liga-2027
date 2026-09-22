/*
  Configuración opcional.

  MODO LOCAL (por defecto): dejá los dos campos vacíos.
    Los datos salen de data/data.js. Lo que editás en el panel admin queda
    como borrador en TU celular; para publicarlo exportás data.js y lo subís.

  MODO NUBE: completá los dos campos con los datos de tu proyecto Supabase.
    Todos ven los cambios sin volver a subir archivos, y el panel admin
    pide email + contraseña reales (ver LEEME.md, paso "Modo nube").
    La clave anon/publishable es pública por diseño: es seguro dejarla acá.
*/
window.LSL_CONFIG = {
  supabaseUrl: 'https://jzeyankmecxazxmycvdz.supabase.co',      // ej: 'https://abcdxyz.supabase.co'
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6ZXlhbmttZWN4YXp4bXljdmR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5OTc2OTgsImV4cCI6MjEwNTU3MzY5OH0.6hGYSlqr_7aSz2inG9rnD15QJwPwWU9Z808kZ5N3MLs',  // ej: 'eyJhbGciOi...' o 'sb_publishable_...'
  pollSeconds: 30,      // cada cuántos segundos revisa novedades si hay partido en vivo
  oneSignalAppId: ''    // opcional: App ID de OneSignal para notificaciones push (ver LEEME.md)
};
