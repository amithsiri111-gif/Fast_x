/* global console */
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { translations, faqListEn, faqListSi, faqListTa } from './translations.js';
import ReceiptScanner from './ReceiptScanner.jsx';

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
const AUTH_TOKEN_KEY = 'fast_cash_token';
const getAuthToken = () => {
  if (typeof window === 'undefined' || !window.localStorage) return '';
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
};
const setAuthToken = (token) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }
};
const api = async (url, options = {}) => { 
  const token = getAuthToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(API_BASE_URL + url, { 
    credentials: "include", 
    headers, 
    ...options 
  }); 
  const data = await res.json().catch(() => ({})); 
  if (!res.ok) {
    let errorMsg = data.error || "Request failed.";
    if (data.fields && typeof data.fields === 'object') {
      const fieldList = Object.entries(data.fields)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
        .filter(Boolean);
      if (fieldList.length > 0) {
        errorMsg = fieldList.join(' | ');
      }
    }
    console.error(`[API Handler Error] ${options.method || 'GET'} ${url} (${res.status}):`, {
      message: errorMsg,
      data
    });
    const err = new Error(errorMsg);
    err.fields = data.fields;
    err.status = res.status;
    throw err;
  }
  return data; 
};

const nav = [['⌂','Home'],['◈','1xBet'],['↓','Deposit'],['↑','Withdraw'],['☆','Sports'],['◉','Casino'],['●','Live Bet'],['✦','Promotions'],['▤','Transactions'],['🔒','PrivacyPolicy'],['◌','Support']];

// --- Helper Utilities ---

const copyToClipboard = (text, notify, label = 'Copied to clipboard!') => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => notify(label))
      .catch(() => {
        fallbackCopy(text);
        notify(label);
      });
  } else {
    fallbackCopy(text);
    notify(label);
  }
};

const fallbackCopy = (text) => {
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  try { document.execCommand('copy'); } catch { /* ignore */ }
  document.body.removeChild(el);
};

const CopyButton = ({ text, label = 'Copy', notify, message, t }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.preventDefault();
    const msg = message || (t?.agentAccounts?.accountCopied || 'Copied to clipboard!');
    copyToClipboard(text, notify, msg);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      type="button" 
      className="copy-btn" 
      title={`Copy ${text}`}
    >
      {copied ? (t?.agentAccounts?.copied || '✓ Copied') : `📋 ${label}`}
    </button>
  );
};

const Field = ({ label, name, type = 'text', required = true, form, setForm, placeholder, min, max }) => (
  <label>
    {label}
    <input 
      required={required} 
      type={type} 
      placeholder={placeholder}
      min={min}
      max={max}
      value={form[name] || ''} 
      onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))}
    />
  </label>
);

const PromoBanner = ({ notify, t }) => {
  const promoCode = 'VGSL';
  const registerUrl = 'https://1xbet.com/en/user/registration/';

  return (
    <div className="promo-banner" style={{
      background: 'linear-gradient(135deg, rgba(34, 199, 255, 0.12) 0%, rgba(182, 255, 53, 0.12) 100%)',
      border: '1px solid rgba(182, 255, 53, 0.35)',
      borderRadius: '16px',
      padding: '14px 18px',
      margin: '0 0 20px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '14px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '24px' }}>🔥</span>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: '600' }}>
            {t?.promoBanner?.title || '🔥 Official 1xBet Promo Code:'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            <span style={{ font: '800 20px Syne', color: 'var(--green)', letterSpacing: '0.08em' }}>{promoCode}</span>
            <span className="pill" style={{ padding: '3px 8px', fontSize: '11px' }}>
              {t?.promoBanner?.bonus || '🎁 130% Welcome Bonus'}
            </span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <CopyButton 
          text={promoCode} 
          label={t?.promoBanner?.copyBtn || 'Copy VGSL'} 
          notify={notify} 
          message={t?.promotionsPage?.copyCodeSuccess || 'Promo Code VGSL copied!'} 
          t={t} 
        />
        <a 
          href={registerUrl} 
          target="_blank" 
          rel="noreferrer" 
          className="green" 
          style={{ 
            padding: '8px 14px', 
            borderRadius: '8px', 
            fontWeight: '800', 
            fontSize: '13px', 
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          🚀 {t?.promoBanner?.registerBtn || 'Register on 1xBet'}
        </a>
      </div>
    </div>
  );
};

const PrivacyPolicyPage = ({ t }) => (
  <section className="panel" style={{ maxWidth: '850px', margin: '30px auto' }}>
    <span className="eyebrow">{t?.privacyPage?.eyebrow || 'Privacy Policy'}</span>
    <h1 style={{ fontSize: '32px', margin: '16px 0 8px' }}>{t?.privacyPage?.title || 'Privacy Policy - Fast_X Official Sri Lanka'}</h1>
    <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '28px' }}>{t?.privacyPage?.subtitle}</p>

    <div style={{ display: 'grid', gap: '20px' }}>
      <article style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '14px', border: '1px solid var(--line)' }}>
        <h3 style={{ color: 'var(--green)', margin: '0 0 10px', fontSize: '17px' }}>{t?.privacyPage?.section1Title}</h3>
        <p style={{ fontSize: '14px', margin: '0 0 12px', color: 'var(--ink)' }}>{t?.privacyPage?.section1Desc}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--muted)' }}>
          <li>{t?.privacyPage?.s1Item1}</li>
          <li>{t?.privacyPage?.s1Item2}</li>
          <li>{t?.privacyPage?.s1Item3}</li>
          <li>{t?.privacyPage?.s1Item4}</li>
        </ul>
      </article>

      <article style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '14px', border: '1px solid var(--line)' }}>
        <h3 style={{ color: 'var(--blue)', margin: '0 0 10px', fontSize: '17px' }}>{t?.privacyPage?.section2Title}</h3>
        <p style={{ fontSize: '14px', margin: '0 0 12px', color: 'var(--ink)' }}>{t?.privacyPage?.section2Desc}</p>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--muted)' }}>
          <li>{t?.privacyPage?.s2Item1}</li>
          <li>{t?.privacyPage?.s2Item2}</li>
        </ul>
      </article>

      <article style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '14px', border: '1px solid var(--line)' }}>
        <h3 style={{ color: 'var(--green)', margin: '0 0 10px', fontSize: '17px' }}>{t?.privacyPage?.section3Title}</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--muted)' }}>
          <li>{t?.privacyPage?.s3Item1}</li>
          <li>{t?.privacyPage?.s3Item2}</li>
        </ul>
      </article>

      <article style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '14px', border: '1px solid var(--line)' }}>
        <h3 style={{ color: '#ffc857', margin: '0 0 10px', fontSize: '17px' }}>{t?.privacyPage?.section4Title}</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--muted)' }}>
          <li>{t?.privacyPage?.s4Item1}</li>
          <li>{t?.privacyPage?.s4Item2}</li>
          <li>{t?.privacyPage?.s4Item3}</li>
        </ul>
      </article>
    </div>
  </section>
);

// --- Header & Layout ---

