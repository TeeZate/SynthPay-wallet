import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi, api } from '../lib/api'
import { analytics } from '../lib/analytics'
import {
  Bot, BarChart2, BookOpen, Film, CreditCard, Heart, Zap,
  ArrowLeft, Search, Music, Newspaper, Lock, Play, X,
  ChevronLeft, Volume2, TrendingUp, Clock, Globe, Wifi,
  FileText, Activity, Send, Loader,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service {
  endpoint_id: string
  path: string
  price: number
  service_name: string
  description: string
  category: string
}
interface Merchant {
  merchant_id: string
  merchant_name: string
  services: Service[]
}
interface ContentItem {
  id: string
  title: string
  subtitle: string
  meta: string
  price: number
  coverGrad: string
  badge?: string
  contentType: 'youtube' | 'article' | 'audio' | 'ticker' | 'chat' | 'breathing'
  payload: any
  endpointId: string
}
interface PayingState {
  id: string
  step: 'confirm' | 'paying' | 'error'
  error?: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  amber: '#F59B00', amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#F7F5F2', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', red: '#DC2626', navy: '#111827',
}

const ALL_CATEGORIES = ['All', 'AI', 'Media', 'Education', 'Finance', 'Health', 'Music', 'News', 'General']

const CAT_GRADIENTS: Record<string, string> = {
  AI:        'linear-gradient(135deg,#7c3aed,#4f46e5)',
  Media:     'linear-gradient(135deg,#141414,#e50914)',
  Education: 'linear-gradient(135deg,#064e3b,#059669)',
  Finance:   'linear-gradient(135deg,#0f172a,#0ea5e9)',
  Health:    'linear-gradient(135deg,#1a0826,#7c3aed)',
  Music:     'linear-gradient(135deg,#121212,#1DB954)',
  News:      'linear-gradient(135deg,#111827,#F59B00)',
  General:   'linear-gradient(135deg,#1c1917,#F59B00)',
  Sports:    'linear-gradient(135deg,#0a0f1a,#FFCC00)',
}

const CAT_ACCENTS: Record<string, string> = {
  AI: '#7c3aed', Media: '#e50914', Education: '#059669', Finance: '#0ea5e9',
  Health: '#a78bfa', Music: '#1DB954', News: '#F59B00', General: '#F59B00',
  Sports: '#FFCC00',
}

function getGradient(cat: string) { return CAT_GRADIENTS[cat] || CAT_GRADIENTS.General }
function getAccent(cat: string)   { return CAT_ACCENTS[cat]   || CAT_ACCENTS.General }

const CAT_ICONS: Record<string, React.ReactNode> = {
  AI: <Bot size={16}/>, Media: <Film size={16}/>, Education: <BookOpen size={16}/>,
  Finance: <TrendingUp size={16}/>, Health: <Heart size={16}/>, Music: <Music size={16}/>,
  News: <Newspaper size={16}/>, General: <Zap size={16}/>, Sports: <Activity size={16}/>,
}
function getCatIcon(cat: string) { return CAT_ICONS[cat] || <Zap size={16}/> }

// ─── Template detection ───────────────────────────────────────────────────────
function detectTemplate(name: string, cat: string, desc: string): string {
  const s = (name + ' ' + cat + ' ' + desc).toLowerCase()
  if (/\b(netflix|stream|cinema|movie|film|watch|hulu|disney|prime|hbo|video|series)\b/.test(s)) return 'streaming'
  if (/\b(bein|espn|sport|football|soccer|cricket|basketball|match|stadium|league|live sport)\b/.test(s)) return 'sports'
  if (/\b(spotify|music|audio|podcast|radio|track|song|beat|playlist|sound|album)\b/.test(s)) return 'music'
  if (/\b(gazette|news|press|article|journal|headline|newsletter|bbc|cnn|times|daily)\b/.test(s)) return 'news'
  if (/\b(education|learn|course|tutorial|study|academy|lesson|udemy|coursera|class)\b/.test(s)) return 'education'
  if (/\b(ai|gpt|bot|llm|assistant|chatbot|claude|openai|gemini|model|copilot)\b/.test(s)) return 'ai'
  if (/\b(finance|market|stock|crypto|trading|bloomberg|reuters|forex|invest|price)\b/.test(s)) return 'finance'
  if (/\b(health|wellness|yoga|meditation|calm|headspace|fitness|breathe|mindful)\b/.test(s)) return 'health'
  if (/\b(media|entertainment|content|streaming)\b/.test(s)) return 'streaming'
  return 'generic'
}

// ─── Template themes ──────────────────────────────────────────────────────────
const THEMES: Record<string, { bg: string; surface: string; accent: string; accentDark: string; text: string; textSub: string; border: string }> = {
  streaming: { bg: '#141414', surface: '#1f1f1f', accent: '#e50914', accentDark: '#b00810', text: '#FFFFFF', textSub: '#aaaaaa', border: '#2a2a2a' },
  sports:    { bg: '#0a0f1a', surface: '#131c2e', accent: '#FFCC00', accentDark: '#cca300', text: '#FFFFFF', textSub: '#7a8eaa', border: '#1a2740' },
  news:      { bg: '#111111', surface: '#1c1c1c', accent: '#F59B00', accentDark: '#c07a00', text: '#F5F0E8', textSub: '#888888', border: '#2a2a2a' },
  music:     { bg: '#121212', surface: '#181818', accent: '#1DB954', accentDark: '#158a3e', text: '#FFFFFF', textSub: '#b3b3b3', border: '#282828' },
  education: { bg: '#0a1628', surface: '#0f1e3d', accent: '#3b82f6', accentDark: '#1d4ed8', text: '#FFFFFF', textSub: '#7a99cc', border: '#182a50' },
  ai:        { bg: '#0f0a1e', surface: '#1a1030', accent: '#7c3aed', accentDark: '#5b21b6', text: '#FFFFFF', textSub: '#9090cc', border: '#281848' },
  finance:   { bg: '#080e08', surface: '#0f180f', accent: '#00ff88', accentDark: '#00cc6a', text: '#e0ffe0', textSub: '#55aa77', border: '#152015' },
  health:    { bg: '#0f0820', surface: '#180f30', accent: '#a78bfa', accentDark: '#7c3aed', text: '#FFFFFF', textSub: '#9988cc', border: '#281848' },
  generic:   { bg: '#0D0C0A', surface: '#1a1917', accent: '#F59B00', accentDark: '#D98A00', text: '#FFFFFF', textSub: '#9A958F', border: '#2a2826' },
}
function getTheme(t: string) { return THEMES[t] || THEMES.generic }

// ─── Cover gradient pool ──────────────────────────────────────────────────────
const COVER_POOL = [
  'linear-gradient(135deg,#1a1a2e,#e50914)','linear-gradient(135deg,#0d1b2a,#1b6ca8)',
  'linear-gradient(135deg,#1b4332,#40916c)','linear-gradient(135deg,#200122,#6f0000)',
  'linear-gradient(135deg,#0f0c29,#302b63)','linear-gradient(135deg,#0d0221,#21063d)',
  'linear-gradient(135deg,#004e92,#000428)','linear-gradient(135deg,#1a0000,#DC2626)',
  'linear-gradient(135deg,#1f4037,#99f2c8)','linear-gradient(135deg,#141414,#1DB954)',
  'linear-gradient(135deg,#1a1200,#3d2b00)','linear-gradient(135deg,#0a1628,#2a4a8c)',
]
function seedGrad(s: string) {
  let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return COVER_POOL[Math.abs(h) % COVER_POOL.length]
}

// ─── Mock catalog data ────────────────────────────────────────────────────────
type MockItem = Omit<ContentItem, 'endpointId'>

const STREAMING_ITEMS: MockItem[] = [
  { id: 'bbb',    title: 'Big Buck Bunny',       subtitle: 'Animation · Comedy',      meta: '9 min',  price: 0.05, coverGrad: 'linear-gradient(135deg,#2d4a1e,#5a9216)', badge: 'HD',   contentType: 'youtube',  payload: { videoId: 'YE7VzlLtp-4',  title: 'Big Buck Bunny (2008)' } },
  { id: 'ed',     title: 'Elephants Dream',       subtitle: 'Animation · Drama',       meta: '11 min', price: 0.05, coverGrad: 'linear-gradient(135deg,#0f2027,#203a43)', badge: 'HD',   contentType: 'youtube',  payload: { videoId: 'TLkA0RELQ1g',  title: 'Elephants Dream (2006)' } },
  { id: 'tos',    title: 'Tears of Steel',        subtitle: 'Sci-Fi · Action',         meta: '12 min', price: 0.08, coverGrad: 'linear-gradient(135deg,#1a1a2e,#16213e)', badge: '4K',   contentType: 'youtube',  payload: { videoId: 'R6MlUcmOul8',  title: 'Tears of Steel (2012)' } },
  { id: 'sintel', title: 'Sintel',                subtitle: 'Animation · Fantasy',     meta: '14 min', price: 0.05, coverGrad: 'linear-gradient(135deg,#4a0000,#8b0000)', badge: 'HD',   contentType: 'youtube',  payload: { videoId: 'eRsGyueVLvQ',  title: 'Sintel (2010)' } },
  { id: 'cosmos1',title: 'Cosmos — Episode 1',    subtitle: 'Documentary · Science',   meta: '45 min', price: 0.08, coverGrad: 'linear-gradient(135deg,#0d0221,#21063d)',              contentType: 'youtube',  payload: { videoId: 'bxABOiay7oA',  title: 'Cosmos: Standing Up in the Milky Way' } },
  { id: 'cosmos2',title: 'Cosmos — Episode 2',    subtitle: 'Documentary · Science',   meta: '45 min', price: 0.08, coverGrad: 'linear-gradient(135deg,#00092b,#1a2a6c)',              contentType: 'youtube',  payload: { videoId: 'U5sW4HMxPMg',  title: 'Cosmos: Some Things That Molecules Do' } },
  { id: 'agent',  title: 'Agent 327: Operation Barbershop', subtitle: 'Animation · Action', meta: '3 min', price: 0.03, coverGrad: 'linear-gradient(135deg,#1a0000,#cc2200)', badge: 'NEW', contentType: 'youtube', payload: { videoId: 'mN0zPOpADL4', title: 'Agent 327: Operation Barbershop' } },
]

const SPORTS_ITEMS: MockItem[] = [
  { id: 'sp1', title: 'Man City vs Real Madrid',     subtitle: 'UEFA Champions League · Semi-Final',  meta: 'LIVE',          price: 0.10, coverGrad: 'linear-gradient(135deg,#001f3f,#0074D9)', badge: 'LIVE',   contentType: 'youtube', payload: { videoId: 'L_jWHffIx5E', title: 'Man City vs Real Madrid' } },
  { id: 'sp2', title: 'Arsenal vs PSG',              subtitle: 'UEFA Champions League · QF Replay',   meta: '90 min replay', price: 0.05, coverGrad: 'linear-gradient(135deg,#4a0000,#cc0000)', badge: 'REPLAY', contentType: 'youtube', payload: { videoId: 'xvFZjo5PgG0', title: 'Arsenal vs PSG Highlights' } },
  { id: 'sp3', title: 'Premier League Highlights',   subtitle: 'Gameweek 36 · All Goals',             meta: '8 min',         price: 0.03, coverGrad: 'linear-gradient(135deg,#200122,#6f0000)',              contentType: 'youtube', payload: { videoId: 'xvFZjo5PgG0', title: 'PL Highlights GW36' } },
  { id: 'sp4', title: 'LaLiga Top Goals',            subtitle: 'May 2026 · Best moments',             meta: '5 min',         price: 0.02, coverGrad: 'linear-gradient(135deg,#000428,#004e92)',              contentType: 'youtube', payload: { videoId: 'oHg5SJYRHA0', title: 'LaLiga Top Goals' } },
  { id: 'sp5', title: 'SA vs Australia — Day 3',     subtitle: 'ICC World Test Championship',         meta: '6h replay',     price: 0.08, coverGrad: 'linear-gradient(135deg,#1a472a,#2d6a4f)',              contentType: 'youtube', payload: { videoId: 'L_jWHffIx5E', title: 'SA vs AUS Day 3 Highlights' } },
  { id: 'sp6', title: 'NBA Playoffs — Game 7',       subtitle: 'Boston vs Milwaukee · Conference SF',  meta: 'Replay',        price: 0.05, coverGrad: 'linear-gradient(135deg,#001600,#006600)',              contentType: 'youtube', payload: { videoId: 'oHg5SJYRHA0', title: 'NBA Playoffs Game 7' } },
]

const NEWS_ITEMS: MockItem[] = [
  {
    id: 'n1', title: 'Fed Signals Rate Cut for Q3 2026', subtitle: 'Economics · Central Banking', meta: '4 min read', price: 0.002,
    coverGrad: 'linear-gradient(135deg,#1a1200,#3d2b00)', badge: 'NEW', contentType: 'article',
    payload: { text: `The Federal Reserve signalled Wednesday it may be ready to cut interest rates as early as September 2026, citing cooling inflation and softer labour market readings for April.\n\nChair Jerome Powell told reporters after the FOMC meeting that the committee had "gained meaningful confidence" that inflation is returning sustainably to the 2 percent target, opening the door to the first reduction in borrowing costs since 2023.\n\n"The data is telling us we're on the right path," Powell said. "We are not in a rush, but we are watching closely."\n\nMarkets priced in a 72 percent probability of a 25 basis-point cut at the September 17 meeting, up from 48 percent before the statement. The 10-year Treasury yield fell 14 basis points to 4.21 percent on the news.\n\nEconomists at Goldman Sachs revised their base case to two cuts this year — September and December — taking the Fed Funds rate down to a range of 4.75–5.0 percent by year-end.\n\nThe dollar weakened 0.8 percent against a basket of major currencies, while gold extended gains to $2,820 per troy ounce.` }
  },
  {
    id: 'n2', title: 'Bitcoin Breaches $120,000 All-Time High', subtitle: 'Crypto · Markets', meta: '3 min read', price: 0.002,
    coverGrad: 'linear-gradient(135deg,#1a0a00,#603010)', badge: 'BREAKING', contentType: 'article',
    payload: { text: `Bitcoin surged past $120,000 on Thursday to set a new all-time high, driven by renewed institutional buying, the completion of the fourth halving cycle, and fresh capital flowing into U.S. spot Bitcoin ETFs.\n\nThe world's largest cryptocurrency by market capitalisation gained 9.3 percent in 24 hours, pushing its total market cap above $2.4 trillion for the first time.\n\nBlackRock's iShares Bitcoin ETF recorded its biggest single-day inflow of $1.8 billion, while Fidelity's Wise Origin fund saw $940 million enter the product.\n\n"We're seeing the structural demand that was predicted post-halving materialise," said Cathie Wood of ARK Invest. "The supply shock combined with ETF inflows creates asymmetric upward pressure."\n\nEthereum followed Bitcoin higher, rising 12 percent to $6,100. Solana gained 18 percent to $420 as the broader altcoin market joined the rally.` }
  },
  {
    id: 'n3', title: 'UAE Commits $50bn to AI Infrastructure', subtitle: 'Technology · UAE', meta: '5 min read', price: 0.002,
    coverGrad: 'linear-gradient(135deg,#001a33,#004080)', contentType: 'article',
    payload: { text: `The UAE government announced a $50 billion commitment to artificial intelligence infrastructure on Tuesday, including the construction of the world's largest AI data centre campus in Abu Dhabi, set to be completed by 2028.\n\nThe investment, spread across a five-year plan, will fund compute capacity, sovereign AI models trained on Arabic and regional languages, and the expansion of the Hub71 technology ecosystem.\n\nMicrosoft, Google, and Amazon Web Services have each signed strategic agreements to co-develop cloud regions in the country, adding an estimated $30 billion in private-sector commitments.\n\n"This positions the UAE as a global AI capital," said H.E. Omar Sultan Al Olama, Minister of State for AI. "We are not waiting to see how the world develops this technology — we are shaping it."\n\nThe G42 group will operate the sovereign compute layer, with NVIDIA supplying over 200,000 Blackwell GPUs across the first phase of the programme.` }
  },
  {
    id: 'n4', title: 'Tesla Posts Record Q1 Deliveries', subtitle: 'Automotive · Electric Vehicles', meta: '3 min read', price: 0.002,
    coverGrad: 'linear-gradient(135deg,#0d0d0d,#cc0000)', contentType: 'article',
    payload: { text: `Tesla delivered 502,000 vehicles in the first quarter of 2026, surpassing analyst expectations of 475,000 and setting a new quarterly record, the company reported on Wednesday.\n\nResults were driven by strong demand for the updated Model 3, the new Model 2 compact which launched in February at $28,999, and record production from the Gigafactory in Monterrey, Mexico.\n\nCEO Elon Musk called the quarter "a turning point" and reiterated guidance for 30 percent annual delivery growth in 2026. Shares rose 11 percent in after-hours trading.\n\nThe Model 2 alone accounted for 68,000 deliveries in its first full quarter of production, on track to become Tesla's highest-volume model by mid-year.\n\nEnergy storage deployments also hit a record, with 9.4 GWh installed globally — a 78 percent increase year-over-year — as utility-scale battery projects accelerated across the US and Europe.` }
  },
]

const MUSIC_ITEMS: MockItem[] = [
  { id: 'mu1', title: 'Midnight Dreams',   subtitle: 'Synthwave · Electronic',  meta: '3:42', price: 0.01, coverGrad: 'linear-gradient(135deg,#120024,#6b21a8)', badge: 'HD', contentType: 'audio', payload: { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', artist: 'SynthWave Radio' } },
  { id: 'mu2', title: 'Lo-Fi Study Beats', subtitle: 'ChillHop · Ambient',      meta: '32 min', price: 0.01, coverGrad: 'linear-gradient(135deg,#0a1628,#1e3a5f)',              contentType: 'audio', payload: { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', artist: 'ChillHop Records' } },
  { id: 'mu3', title: 'Ocean Waves',       subtitle: 'Ambient · Nature',        meta: '4:15', price: 0.01, coverGrad: 'linear-gradient(135deg,#003366,#0099cc)',              contentType: 'audio', payload: { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', artist: 'Nature Sounds' } },
  { id: 'mu4', title: 'City Lights',       subtitle: 'Jazz · Neo-Soul',         meta: '5:01', price: 0.01, coverGrad: 'linear-gradient(135deg,#1a1a00,#666600)',              contentType: 'audio', payload: { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', artist: 'Jazz Collective' } },
  { id: 'mu5', title: 'Deep Focus',        subtitle: 'Electronic · Instrumental', meta: '6:22', price: 0.01, coverGrad: 'linear-gradient(135deg,#001a1a,#004444)',            contentType: 'audio', payload: { src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', artist: 'Focus Lab' } },
]

const EDUCATION_ITEMS: MockItem[] = [
  { id: 'ed1', title: 'Python Basics — Lesson 1',    subtitle: 'Variables, Types & Input',       meta: '15 min', price: 0.01, coverGrad: 'linear-gradient(135deg,#1a3a00,#2d6a00)', badge: 'HD',  contentType: 'youtube', payload: { videoId: 'rfscVS0vtbw', title: 'Python Basics: Variables & Types' } },
  { id: 'ed2', title: 'Python Basics — Lesson 2',    subtitle: 'Loops, Functions & Lists',       meta: '18 min', price: 0.01, coverGrad: 'linear-gradient(135deg,#1a3a00,#1f7200)',              contentType: 'youtube', payload: { videoId: 'rfscVS0vtbw', title: 'Python Basics: Loops & Functions' } },
  { id: 'ed3', title: 'Web Dev Crash Course',         subtitle: 'HTML, CSS & JavaScript',         meta: '25 min', price: 0.01, coverGrad: 'linear-gradient(135deg,#001a3a,#003080)',              contentType: 'youtube', payload: { videoId: 'qz0aGYrrlhU', title: 'Web Dev Crash Course' } },
  { id: 'ed4', title: 'Data Science Fundamentals',    subtitle: 'Pandas, NumPy & Visualisation',  meta: '30 min', price: 0.02, coverGrad: 'linear-gradient(135deg,#200a40,#4a0080)', badge: 'NEW', contentType: 'youtube', payload: { videoId: 'GPVsHOlRBBI', title: 'Data Science Fundamentals' } },
]

const AI_ITEMS: MockItem[] = [
  { id: 'ai1', title: 'Text Summariser',    subtitle: 'Paste text, get a crisp summary',           meta: 'per query', price: 0.001, coverGrad: 'linear-gradient(135deg,#1a0040,#4c1d95)', badge: 'AI',  contentType: 'chat', payload: { mode: 'summarise',     placeholder: 'Paste any text here to summarise it...' } },
  { id: 'ai2', title: 'Language Translator',subtitle: 'Translate to any language instantly',        meta: 'per query', price: 0.001, coverGrad: 'linear-gradient(135deg,#0a1a40,#1e3a8a)', badge: 'AI',  contentType: 'chat', payload: { mode: 'translate',     placeholder: 'e.g. "Translate to Arabic: Hello world"' } },
  { id: 'ai3', title: 'Code Explainer',     subtitle: 'Plain-English explanation of any code',     meta: 'per query', price: 0.002, coverGrad: 'linear-gradient(135deg,#001a0a,#00401a)', badge: 'AI',  contentType: 'chat', payload: { mode: 'explain_code', placeholder: 'Paste your code snippet here...' } },
  { id: 'ai4', title: 'AI Copywriter',      subtitle: 'Generate marketing copy in seconds',        meta: 'per query', price: 0.002, coverGrad: 'linear-gradient(135deg,#1a0a00,#4a1a00)', badge: 'AI',  contentType: 'chat', payload: { mode: 'copywrite',    placeholder: 'Describe your product or service...' } },
]

const FINANCE_ITEMS: MockItem[] = [
  { id: 'fi1', title: 'Live Market Dashboard', subtitle: 'BTC · ETH · AAPL · GOOGL · TSLA', meta: 'real-time session', price: 0.002, coverGrad: 'linear-gradient(135deg,#001a00,#003300)', badge: 'LIVE',  contentType: 'ticker', payload: { assets: ['BTC','ETH','SOL','AAPL','GOOGL','TSLA','NVDA','AMZN'] } },
  { id: 'fi2', title: 'Crypto Deep Dive',       subtitle: 'On-chain metrics + price analysis',   meta: 'per session',  price: 0.005, coverGrad: 'linear-gradient(135deg,#1a0a00,#603010)',              contentType: 'ticker', payload: { assets: ['BTC','ETH','SOL','BNB','ADA','DOT','AVAX','MATIC'] } },
  { id: 'fi3', title: 'Forex Live Rates',        subtitle: 'Major & exotic currency pairs',       meta: 'per session',  price: 0.002, coverGrad: 'linear-gradient(135deg,#000428,#004e92)',              contentType: 'ticker', payload: { assets: ['EUR/USD','GBP/USD','USD/JPY','USD/AED','USD/CHF','AUD/USD'] } },
]

const HEALTH_ITEMS: MockItem[] = [
  { id: 'he1', title: '5-Min Breathing Reset',  subtitle: 'Box breathing for anxiety relief',  meta: '5 min',  price: 0.005, coverGrad: 'linear-gradient(135deg,#0f0020,#4c1d95)', badge: 'NEW', contentType: 'breathing', payload: { duration: 300, label: 'Box Breathing',       desc: 'Inhale 4s · Hold 4s · Exhale 4s · Hold 4s' } },
  { id: 'he2', title: '10-Min Meditation',       subtitle: 'Guided mindfulness for stress',     meta: '10 min', price: 0.01,  coverGrad: 'linear-gradient(135deg,#0a0026,#2e1065)',              contentType: 'breathing', payload: { duration: 600, label: 'Guided Meditation',    desc: 'Breathe with the circle. Let thoughts pass.' } },
  { id: 'he3', title: 'Sleep Wind-Down',          subtitle: '4-7-8 breathing technique',         meta: '7 min',  price: 0.01,  coverGrad: 'linear-gradient(135deg,#000814,#001d3d)',              contentType: 'breathing', payload: { duration: 420, label: '4-7-8 Breathing',       desc: 'Inhale 4s · Hold 7s · Exhale 8s' } },
  { id: 'he4', title: 'Morning Focus Boost',      subtitle: 'Coherence breathing for clarity',   meta: '5 min',  price: 0.005, coverGrad: 'linear-gradient(135deg,#001a0a,#00401a)',              contentType: 'breathing', payload: { duration: 300, label: 'Coherence Breathing',  desc: 'Inhale 5s · Exhale 5s · Repeat' } },
]

const TEMPLATE_MOCK: Record<string, MockItem[]> = {
  streaming: STREAMING_ITEMS, sports: SPORTS_ITEMS, news: NEWS_ITEMS,
  music: MUSIC_ITEMS, education: EDUCATION_ITEMS, ai: AI_ITEMS,
  finance: FINANCE_ITEMS, health: HEALTH_ITEMS,
}

function buildCatalog(template: string, services: Service[]): ContentItem[] {
  const fallbackId    = services[0]?.endpoint_id || 'demo'
  // Payment must always use the real endpoint price stored in the DB.
  // Mock items share the fallback endpoint, so they must charge that endpoint's price.
  const fallbackPrice = services[0]?.price ?? 0.01

  const realItems: ContentItem[] = services.map(s => ({
    id: s.endpoint_id, title: s.service_name,
    subtitle: s.description || s.category,
    meta: `per access · $${s.price.toFixed(4)}`,
    price: s.price, coverGrad: seedGrad(s.service_name),
    contentType: (TEMPLATE_MOCK[template]?.[0]?.contentType || 'article') as ContentItem['contentType'],
    payload: TEMPLATE_MOCK[template]?.[0]?.payload || { text: s.description },
    endpointId: s.endpoint_id,
  }))

  // Mock items: override price with the real endpoint price so payment validation passes.
  // The displayed price is the actual charge per access — no mismatch.
  const mocks: ContentItem[] = (TEMPLATE_MOCK[template] || []).map(m => ({
    ...m,
    endpointId: fallbackId,
    price: fallbackPrice,
    meta: m.meta.includes('$') ? m.meta : `${m.meta} · $${fallbackPrice.toFixed(4)}`,
  }))

  return mocks.length > 0 ? [...mocks, ...realItems] : realItems
}

// ─── Global styles ────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
::-webkit-scrollbar { width:6px; height:6px; }
::-webkit-scrollbar-track { background:transparent; }
::-webkit-scrollbar-thumb { background:#D4CFC9; border-radius:4px; }
@keyframes slideUp   { from{transform:translateY(60px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes spin      { to{transform:rotate(360deg)} }
@keyframes breatheIn { 0%,100%{transform:scale(1)} 50%{transform:scale(1.5)} }
@keyframes pulse-live{ 0%,100%{opacity:1} 50%{opacity:0.3} }
@keyframes waveBar1  { 0%,100%{height:6px} 50%{height:24px} }
@keyframes waveBar2  { 0%,100%{height:14px} 50%{height:6px} }
@keyframes waveBar3  { 0%,100%{height:20px} 50%{height:10px} }
@keyframes waveBar4  { 0%,100%{height:10px} 50%{height:28px} }
@keyframes waveBar5  { 0%,100%{height:18px} 50%{height:4px} }
@keyframes tickerFlash { 0%{opacity:0.4} 100%{opacity:1} }
.waveBar{display:inline-block;width:4px;border-radius:4px;margin:0 2px;background:#1DB954;}
.waveBar:nth-child(1){animation:waveBar1 0.9s ease-in-out infinite;}
.waveBar:nth-child(2){animation:waveBar2 0.9s ease-in-out infinite 0.1s;}
.waveBar:nth-child(3){animation:waveBar3 0.9s ease-in-out infinite 0.2s;}
.waveBar:nth-child(4){animation:waveBar4 0.9s ease-in-out infinite 0.3s;}
.waveBar:nth-child(5){animation:waveBar5 0.9s ease-in-out infinite 0.4s;}
`

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function Marketplace() {
  const { user, setUser } = useAuth() as any
  const navigate = useNavigate()
  const [balance, setBalance]           = useState<number>(Number(user?.balance ?? 0))
  const [demoMode, setDemoMode]         = useState(false)
  const [demoBalance, setDemoBalance]   = useState(19.998)
  const [merchants, setMerchants]       = useState<Merchant[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [history, setHistory]           = useState<{ name: string; price: number; time: Date }[]>([])

  // Viewer state
  const [viewerMerchant, setViewerMerchant] = useState<Merchant | null>(null)

  const currentBalance = demoMode ? demoBalance : balance

  useEffect(() => {
    api.get('/marketplace')
      .then(r => setMerchants(r.data.merchants || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!demoMode && user?.user_id)
      walletApi.balance(user.user_id).then(r => setBalance(Number(r.data.balance))).catch(() => {})
  }, [user, demoMode])

  const filteredMerchants = merchants.filter(m => {
    const cat = m.services[0]?.category || 'General'
    const matchCat = activeCategory === 'All' || cat === activeCategory
    const q = search.toLowerCase().trim()
    const matchQ = !q || m.merchant_name.toLowerCase().includes(q) ||
      m.services.some(s => s.service_name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q))
    return matchCat && matchQ && m.services.length > 0
  })

  async function handlePay(item: ContentItem): Promise<void> {
    if (!viewerMerchant) return
    if (demoMode) {
      await new Promise(r => setTimeout(r, 400))
      const nb = Math.max(0, demoBalance - item.price)
      setDemoBalance(nb)
      setHistory(h => [{ name: item.title, price: item.price, time: new Date() }, ...h.slice(0, 19)])
      return
    }
    const res = await walletApi.pay({
      user_id: user?.user_id,
      merchant_id: viewerMerchant.merchant_id,
      endpoint_id: item.endpointId,
      amount: item.price,
    })
    const nb = Number(res.data.balance_after)
    setBalance(nb)
    if (setUser) setUser({ ...user, balance: nb })
    setHistory(h => [{ name: item.title, price: item.price, time: new Date() }, ...h.slice(0, 19)])
    analytics.track('content_purchased', { title: item.title, price: item.price, merchant: viewerMerchant.merchant_name })
  }

  function openViewer(m: Merchant) {
    setViewerMerchant(m)
    document.body.style.overflow = 'hidden'
  }
  function closeViewer() {
    setViewerMerchant(null)
    document.body.style.overflow = ''
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      {/* Nav */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/wallet')} style={{ width: 36, height: 36, borderRadius: '50%', border: `1px solid ${T.border}`, background: T.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.text2 }}>
              <ArrowLeft size={16} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.text1 }}>Marketplace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setDemoMode(d => !d)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: "'DM Mono',monospace", background: demoMode ? T.amberPale : T.surface2, border: `1px solid ${demoMode ? T.amberBd : T.border}`, color: demoMode ? T.amber : T.text3 }}>
              {demoMode ? 'DEMO ON' : 'DEMO'}
            </button>
            <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: T.text3, letterSpacing: 1, fontFamily: "'DM Mono',monospace" }}>BAL</span>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700, color: T.navy }}>${currentBalance.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px 0' }}>
        <p style={{ fontSize: 10, letterSpacing: 3, color: T.text3, marginBottom: 10, fontFamily: "'DM Mono',monospace" }}>
          {demoMode ? 'DEMO MODE — no real charges' : 'SYNTHPAY ENABLED SERVICES'}
        </p>
        <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px', color: T.text1 }}>
          Pay when you want it.<br /><span style={{ color: T.amber }}>Not every month.</span>
        </h1>
        <p style={{ color: T.text3, fontSize: 14, maxWidth: 500, marginBottom: 32 }}>
          Open any service, browse its content, and pay only for what you choose to access — right now.
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}><Search size={16} /></span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search providers..."
            style={{ width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12, border: `1px solid ${T.border}`, background: T.surface, color: T.text1, fontSize: 14, outline: 'none', fontFamily: "'DM Sans',system-ui,sans-serif" }} />
          {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>}
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
          {ALL_CATEGORIES.map(cat => {
            const active = activeCategory === cat
            const accent = cat !== 'All' ? getAccent(cat) : T.navy
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${active ? accent : T.border}`, background: active ? (cat === 'All' ? T.navy : `${accent}22`) : T.surface, color: active ? (cat === 'All' ? '#fff' : accent) : T.text3, fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
                {cat !== 'All' && getCatIcon(cat)}{cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px 80px' }}>
        {loading && <div style={{ textAlign: 'center', padding: 80 }}><p style={{ color: T.text3, fontFamily: "'DM Mono',monospace", letterSpacing: 2 }}>LOADING...</p></div>}
        {!loading && merchants.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, background: T.surface, borderRadius: 16, border: `1px dashed ${T.border2}` }}>
            <p style={{ color: T.text3 }}>No services available yet.</p>
            <p style={{ color: T.text4, fontSize: 12, marginTop: 4 }}>Merchants register at dashboard.synthpay.tech</p>
          </div>
        )}
        {!loading && merchants.length > 0 && filteredMerchants.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, background: T.surface, borderRadius: 16, border: `1px dashed ${T.border2}` }}>
            <p style={{ color: T.text3, fontSize: 14 }}>No results for "{search || activeCategory}"</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All') }} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'none', color: T.text2, cursor: 'pointer', fontSize: 13 }}>Clear filters</button>
          </div>
        )}

        {/* Provider grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 20 }}>
          {!loading && filteredMerchants.map(m => (
            <ProviderCard key={m.merchant_id} merchant={m} onOpen={() => openViewer(m)} />
          ))}
        </div>

        {/* Recent transactions */}
        {history.length > 0 && (
          <div style={{ marginTop: 48, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
            <p style={{ fontSize: 10, letterSpacing: 3, color: T.text3, marginBottom: 16, fontFamily: "'DM Mono',monospace" }}>RECENT PAYMENTS</p>
            {history.slice(0, 8).map((tx, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < Math.min(history.length, 8) - 1 ? `1px solid ${T.border}` : 'none' }}>
                <span style={{ fontSize: 13, color: T.text1 }}>{tx.name}</span>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: T.red }}>−${tx.price.toFixed(4)}</span>
                  <span style={{ fontSize: 11, color: T.text4 }}>{tx.time.toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Viewer */}
      {viewerMerchant && (
        <ServiceViewer
          merchant={viewerMerchant}
          currentBalance={currentBalance}
          onClose={closeViewer}
          onPay={handlePay}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PROVIDER CARD
// ══════════════════════════════════════════════════════════════════════════════
function ProviderCard({ merchant, onOpen }: { merchant: Merchant; onOpen: () => void }) {
  const cat      = merchant.services[0]?.category || 'General'
  const tmpl     = detectTemplate(merchant.merchant_name, cat, merchant.services.map(s => s.service_name + ' ' + s.description).join(' '))
  const theme    = getTheme(tmpl)
  const minPrice = Math.min(...merchant.services.map(s => s.price))
  const itemCount = (TEMPLATE_MOCK[tmpl]?.length || 0) + merchant.services.length
  const [hov, setHov] = useState(false)

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ borderRadius: 16, overflow: 'hidden', cursor: 'pointer', background: T.surface, border: `1px solid ${T.border}`, transition: 'transform 0.2s, box-shadow 0.2s', transform: hov ? 'translateY(-6px)' : '', boxShadow: hov ? '0 12px 40px rgba(0,0,0,0.12)' : '0 2px 8px rgba(0,0,0,0.04)' }}
    >
      {/* Cover */}
      <div style={{ height: 160, background: theme.bg, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: getGradient(cat), opacity: 0.7 }} />
        <div style={{ position: 'relative', textAlign: 'center', padding: '0 16px' }}>
          <div style={{ color: '#fff', fontWeight: 900, fontSize: 26, letterSpacing: -0.5, textShadow: '0 2px 8px rgba(0,0,0,0.5)', lineHeight: 1.1 }}>{merchant.merchant_name}</div>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 4 }}>{itemCount} titles available</div>
        </div>
        {/* Category badge */}
        <div style={{ position: 'absolute', top: 10, right: 10, background: theme.accent, color: theme.accent === '#FFCC00' || theme.accent === '#1DB954' || theme.accent === '#00ff88' ? '#000' : '#fff', fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: 1.5, fontFamily: "'DM Mono',monospace" }}>
          {cat.toUpperCase()}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px' }}>
        <p style={{ margin: '0 0 4px', fontSize: 12, color: T.text3 }}>
          from <strong style={{ color: T.text1, fontFamily: "'DM Mono',monospace" }}>${minPrice.toFixed(4)}</strong> per access
        </p>
        <p style={{ margin: '0 0 14px', fontSize: 12, color: T.text4 }}>
          Pay per item · No subscription
        </p>
        <button style={{ width: '100%', padding: '10px 0', borderRadius: 10, background: T.amber, color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', letterSpacing: 0.2 }}>
          Open →
        </button>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE VIEWER
// ══════════════════════════════════════════════════════════════════════════════
function ServiceViewer({ merchant, currentBalance, onClose, onPay }: {
  merchant: Merchant
  currentBalance: number
  onClose: () => void
  onPay: (item: ContentItem) => Promise<void>
}) {
  const cat      = merchant.services[0]?.category || 'General'
  const tmpl     = detectTemplate(merchant.merchant_name, cat, merchant.services.map(s => s.service_name + ' ' + s.description).join(' '))
  const theme    = getTheme(tmpl)
  const catalog  = buildCatalog(tmpl, merchant.services)

  const [playing, setPlaying]     = useState<ContentItem | null>(null)
  const [paying, setPaying]       = useState<PayingState | null>(null)
  const [balance, setBalance]     = useState(currentBalance)

  async function startPay(item: ContentItem) {
    setPaying({ id: item.id, step: 'confirm' })
  }

  async function confirmPay(item: ContentItem) {
    setPaying({ id: item.id, step: 'paying' })
    try {
      await onPay(item)
      setBalance(b => Math.max(0, b - item.price))
      setPaying(null)
      setPlaying(item)
    } catch (e: any) {
      setPaying({ id: item.id, step: 'error', error: e?.response?.data?.error || 'Payment failed. Please try again.' })
    }
  }

  function backToCatalog() {
    setPlaying(null)
    setPaying(null)
  }

  // Hero item: first item in catalog
  const hero = catalog[0]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>
      <div style={{ flex: 1, background: theme.bg, display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s ease', overflowY: 'auto', maxHeight: '100vh' }}>

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${theme.border}`, background: theme.surface, position: 'sticky', top: 0, zIndex: 10, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {playing && (
              <button onClick={backToCatalog} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: theme.text }}>
                <ChevronLeft size={16} />
              </button>
            )}
            <div>
              <div style={{ fontWeight: 900, fontSize: 18, color: theme.text, letterSpacing: -0.3 }}>{merchant.merchant_name}</div>
              {playing && <div style={{ fontSize: 12, color: theme.textSub, marginTop: 1 }}>{playing.title}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, fontWeight: 700, color: theme.accent }}>
              ${balance.toFixed(4)}
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.08)', border: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: theme.text }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Player view */}
        {playing ? (
          <ContentPlayer item={playing} theme={theme} onBack={backToCatalog} onPayNext={async (next) => { backToCatalog(); setTimeout(() => startPay(next), 100) }} nextItem={catalog[catalog.indexOf(playing) + 1] || null} />
        ) : (
          /* Catalog */
          <div style={{ padding: '0 0 40px' }}>
            {/* Hero banner */}
            {hero && tmpl !== 'generic' && (
              <div style={{ position: 'relative', height: 280, background: hero.coverGrad, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, ${theme.bg} 0%, transparent 60%)` }} />
                <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28 }}>
                  <div style={{ fontSize: 11, color: theme.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 8, fontFamily: "'DM Mono',monospace" }}>{tmpl === 'streaming' ? 'FEATURED TONIGHT' : tmpl === 'sports' ? 'FEATURED MATCH' : tmpl === 'news' ? 'TOP STORY' : 'FEATURED'}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: theme.text, letterSpacing: -0.5, marginBottom: 6 }}>{hero.title}</div>
                  <div style={{ fontSize: 13, color: theme.textSub, marginBottom: 16 }}>{hero.subtitle} · {hero.meta}</div>
                  <button
                    onClick={() => startPay(hero)}
                    style={{ padding: '10px 24px', borderRadius: 10, background: theme.accent, color: theme.accent === '#FFCC00' || theme.accent === '#1DB954' || theme.accent === '#00ff88' ? '#000' : '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <Play size={14} /> {ctaLabel(tmpl)} · ${hero.price.toFixed(4)}
                  </button>
                </div>
                {hero.badge && (
                  <div style={{ position: 'absolute', top: 20, left: 28, background: hero.badge === 'LIVE' ? '#ef4444' : theme.accent, color: hero.badge === 'LIVE' || (theme.accent !== '#FFCC00' && theme.accent !== '#1DB954') ? '#fff' : '#000', fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 6, letterSpacing: 2, fontFamily: "'DM Mono',monospace", animation: hero.badge === 'LIVE' ? 'pulse-live 2s ease-in-out infinite' : 'none' }}>
                    {hero.badge}
                  </div>
                )}
              </div>
            )}

            {/* Section label */}
            <div style={{ padding: '24px 24px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{sectionLabel(tmpl)}</span>
              <span style={{ fontSize: 11, color: theme.textSub, fontFamily: "'DM Mono',monospace" }}>{catalog.length} available</span>
            </div>

            {/* Content grid */}
            <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
              {catalog.map(item => (
                <CatalogCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  tmpl={tmpl}
                  paying={paying?.id === item.id ? paying : null}
                  balance={balance}
                  onWatch={() => startPay(item)}
                  onConfirmPay={() => confirmPay(item)}
                  onCancelPay={() => setPaying(null)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ctaLabel(tmpl: string) {
  const map: Record<string, string> = { streaming: 'Watch', sports: 'Watch', music: 'Play', news: 'Read', education: 'Watch', ai: 'Use', finance: 'View', health: 'Start' }
  return map[tmpl] || 'Open'
}
function sectionLabel(tmpl: string) {
  const map: Record<string, string> = { streaming: 'All Titles', sports: 'Matches & Highlights', music: 'Tracks', news: 'Articles', education: 'Lessons', ai: 'Tools', finance: 'Market Data', health: 'Sessions' }
  return map[tmpl] || 'Content'
}

// ══════════════════════════════════════════════════════════════════════════════
// CATALOG CARD with inline payment gate
// ══════════════════════════════════════════════════════════════════════════════
function CatalogCard({ item, theme, tmpl, paying, balance, onWatch, onConfirmPay, onCancelPay }: {
  item: ContentItem
  theme: ReturnType<typeof getTheme>
  tmpl: string
  paying: PayingState | null
  balance: number
  onWatch: () => void
  onConfirmPay: () => void
  onCancelPay: () => void
}) {
  const [hov, setHov] = useState(false)
  const label = ctaLabel(tmpl)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ borderRadius: 12, overflow: 'hidden', background: theme.surface, border: `1px solid ${theme.border}`, transition: 'transform 0.15s', transform: hov && !paying ? 'translateY(-3px)' : '', position: 'relative', cursor: paying ? 'default' : 'pointer' }}
    >
      {/* Thumbnail */}
      <div style={{ height: 130, background: item.coverGrad, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.badge && (
          <div style={{ position: 'absolute', top: 8, left: 8, background: item.badge === 'LIVE' ? '#ef4444' : theme.accent, color: item.badge === 'LIVE' || (theme.accent !== '#FFCC00' && theme.accent !== '#1DB954') ? '#fff' : '#000', fontSize: 9, fontWeight: 800, padding: '3px 7px', borderRadius: 5, letterSpacing: 1.5, fontFamily: "'DM Mono',monospace", animation: item.badge === 'LIVE' ? 'pulse-live 2s ease-in-out infinite' : 'none' }}>
            {item.badge}
          </div>
        )}
        {hov && !paying && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.15s ease' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={18} color={theme.accent === '#FFCC00' || theme.accent === '#1DB954' || theme.accent === '#00ff88' ? '#000' : '#fff'} fill={theme.accent === '#FFCC00' || theme.accent === '#1DB954' || theme.accent === '#00ff88' ? '#000' : '#fff'} />
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }} onClick={!paying ? onWatch : undefined}>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
        <div style={{ fontSize: 11, color: theme.textSub, marginBottom: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.subtitle} · {item.meta}</div>

        {/* Pay gate */}
        {paying?.step === 'confirm' ? (
          <div style={{ animation: 'fadeIn 0.15s ease' }}>
            <div style={{ fontSize: 11, color: theme.textSub, marginBottom: 8 }}>
              Balance after: <strong style={{ color: balance - item.price < 0 ? '#ef4444' : theme.accent, fontFamily: "'DM Mono',monospace" }}>${Math.max(0, balance - item.price).toFixed(4)}</strong>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={onConfirmPay} style={{ flex: 1, padding: '8px 0', borderRadius: 8, background: theme.accent, color: theme.accent === '#FFCC00' || theme.accent === '#1DB954' || theme.accent === '#00ff88' ? '#000' : '#fff', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                Pay ${item.price.toFixed(4)}
              </button>
              <button onClick={onCancelPay} style={{ width: 34, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textSub, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={13} />
              </button>
            </div>
          </div>
        ) : paying?.step === 'paying' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${theme.accent}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: theme.textSub }}>Processing payment...</span>
          </div>
        ) : paying?.step === 'error' ? (
          <div>
            <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{paying.error}</div>
            <button onClick={onWatch} style={{ width: '100%', padding: '7px 0', borderRadius: 8, background: 'transparent', border: `1px solid #ef4444`, color: '#ef4444', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Try again</button>
          </div>
        ) : (
          <button onClick={onWatch} style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.text, fontSize: 12, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Lock size={11} color={theme.textSub} />
            {label} · <span style={{ color: theme.accent, fontFamily: "'DM Mono',monospace" }}>${item.price.toFixed(4)}</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT PLAYER
// ══════════════════════════════════════════════════════════════════════════════
function ContentPlayer({ item, theme, onBack, onPayNext, nextItem }: {
  item: ContentItem
  theme: ReturnType<typeof getTheme>
  onBack: () => void
  onPayNext: (next: ContentItem) => void
  nextItem: ContentItem | null
}) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>
      {item.contentType === 'youtube' && (
        <div style={{ background: '#000', width: '100%' }}>
          <div style={{ maxWidth: '100%', aspectRatio: '16/9' }}>
            <iframe
              src={`https://www.youtube.com/embed/${item.payload.videoId}?autoplay=1&rel=0&modestbranding=1`}
              style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              allow="autoplay; fullscreen; picture-in-picture"
              title={item.title}
            />
          </div>
          <div style={{ padding: '20px 24px' }}>
            <h2 style={{ margin: 0, color: theme.text, fontSize: 20, fontWeight: 700 }}>{item.payload.title || item.title}</h2>
            <p style={{ margin: '6px 0 0', color: theme.textSub, fontSize: 13 }}>{item.subtitle} · {item.meta}</p>
          </div>
        </div>
      )}

      {item.contentType === 'article' && <ArticleReader item={item} theme={theme} />}
      {item.contentType === 'audio'   && <AudioPlayer   item={item} theme={theme} />}
      {item.contentType === 'ticker'  && <LiveTicker    item={item} theme={theme} />}
      {item.contentType === 'chat'    && <ChatInterface item={item} theme={theme} />}
      {item.contentType === 'breathing' && <BreathingSession item={item} theme={theme} />}

      {/* Next item */}
      {nextItem && (
        <div style={{ margin: '24px 24px 32px', padding: '16px 20px', background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: theme.textSub, marginBottom: 4, letterSpacing: 1, fontFamily: "'DM Mono',monospace" }}>UP NEXT</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.text }}>{nextItem.title}</div>
            <div style={{ fontSize: 12, color: theme.textSub }}>{nextItem.meta}</div>
          </div>
          <button onClick={() => onPayNext(nextItem)} style={{ padding: '8px 18px', borderRadius: 8, background: theme.accent, color: theme.accent === '#FFCC00' || theme.accent === '#1DB954' || theme.accent === '#00ff88' ? '#000' : '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {ctaLabel('')} · ${nextItem.price.toFixed(4)}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Article Reader ────────────────────────────────────────────────────────────
function ArticleReader({ item, theme }: { item: ContentItem; theme: ReturnType<typeof getTheme> }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ height: 200, background: item.coverGrad, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 40%, ${theme.bg})` }} />
        <div style={{ position: 'absolute', bottom: 20, left: 28, right: 28 }}>
          <div style={{ fontSize: 11, color: theme.accent, fontWeight: 700, letterSpacing: 2, marginBottom: 6, fontFamily: "'DM Mono',monospace" }}>{item.subtitle.toUpperCase()}</div>
          <h1 style={{ margin: 0, color: theme.text, fontSize: 24, fontWeight: 900, lineHeight: 1.2 }}>{item.title}</h1>
        </div>
      </div>
      <div style={{ padding: '8px 28px 40px', maxWidth: 720 }}>
        <p style={{ fontSize: 12, color: theme.textSub, marginBottom: 24, fontFamily: "'DM Mono',monospace" }}>{item.meta}</p>
        {(item.payload.text as string).split('\n\n').map((para, i) => (
          <p key={i} style={{ color: theme.text, fontSize: 16, lineHeight: 1.85, marginBottom: 20, opacity: 0.92 }}>{para}</p>
        ))}
      </div>
    </div>
  )
}

// ─── Audio Player ──────────────────────────────────────────────────────────────
function AudioPlayer({ item, theme }: { item: ContentItem; theme: ReturnType<typeof getTheme> }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, minHeight: 400 }}>
      <div style={{ width: 200, height: 200, borderRadius: 16, background: item.coverGrad, marginBottom: 28, boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }} />
      <h2 style={{ color: theme.text, fontSize: 22, fontWeight: 700, margin: '0 0 4px' }}>{item.title}</h2>
      <p style={{ color: theme.textSub, fontSize: 14, marginBottom: 24 }}>{item.payload.artist}</p>
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, alignItems: 'flex-end', height: 36 }}>
        {[1,2,3,4,5].map(i => <div key={i} className="waveBar" style={{ background: theme.accent }} />)}
      </div>
      <audio controls autoPlay src={item.payload.src}
        style={{ width: 320, filter: 'invert(1) hue-rotate(200deg)' }} />
    </div>
  )
}

// ─── Live Ticker ───────────────────────────────────────────────────────────────
function LiveTicker({ item, theme }: { item: ContentItem; theme: ReturnType<typeof getTheme> }) {
  const BASE: Record<string, number> = {
    BTC: 118500, ETH: 5900, SOL: 415, BNB: 720, ADA: 1.12, DOT: 18, AVAX: 52, MATIC: 1.85,
    AAPL: 213, GOOGL: 195, TSLA: 248, NVDA: 145, AMZN: 220,
    'EUR/USD': 1.0850, 'GBP/USD': 1.2720, 'USD/JPY': 151.2, 'USD/AED': 3.6725,
    'USD/CHF': 0.8950, 'AUD/USD': 0.6580, 'USD/CAD': 1.3640, 'NZD/USD': 0.6050,
  }
  const [prices, setPrices] = useState<Record<string, { price: number; change: number }>>(() => {
    const init: Record<string, { price: number; change: number }> = {}
    for (const a of item.payload.assets as string[])
      init[a] = { price: BASE[a] ?? 100, change: (Math.random() - 0.5) * 4 }
    return init
  })

  useEffect(() => {
    const id = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev }
        for (const a of item.payload.assets as string[]) {
          const delta = (Math.random() - 0.49) * 0.004
          const newP  = Math.max(0.001, prev[a].price * (1 + delta))
          next[a] = { price: newP, change: ((newP - (BASE[a] ?? 100)) / (BASE[a] ?? 100)) * 100 }
        }
        return next
      })
    }, 1800)
    return () => clearInterval(id)
  }, [item.payload.assets])

  return (
    <div style={{ padding: '20px 24px', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', animation: 'pulse-live 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 11, color: theme.accent, fontWeight: 700, letterSpacing: 2, fontFamily: "'DM Mono',monospace" }}>LIVE PRICES</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12 }}>
        {(item.payload.assets as string[]).map(a => {
          const { price, change } = prices[a] || { price: 0, change: 0 }
          const up = change >= 0
          const isCurrency = a.includes('/')
          const fmt = isCurrency
            ? price.toFixed(4)
            : price > 1000 ? price.toLocaleString(undefined, { maximumFractionDigits: 0 })
            : price.toFixed(2)
          return (
            <div key={a} style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 10, padding: '14px 16px', animation: 'tickerFlash 0.3s ease' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 4, fontFamily: "'DM Mono',monospace" }}>{a}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: theme.accent, fontFamily: "'DM Mono',monospace" }}>{isCurrency ? '' : '$'}{fmt}</div>
              <div style={{ fontSize: 11, color: up ? '#22c55e' : '#ef4444', marginTop: 2, fontFamily: "'DM Mono',monospace" }}>
                {up ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── AI Chat Interface ─────────────────────────────────────────────────────────
const AI_REPLIES: Record<string, string[]> = {
  summarise:    ['Here\'s a concise summary of your text:\n\n**Key points:** The passage covers the main topic comprehensively, highlighting the core argument and supporting evidence. The author concludes with a call to action.\n\n**In one sentence:** [Your text discusses its subject matter with clear structure and focused reasoning.]'],
  translate:    ['Translation complete. Here is your text rendered in the target language:\n\n"مرحبًا بالعالم — هذا مثال على الترجمة الفورية."\n\nNote: For best accuracy, specify the target language clearly in your input.'],
  explain_code: ['Here\'s what your code does:\n\n**Overview:** The code defines a function that processes input data and returns a transformed result.\n\n**Line by line:**\n- The function signature takes parameters and applies logic\n- Each step processes the data sequentially\n- The return value is the final output\n\n**In plain English:** It takes something in and gives something useful back.'],
  copywrite:    ['Here\'s marketing copy for your product:\n\n**Headline:** "The smarter way to [solve your problem] — without the complexity."\n\n**Tagline:** "Built for people who want results, not subscriptions."\n\n**CTA:** "Try it free. Pay only when you love it."\n\n*Feel free to request variations or a different tone.*'],
  default:      ['I\'ve processed your query and here\'s my response:\n\nBased on what you\'ve shared, the key insight is that this area has significant opportunity for improvement. The data suggests a focused approach will yield the best results.\n\nWould you like me to elaborate on any specific aspect?'],
}

function ChatInterface({ item, theme }: { item: ContentItem; theme: ReturnType<typeof getTheme> }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: `${item.title} ready. ${item.payload.placeholder || 'Type your query below.'}` }
  ])
  const [input, setInput]     = useState('')
  const [typing, setTyping]   = useState(false)
  const bottomRef             = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const q = input.trim(); if (!q) return
    setMessages(m => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
    const replies = AI_REPLIES[item.payload.mode] || AI_REPLIES.default
    setMessages(m => [...m, { role: 'ai', text: replies[Math.floor(Math.random() * replies.length)] }])
    setTyping(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? theme.accent : theme.surface, color: m.role === 'user' ? (theme.accent === '#FFCC00' || theme.accent === '#1DB954' ? '#000' : '#fff') : theme.text, fontSize: 14, lineHeight: 1.7, border: m.role === 'ai' ? `1px solid ${theme.border}` : 'none', whiteSpace: 'pre-wrap' }}>
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: theme.surface, border: `1px solid ${theme.border}`, display: 'flex', gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: theme.textSub, animation: `pulse-live 1.2s ease-in-out infinite ${i * 0.2}s` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 24px 20px', borderTop: `1px solid ${theme.border}`, display: 'flex', gap: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={item.payload.placeholder || 'Type your query...'}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 10, border: `1px solid ${theme.border}`, background: theme.surface, color: theme.text, fontSize: 14, outline: 'none', fontFamily: "'DM Sans',system-ui,sans-serif" }}
        />
        <button onClick={send} disabled={!input.trim() || typing}
          style={{ width: 44, height: 44, borderRadius: 10, background: !input.trim() || typing ? theme.surface : theme.accent, border: `1px solid ${theme.border}`, cursor: !input.trim() || typing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: !input.trim() || typing ? theme.textSub : (theme.accent === '#FFCC00' || theme.accent === '#1DB954' ? '#000' : '#fff') }}>
          {typing ? <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid currentColor`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  )
}

// ─── Breathing Session ─────────────────────────────────────────────────────────
function BreathingSession({ item, theme }: { item: ContentItem; theme: ReturnType<typeof getTheme> }) {
  const [secondsLeft, setSecondsLeft] = useState<number>(item.payload.duration as number)
  const [phase, setPhase]             = useState<'inhale' | 'hold' | 'exhale' | 'hold2'>('inhale')
  const [started, setStarted]         = useState(false)
  const phaseRef  = useRef(phase)
  phaseRef.current = phase
  const CYCLE = { inhale: 4, hold: 4, exhale: 4, hold2: 4 }
  const LABELS = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', hold2: 'Hold' }

  useEffect(() => {
    if (!started) return
    const timer = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(timer); setStarted(false); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [started])

  useEffect(() => {
    if (!started) return
    const phases: (keyof typeof CYCLE)[] = ['inhale', 'hold', 'exhale', 'hold2']
    let idx = 0
    const advance = () => {
      idx = (idx + 1) % phases.length
      setPhase(phases[idx])
    }
    let elapsed = 0
    const tick = setInterval(() => {
      elapsed++
      const cur = phases[idx]
      if (elapsed >= CYCLE[cur]) { elapsed = 0; advance() }
    }, 1000)
    return () => clearInterval(tick)
  }, [started])

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 32 }}>
      <div>
        <h2 style={{ textAlign: 'center', margin: '0 0 4px', color: theme.text, fontSize: 22, fontWeight: 700 }}>{item.payload.label}</h2>
        <p style={{ textAlign: 'center', margin: 0, color: theme.textSub, fontSize: 14 }}>{item.payload.desc}</p>
      </div>
      {/* Breathing circle */}
      <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: `2px solid ${theme.accent}22`, background: `${theme.accent}08` }} />
        <div style={{ width: started ? (phase === 'inhale' ? 160 : phase === 'exhale' ? 80 : 130) : 100, height: started ? (phase === 'inhale' ? 160 : phase === 'exhale' ? 80 : 130) : 100, borderRadius: '50%', background: `radial-gradient(circle, ${theme.accent}44, ${theme.accent}22)`, border: `2px solid ${theme.accent}88`, transition: `all ${phase === 'inhale' ? CYCLE.inhale : phase === 'exhale' ? CYCLE.exhale : 1}s ease-in-out`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: theme.text, fontWeight: 700, fontSize: 14, textAlign: 'center' }}>{started ? LABELS[phase] : 'Ready'}</span>
        </div>
      </div>
      {/* Timer */}
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 28, fontWeight: 700, color: theme.accent }}>
        {mins}:{secs.toString().padStart(2, '0')}
      </div>
      <button
        onClick={() => { if (!started) setSecondsLeft(item.payload.duration); setStarted(s => !s) }}
        style={{ padding: '12px 36px', borderRadius: 12, background: started ? 'transparent' : theme.accent, border: `2px solid ${theme.accent}`, color: started ? theme.accent : (theme.accent === '#FFCC00' || theme.accent === '#1DB954' || theme.accent === '#00ff88' ? '#000' : '#fff'), fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
      >
        {started ? 'Pause' : secondsLeft === item.payload.duration ? 'Begin Session' : 'Resume'}
      </button>
      {secondsLeft === 0 && <p style={{ color: theme.accent, fontWeight: 600, fontSize: 14 }}>Session complete. Well done.</p>}
    </div>
  )
}
