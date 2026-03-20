import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: "AIzaSyDeSnreU3XY41OdCGUkenseM-zxosP_TPE",
  authDomain: "shor-meter.firebaseapp.com",
  projectId: "shor-meter",
  storageBucket: "shor-meter.firebasestorage.app",
  messagingSenderId: "779691154955",
  appId: "1:779691154955:web:fbc319d423db1d6239f10e",
  measurementId: "G-N8NFDLBWVW"
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const auth = getAuth(app)
export const db = getFirestore(app)

// Analytics only runs in browser
if (typeof window !== 'undefined') {
  isSupported().then(yes => yes && getAnalytics(app))
}