const Header = ({ page, move, user, drawer, setDrawer, theme, toggleTheme, lang, setLang, t }) => (
  <>
    <header>
      <button className="brand" onClick={() => move('Home')}>
        FAST <i>CASH</i><small>{t.header.brandSubtitle}</small>
      </button>
      <nav>
        {nav.map(([, p]) => (
          <button className={page === p ? 'active' : ''} onClick={() => move(p)} key={p}>
            {t.nav[p] || p}
          </button>
        ))}
      </nav>
      <div className="head-actions">
        {/* Multi-language Selector */}
        <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.06)', padding: '2px', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <button 
            type="button" 
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: lang === 'en' ? 'var(--blue)' : 'transparent', color: lang === 'en' ? '#001720' : 'var(--muted)', cursor: 'pointer' }} 
            onClick={() => setLang('en')}
            title="English"
          >
            EN
          </button>
          <button 
            type="button" 
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: lang === 'si' ? 'var(--blue)' : 'transparent', color: lang === 'si' ? '#001720' : 'var(--muted)', cursor: 'pointer' }} 
            onClick={() => setLang('si')}
            title="සිංහල"
          >
            SI
          </button>
          <button 
            type="button" 
            style={{ padding: '6px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: lang === 'ta' ? 'var(--blue)' : 'transparent', color: lang === 'ta' ? '#001720' : 'var(--muted)', cursor: 'pointer' }} 
            onClick={() => setLang('ta')}
            title="தமிழ்"
          >
            TA
          </button>
        </div>

        <button 
          type="button" 
          className="theme-toggle-btn" 
          onClick={toggleTheme}
          aria-label="Toggle light or dark theme"
          title={theme === 'dark' ? t.header.switchToLight : t.header.switchToDark}
        >
          {theme === 'dark' ? t.header.lightMode : t.header.darkMode}
        </button>
        <button onClick={() => move('Deposit')} className="green">{t.header.deposit}</button>
        <button onClick={() => move('Withdraw')} className="blue">{t.header.withdraw}</button>
      </div>
      <button className="hamburger" aria-label="Open menu" onClick={() => setDrawer(true)}>☰</button>
    </header>

    <aside className={drawer ? 'drawer open' : 'drawer'} aria-label="Navigation">
      <button className="close" onClick={() => setDrawer(false)}>×</button>
      <div className="brand">FAST <i>CASH</i></div>
      
      {/* Menu Promo Banner */}
      <div style={{
        background: 'rgba(182, 255, 53, 0.08)',
        border: '1px solid rgba(182, 255, 53, 0.35)',
        borderRadius: '12px',
        padding: '10px 12px',
        margin: '6px 0 10px',
        display: 'grid',
        gap: '6px'
      }}>
        <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: '700' }}>
          {t?.promoBanner?.title || '🔥 Official 1xBet Promo Code'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: 'var(--green)', font: '800 16px Syne', letterSpacing: '1px' }}>VGSL</strong>
          <a 
            href="https://1xbet.com/en/user/registration/" 
            target="_blank" 
            rel="noreferrer"
            className="green"
            style={{ padding: '5px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: '800', textDecoration: 'none' }}
          >
            {t?.promoBanner?.registerBtn || 'Register'}
          </a>
        </div>
      </div>

      {nav.map(([icon, p]) => (
        <button className={page === p ? 'active' : ''} onClick={() => move(p)} key={p}>
          <b>{icon}</b>{t.nav[p] || p}
        </button>
      ))}
      {user?.role === 'ADMIN' && <button className={page === 'Admin' ? 'active' : ''} onClick={() => move('Admin')}><b>🛡️</b>Admin Dashboard</button>}
      <div className="drawer-bottom">
        <div style={{ display: 'flex', gap: '4px', width: '100%', margin: '4px 0' }}>
          <button 
            type="button" 
            style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: '1px solid var(--line)', background: lang === 'en' ? 'var(--green)' : 'rgba(255,255,255,0.08)', color: lang === 'en' ? '#102000' : 'var(--ink)' }}
            onClick={() => { setLang('en'); setDrawer(false); }}
          >
            🌐 EN
          </button>
          <button 
            type="button" 
            style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: '1px solid var(--line)', background: lang === 'si' ? 'var(--green)' : 'rgba(255,255,255,0.08)', color: lang === 'si' ? '#102000' : 'var(--ink)' }}
            onClick={() => { setLang('si'); setDrawer(false); }}
          >
            🇱🇰 SI
          </button>
          <button 
            type="button" 
            style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', border: '1px solid var(--line)', background: lang === 'ta' ? 'var(--green)' : 'rgba(255,255,255,0.08)', color: lang === 'ta' ? '#102000' : 'var(--ink)' }}
            onClick={() => { setLang('ta'); setDrawer(false); }}
          >
            🇱🇰 TA
          </button>
        </div>
        <button 
          type="button" 
          className="theme-toggle-btn" 
          onClick={toggleTheme}
          style={{ justifyContent: 'center' }}
        >
          {theme === 'dark' ? t.header.switchToLight : t.header.switchToDark}
        </button>
        {user ? (
          <span>👤 {user.fullName}<small>{t.header.playerId}: {user.playerId || t.header.notSaved}</small></span>
        ) : (
          <button onClick={() => move('Login')}>{t.header.loginRegister}</button>
        )}
        <button className="green" onClick={() => move('Support')}>{t.header.contactAgent}</button>
      </div>
    </aside>
    {drawer && <div className="scrim" onClick={() => setDrawer(false)} />}
  </>
);

// --- Content Components ---

const Home = ({ move, notify, t }) => (
  <>
    <PromoBanner notify={notify} t={t} />
    <section className="hero">
      <span className="pill">{t.hero.pill}</span>
      <h1>{t.hero.titleStart}<em>{t.hero.titleEm}</em>{t.hero.titleEnd}</h1>
      <p>{t.hero.subtitle}</p>
      <div className="actions">
        <button className="green" onClick={() => move('Deposit')}>{t.hero.depositBtn}</button>
        <button className="blue" onClick={() => move('Withdraw')}>{t.hero.withdrawBtn}</button>
        <button onClick={() => move('Support')}>{t.hero.contactBtn}</button>
      </div>
    </section>
    <section className="features">
      {[
        ['↘', t.features.fastDeposits, t.features.fastDepositsDesc],
        ['↗', t.features.quickWithdrawals, t.features.quickWithdrawalsDesc],
        ['◌', t.features.support247, t.features.support247Desc],
        ['◇', t.features.secureAssistance, t.features.secureAssistanceDesc]
      ].map(x => (
        <article key={x[1]}>
          <b>{x[0]}</b>
          <h3>{x[1]}</h3>
          <p>{x[2]}</p>
        </article>
      ))}
    </section>
    <Info t={t} />
    <PrivacyPolicyPage t={t} />
    <Responsible t={t} />
  </>
);

const Info = ({ t }) => (
  <section className="panel">
    <h2>{t.info.title}</h2>
    <p>{t.info.desc1}</p>
    <div className="chips">
      {t.info.chips.map(x => <span key={x}>{x}</span>)}
    </div>
    <p>{t.info.desc2}</p>
  </section>
);

const Responsible = ({ t }) => (
  <section className="responsible">
    <h2>{t.responsible.title}</h2>
    <p>{t.responsible.desc}</p>
  </section>
);

const Empty = ({ text, action, t }) => (
  <div className="empty">
    <p>{text}</p>
    <button onClick={action}>{t?.empty?.continue || 'Continue'}</button>
  </div>
);

const maskNumber = (str) => {
  if (!str) return '';
  const s = String(str).trim();
  if (s.length <= 8) {
    return s.slice(0, 4) + '•'.repeat(Math.max(2, s.length - 4));
  }
  if (s.length <= 11) {
    return s.slice(0, 4) + '••••' + s.slice(-3);
  }
  const maskedLength = Math.max(4, s.length - 8);
  return s.slice(0, 4) + '•'.repeat(maskedLength) + s.slice(-4);
};

const defaultAgentAccounts = [
  { id: 'boc', name: 'BOC (Walasmulla)', number: '95645895', icon: '🏦', type: 'BANK' },
  { id: 'peoples', name: "PEOPLE'S BANK", number: '120200380030196', icon: '🏦', type: 'BANK' },
  { id: 'sampath', name: 'SAMPATH BANK', number: '105456146706', icon: '🏦', type: 'BANK' },
  { id: 'lolc', name: 'LOLC BANK', number: '01210012722', icon: '🏦', type: 'BANK' },
  { id: 'ipay_1', name: 'iPay Mobile 1', number: '0740452530', icon: '📱', type: 'IPAY' },
  { id: 'ipay_2', name: 'iPay Mobile 2', number: '0703346455', icon: '📱', type: 'IPAY' }
];

