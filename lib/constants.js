export const ISSUE_TYPES = [
  'Noise Pollution', 'Construction Noise', 'Garbage Disposal',
  'Sewage Issue', 'Traffic Congestion', 'Industrial Noise'
]

export const ISSUE_ICONS = {
  'Noise Pollution': '📢', 'Construction Noise': '🏗️',
  'Garbage Disposal': '🗑️', 'Sewage Issue': '💧',
  'Traffic Congestion': '🚗', 'Industrial Noise': '🏭'
}

export const ISSUE_AUTH = {
  'Noise Pollution': 'MBMC Noise Cell',
  'Construction Noise': 'MBMC Building Dept.',
  'Garbage Disposal': 'MBMC Sanitation',
  'Sewage Issue': 'MBMC Water Dept.',
  'Traffic Congestion': 'Traffic Police',
  'Industrial Noise': 'MPCB'
}

export const STATUS_CFG = {
  pending:    { color: '#FCD34D', bg: 'rgba(252,211,77,0.15)',  border: 'rgba(252,211,77,0.4)',  dot: '●', label: { en: 'Pending',     hi: 'लंबित',        mr: 'प्रलंबित' } },
  inProgress: { color: '#60A5FA', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.4)',  dot: '●', label: { en: 'In Progress', hi: 'प्रगति में',    mr: 'प्रगतीपथावर' } },
  resolved:   { color: '#34D399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.4)',  dot: '●', label: { en: 'Resolved',    hi: 'हल हुई',        mr: 'निराकरण' } },
}

export const MONTHLY  = [120, 145, 98, 167, 189, 134, 210, 178, 220, 195, 242, 267]
export const MONTHS   = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar']
export const HOTSPOTS = [
  { name: 'Bhayandar West Station', count: 87 },
  { name: 'Mira Road Sector 4',     count: 64 },
  { name: 'Kashimira Junction',     count: 51 },
  { name: 'Golden Nest Colony',     count: 43 },
  { name: 'Navghar Road',           count: 38 },
]

export const QUICK_TYPES = [
  { icon: '📢', label: 'Noise',        col: '#FF6B35', glow: 'rgba(255,107,53,.3)',  type: 'Noise Pollution' },
  { icon: '🏗️', label: 'Construction', col: '#818CF8', glow: 'rgba(129,140,248,.3)', type: 'Construction Noise' },
  { icon: '🗑️', label: 'Garbage',      col: '#34D399', glow: 'rgba(52,211,153,.3)',  type: 'Garbage Disposal' },
  { icon: '💧', label: 'Sewage',       col: '#60A5FA', glow: 'rgba(96,165,250,.3)',  type: 'Sewage Issue' },
]
