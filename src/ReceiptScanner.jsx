/* global console, FileReader, Image */
import React, { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';

const Icon = ({ children, size = 24, className = '', color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>
);
const UploadCloud = p => <Icon {...p}><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></Icon>;
const Sparkles = p => <Icon {...p}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></Icon>;
const ScanLine = p => <Icon {...p}><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="7" x2="17" y1="12" y2="12"/></Icon>;
const Loader2 = p => <Icon {...p}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></Icon>;
const CheckCircle2 = p => <Icon {...p}><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></Icon>;
const Calendar = p => <Icon {...p}><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="19" y1="10" y2="10"/></Icon>;
const Hash = p => <Icon {...p}><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></Icon>;
const Coins = p => <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/></Icon>;
const RefreshCw = p => <Icon {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></Icon>;
const Trash2 = p => <Icon {...p}><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></Icon>;
const Building2 = p => <Icon {...p}><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></Icon>;

const cleanOcrText = (text) => String(text || '')
  .replace(/\u00a0/g, ' ')
  .replace(/[|]/g, 'I')
  .replace(/[^\S\r\n]+/g, ' ')
  .replace(/\r/g, '');

const normalizeNumber = (value) => {
  if (!value) return '';
  const s = String(value).replace(/[^\d.,]/g, '');
  if (!s) return '';
  // Handle 5,000.00 and 5000.00 as well as 5.000,00.
  const normalized = s.includes(',') && s.includes('.')
    ? (s.lastIndexOf('.') > s.lastIndexOf(',') ? s.replace(/,/g, '') : s.replace(/\./g, '').replace(',', '.'))
    : s.includes(',') && /,\d{1,2}$/.test(s)
      ? s.replace(',', '.')
      : s.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? String(Number(n.toFixed(2))) : '';
};

const amountCandidates = (text) => {
  const lines = cleanOcrText(text).split('\n').map(x => x.trim()).filter(Boolean);
  const candidates = [];
  const amountLabel = /\b(amount|total|paid|payment|deposit|transferred|transfer|debit|credit|value|sum|received|sent|lkr|rs\.?)\b/i;
  const money = /(?:LKR|Rs\.?|රු\.?)?\s*([0-9]{1,3}(?:[,\s][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]{3,9}(?:[.,][0-9]{1,2})?)/gi;

  lines.forEach((line, index) => {
    for (const m of line.matchAll(money)) {
      const raw = m[1];
      const value = Number(normalizeNumber(raw));
      if (!Number.isFinite(value) || value < 50 || value > 50000000) continue;
      let score = 1;
      if (/\bLKR\b|Rs\.?|රු\.?/i.test(line)) score += 5;
      if (amountLabel.test(line)) score += 4;
      if (/[.,]\d{2}\b/.test(raw)) score += 1;
      if (index > 0 && amountLabel.test(lines[index - 1])) score += 4;
      if (index + 1 < lines.length && amountLabel.test(lines[index + 1])) score += 2;
      // Account/reference-like long integers are less likely to be an amount.
      if (/^\d{9,}$/.test(raw.replace(/\D/g, ''))) score -= 2;
      candidates.push({ value: String(value), score });
    }
  });
  return candidates.sort((a, b) => b.score - a.score);
};

export const parseReceiptText = (text) => {
  const rawText = cleanOcrText(text);
  if (!rawText) return { amount: '', reference: '', date: '', paymentMethod: '', rawText: '', confidence: 0 };

  const lines = rawText.split('\n').map(x => x.trim()).filter(Boolean);

  // Prefer values explicitly next to an amount label/currency.
  const amounts = amountCandidates(rawText);
  const amount = amounts[0]?.value || '';

  // Reference/transaction IDs: support bank formats with prefixes and long numeric IDs.
  const refPatterns = [
    /\b(?:reference|ref(?:erence)?|transaction\s*(?:id|no|number)?|txn\s*(?:id|no|number)?|journal\s*(?:no|number)?|trace\s*(?:no|number)?|receipt\s*(?:no|number)?|utr|rrn)\s*[:#.\-]?\s*([A-Z0-9][A-Z0-9\-\/]{5,30})\b/i,
    /\b(?:FT|TXN|TRX|REF|RRN|UTR|JNL|JRN)[A-Z0-9\-]{5,30}\b/i
  ];
  let reference = '';
  for (const pattern of refPatterns) {
    const match = rawText.match(pattern);
    if (match) {
      reference = (match[1] || match[0]).replace(/[.,;:]+$/, '').trim();
      break;
    }
  }

  // If no labeled reference was found, use a likely long alphanumeric transaction token,
  // but avoid phone numbers, dates and obvious amounts.
  if (!reference) {
    const tokens = rawText.match(/\b[A-Z]{2,5}[A-Z0-9\-]{5,25}\b|\b\d{10,24}\b/gi) || [];
    const bad = /^(?:19|20)\d{2}|^0?7\d{8}$|^947\d{9}$/;
    reference = tokens.find(t => !bad.test(t) && !amounts.some(a => a.value.replace(/\D/g, '') === t)) || '';
  }

  const datePatterns = [
    /\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b/,
    /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{4}\b/,
    /\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i,
    /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i
  ];
  let date = '';
  for (const p of datePatterns) {
    const match = rawText.match(p);
    if (match) { date = match[0]; break; }
  }

  const lower = rawText.toLowerCase();
  const bankNames = [
    ['boc', 'BANK_TRANSFER'], ['bank of ceylon', 'BANK_TRANSFER'], ['ceylon bank', 'BANK_TRANSFER'],
    ['sampath', 'BANK_TRANSFER'], ['commercial bank', 'BANK_TRANSFER'], ['combank', 'BANK_TRANSFER'],
    ['people', 'BANK_TRANSFER'], ["people's bank", 'BANK_TRANSFER'], ['hnb', 'BANK_TRANSFER'],
    ['hatton national', 'BANK_TRANSFER'], ['seylan', 'BANK_TRANSFER'], ['seylan bank', 'BANK_TRANSFER'],
    ['ndb', 'BANK_TRANSFER'], ['nsb', 'BANK_TRANSFER'], ['dfcc', 'BANK_TRANSFER'],
    ['lolc', 'BANK_TRANSFER'], ['frimi', 'MOBILE_BANKING'], ['fri mi', 'MOBILE_BANKING'],
    ['genie', 'MOBILE_BANKING'], ['ipay', 'MOBILE_BANKING'], ['i-pay', 'MOBILE_BANKING'],
    ['ez cash', 'MOBILE_BANKING'], ['mcash', 'MOBILE_BANKING'], ['m cash', 'MOBILE_BANKING']
  ];
  const paymentMethod = bankNames.find(([name]) => lower.includes(name))?.[1] || '';

  const found = [amount, reference, date, paymentMethod].filter(Boolean).length;
  const confidence = Math.min(99, Math.round((found / 4) * 70 + (amount ? 15 : 0) + (reference ? 15 : 0)));

  return { amount, reference, date, paymentMethod, rawText, confidence };
};

const loadImage = (source) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.onload = e => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = e.target.result;
  };
  reader.readAsDataURL(source);
});

const preprocessImage = async (file, mode = 'enhanced') => {
  const img = await loadImage(file);
  const maxDim = 2200;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }
  // Small screenshots benefit substantially from upscaling.
  if (Math.max(width, height) < 1500) {
    const scale = Math.min(2, 1500 / Math.max(width, height));
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    if (mode === 'threshold') {
      const v = lum > 165 ? 255 : lum < 95 ? 0 : Math.round(((lum - 95) / 70) * 255);
      d[i] = d[i + 1] = d[i + 2] = v;
    } else {
      const v = Math.max(0, Math.min(255, (lum - 128) * 1.45 + 128));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/jpeg', mode === 'threshold' ? 0.92 : 0.95);
};

export const processReceiptImageToDataUrl = (file, callback) => {
  preprocessImage(file, 'enhanced').then(callback).catch(() => {
    const reader = new FileReader();
    reader.onload = e => callback(e.target.result);
    reader.readAsDataURL(file);
  });
};

const ReceiptScanner = ({ onDataExtracted, onImageReady, receiptImage, onRemoveImage, notify, lang = 'si' }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [extractedInfo, setExtractedInfo] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const texts = {
    dropzoneTitle: lang === 'si' ? 'බැංකු රිසිට්පත මෙතැනට Drag කරන්න, නැතහොත්' : lang === 'ta' ? 'ரசீதை இங்கே Drag செய்யவும், அல்லது' : 'Drag & drop bank receipt here, or',
    browseBtn: 'Browse Files',
    dropzoneDesc: lang === 'si' ? 'OCR මඟින් මුදල, Reference ID, දිනය සහ ගෙවීම් ක්‍රමය හඳුනාගෙන Form එක පුරවයි' : lang === 'ta' ? 'OCR மூலம் தொகை, Ref ID மற்றும் தேதி தானாக கண்டறியப்படும்' : 'Enhanced OCR detects Amount, Reference ID, Date and payment method',
    scanning: lang === 'si' ? 'රිසිට්පත විශ්ලේෂණය වෙමින් පවතී...' : lang === 'ta' ? 'ரசீது ஸ்கேன் செய்யப்படுகிறது...' : 'Analyzing receipt with enhanced OCR...',
    detectedHeader: lang === 'si' ? 'රිසිට්පතෙන් හඳුනාගත් තොරතුරු' : lang === 'ta' ? 'ரசீதில் கண்டறியப்பட்ட விவரங்கள்' : 'Receipt Details Detected',
    amount: lang === 'si' ? 'හඳුනාගත් මුදල' : lang === 'ta' ? 'தொகை' : 'Detected Amount',
    ref: lang === 'si' ? 'Ref / Journal No' : lang === 'ta' ? 'Ref ID' : 'Ref / Txn ID',
    date: lang === 'si' ? 'දිනය' : lang === 'ta' ? 'தேதி' : 'Date',
    bankType: lang === 'si' ? 'ගෙවූ ක්‍රමය' : lang === 'ta' ? 'செலுத்தும் முறை' : 'Method',
    removeBtn: lang === 'si' ? 'රිසිට්පත ඉවත් කරන්න' : lang === 'ta' ? 'நீக்குக' : 'Remove Slip',
    scanAnother: lang === 'si' ? 'වෙනත් රිසිට්පතක් තෝරන්න' : lang === 'ta' ? 'வேறொரு ரசீது' : 'Scan Another Slip',
    successToast: lang === 'si' ? 'රිසිට්පත සාර්ථකව Scan කර Form එකට තොරතුරු ඇතුළත් කරන ලදී!' : lang === 'ta' ? 'ரசீது வெற்றிகரமாக ஸ்கேன் செய்யப்பட்டு விவரங்கள் நிரப்பப்பட்டன!' : 'Receipt scanned successfully! Form auto-filled.'
  };

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      notify?.(lang === 'si' ? 'කරුණාකර JPG, PNG හෝ WEBP image එකක් තෝරන්න.' : 'Please select a valid JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      notify?.(lang === 'si' ? 'Image එක 10MB ට වඩා අඩු විය යුතුයි.' : 'Please choose an image smaller than 10MB.');
      return;
    }

    setIsScanning(true);
    setProgress(5);
    setExtractedInfo(null);
    setStatusText(lang === 'si' ? 'Image එක සකස් කරමින්...' : 'Preparing image...');

    try {
      const enhanced = await preprocessImage(file, 'enhanced');
      onImageReady?.(enhanced);

      const threshold = await preprocessImage(file, 'threshold');
      setProgress(12);
      setStatusText(lang === 'si' ? 'OCR Engine එක සූදානම් වේ...' : 'Loading OCR engine...');

      // English is enough for most bank receipt fields and is much lighter/faster.
      // Sinhala/Tamil are tried as a fallback when the multilingual trained data is available.
      let worker;
      try {
        worker = await createWorker('eng+sin+tam', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              const p = Math.round((m.progress || 0) * 100);
              setProgress(15 + Math.round(p * 0.7));
              setStatusText(`${texts.scanning} ${p}%`);
            }
          }
        });
      } catch (e) {
        console.warn('Multilingual OCR unavailable, falling back to English:', e);
        worker = await createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              const p = Math.round((m.progress || 0) * 100);
              setProgress(15 + Math.round(p * 0.7));
              setStatusText(`${texts.scanning} ${p}%`);
            }
          }
        });
      }

      // Run two OCR passes: enhanced grayscale and thresholded text.
      await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' });
      const first = await worker.recognize(enhanced);
      await worker.setParameters({ tessedit_pageseg_mode: '11', preserve_interword_spaces: '1' });
      const second = await worker.recognize(threshold);
      await worker.terminate();

      const a = parseReceiptText(first?.data?.text || '');
      const b = parseReceiptText(second?.data?.text || '');
      const extractedData = (b.confidence > a.confidence ? b : a);
      // Keep the raw OCR from the stronger pass for diagnostics.
      extractedData.rawText = extractedData === b ? b.rawText : a.rawText;

      setExtractedInfo(extractedData);
      onDataExtracted?.(extractedData);

      if (notify) {
        if (extractedData.amount || extractedData.reference || extractedData.date) {
          notify(`${texts.successToast}${extractedData.amount ? ` (LKR ${Number(extractedData.amount).toLocaleString()})` : ''}`);
        } else {
          notify(lang === 'si' ? 'OCR එක අවසන්. තොරතුරු හඳුනාගැනීමට නොහැකි නම් Form එකෙන් manually ඇතුළත් කරන්න.' : 'OCR finished, but no key fields were detected. Please verify manually.');
        }
      }
    } catch (error) {
      console.error('OCR Scanning Error:', error);
      notify?.(lang === 'si' ? 'OCR කිරීමට නොහැකි විය. Image එක පැහැදිලි එකක් upload කර නැවත උත්සාහ කරන්න.' : 'Could not scan the receipt. Try a clearer screenshot.');
    } finally {
      setIsScanning(false);
      setProgress(100);
    }
  };

  const handleImageUpload = e => { const file = e.target.files?.[0]; if (file) processFile(file); e.target.value = ''; };
  const handleTriggerInput = () => { if (fileInputRef.current && !isScanning) fileInputRef.current.click(); };
  const handleKeyDown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTriggerInput(); } };
  const handleDragOver = e => { e.preventDefault(); e.stopPropagation(); if (!isScanning) setIsDragOver(true); };
  const handleDragLeave = e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDrop = e => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); if (!isScanning && e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]); };

  return (
    <div className="ocr-upload-container">
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} disabled={isScanning} style={{ display: 'none' }} id="ocr-receipt-file-input" />
      {!receiptImage ? (
        <div className={`ocr-dropzone ${isDragOver ? 'drag-active' : ''} ${isScanning ? 'is-scanning' : ''}`}
          onClick={handleTriggerInput} onKeyDown={handleKeyDown} onDragOver={handleDragOver} onDragEnter={handleDragOver}
          onDragLeave={handleDragLeave} onDrop={handleDrop} role="button" tabIndex={0} aria-label="Upload and scan deposit receipt">
          <div className="ocr-upload-icon-badge">
            {isScanning ? <Loader2 className="ocr-spin-icon" size={32} /> : isDragOver ? <Sparkles size={32} /> : <UploadCloud size={32} />}
          </div>
          <div>
            <p className="ocr-dropzone-title">{texts.dropzoneTitle} <em>{texts.browseBtn}</em></p>
            <p className="ocr-dropzone-desc">{texts.dropzoneDesc}</p>
          </div>
          <div className="ocr-badges-row">
            <span className="ocr-tag">PNG, JPG, WEBP</span><span className="ocr-tag">BOC</span><span className="ocr-tag">Sampath</span>
            <span className="ocr-tag">ComBank</span><span className="ocr-tag">People's</span><span className="ocr-tag">HNB</span><span className="ocr-tag">iPay / FriMi</span>
          </div>
          {isScanning && (
            <div className="ocr-scan-progress-wrap" onClick={e => e.stopPropagation()}>
              <div className="ocr-scan-header"><div className="ocr-scan-status"><ScanLine size={18} className="ocr-spin-icon" /><span>{statusText || texts.scanning}</span></div><span className="ocr-progress-percent">{progress}%</span></div>
              <div className="ocr-progress-bar-track"><div className="ocr-progress-bar-fill" style={{ width: `${Math.max(progress, 6)}%` }} /></div>
            </div>
          )}
        </div>
      ) : (
        <div className="ocr-result-card">
          <div className="ocr-result-body">
            <div className="ocr-receipt-thumb-wrap"><img src={receiptImage} alt="Deposit Receipt Preview" className="ocr-receipt-thumb" /></div>
            <div className="ocr-extracted-details">
              <div className="ocr-detected-title"><CheckCircle2 size={18} color="var(--green)" /><span>{texts.detectedHeader}</span></div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {extractedInfo?.amount && <div className="ocr-data-pill"><span className="ocr-data-label" style={{display:'flex',alignItems:'center',gap:'6px'}}><Coins size={14} color="var(--green)" />{texts.amount}:</span><span className="ocr-data-val-amount">LKR {Number(extractedInfo.amount).toLocaleString()}</span></div>}
                {extractedInfo?.reference && <div className="ocr-data-pill"><span className="ocr-data-label" style={{display:'flex',alignItems:'center',gap:'6px'}}><Hash size={14} color="var(--blue)" />{texts.ref}:</span><span className="ocr-data-val-ref">{extractedInfo.reference}</span></div>}
                {extractedInfo?.date && <div className="ocr-data-pill"><span className="ocr-data-label" style={{display:'flex',alignItems:'center',gap:'6px'}}><Calendar size={14} />{texts.date}:</span><span style={{color:'var(--ink)',fontWeight:'600'}}>{extractedInfo.date}</span></div>}
                {extractedInfo?.paymentMethod && <div className="ocr-data-pill"><span className="ocr-data-label" style={{display:'flex',alignItems:'center',gap:'6px'}}><Building2 size={14} />{texts.bankType}:</span><span style={{color:'var(--green)',fontWeight:'700'}}>{extractedInfo.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : 'Mobile Banking'}</span></div>}
                {extractedInfo && <div className="ocr-data-pill"><span className="ocr-data-label">OCR confidence:</span><span style={{fontWeight:'700'}}>{extractedInfo.confidence || 0}%</span></div>}
                {extractedInfo && !extractedInfo.amount && !extractedInfo.reference && !extractedInfo.date && !isScanning && <div style={{color:'var(--muted)',fontSize:'12px',fontStyle:'italic',padding:'4px 0'}}>Receipt attached. Please verify and enter the fields manually.</div>}
              </div>
            </div>
          </div>
          {isScanning && <div className="ocr-scan-progress-wrap"><div className="ocr-scan-header"><div className="ocr-scan-status"><ScanLine size={18} className="ocr-spin-icon" /><span>{statusText || texts.scanning}</span></div><span className="ocr-progress-percent">{progress}%</span></div><div className="ocr-progress-bar-track"><div className="ocr-progress-bar-fill" style={{width:`${Math.max(progress,6)}%`}} /></div></div>}
          <div className="ocr-actions-row">
            <button type="button" className="ocr-btn-secondary" onClick={handleTriggerInput} disabled={isScanning}><RefreshCw size={14} />{texts.scanAnother}</button>
            <button type="button" className="ocr-btn-danger" onClick={() => {setExtractedInfo(null); onRemoveImage?.();}}><Trash2 size={14} />{texts.removeBtn}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptScanner;
