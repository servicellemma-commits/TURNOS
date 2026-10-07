// =====================================================================
//  CONFIGURACIÓN — lo único que hay que completar a mano
// =====================================================================

// 1) Pegá acá el bloque "firebaseConfig" que te da Firebase
//    (Configuración del proyecto → Tus apps → App web).
//    No es una clave secreta: la seguridad está en las reglas (firestore.rules).
export const firebaseConfig = {
  apiKey: "PEGAR_AQUI",
  authDomain: "PEGAR_AQUI",
  projectId: "PEGAR_AQUI",
  storageBucket: "PEGAR_AQUI",
  messagingSenderId: "PEGAR_AQUI",
  appId: "PEGAR_AQUI"
};

// 2) Profesional que se muestra si el link no dice cuál (ej: .../#dra-chavez)
export const PROFESIONAL_POR_DEFECTO = "dra-chavez";

// 3) Mails de los administradores de la plataforma (pueden crear profesionales).
//    Tienen que ser los mismos que están en firestore.rules.
export const ADMINS = ["ADMIN_MAIL@gmail.com"];

// 4) Código por SMS. Necesita el plan Blaze de Firebase y activar "Teléfono"
//    en Authentication. Mientras esté en false, el turno se confirma sin código.
export const VERIFICAR_SMS = false;

// Nombre de la plataforma (provisorio)
export const PLATAFORMA = "Turnos";
