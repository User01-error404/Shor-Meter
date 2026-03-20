import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const etaStr = () => {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export const dateStr = () =>
  new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export const friendlyError = (code) => ({
  'auth/email-already-in-use':   'This email is already registered.',
  'auth/wrong-password':         'Incorrect password. Try again.',
  'auth/user-not-found':         'No account found with this email.',
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/weak-password':          'Password must be at least 6 characters.',
  'auth/too-many-requests':      'Too many attempts. Please wait.',
  'auth/invalid-credential':     'Incorrect email or password.',
  'auth/network-request-failed': 'Network error. Check your connection.',
}[code] || 'Something went wrong. Please try again.')
