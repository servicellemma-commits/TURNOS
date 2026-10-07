// Conexión con Firebase (SDK oficial desde el CDN de Google)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInAnonymously, signOut,
  GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  RecaptchaVerifier, linkWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where,
  onSnapshot, writeBatch, serverTimestamp, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

export const configurado = !String(firebaseConfig.apiKey || "").startsWith("PEGAR");
export const app = configurado ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
if (auth) auth.languageCode = "es";

export {
  onAuthStateChanged, signInAnonymously, signOut, GoogleAuthProvider, signInWithPopup,
  signInWithRedirect, getRedirectResult, RecaptchaVerifier, linkWithPhoneNumber,
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot,
  writeBatch, serverTimestamp, getDocs
};