const formattedFullDetails = `🏦 BOC (Walasmulla): 95645895\n🏦 PEOPLE'S BANK: 120200380030196\n🏦 SAMPATH BANK: 105456146706\n🏦 LOLC BANK: 01210012722\n\n📱 iPay: 0740452530 / 0703346455`;

const AgentAccountRow = ({ acc, notify, t }) => {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="agent-detail-row">
      <div>
        <span className="detail-label">{acc.icon} {acc.name}</span>
        <strong className="detail-value highlighting">
          {revealed ? acc.number : maskNumber(acc.number)}
        </strong>
      </div>
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setRevealed(!revealed)}
          className="toggle-btn"
          title={revealed ? t.agentAccounts.hideTitle : t.agentAccounts.showTitle}
        >
          {revealed ? t.agentAccounts.hide : t.agentAccounts.show}
        </button>
        <CopyButton
          text={acc.number}
          label={t.agentAccounts.copy}
          notify={notify}
          message={`${acc.name} ${t.agentAccounts.accountCopied}`}
          t={t}
        />
      </div>
    </div>
  );
};

const AgentAccountsCard = ({ config, notify, title, t }) => {
  const accounts = Array.isArray(config?.agentBankDetails) ? config.agentBankDetails : defaultAgentAccounts;
  const cardTitle = title || t.agentAccounts.title;

  return (
    <div className="agent-details-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <h2>{cardTitle}</h2>
        <span style={{ fontSize: '11px', color: 'var(--muted)', background: 'rgba(255,255,255,0.06)', padding: '4px 8px', borderRadius: '6px' }}>
          {t.agentAccounts.maskedBadge}
        </span>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--muted)' }}>
        {t.agentAccounts.desc}
      </p>

      {accounts.map(acc => (
        <AgentAccountRow key={acc.id} acc={acc} notify={notify} t={t} />
      ))}

      <div className="agent-detail-actions">
        <CopyButton
          text={formattedFullDetails}
          label={t.agentAccounts.copyAll}
          notify={notify}
          message={t.agentAccounts.copyAllSuccess}
          t={t}
        />
      </div>
    </div>
  );
};

const getDepositInstructionText = (lang) => {
  if (lang === 'si') {
    return `මුදල් තැන්පත් කිරීමේ පියවර:
1️⃣ අපගේ නිල නියෝජිත බැංකු ගිණුමකට (BOC, People's Bank, Sampath, LOLC) හෝ iPay අංකයකට මුදල් තැන්පත් කරන්න.
2️⃣ ඔබේ 1xBet Player ID එක, මුදල සහ Payment Method එක පහත ෆෝම් එකෙහි ඇතුළත් කරන්න.
3️⃣ 'Submit deposit request' ක්ලික් කර Request ID එක ලබා ගන්න.

📍 24/7 වේගවත් සහ විශ්වාසනීය තැන්පතු සේවාව!`;
  } else if (lang === 'ta') {
    return `டெபாசிட் செய்யும் படிகள்:
1️⃣ எங்கள் அதிகாரப்பூர்வ முகவர் வங்கி கணக்குகளில் (BOC, People's Bank, Sampath, LOLC) அல்லது iPay எண்களில் பணத்தை டெபாசிட் செய்யவும்.
2️⃣ உங்கள் 1xBet Player ID, தொகை மற்றும் செலுத்தும் முறையை கீழே உள்ள படிவத்தில் உள்ளிடவும்.
3️⃣ 'Submit deposit request' என்பதைக் கிளிக் செய்து உங்கள் Request ID ஐப் பெறவும்.

📍 24/7 வேகமான மற்றும் விசுவாசமான சேவை!`;
  }
  return `1xBet Deposit Steps:
1️⃣ Deposit money into any of our official agent bank accounts (BOC, People's Bank, Sampath, LOLC) or iPay numbers.
2️⃣ Enter your 1xBet Player ID, amount, and payment method in the form below.
3️⃣ Click 'Submit deposit request' to receive your Request ID.

📍 24/7 Fast & Reliable Deposit Service!`;
};

