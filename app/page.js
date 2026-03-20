'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile,
} from 'firebase/auth'
import {
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import T from '@/lib/translations'
import { etaStr, dateStr, friendlyError } from '@/lib/utils'
import { ISSUE_TYPES, ISSUE_ICONS, ISSUE_AUTH, STATUS_CFG, MONTHLY, MONTHS, HOTSPOTS, QUICK_TYPES } from '@/lib/constants'

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

function Spinner({ text }) {
  return (
    <div className="flex flex-col items-center py-10 gap-3">
      <div className="animate-spin-slow w-7 h-7 rounded-full border-2 border-white/10 border-t-orange-400" />
      <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>{text}</p>
    </div>
  )
}

function GlassCard({ children, style = {}, onClick, className = '' }) {
  return (
    <div
      className={`glass rounded-2xl p-4 mb-3 ${onClick ? 'cursor-pointer press' : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

function GlassInput({ ...props }) {
  return <input className="glass-input" {...props} />
}

function GlassTextarea({ ...props }) {
  return <textarea className="glass-input" style={{ height: 88, resize: 'none', lineHeight: 1.5 }} {...props} />
}

function PrimaryBtn({ children, onClick, disabled, style = {} }) {
  return (
    <button
      className="press w-full py-3.5 rounded-2xl font-bold text-white text-sm tracking-wide cursor-pointer border-none"
      style={{
        background: 'linear-gradient(135deg,#FF6B35,#FF3CAC)',
        boxShadow: '0 8px 32px rgba(255,107,53,.45)',
        opacity: disabled ? 0.65 : 1,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        fontSize: 15,
        ...style,
      }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status, lang }) {
  const sc = STATUS_CFG[status] || STATUS_CFG.pending
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: sc.color,
      background: sc.bg, border: `1px solid ${sc.border}`,
      borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap',
    }}>
      {sc.dot} {sc.label[lang]}
    </span>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,.9)', marginBottom: 12, fontFamily: "'Space Grotesk',sans-serif" }}>
      {children}
    </p>
  )
}

function GlassLabel({ children }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.45)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.8px' }}>
      {children}
    </p>
  )
}

function ErrorBox({ msg }) {
  if (!msg) return null
  return (
    <div style={{ background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#FCA5A5', marginBottom: 14 }}>
      ⚠️ {msg}
    </div>
  )
}

function Dots({ n, cur }) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ width: i === cur ? 20 : 6, height: 6, borderRadius: 3, background: i === cur ? '#FF6B35' : 'rgba(255,255,255,.25)', transition: 'all .3s' }} />
      ))}
    </div>
  )
}

function Overlay({ children, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 }}
      onClick={onClose}
    >
      {children}
    </div>
  )
}

// ─── PHONE SHELL ──────────────────────────────────────────────────────────────
function Phone({ children }) {
  return (
    <div style={{
      width: 390, minHeight: 844,
      background: 'linear-gradient(135deg,#0f0c29 0%,#1a1040 35%,#24243e 65%,#0f3460 100%)',
      borderRadius: 44, overflow: 'hidden',
      fontFamily: "'Plus Jakarta Sans',sans-serif",
      boxShadow: '0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.08)',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* ambient orbs */}
      <div style={{ position: 'absolute', top: -60, left: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle,rgba(255,107,53,.25) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', top: 100, right: -80, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: 120, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(52,211,153,.15) 0%,transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}

function StatusBar() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }))
    update()
    const t = setInterval(update, 10000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
      <span style={{ color: 'rgba(255,255,255,.9)', fontSize: 14, fontWeight: 600 }}>{time}</span>
      <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 11, display: 'flex', gap: 5 }}>●●● WiFi 🔋</div>
    </div>
  )
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ShorMeter() {
  const [screen,      setScreen]      = useState('onboarding')
  const [obStep,      setObStep]      = useState(0)
  const [authMode,    setAuthMode]    = useState('login')
  const [lang,        setLang]        = useState('en')
  const [tab,         setTab]         = useState('home')
  const [user,        setUser]        = useState(null)
  const [authForm,    setAuthForm]    = useState({ name: '', email: '', password: '', phone: '' })
  const [authErr,     setAuthErr]     = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [complaints,  setComplaints]  = useState([])
  const [loadingC,    setLoadingC]    = useState(false)
  const [form,        setForm]        = useState({ type: '', location: '', desc: '', severity: 'medium' })
  const [formErr,     setFormErr]     = useState('')
  const [formSaving,  setFormSaving]  = useState(false)
  const [photoName,   setPhotoName]   = useState('')
  const [filterS,     setFilterS]     = useState('all')
  const [selected,    setSelected]    = useState(null)
  const [showOk,      setShowOk]      = useState(null)
  const [notifOn,     setNotifOn]     = useState(true)
  const scrollRef = useRef(null)
  const fileRef   = useRef(null)
  const L = T[lang]

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) { setUser(u); setScreen('app'); fetchComplaints(u.uid) }
      else   { setUser(null); setScreen(s => s === 'app' ? 'auth' : s) }
    })
    return () => unsub()
  }, [])

  const fetchComplaints = async (uid) => {
    setLoadingC(true)
    try {
      const q = query(collection(db, 'complaints'), where('userId', '==', uid), orderBy('createdAt', 'desc'))
      const snap = await getDocs(q)
      setComplaints(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (e) { console.error(e) }
    setLoadingC(false)
  }

  const goTab = useCallback((t) => {
    setTab(t)
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0 }, 50)
  }, [])

  // ── DERIVED ──
  const activeCount   = complaints.filter(c => c.status !== 'resolved').length
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length
  const displayName   = user?.displayName || user?.email?.split('@')[0] || 'User'
  const initials      = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // ── ONBOARDING ──────────────────────────────────────────────────────────────
  const slides = [
    { emoji: '📡', title: L.ob1t, desc: L.ob1d, accent: '#FF6B35' },
    { emoji: '📋', title: L.ob2t, desc: L.ob2d, accent: '#818CF8' },
    { emoji: '🌿', title: L.ob3t, desc: L.ob3d, accent: '#34D399' },
  ]

  if (screen === 'onboarding') {
    const sl = slides[obStep]
    return (
      <main className="min-h-screen flex items-center justify-center p-5" style={{ background: '#0a0a14' }}>
        <Phone>
          <StatusBar />
          <div className="flex-1 flex flex-col items-center px-8 pb-10">
            <div className="flex justify-end w-full mb-6">
              <button className="press glass-light rounded-full px-4 py-1.5 text-white/60 text-sm cursor-pointer border border-white/20"
                onClick={() => setScreen('auth')} style={{ background: 'rgba(255,255,255,.12)', backdropFilter: 'blur(10px)' }}>
                {L.skip}
              </button>
            </div>
            <div className="animate-float text-8xl mb-8" style={{ filter: `drop-shadow(0 0 30px ${sl.accent}88)` }}>{sl.emoji}</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: 12, lineHeight: 1.25 }}>{sl.title}</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', textAlign: 'center', lineHeight: 1.7, maxWidth: 280 }}>{sl.desc}</p>
            <div className="flex-1" />
            <Dots n={3} cur={obStep} />
            <PrimaryBtn style={{ marginTop: 20, borderRadius: 20 }} onClick={() => obStep < 2 ? setObStep(s => s + 1) : setScreen('auth')}>
              {obStep < 2 ? L.next : L.getStarted}
            </PrimaryBtn>
          </div>
        </Phone>
      </main>
    )
  }

  // ── AUTH ────────────────────────────────────────────────────────────────────
  if (screen === 'auth') {
    const handleAuth = async () => {
      setAuthErr(''); setAuthLoading(true)
      try {
        if (authMode === 'signup') {
          if (!authForm.name.trim()) { setAuthErr('Please enter your full name.'); setAuthLoading(false); return }
          if (authForm.phone.trim().length < 10) { setAuthErr('Enter a valid 10-digit phone number.'); setAuthLoading(false); return }
          const cred = await createUserWithEmailAndPassword(auth, authForm.email.trim(), authForm.password)
          await updateProfile(cred.user, { displayName: authForm.name.trim() })
        } else {
          await signInWithEmailAndPassword(auth, authForm.email.trim(), authForm.password)
        }
        setScreen('app'); setTab('home')
      } catch (e) { setAuthErr(friendlyError(e.code)) }
      setAuthLoading(false)
    }

    return (
      <main className="min-h-screen flex items-center justify-center p-5" style={{ background: '#0a0a14' }}>
        <Phone>
          <StatusBar />
          <div className="flex-1 overflow-y-auto">
            {/* Hero */}
            <div className="text-center px-7 pt-6 pb-9">
              <div className="animate-float text-5xl mb-3">📡</div>
              <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 32, fontWeight: 700, background: 'linear-gradient(135deg,#FF6B35,#FF3CAC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{L.appName}</div>
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginTop: 4 }}>{L.tagline}</p>
            </div>
            {/* Card */}
            <div className="glass rounded-3xl mx-5 p-6 mb-8">
              {/* Lang */}
              <div className="flex gap-2 mb-5">
                {[['en', 'EN'], ['hi', 'हि'], ['mr', 'म']].map(([c, l]) => (
                  <button key={c} className="chip-btn press flex-1 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                    style={{ border: `1px solid ${lang === c ? 'rgba(255,107,53,.7)' : 'rgba(255,255,255,.1)'}`, background: lang === c ? 'rgba(255,107,53,.15)' : 'transparent', color: lang === c ? '#FF6B35' : 'rgba(255,255,255,.45)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                    onClick={() => setLang(c)}>{l}</button>
                ))}
              </div>
              {/* Toggle */}
              <div className="flex p-1 rounded-xl mb-5" style={{ background: 'rgba(0,0,0,.3)' }}>
                {['login', 'signup'].map(m => (
                  <button key={m} className="press flex-1 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                    style={{ background: authMode === m ? 'rgba(255,107,53,.9)' : 'transparent', color: authMode === m ? '#fff' : 'rgba(255,255,255,.4)', border: 'none', boxShadow: authMode === m ? '0 4px 15px rgba(255,107,53,.4)' : 'none', fontFamily: "'Plus Jakarta Sans',sans-serif", transition: 'all .2s' }}
                    onClick={() => { setAuthMode(m); setAuthErr('') }}>
                    {m === 'login' ? L.login : L.signup}
                  </button>
                ))}
              </div>
              <ErrorBox msg={authErr} />
              <div className="flex flex-col gap-3">
                {authMode === 'signup' && <>
                  <GlassInput placeholder={L.name} value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
                  <GlassInput placeholder={L.phone} type="tel" maxLength={10} value={authForm.phone} onChange={e => setAuthForm({ ...authForm, phone: e.target.value.replace(/\D/g, '') })} />
                </>}
                <GlassInput placeholder={L.email} type="email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
                <GlassInput placeholder={L.password} type="password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
              </div>
              <PrimaryBtn style={{ marginTop: 20 }} onClick={handleAuth} disabled={authLoading}>
                {authLoading ? (authMode === 'login' ? L.signingIn : L.signingUp) : (authMode === 'login' ? L.login : L.signup)}
              </PrimaryBtn>
              <p className="text-center mt-4" style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>
                {authMode === 'login' ? L.noAcc : L.haveAcc}{' '}
                <span className="cursor-pointer font-bold" style={{ color: '#FF6B35' }}
                  onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthErr('') }}>
                  {authMode === 'login' ? L.signup : L.login}
                </span>
              </p>
            </div>
          </div>
        </Phone>
      </main>
    )
  }

  // ── MAIN APP ─────────────────────────────────────────────────────────────────
  const submitComplaint = async () => {
    setFormErr('')
    if (!form.type)                     { setFormErr('Please select an issue type.'); return }
    if (!form.location.trim())          { setFormErr('Please enter the location.'); return }
    if (form.desc.trim().length < 10)   { setFormErr('Describe the issue in at least 10 characters.'); return }
    setFormSaving(true)
    try {
      const payload = {
        userId: user.uid, type: form.type, location: form.location.trim(),
        desc: form.desc.trim(), severity: form.severity, status: 'pending',
        authority: ISSUE_AUTH[form.type] || 'MBMC', eta: etaStr(),
        createdAt: serverTimestamp(),
        date: dateStr(),
      }
      const ref = await addDoc(collection(db, 'complaints'), payload)
      setComplaints(prev => [{ id: ref.id, ...payload, createdAt: new Date() }, ...prev])
      setForm({ type: '', location: '', desc: '', severity: 'medium' })
      setPhotoName('')
      setShowOk(ref.id.slice(-7).toUpperCase())
    } catch (e) { setFormErr('Failed to save. Check your internet.'); console.error(e) }
    setFormSaving(false)
  }

  const filtered = filterS === 'all' ? complaints : complaints.filter(c => c.status === filterS)
  const maxBar   = Math.max(...MONTHLY)
  const catData  = [
    { label: L.noiseLabel,        pct: Math.round(complaints.filter(c => c.type?.toLowerCase().includes('noise')).length / Math.max(complaints.length, 1) * 100),        col: '#FF6B35' },
    { label: L.constructionLabel, pct: Math.round(complaints.filter(c => c.type?.toLowerCase().includes('construction')).length / Math.max(complaints.length, 1) * 100), col: '#818CF8' },
    { label: L.garbageLabel,      pct: Math.round(complaints.filter(c => c.type?.toLowerCase().includes('garbage')).length / Math.max(complaints.length, 1) * 100),      col: '#34D399' },
    { label: L.sewageLabel,       pct: Math.round(complaints.filter(c => c.type?.toLowerCase().includes('sewage')).length / Math.max(complaints.length, 1) * 100),       col: '#FCD34D' },
  ]

  const TABS = [
    { id: 'home',       icon: '🏠', label: L.home },
    { id: 'report',     icon: '📢', label: L.report },
    { id: 'complaints', icon: '📋', label: L.complaints },
    { id: 'analytics',  icon: '📊', label: L.analyticsTab },
    { id: 'profile',    icon: '👤', label: L.profile },
  ]

  return (
    <main className="min-h-screen flex items-center justify-center p-5" style={{ background: '#0a0a14' }}>
      <Phone>
        <StatusBar />
        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="animate-fade-up">

            {/* ═══ HOME ═══ */}
            {tab === 'home' && (
              <div className="pb-4">
                {/* Header */}
                <div className="px-5 pt-2 pb-7">
                  <div className="flex justify-between items-start mb-5">
                    <div>
                      <p style={{ color: 'rgba(255,255,255,.45)', fontSize: 12, marginBottom: 2 }}>{L.hello},</p>
                      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: '#fff' }}>{displayName} 👋</p>
                      <p style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, marginTop: 2 }}>Mira-Bhayandar, MH</p>
                    </div>
                    <div className="animate-glow glass-light rounded-full px-3 py-2 flex items-center gap-2" style={{ backdropFilter: 'blur(12px)' }}>
                      <div className="animate-pulse-dot w-2 h-2 rounded-full" style={{ background: '#FF6B35' }} />
                      <span style={{ color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>{L.nearbyAlert}</span>
                    </div>
                  </div>
                  {/* Stat cards — v0 StatCard style */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { label: L.activeC,  val: activeCount,   col: '#FF6B35', icon: '🔴' },
                      { label: L.resolved, val: resolvedCount, col: '#34D399', icon: '✅' },
                      { label: L.avgResp,  val: '2.4d',        col: '#FCD34D', icon: '⏱' },
                    ].map((s, i) => (
                      <div key={i} className="glass rounded-2xl p-3 text-center">
                        <div style={{ fontSize: 18, marginBottom: 3 }}>{s.icon}</div>
                        <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: s.col }}>{s.val}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-5">
                  <SectionLabel>{L.quickReport}</SectionLabel>
                  {/* v0 QuickReportButton style */}
                  <div className="grid grid-cols-2 gap-2.5 mb-6">
                    {QUICK_TYPES.map((it, i) => (
                      <button key={i} className="press chip-btn group relative glass rounded-2xl p-4 flex flex-col items-center gap-2 cursor-pointer overflow-hidden"
                        style={{ border: `1px solid ${it.col}33`, boxShadow: `0 4px 20px ${it.glow}` }}
                        onClick={() => { setForm({ ...form, type: it.type }); goTab('report') }}>
                        <span style={{ fontSize: 28, filter: `drop-shadow(0 0 8px ${it.col}88)` }}>{it.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: it.col, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{it.label}</span>
                      </button>
                    ))}
                  </div>

                  <SectionLabel>{L.recentAct}</SectionLabel>
                  {loadingC && <Spinner text={L.loading} />}
                  {!loadingC && complaints.length === 0 && (
                    <GlassCard><p style={{ color: 'rgba(255,255,255,.35)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{L.noComplaints}</p></GlassCard>
                  )}
                  {/* v0 ActivityFeed style */}
                  {!loadingC && complaints.slice(0, 4).map((c, i) => {
                    const sc = STATUS_CFG[c.status] || STATUS_CFG.pending
                    return (
                      <GlassCard key={i} style={{ border: `1px solid ${sc.border}` }} onClick={() => setSelected(c)}>
                        <div className="flex gap-3 items-start">
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: sc.bg, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{ISSUE_ICONS[c.type] || '📋'}</div>
                          <div className="flex-1 min-w-0">
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{c.type}</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginBottom: 5 }}>📍 {c.location}</p>
                            <StatusBadge status={c.status} lang={lang} />
                          </div>
                          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', whiteSpace: 'nowrap' }}>{c.date}</span>
                        </div>
                      </GlassCard>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ═══ REPORT ═══ */}
            {tab === 'report' && (
              <div className="px-5 pt-2 pb-24">
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{L.fileComplaint}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginBottom: 16 }}>Mira-Bhayandar Municipal Corporation</p>
                <ErrorBox msg={formErr} />

                {/* Issue type */}
                <GlassCard>
                  <GlassLabel>{L.issueType} *</GlassLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {ISSUE_TYPES.map(t => {
                      const a = form.type === t
                      return (
                        <button key={t} className="chip-btn press flex items-center gap-2 p-2.5 rounded-xl text-xs cursor-pointer"
                          style={{ border: `1px solid ${a ? 'rgba(255,107,53,.6)' : 'rgba(255,255,255,.1)'}`, background: a ? 'rgba(255,107,53,.15)' : 'rgba(255,255,255,.04)', fontWeight: a ? 700 : 400, color: a ? '#FF6B35' : 'rgba(255,255,255,.55)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                          onClick={() => { setForm({ ...form, type: t }); setFormErr('') }}>
                          <span>{ISSUE_ICONS[t]}</span>{t}
                        </button>
                      )
                    })}
                  </div>
                </GlassCard>

                {/* Location */}
                <GlassCard>
                  <GlassLabel>{L.location} *</GlassLabel>
                  <GlassInput value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder={L.enterLoc} />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['Bhayandar West', 'Mira Road', 'Kashimira', 'Bhayandar East'].map(l => (
                      <button key={l} className="chip-btn text-xs px-3 py-1.5 rounded-full cursor-pointer"
                        style={{ border: `1px solid ${form.location === l ? 'rgba(255,107,53,.6)' : 'rgba(255,255,255,.1)'}`, background: form.location === l ? 'rgba(255,107,53,.15)' : 'transparent', color: form.location === l ? '#FF6B35' : 'rgba(255,255,255,.4)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                        onClick={() => setForm({ ...form, location: l })}>{l}</button>
                    ))}
                  </div>
                </GlassCard>

                {/* Severity */}
                <GlassCard>
                  <GlassLabel>{L.severity}</GlassLabel>
                  <div className="flex gap-2">
                    {[['low', L.low, '#34D399', 'rgba(52,211,153,.15)'], ['medium', L.medium, '#FCD34D', 'rgba(252,211,77,.15)'], ['high', L.high, '#F87171', 'rgba(248,113,113,.15)']].map(([s, lbl, col, bg]) => {
                      const a = form.severity === s
                      return (
                        <button key={s} className="chip-btn press flex-1 py-2.5 rounded-xl text-sm cursor-pointer"
                          style={{ border: `1px solid ${a ? col + '88' : 'rgba(255,255,255,.1)'}`, background: a ? bg : 'rgba(255,255,255,.04)', fontWeight: a ? 700 : 400, color: a ? col : 'rgba(255,255,255,.4)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                          onClick={() => setForm({ ...form, severity: s })}>{lbl}</button>
                      )
                    })}
                  </div>
                </GlassCard>

                {/* Description */}
                <GlassCard>
                  <GlassLabel>{L.descLabel} *</GlassLabel>
                  <GlassTextarea value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder={L.descPlaceholder} />
                  <p style={{ textAlign: 'right', fontSize: 11, color: form.desc.length >= 10 ? 'rgba(255,255,255,.3)' : 'rgba(248,113,113,.8)', marginTop: 4 }}>{form.desc.length} chars {form.desc.length < 10 ? '(min 10)' : ''}</p>
                </GlassCard>

                {/* Photo */}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => setPhotoName(e.target.files[0]?.name || '')} />
                <GlassCard style={{ border: `1.5px dashed ${photoName ? 'rgba(52,211,153,.5)' : 'rgba(252,211,77,.4)'}`, background: photoName ? 'rgba(52,211,153,.06)' : 'rgba(252,211,77,.04)', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: 24 }}>{photoName ? '✅' : '📷'}</span>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: photoName ? '#34D399' : '#FCD34D' }}>{photoName || L.photo}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)' }}>{photoName ? 'Photo attached — tap to change' : 'Optional but helps resolve faster'}</p>
                    </div>
                  </div>
                </GlassCard>

                <PrimaryBtn onClick={submitComplaint} disabled={formSaving}>
                  {formSaving ? L.saving : L.submitBtn}
                </PrimaryBtn>
              </div>
            )}

            {/* ═══ COMPLAINTS ═══ */}
            {tab === 'complaints' && (
              <div className="px-5 pt-2 pb-24">
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 14 }}>{L.myComplaints}</p>
                {/* Filter chips */}
                <div className="flex gap-2 mb-4 flex-wrap">
                  {[['all', L.all, complaints.length], ['pending', L.pending, complaints.filter(c => c.status === 'pending').length], ['inProgress', L.inProgress, complaints.filter(c => c.status === 'inProgress').length], ['resolved', L.resolvedS, resolvedCount]].map(([s, lbl, cnt]) => (
                    <button key={s} className="chip-btn press px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer"
                      style={{ border: `1px solid ${filterS === s ? 'rgba(255,107,53,.6)' : 'rgba(255,255,255,.12)'}`, background: filterS === s ? 'rgba(255,107,53,.2)' : 'rgba(255,255,255,.05)', color: filterS === s ? '#FF6B35' : 'rgba(255,255,255,.45)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                      onClick={() => setFilterS(s)}>{lbl} ({cnt})</button>
                  ))}
                </div>
                {loadingC && <Spinner text={L.loading} />}
                {!loadingC && filtered.length === 0 && <GlassCard><p style={{ color: 'rgba(255,255,255,.35)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>{L.noComplaints}</p></GlassCard>}
                {!loadingC && filtered.map(c => {
                  const sc = STATUS_CFG[c.status] || STATUS_CFG.pending
                  const sevCol = c.severity === 'high' ? '#F87171' : c.severity === 'medium' ? '#FCD34D' : '#34D399'
                  return (
                    <GlassCard key={c.id} style={{ border: `1px solid ${sc.border}`, cursor: 'pointer' }} onClick={() => setSelected(c)}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2.5 items-center">
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: sc.bg, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{ISSUE_ICONS[c.type] || '📋'}</div>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.type}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>#{c.id.slice(-7).toUpperCase()}</p>
                          </div>
                        </div>
                        <StatusBadge status={c.status} lang={lang} />
                      </div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', marginBottom: 4 }}>📍 {c.location}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginBottom: 10 }}>{c.desc?.length > 68 ? c.desc.slice(0, 68) + '…' : c.desc}</p>
                      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,.07)' }}>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)' }}>🗓 {c.date}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: sevCol, background: `${sevCol}18`, border: `1px solid ${sevCol}33`, borderRadius: 20, padding: '2px 8px' }}>{c.severity?.toUpperCase()}</span>
                        <span style={{ fontSize: 10, color: c.status === 'resolved' ? '#34D399' : '#FCD34D', fontWeight: 600 }}>{c.status === 'resolved' ? '✅ Done' : `ETA: ${c.eta}`}</span>
                      </div>
                    </GlassCard>
                  )
                })}
              </div>
            )}

            {/* ═══ ANALYTICS ═══ */}
            {tab === 'analytics' && (
              <div className="px-5 pt-2 pb-24">
                <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{L.analyticsTab}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginBottom: 16 }}>Mira-Bhayandar • 2023–2024</p>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  {[
                    { label: L.totalReports, val: (complaints.length + 2098).toLocaleString(), icon: '📋', col: '#FF6B35', glow: 'rgba(255,107,53,.2)' },
                    { label: L.thisMonth,    val: 267 + complaints.length,                     icon: '📈', col: '#34D399', glow: 'rgba(52,211,153,.2)' },
                  ].map((s, i) => (
                    <div key={i} className="glass rounded-2xl p-4" style={{ boxShadow: `0 4px 20px ${s.glow}` }}>
                      <div style={{ fontSize: 22, marginBottom: 5 }}>{s.icon}</div>
                      <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 26, fontWeight: 700, color: s.col }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
                {/* Bar chart */}
                <GlassCard>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginBottom: 12 }}>{L.monthlyTrend}</p>
                  <div className="flex items-end gap-1" style={{ height: 88 }}>
                    {MONTHLY.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <div style={{ width: '100%', borderRadius: '3px 3px 0 0', background: i === MONTHLY.length - 1 ? 'linear-gradient(180deg,#FF6B35,#FF3CAC)' : `rgba(255,107,53,${0.2 + (v / maxBar) * 0.6})`, height: Math.round((v / maxBar) * 74), boxShadow: i === MONTHLY.length - 1 ? '0 0 10px rgba(255,107,53,.5)' : 'none' }} />
                        <span style={{ fontSize: 7, color: 'rgba(255,255,255,.3)' }}>{MONTHS[i]}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
                {/* Categories */}
                <GlassCard>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginBottom: 12 }}>{L.byCategory}</p>
                  {catData.map((c, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between mb-1.5">
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.7)' }}>{c.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: c.col }}>{c.pct || 0}%</span>
                      </div>
                      <div style={{ height: 7, background: 'rgba(255,255,255,.07)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${c.pct || 0}%`, background: `linear-gradient(90deg,${c.col}99,${c.col})`, borderRadius: 4, boxShadow: `0 0 8px ${c.col}66` }} />
                      </div>
                    </div>
                  ))}
                </GlassCard>
                {/* Hotspots */}
                <GlassCard>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginBottom: 12 }}>🔥 {L.hotspots}</p>
                  {HOTSPOTS.map((h, i) => (
                    <div key={i} className="flex justify-between items-center py-2.5" style={{ borderBottom: i < HOTSPOTS.length - 1 ? '1px solid rgba(255,255,255,.07)' : 'none' }}>
                      <div className="flex gap-2.5 items-center">
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? 'linear-gradient(135deg,#FF6B35,#FF3CAC)' : i === 1 ? 'rgba(252,211,77,.2)' : 'rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: i === 0 ? '#fff' : i === 1 ? '#FCD34D' : 'rgba(255,255,255,.4)', border: i === 1 ? '1px solid rgba(252,211,77,.3)' : 'none' }}>{i + 1}</div>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.75)' }}>{h.name}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#FF6B35', background: 'rgba(255,107,53,.12)', border: '1px solid rgba(255,107,53,.25)', borderRadius: 20, padding: '2px 10px' }}>{h.count}</span>
                    </div>
                  ))}
                </GlassCard>
              </div>
            )}

            {/* ═══ PROFILE ═══ */}
            {tab === 'profile' && (
              <div className="px-5 pt-2 pb-24">
                {/* Hero card */}
                <GlassCard style={{ textAlign: 'center', padding: '22px 18px', marginBottom: 12 }}>
                  <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B35,#FF3CAC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 auto 12px', boxShadow: '0 8px 24px rgba(255,107,53,.4)' }}>{initials}</div>
                  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>{displayName}</p>
                  <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 12, marginTop: 3 }}>{user?.email}</p>
                  <div className="flex justify-center gap-2 mt-3">
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#FF6B35', background: 'rgba(255,107,53,.15)', border: '1px solid rgba(255,107,53,.3)', borderRadius: 20, padding: '4px 12px' }}>⭐ {complaints.length} Reports</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#34D399', background: 'rgba(52,211,153,.15)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 20, padding: '4px 12px' }}>✅ {resolvedCount} Resolved</span>
                  </div>
                </GlassCard>

                {/* Language */}
                <GlassCard style={{ marginBottom: 10 }}>
                  <GlassLabel>{L.language}</GlassLabel>
                  <div className="flex gap-2">
                    {[['en', 'English'], ['hi', 'हिंदी'], ['mr', 'मराठी']].map(([c, lbl]) => (
                      <button key={c} className="chip-btn press flex-1 py-2.5 rounded-xl text-sm cursor-pointer"
                        style={{ border: `1px solid ${lang === c ? 'rgba(255,107,53,.6)' : 'rgba(255,255,255,.1)'}`, background: lang === c ? 'rgba(255,107,53,.15)' : 'rgba(255,255,255,.04)', fontWeight: lang === c ? 700 : 400, color: lang === c ? '#FF6B35' : 'rgba(255,255,255,.4)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                        onClick={() => setLang(c)}>{lbl}</button>
                    ))}
                  </div>
                </GlassCard>

                {/* Notifications toggle */}
                <GlassCard style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 10 }} onClick={() => setNotifOn(v => !v)}>
                  <span style={{ fontSize: 20 }}>🔔</span>
                  <span style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,.8)' }}>{L.notifications}</span>
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: notifOn ? 'linear-gradient(135deg,#FF6B35,#FF3CAC)' : 'rgba(255,255,255,.1)', transition: 'background .25s', position: 'relative', boxShadow: notifOn ? '0 0 12px rgba(255,107,53,.4)' : 'none' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: notifOn ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,.3)' }} />
                  </div>
                </GlassCard>

                {[{ icon: '📞', label: L.helpline, extra: '1800-22-7773' }, { icon: 'ℹ️', label: L.about, extra: 'v3.0' }, { icon: '📄', label: L.rules, extra: '→' }].map((it, i) => (
                  <GlassCard key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 10 }}>
                    <span style={{ fontSize: 20 }}>{it.icon}</span>
                    <span style={{ flex: 1, fontSize: 14, color: 'rgba(255,255,255,.75)' }}>{it.label}</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>{it.extra}</span>
                  </GlassCard>
                ))}

                <button className="press w-full py-3.5 rounded-2xl font-bold text-sm cursor-pointer mt-1"
                  style={{ border: '1px solid rgba(248,113,113,.3)', background: 'rgba(248,113,113,.1)', color: '#F87171', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                  onClick={() => signOut(auth)}>{L.logout}</button>
              </div>
            )}

          </div>
        </div>

        {/* ── BOTTOM NAV ── */}
        <div className="glass-light flex items-center justify-around px-1 pb-2" style={{ height: 72, borderTop: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} className="nav-hover press flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl cursor-pointer"
              style={{ background: tab === t.id ? 'rgba(255,107,53,.15)' : 'transparent', border: `1px solid ${tab === t.id ? 'rgba(255,107,53,.3)' : 'transparent'}`, transition: 'all .2s' }}
              onClick={() => goTab(t.id)}>
              <span style={{ fontSize: 20, opacity: tab === t.id ? 1 : 0.38, filter: tab === t.id ? 'drop-shadow(0 0 6px #FF6B35)' : 'none' }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? '#FF6B35' : 'rgba(255,255,255,.35)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}>{t.label}</span>
            </button>
          ))}
        </div>
      </Phone>

      {/* ── SUCCESS MODAL ── */}
      {showOk && (
        <Overlay onClose={() => setShowOk(null)}>
          <div className="glass-light animate-scale-in rounded-3xl p-7 text-center" style={{ maxWidth: 320, width: '100%' }} onClick={e => e.stopPropagation()}>
            <div className="animate-float text-5xl mb-3">🎉</div>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{L.successTitle}</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 6 }}>#{showOk}</p>
            <div style={{ background: 'rgba(52,211,153,.15)', border: '1px solid rgba(52,211,153,.3)', borderRadius: 10, padding: '8px 14px', fontSize: 12, color: '#34D399', marginBottom: 14 }}>✅ Saved to Firebase database</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.5, marginBottom: 20 }}>{L.successDesc}</p>
            <div className="flex gap-3">
              <button className="press flex-1 py-3 rounded-2xl text-sm font-semibold cursor-pointer" style={{ border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.7)', fontFamily: "'Plus Jakarta Sans',sans-serif" }}
                onClick={() => { setShowOk(null); goTab('complaints') }}>{L.trackIt}</button>
              <PrimaryBtn style={{ flex: 1, padding: '12px 0' }} onClick={() => setShowOk(null)}>{L.close}</PrimaryBtn>
            </div>
          </div>
        </Overlay>
      )}

      {/* ── DETAIL SHEET ── */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={() => setSelected(null)}>
          <div className="glass-light animate-slide-up" style={{ borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: '20px 22px 40px', width: '100%', maxWidth: 390 }} onClick={e => e.stopPropagation()}>
            <div style={{ width: 36, height: 4, background: 'rgba(255,255,255,.2)', borderRadius: 2, margin: '0 auto 18px' }} />
            <div className="flex justify-between items-center mb-4">
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 19, fontWeight: 700, color: '#fff' }}>Complaint Details</p>
              <StatusBadge status={selected.status} lang={lang} />
            </div>
            {[[L.complaintId, '#' + selected.id.slice(-7).toUpperCase()], [L.issueType, selected.type], [L.location, selected.location], [L.authority, selected.authority], [L.submitted, selected.date], [L.eta, selected.eta]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.35)' }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', textAlign: 'right', maxWidth: '60%' }}>{v}</span>
              </div>
            ))}
            <div className="glass rounded-2xl p-4 mt-3">
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.8px' }}>{L.details}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', lineHeight: 1.6 }}>{selected.desc}</p>
            </div>
            <PrimaryBtn style={{ marginTop: 16 }} onClick={() => setSelected(null)}>{L.close}</PrimaryBtn>
          </div>
        </div>
      )}
    </main>
  )
}