const DepositInstructionsCard = ({ notify, lang, t }) => (
  <div className="agent-details-card" style={{ borderColor: 'rgba(182, 255, 53, 0.35)', background: 'rgba(8, 23, 32, 0.9)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
      <h2 style={{ color: 'var(--green)', fontSize: '18px', margin: 0 }}>
        {t.depositPage.stepsTitle}
      </h2>
      {notify && (
        <CopyButton
          text={getDepositInstructionText(lang)}
          label={t.depositPage.copyInstructionsBtn}
          notify={notify}
          message={t.depositPage.copyInstructionsSuccess}
          t={t}
        />
      )}
    </div>

    <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
      <p style={{ margin: '0 0 10px', fontWeight: '700', color: 'var(--green)' }}>
        {t.depositPage.stepsHeader}
      </p>
      <div style={{ display: 'grid', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>{t.depositPage.step1}</div>
        <div>{t.depositPage.step2}</div>
        <div>{t.depositPage.step3}</div>
      </div>
      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(182, 255, 53, 0.08)', borderRadius: '10px', borderLeft: '4px solid var(--green)', fontSize: '13px' }}>
        {t.depositPage.stepsNote}
      </div>
    </div>
  </div>
);

const processImageFile = (file, callback) => {
  if (!file) return;
  const reader = new window.FileReader();
  reader.onload = (e) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      const MAX = 1000;
      if (width > height) {
        if (width > MAX) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        }
      } else {
        if (height > MAX) {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

const Deposit = ({ submit, form, setForm, config, notify, lang, t }) => {
  const handleDataExtracted = (extracted) => {
    setForm(prev => {
      const updated = { ...prev };
      if (extracted.amount) {
        updated.amount = extracted.amount;
      }
      if (extracted.reference) {
        updated.receiptReference = extracted.reference;
      }
      if (extracted.paymentMethod && !prev.paymentMethod) {
        updated.paymentMethod = extracted.paymentMethod;
      }
      return updated;
    });
  };

  return (
    <section className="wizard">
      <p className="eyebrow">{t.depositPage.eyebrow}</p>
      <h1>{t.depositPage.title}</h1>
      <p>{t.depositPage.subtitle}</p>

      <DepositInstructionsCard notify={notify} lang={lang} t={t} />

      <AgentAccountsCard config={config} notify={notify} title={t.agentAccounts.title} t={t} />

      {/* AI OCR Receipt Scanner Component */}
      <ReceiptScanner
        onDataExtracted={handleDataExtracted}
        onImageReady={(dataUrl) => setForm(prev => ({ ...prev, receiptImage: dataUrl }))}
        receiptImage={form.receiptImage}
        onRemoveImage={() => setForm(prev => ({ ...prev, receiptImage: null, receiptReference: '' }))}
        notify={notify}
        lang={lang}
        t={t}
      />

      <form onSubmit={e => submit('Deposit', e)}>
        <Field label={t.depositPage.playerIdLabel} name="playerId" placeholder="e.g. 12345678" form={form} setForm={setForm} />
        <Field label={t.depositPage.amountLabel} name="amount" type="number" min={config?.minTransaction || 100} max={config?.maxTransaction || 500000} placeholder="e.g. 5000" form={form} setForm={setForm} />
        <label>
          {t.depositPage.methodLabel}
          <select required value={form.paymentMethod || ''} onChange={e => setForm(prev => ({ ...prev, paymentMethod: e.target.value }))}>
            <option value="">{t.depositPage.chooseMethod}</option>
            <option value="BANK_TRANSFER">{t.depositPage.bankTransfer}</option>
            <option value="MOBILE_BANKING">{t.depositPage.mobileBanking}</option>
            <option value="OTHER">{t.depositPage.otherMethod}</option>
          </select>
        </label>

        {form.receiptReference && (
          <div style={{ padding: '8px 12px', background: 'rgba(34, 199, 255, 0.1)', border: '1px solid rgba(34, 199, 255, 0.3)', borderRadius: '10px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)' }}>Receipt Ref:</span>
            <span style={{ fontFamily: 'monospace', fontWeight: '700', color: 'var(--blue)' }}>{form.receiptReference}</span>
          </div>
        )}

        <button className="green">{t.depositPage.submitBtn}</button>
      </form>
      <small>{t.depositPage.limits} {config?.minTransaction?.toLocaleString() || 1000}–{config?.maxTransaction?.toLocaleString() || 500000}.</small>
    </section>
  );
};

const getWithdrawalInstructionText = (lang) => {
  if (lang === 'si') {
    return `ඔබේ මුදල් ලබා ගැනීමට පහත පියවර අනුගමනය කරන්න:
1️⃣ ඔබේ 1xBet App එකේ Withdraw වෙත ගොස් 'Cash' යන්න තෝරන්න.
2️⃣ එහි City ලෙස Walasmulla සහ Street ලෙස Beliatta Road 24/7 යන්න තෝරන්න.
3️⃣ ඉන්පසු ලැබෙන Security Code එක සහ ඔබේ Player ID එක මෙහි ලබා දෙන්න.

📍 අපගේ පිහිටීම: Walasmulla, Beliatta Road (24/7 Service)`;
  } else if (lang === 'ta') {
    return `பணத்தைத் திரும்பப் பெற இந்த படிகளைப் பின்தொடரவும்:
1️⃣ 1xBet பயன்பாட்டில் Withdraw சென்று 'Cash' என்பதைத் தேர்ந்தெடுக்கவும்.
2️⃣ நகரம் Walasmulla மற்றும் தெரு Beliatta Road 24/7 எனத் தேர்ந்தெடுக்கவும்.
3️⃣ பாதுகாப்பு குறியீடு மற்றும் உங்கள் Player ID ஐ இங்கே உள்ளிடவும்.

📍 எங்கள் இருப்பிடம்: Walasmulla, Beliatta Road (24/7 சேவை)`;
  }
  return `Follow these steps to request a cash withdrawal:
1️⃣ Open 1xBet App, go to Withdraw and select 'Cash'.
2️⃣ Select City as Walasmulla and Street as Beliatta Road 24/7.
3️⃣ Enter the Security Code and your Player ID in the form below.

📍 Our Location: Walasmulla, Beliatta Road (24/7 Service)`;
};

const WithdrawalInstructionsCard = ({ notify, lang, t }) => (
  <div className="agent-details-card" style={{ borderColor: 'rgba(34, 199, 255, 0.35)', background: 'rgba(8, 23, 32, 0.9)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
      <h2 style={{ color: 'var(--blue)', fontSize: '18px', margin: 0 }}>
        {t.withdrawPage.stepsTitle}
      </h2>
      {notify && (
        <CopyButton
          text={getWithdrawalInstructionText(lang)}
          label={t.withdrawPage.copyInstructionsBtn}
          notify={notify}
          message={t.withdrawPage.copyInstructionsSuccess}
          t={t}
        />
      )}
    </div>

    <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--ink)' }}>
      <p style={{ margin: '0 0 10px', fontWeight: '700', color: 'var(--green)' }}>
        {t.withdrawPage.stepsHeader}
      </p>
      <div style={{ display: 'grid', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>{t.withdrawPage.step1}</div>
        <div>{t.withdrawPage.step2}</div>
        <div>{t.withdrawPage.step3}</div>
      </div>
      <div style={{ marginTop: '12px', padding: '10px 14px', background: 'rgba(34, 199, 255, 0.08)', borderRadius: '10px', borderLeft: '4px solid var(--blue)', fontSize: '13px' }}>
        {t.withdrawPage.location}
      </div>
    </div>
  </div>
);

const Withdraw = ({ submit, form, setForm, notify, lang, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.withdrawPage.eyebrow}</p>
    <h1>{t.withdrawPage.title}</h1>
    <p>{t.withdrawPage.subtitle}</p>

    <WithdrawalInstructionsCard notify={notify} lang={lang} t={t} />

    <form onSubmit={e => submit('Withdraw', e)}>
      <Field label={t.withdrawPage.playerIdLabel} name="playerId" placeholder="e.g. 12345678" form={form} setForm={setForm} />
      <Field label={t.withdrawPage.securityCodeLabel} name="securityCode" required={false} placeholder="e.g. 48291" form={form} setForm={setForm} />
      <Field label={t.withdrawPage.fullNameLabel} name="fullName" placeholder="e.g. A. B. Perera" form={form} setForm={setForm} />
      <Field label={t.withdrawPage.bankLabel} name="bank" placeholder="e.g. Commercial Bank" form={form} setForm={setForm} />
      <Field label={t.withdrawPage.accountNumberLabel} name="accountNumber" placeholder="e.g. 8001234567" form={form} setForm={setForm} />
      <Field label={t.withdrawPage.amountLabel} name="amount" type="number" min={100} max={500000} placeholder="e.g. 5000" form={form} setForm={setForm} />
      <Field label={t.withdrawPage.contactLabel} name="contactNumber" required={false} placeholder="e.g. 0771234567" form={form} setForm={setForm} />
      <button className="blue">{t.withdrawPage.submitBtn}</button>
    </form>
  </section>
);

const getWhatsAppUrl = (tx, lang = 'en', user = null) => {
  const phone = '94765865387';
  if (!tx) {
    const userPlayerId = user?.playerId;
    const userId = user?.id;
    const userInfoStr = userPlayerId 
      ? `\n👤 Player ID: ${userPlayerId}` 
      : (userId && userId !== 'GUEST' ? `\n👤 User ID: ${userId}` : '');

    let generalMsg = '';
    if (lang === 'si') {
      generalMsg = `👋 හෙලෝ Fast Cash නියෝජිතතුමනි!\nමට 1xBet Deposit / Withdrawal සඳහා සහාය අවශ්‍යයි.${userInfoStr}`;
    } else if (lang === 'ta') {
      generalMsg = `👋 வணக்கம் Fast Cash முகவரே!\nஎனக்கு 1xBet டெபாசிட் / திரும்பப் பெறுதலுக்கு உதவி தேவை.${userInfoStr}`;
    } else {
      generalMsg = `👋 Hello Fast Cash Agent!\nI need assistance with 1xBet Deposit / Withdrawal.${userInfoStr}`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(generalMsg)}`;
  }

  const txTypeRaw = String(tx.type || '').toUpperCase();
  const isDeposit = txTypeRaw.includes('DEP') || txTypeRaw === 'DEPOSIT';

  const resolvedPlayerId = tx.playerId || user?.playerId || 'N/A';
  const resolvedUserId = tx.userId || user?.id || null;
  const refId = tx.id || 'N/A';
  const formattedAmount = Number(tx.amount || 0).toLocaleString();
  const dateStr = tx.createdAt ? new Date(tx.createdAt) : new Date();

  let message = '';

  if (lang === 'si') {
    if (isDeposit) {
      message = `📥 *නව තැන්පතු ඉල්ලීම - FAST CASH*\n` +
        `----------------------------------\n` +
        `🆔 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== 'GUEST' ? `🆔 *User ID:* ${resolvedUserId}\n` : '') +
        `💰 *මුදල:* LKR ${formattedAmount}\n` +
        `💳 *ගෙවූ ක්‍රමය:* ${tx.paymentMethod || 'Bank Deposit'}\n` +
        (tx.receiptReference ? `🧾 *රිසිට්පත් Ref:* ${tx.receiptReference}\n` : '') +
        `${tx.receiptImage ? '📸 *ගෙවූ රිසිට්පත:* Portal එකට එකතු කර ඇත\n' : ''}` +
        `📅 *දිනය:* ${dateStr.toLocaleString('si-LK')}\n\n` +
        `කරුණාකර මාගේ තැන්පතු ඉල්ලීම සලකා බලන්න. ස්තුතියි!`;
    } else {
      message = `📤 *නව මුදල් ආපසු ගැනීමේ ඉල්ලීම - FAST CASH*\n` +
        `----------------------------------\n` +
        `🆔 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== 'GUEST' ? `🆔 *User ID:* ${resolvedUserId}\n` : '') +
        `🔐 *Security Code:* ${tx.securityCode || 'N/A'}\n` +
        `👤 *සම්පූර්ණ නම:* ${tx.fullName || 'N/A'}\n` +
        `🏦 *බැංකුව:* ${tx.bank || 'N/A'}\n` +
        `🔢 *ගිණුම් අංකය:* ${tx.accountNumber || 'N/A'}\n` +
        `💰 *මුදල:* LKR ${formattedAmount}\n` +
        `📱 *දුරකථන අංකය:* ${tx.contactNumber || 'N/A'}\n` +
        `📅 *දිනය:* ${dateStr.toLocaleString('si-LK')}\n\n` +
        `කරුණාකර මාගේ මුදල් බැංකු ගිණුමට ලබා දෙන්න. ස්තුතියි!`;
    }
  } else if (lang === 'ta') {
    if (isDeposit) {
      message = `📥 *புதிய டெபாசிட் கோரிக்கை - FAST CASH*\n` +
        `----------------------------------\n` +
        `🆔 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== 'GUEST' ? `🆔 *User ID:* ${resolvedUserId}\n` : '') +
        `💰 *தொகை:* LKR ${formattedAmount}\n` +
        `💳 *செலுத்தும் முறை:* ${tx.paymentMethod || 'Bank Deposit'}\n` +
        (tx.receiptReference ? `🧾 *ரசீது Ref:* ${tx.receiptReference}\n` : '') +
        `${tx.receiptImage ? '📸 *ரசீது:* இணைக்கப்பட்டுள்ளது\n' : ''}` +
        `📅 *தேதி:* ${dateStr.toLocaleString('ta-LK')}\n\n` +
        `தயவுசெய்து எனது டெபாசிட் கோரிக்கையைச் செயலாக்கவும். நன்றி!`;
    } else {
      message = `📤 *புதிய திரும்பப் பெறுதல் கோரிக்கை - FAST CASH*\n` +
        `----------------------------------\n` +
        `🆔 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== 'GUEST' ? `🆔 *User ID:* ${resolvedUserId}\n` : '') +
        `🔐 *பாதுகாப்பு குறியீடு:* ${tx.securityCode || 'N/A'}\n` +
        `👤 *முழு பெயர்:* ${tx.fullName || 'N/A'}\n` +
        `🏦 *வங்கி:* ${tx.bank || 'N/A'}\n` +
        `🔢 *கணக்கு எண்:* ${tx.accountNumber || 'N/A'}\n` +
        `💰 *தொகை:* LKR ${formattedAmount}\n` +
        `📱 *தொடர்பு:* ${tx.contactNumber || 'N/A'}\n` +
        `📅 *தேதி:* ${dateStr.toLocaleString('ta-LK')}\n\n` +
        `தயவுசெய்து எனது பணத்தை வங்கி கணக்கிற்கு அனுப்பவும். நன்றி!`;
    }
  } else {
    if (isDeposit) {
      message = `📥 *NEW DEPOSIT REQUEST - FAST CASH*\n` +
        `----------------------------------\n` +
        `🆔 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== 'GUEST' ? `🆔 *User ID:* ${resolvedUserId}\n` : '') +
        `💰 *Amount:* LKR ${formattedAmount}\n` +
        `💳 *Payment Method:* ${tx.paymentMethod || 'Bank Deposit'}\n` +
        (tx.receiptReference ? `🧾 *Receipt Ref:* ${tx.receiptReference}\n` : '') +
        `${tx.receiptImage ? '📸 *Payment Slip:* Attached in portal\n' : ''}` +
        `📅 *Date:* ${dateStr.toLocaleString()}\n\n` +
        `Please process my deposit request. Thank you!`;
    } else {
      message = `📤 *NEW WITHDRAWAL REQUEST - FAST CASH*\n` +
        `----------------------------------\n` +
        `🆔 *Ref ID:* #${refId}\n` +
        `👤 *Player ID:* ${resolvedPlayerId}\n` +
        (resolvedUserId && resolvedUserId !== 'GUEST' ? `🆔 *User ID:* ${resolvedUserId}\n` : '') +
        `🔐 *Security Code:* ${tx.securityCode || 'N/A'}\n` +
        `👤 *Full Name:* ${tx.fullName || 'N/A'}\n` +
        `🏦 *Bank:* ${tx.bank || 'N/A'}\n` +
        `🔢 *Account No:* ${tx.accountNumber || 'N/A'}\n` +
        `💰 *Amount:* LKR ${formattedAmount}\n` +
        `📱 *Contact:* ${tx.contactNumber || 'N/A'}\n` +
        `📅 *Date:* ${dateStr.toLocaleString()}\n\n` +
        `Please process my withdrawal to my bank account. Thank you!`;
    }
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

const WhatsAppModal = ({ tx, onClose, lang, user, t }) => {
  if (!tx) return null;
  const url = getWhatsAppUrl(tx, lang, user);
  return (
    <div className="wa-modal-overlay">
      <div className="wa-modal">
        <h2>{t.whatsapp.modalTitle}</h2>
        <p>{t.whatsapp.modalDesc}</p>
        
        {tx.receiptImage && (
          <div style={{ margin: '10px 0 16px', textAlign: 'center' }}>
            <span style={{ fontSize: '12px', color: '#25d366', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
              {t.whatsapp.slipAttached}
            </span>
            <img
              src={tx.receiptImage}
              alt="Attached Receipt"
              style={{ maxHeight: '140px', maxWidth: '100%', borderRadius: '10px', border: '1px solid rgba(37,211,102,0.4)', objectFit: 'contain' }}
            />
          </div>
        )}

        <div className="wa-modal-actions">
          <a href={url} target="_blank" rel="noreferrer" className="wa-btn" style={{ padding: '14px', fontSize: '15px' }}>
            {t.whatsapp.sendNowBtn}
          </a>
          <button onClick={onClose} style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: 'var(--muted)' }}>
            {t.whatsapp.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};

const Transactions = ({ user, transactions, move, lang, t }) => (
  <section>
    <h1>{t.transactionsPage.title}</h1>
    {!user ? (
      <Empty text={t.transactionsPage.signInPrompt} action={() => move('Login')} t={t} />
    ) : transactions.length ? (
      <div className="transactions">
        {transactions.map(tItem => (
          <article key={tItem.id}>
            <span className={'status ' + tItem.status}>{t.status[tItem.status] || tItem.status}</span>
            <h3>{(t.type[tItem.type] || tItem.type)} · LKR {Number(tItem.amount).toLocaleString()}</h3>
            <p>{tItem.id} · {t.transactionsPage.playerID} {tItem.playerId}</p>
            <small style={{ display: 'block', marginBottom: '8px' }}>{new Date(tItem.createdAt).toLocaleString()}</small>
            
            {tItem.receiptImage && (
              <div style={{ margin: '8px 0', textAlign: 'center', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
                <span style={{ fontSize: '11px', color: 'var(--green)', display: 'block', marginBottom: '4px' }}>
                  {t.whatsapp.attachedSlip}
                </span>
                <img
                  src={tItem.receiptImage}
                  alt="Receipt"
                  style={{ maxHeight: '130px', maxWidth: '100%', borderRadius: '6px', objectFit: 'contain' }}
                />
              </div>
            )}

            <a 
              href={getWhatsAppUrl(tItem, lang, user)} 
              target="_blank" 
              rel="noreferrer" 
              className="wa-btn-sleek"
              style={{ width: '100%', marginTop: '6px' }}
            >
              {t.whatsapp.sendDetails}
            </a>
          </article>
        ))}
      </div>
    ) : (
      <Empty text={t.transactionsPage.noRequests} action={() => move('Deposit')} t={t} />
    )}
  </section>
);

const AdminDashboard = ({ user, notify }) => {
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('PENDING');
  const [busy, setBusy] = useState(null);
  const [notes, setNotes] = useState({});

  const load = async () => {
    try {
      const result = await api('/api/admin/overview');
      setData(result);
    } catch (error) {
      notify(error.message);
    }
  };

  useEffect(() => { if (user?.role === 'ADMIN') load(); }, [user?.role]);

  if (!user || user.role !== 'ADMIN') {
    return <section className="wizard"><h1>Administrator access required</h1><p>Sign in with an administrator account to review transactions.</p></section>;
  }

  const update = async (id, status) => {
    setBusy(id + status);
    try {
      await api(`/api/admin/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, note: notes[id] || undefined })
      });
      notify(`Transaction ${id} updated to ${status}.`);
      await load();
    } catch (error) {
      notify(error.message);
    } finally {
      setBusy(null);
    }
  };

  const transactions = (data?.transactions || []).filter(tx => filter === 'ALL' || tx.status === filter);
  const counts = (data?.transactions || []).reduce((acc, tx) => { acc[tx.status] = (acc[tx.status] || 0) + 1; return acc; }, {});

  return (
    <section className="admin-page">
      <div className="admin-heading">
        <div><span className="admin-kicker">SECURE ADMIN</span><h1>Transaction Review</h1><p>Review receipts and update payment requests after verification.</p></div>
        <button className="blue" onClick={load}>↻ Refresh</button>
      </div>
      <div className="admin-stats">
        <div><span>Pending</span><strong>{counts.PENDING || 0}</strong></div>
        <div><span>Processing</span><strong>{counts.PROCESSING || 0}</strong></div>
        <div><span>Completed</span><strong>{counts.COMPLETED || 0}</strong></div>
        <div><span>Total</span><strong>{data?.stats?.transactions || 0}</strong></div>
      </div>
      <div className="admin-filters">
        {['PENDING','PROCESSING','COMPLETED','REJECTED','CANCELLED','ALL'].map(status => (
          <button key={status} className={filter === status ? 'active' : ''} onClick={() => setFilter(status)}>{status} <b>{status === 'ALL' ? (data?.stats?.transactions || 0) : (counts[status] || 0)}</b></button>
        ))}
      </div>
      <div className="admin-list">
        {!transactions.length ? <div className="admin-empty">No transactions in this status.</div> : transactions.map(tx => (
          <article className="admin-card" key={tx.id}>
            <div className="admin-card-top"><span className={'status ' + tx.status}>{tx.status}</span><strong>{tx.type} · LKR {Number(tx.amount).toLocaleString()}</strong></div>
            <div className="admin-grid">
              <div><span>Request ID</span><b>{tx.id}</b></div>
              <div><span>Player ID</span><b>{tx.playerId}</b></div>
              <div><span>Created</span><b>{new Date(tx.createdAt).toLocaleString()}</b></div>
              <div><span>Payment</span><b>{tx.paymentMethod || tx.bank || '—'}</b></div>
              {tx.receiptReference && <div><span>Reference</span><b>{tx.receiptReference}</b></div>}
              {tx.accountNumber && <div><span>Account</span><b>••••{String(tx.accountNumber).slice(-4)}</b></div>}
            </div>
            {tx.receiptImage && <details className="admin-receipt"><summary>🧾 View receipt</summary><img src={tx.receiptImage} alt="Transaction receipt" /></details>}
            <textarea value={notes[tx.id] || ''} onChange={e => setNotes(prev => ({ ...prev, [tx.id]: e.target.value }))} placeholder="Optional admin note" maxLength={1000} />
            {tx.status !== 'COMPLETED' && tx.status !== 'REJECTED' && tx.status !== 'CANCELLED' && (
              <div className="admin-actions">
                {tx.status === 'PENDING' && <button className="blue" disabled={busy === tx.id + 'PROCESSING'} onClick={() => update(tx.id, 'PROCESSING')}>Processing</button>}
                <button className="green" disabled={busy === tx.id + 'COMPLETED'} onClick={() => update(tx.id, 'COMPLETED')}>✓ Approve / Complete</button>
                <button className="danger" disabled={busy === tx.id + 'REJECTED'} onClick={() => update(tx.id, 'REJECTED')}>Reject</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
};

const FAQSection = ({ lang, t }) => {
  const [openIndex, setOpenIndex] = useState(null);
  const list = lang === 'si' ? faqListSi : lang === 'ta' ? faqListTa : faqListEn;

  const toggle = (i) => {
    setOpenIndex(openIndex === i ? null : i);
  };

  return (
    <div className="faq-section">
      <h2>{t.faq.title}</h2>
      <p>{t.faq.subtitle}</p>
      <div className="faq-container">
        {list.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div className={`faq-item ${isOpen ? 'open' : ''}`} key={index}>
              <button
                type="button"
                className="faq-header"
                onClick={() => toggle(index)}
                aria-expanded={isOpen}
              >
                <span>{item.q}</span>
                <span className="faq-icon">{isOpen ? '➖' : '➕'}</span>
              </button>
              {isOpen && (
                <div className="faq-body">
                  {item.a.split('\n').map((line, lIdx) => (
                    <p key={lIdx} style={{ margin: '4px 0' }}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Support = ({ chat, chatText, setChatText, sendChat, config, notify, lang, t }) => {
  const phone = config?.whatsappNumber || '+94765865387';

  return (
    <section className="support">
      <h1>{t.supportPage.title}</h1>
      <p>{t.supportPage.subtitle}</p>

      <div className="agent-details-card">
        <h2>{t.supportPage.contactCardTitle}</h2>
        <div className="agent-detail-row">
          <div>
            <span className="detail-label">{t.supportPage.phoneLabel}</span>
            <strong className="detail-value">{phone}</strong>
          </div>
          <CopyButton text={phone} label={t.supportPage.copyPhoneBtn} notify={notify} message={t.supportPage.copyPhoneSuccess} t={t} />
        </div>
      </div>

      <AgentAccountsCard config={config} notify={notify} title={t.agentAccounts.title} t={t} />

      <FAQSection lang={lang} t={t} />

      <h2>{t.supportPage.assistantTitle}</h2>
      <p>{t.supportPage.assistantSubtitle}</p>
      <div className="chat">
        {chat.map((m, i) => <p className={m.role} key={i}>{m.content}</p>) || null}
      </div>
      <form onSubmit={sendChat}>
        <input 
          value={chatText} 
          onChange={e => setChatText(e.target.value)} 
          placeholder={t.supportPage.inputPlaceholder}
        />
        <button>{t.supportPage.sendBtn}</button>
      </form>
      <Responsible t={t} />
    </section>
  );
};

const Login = ({ login, form, setForm, move, t }) => (
  <section className="wizard">
    <h1>{t.login.title}</h1>
    <form onSubmit={login}>
      <Field label={t.login.emailLabel} name="email" type="email" placeholder="e.g. name@example.com" form={form} setForm={setForm} />
      <Field label={t.login.passwordLabel} name="password" type="password" placeholder="••••••••" form={form} setForm={setForm} />
      <button className="green">{t.login.loginBtn}</button>
    </form>
    <p>{t.login.newHere} <button type="button" className="link" onClick={() => move('Register')}>{t.login.createAccountBtn}</button></p>
  </section>
);

const Register = ({ form, setForm, notify, setUser, move, t }) => (
  <section className="wizard">
    <h1>{t.register.title}</h1>
    <form onSubmit={async e => {
      e.preventDefault();
      try {
        console.log('[Register] Submitting account creation form:', { email: form.email, fullName: form.fullName, playerId: form.playerId });
        const x = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(form) });
        setAuthToken(x.token);
        setUser(x.user);
        setForm({});
        notify(t.messages.accountCreated);
        move('Home');
      } catch (error) {
        console.error('[Register Failure]', error);
        notify(error.message);
      }
    }}>
      <Field label={t.register.fullNameLabel} name="fullName" placeholder="e.g. John Silva" form={form} setForm={setForm} />
      <Field label={t.register.emailLabel} name="email" type="email" placeholder="e.g. john@example.com" form={form} setForm={setForm} />
      <Field label={t.register.passwordLabel} name="password" type="password" placeholder="Minimum 10 characters" form={form} setForm={setForm} />
      <Field label={t.register.playerIdLabel} name="playerId" required={false} placeholder="e.g. 12345678 (Optional)" form={form} setForm={setForm} />
      <button className="green">{t.register.registerBtn}</button>
    </form>
  </section>
);

const PromotionsPage = ({ move, notify, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.promotionsPage.eyebrow}</p>
    <h1>{t.promotionsPage.title}</h1>
    <p>{t.promotionsPage.subtitle}</p>

    <div className="agent-details-card" style={{ borderColor: 'rgba(182, 255, 53, 0.4)', background: 'rgba(8, 23, 32, 0.95)' }}>
      <h2 style={{ color: 'var(--green)', fontSize: '20px', margin: '0 0 8px' }}>
        {t.promotionsPage.bonusTitle}
      </h2>
      <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--ink)' }}>
        {t.promotionsPage.bonusDesc}
      </p>

      <div className="agent-detail-row" style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '12px' }}>
        <div>
          <span className="detail-label">{t.promotionsPage.promoCodeLabel}</span>
          <strong className="detail-value" style={{ color: 'var(--green)', fontSize: '18px', letterSpacing: '1px' }}>
            {t.promotionsPage.promoCode}
          </strong>
        </div>
        <CopyButton
          text={t.promotionsPage.promoCode}
          label={t.promotionsPage.copyCodeBtn}
          notify={notify}
          message={t.promotionsPage.copyCodeSuccess}
          t={t}
        />
      </div>

      <div style={{ marginTop: '16px', fontSize: '13px', lineHeight: '1.7', color: 'var(--ink)' }}>
        <b>{t.promotionsPage.howToClaimTitle}</b>
        <div style={{ display: 'grid', gap: '6px', marginTop: '6px' }}>
          <div>{t.promotionsPage.step1}</div>
          <div>{t.promotionsPage.step2}</div>
          <div>{t.promotionsPage.step3}</div>
          <div>{t.promotionsPage.step4}</div>
        </div>
      </div>
    </div>

    <div className="agent-details-card" style={{ borderColor: 'rgba(34, 199, 255, 0.4)', background: 'rgba(8, 23, 32, 0.95)' }}>
      <h2 style={{ color: 'var(--blue)', fontSize: '18px', margin: '0 0 8px' }}>
        {t.promotionsPage.agentCashbackTitle}
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--ink)' }}>
        {t.promotionsPage.cashbackDesc}
      </p>
      <button className="green" onClick={() => move('Deposit')}>
        {t.promotionsPage.depositNowBtn}
      </button>
    </div>

    <Responsible t={t} />
  </section>
);

const Guide1xBetPage = ({ move, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.guide1xBetPage.eyebrow}</p>
    <h1>{t.guide1xBetPage.title}</h1>
    <p>{t.guide1xBetPage.subtitle}</p>

    <div className="agent-details-card">
      <h2 style={{ color: 'var(--green)', fontSize: '18px', margin: '0 0 8px' }}>
        {t.guide1xBetPage.downloadTitle}
      </h2>
      <p style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--ink)' }}>
        {t.guide1xBetPage.downloadDesc}
      </p>
    </div>

    <div className="agent-details-card" style={{ borderColor: 'rgba(182, 255, 53, 0.35)' }}>
      <h2 style={{ color: 'var(--green)', fontSize: '18px', margin: '0 0 8px' }}>
        {t.guide1xBetPage.playerIDTitle}
      </h2>
      <div style={{ display: 'grid', gap: '8px', fontSize: '14px', color: 'var(--ink)' }}>
        <div>{t.guide1xBetPage.step1}</div>
        <div>{t.guide1xBetPage.step2}</div>
        <div>{t.guide1xBetPage.step3}</div>
        <div>{t.guide1xBetPage.step4}</div>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
        <button className="green" onClick={() => move('Deposit')}>
          {t.guide1xBetPage.actionDeposit}
        </button>
        <button className="blue" onClick={() => move('Support')}>
          {t.guide1xBetPage.actionContact}
        </button>
      </div>
    </div>

    <Info t={t} />
  </section>
);

const GuideSportsPage = ({ move, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.guideSportsPage.eyebrow}</p>
    <h1>{t.guideSportsPage.title}</h1>
    <p>{t.guideSportsPage.subtitle}</p>

    <div className="agent-details-card" style={{ borderColor: 'rgba(182, 255, 53, 0.35)' }}>
      <h2 style={{ color: 'var(--green)', fontSize: '18px', margin: '0 0 8px' }}>
        {t.guideSportsPage.cardTitle}
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--ink)' }}>
        {t.guideSportsPage.cardDesc}
      </p>
      <button className="green" onClick={() => move('Deposit')}>
        {t.guideSportsPage.btnDeposit}
      </button>
    </div>

    <div className="agent-details-card" style={{ borderColor: 'rgba(34, 199, 255, 0.35)' }}>
      <h2 style={{ color: 'var(--blue)', fontSize: '18px', margin: '0 0 8px' }}>
        {t.guideSportsPage.withdrawTitle}
      </h2>
      <p style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--ink)' }}>
        {t.guideSportsPage.withdrawDesc}
      </p>
      <div style={{ padding: '8px 12px', background: 'rgba(34, 199, 255, 0.08)', borderRadius: '8px', fontSize: '13px', margin: '0 0 14px' }}>
        {t.guideSportsPage.locationNote}
      </div>
      <button className="blue" onClick={() => move('Withdraw')}>
        {t.guideSportsPage.btnWithdraw}
      </button>
    </div>

    <Responsible t={t} />
  </section>
);

const GuideCasinoPage = ({ move, t }) => (
  <section className="wizard">
    <p className="eyebrow">{t.guideCasinoPage.eyebrow}</p>
    <h1>{t.guideCasinoPage.title}</h1>
    <p>{t.guideCasinoPage.subtitle}</p>

    <div className="agent-details-card" style={{ borderColor: 'rgba(182, 255, 53, 0.35)' }}>
      <h2 style={{ color: 'var(--green)', fontSize: '18px', margin: '0 0 8px' }}>
        {t.guideCasinoPage.cardTitle}
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--ink)' }}>
        {t.guideCasinoPage.cardDesc}
      </p>
      <button className="green" onClick={() => move('Deposit')}>
        {t.guideCasinoPage.btnDeposit}
      </button>
    </div>

    <div className="agent-details-card" style={{ borderColor: 'rgba(34, 199, 255, 0.35)' }}>
      <h2 style={{ color: 'var(--blue)', fontSize: '18px', margin: '0 0 8px' }}>
        {t.guideCasinoPage.withdrawTitle}
      </h2>
      <p style={{ margin: '0 0 14px', fontSize: '14px', color: 'var(--ink)' }}>
        {t.guideCasinoPage.withdrawDesc}
      </p>
      <button className="blue" onClick={() => move('Withdraw')}>
        {t.guideCasinoPage.btnWithdraw}
      </button>
    </div>

    <Responsible t={t} />
  </section>
);

// --- Main App Component ---

function App() {
  const [theme, setTheme] = useState(() => (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('theme') : null) || 'dark');
  const [lang, setLangState] = useState(() => (typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('lang') : null) || 'en');
  const [page, setPage] = useState('Home');
  const [drawer, setDrawer] = useState(false);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState('');
  const [config, setConfig] = useState({ minTransaction: 1000, maxTransaction: 500000 });
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState({});
  const [chat, setChat] = useState([]);
  const [chatText, setChatText] = useState('');

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setLang = (nextLang) => {
    setLangState(nextLang);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('lang', nextLang);
    }
  };

  const t = translations[lang] || translations.en;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    if (drawer) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawer]);

  const notify = m => {
    setToast(m);
    setTimeout(() => setToast(''), 3500);
  };

  useEffect(() => {
    api('/api/config').then(setConfig).catch(() => notify(t.messages.unableToLoadConfig));
    api('/api/auth/me').then(x => { setUser(x.user); loadTransactions(); }).catch(() => {});
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTransactions = () => api('/api/transactions').then(x => setTransactions(x.transactions)).catch(() => {});

  const move = p => {
    setPage(p);
    setDrawer(false);
    setForm({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const [waModalTx, setWaModalTx] = useState(null);

  const submit = async (type, e) => {
    e.preventDefault();
    try {
      const endpoint = type === 'Deposit' ? '/api/deposits' : '/api/withdrawals';
      console.log(`[Submit ${type}] Payload:`, { ...form, receiptImage: form.receiptImage ? '[Receipt Image Attached]' : undefined });
      const data = await api(endpoint, { method: 'POST', body: JSON.stringify(form) });
      notify(`${t.type[type] || type} ${t.messages.requestSubmitted} ${data.transaction.id}`);
      setForm({});
      loadTransactions();
      setWaModalTx(data.transaction);
      
      const waUrl = getWhatsAppUrl(data.transaction, lang, user);
      setTimeout(() => {
        window.location.href = waUrl;
      }, 300);

      setPage('Transactions');
    } catch (error) {
      console.error(`[Submit ${type} Error]`, error);
      notify(error.message);
    }
  };

  const login = async e => {
    e.preventDefault();
    try {
      const x = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(form) });
      setAuthToken(x.token);
      setUser(x.user);
      setForm({});
      notify(t.messages.welcomeBack);
      setPage(x.user?.role === 'ADMIN' ? 'Admin' : 'Home');
    } catch (error) {
      notify(error.message);
    }
  };

  const sendChat = async e => {
    e.preventDefault();
    if (!chatText.trim()) return;
    const messages = [...chat, { role: 'user', content: chatText }];
    setChat(messages);
    setChatText('');
    try {
      const x = await api('/api/support/chat', { method: 'POST', body: JSON.stringify({ messages }) });
      setChat([...messages, { role: 'assistant', content: x.reply }]);
    } catch (error) {
      notify(error.message);
    }
  };

  const renderContent = () => {
    switch (page) {
      case 'Home':
        return <Home move={move} notify={notify} t={t} />;
      case 'Deposit':
        return <Deposit submit={submit} form={form} setForm={setForm} config={config} notify={notify} lang={lang} t={t} />;
      case 'Withdraw':
        return <Withdraw submit={submit} form={form} setForm={setForm} notify={notify} lang={lang} t={t} />;
      case 'Transactions':
        return <Transactions user={user} transactions={transactions} move={move} lang={lang} t={t} />;
      case 'Admin':
        return <AdminDashboard user={user} notify={notify} />;
      case 'Support':
        return <Support chat={chat} chatText={chatText} setChatText={setChatText} sendChat={sendChat} config={config} notify={notify} lang={lang} t={t} />;
      case 'Promotions':
        return <PromotionsPage move={move} notify={notify} t={t} />;
      case 'PrivacyPolicy':
        return <PrivacyPolicyPage t={t} />;
      case '1xBet':
        return <Guide1xBetPage move={move} t={t} />;
      case 'Sports':
      case 'Live Bet':
        return <GuideSportsPage move={move} t={t} />;
      case 'Casino':
        return <GuideCasinoPage move={move} t={t} />;
      case 'Login':
        return <Login login={login} form={form} setForm={setForm} move={move} t={t} />;
      case 'Register':
        return <Register form={form} setForm={setForm} notify={notify} setUser={setUser} move={move} t={t} />;
      default:
        return (
          <section>
            <h1>{page}</h1>
            <Info t={t} />
            <Empty text={t.empty.liveDataUnavailable} action={() => move('Support')} t={t} />
          </section>
        );
    }
  };

  return (
    <>
      <Header page={page} move={move} user={user} drawer={drawer} setDrawer={setDrawer} theme={theme} toggleTheme={toggleTheme} lang={lang} setLang={setLang} t={t} />
      <main>{renderContent()}</main>
      <footer>
        <b>FAST CASH</b>
        <span>{t.footer.text}</span>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => move('PrivacyPolicy')}>{t?.nav?.['PrivacyPolicy'] || 'Privacy Policy'}</button>
          <button onClick={() => move('Support')}>{t.footer.support}</button>
        </div>
      </footer>
      <div className="bottom-nav">
        {[
          ['⌂', 'Home'],
          ['↓', 'Deposit'],
          ['↑', 'Withdraw'],
          ['▤', 'Transactions'],
          ['☰', 'Menu']
        ].map(([i, p]) => (
          <button onClick={() => (p === 'Menu' ? setDrawer(true) : move(p))} key={p}>
            <b>{i}</b>{t.nav[p] || p}
          </button>
        ))}
      </div>
      
      {waModalTx && <WhatsAppModal tx={waModalTx} onClose={() => setWaModalTx(null)} lang={lang} user={user} t={t} />}

      <a 
        href={getWhatsAppUrl(null, lang, user)} 
        target="_blank" 
        rel="noreferrer" 
        className="floating-wa-fab"
        title={t.whatsapp.floatingTitle}
        aria-label="WhatsApp Support"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984 0 1.762.459 3.48 1.332 5.001L2 22l5.132-1.339c1.461.792 3.111 1.21 4.88 1.21h.005c5.505 0 9.988-4.478 9.989-9.985 0-2.667-1.037-5.176-2.924-7.062C17.195 2.937 14.685 2 12.012 2zm5.836 14.339c-.244.688-1.42 1.313-1.961 1.393-.497.073-1.139.11-3.328-.795-2.798-1.157-4.597-4.004-4.737-4.192-.138-.188-1.127-1.503-1.127-2.868 0-1.365.708-2.036.958-2.313.244-.271.533-.339.711-.339.178 0 .356.002.511.01.168.008.396-.064.62.473.229.549.778 1.897.845 2.035.067.138.112.301.022.481-.089.179-.134.292-.267.448-.133.156-.281.349-.401.468-.134.133-.274.279-.118.547.156.268.692 1.14 1.484 1.844 1.018.905 1.874 1.187 2.142 1.32.268.134.423.112.579-.067.156-.179.667-.778.845-1.045.178-.268.356-.223.599-.134.244.089 1.556.734 1.823.868.267.134.445.201.511.312.067.111.067.644-.177 1.332z"/>
        </svg>
      </a>

      {toast && <div className="toast" role="alert">{toast}</div>}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

