import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  History, 
  Clock, 
  RotateCcw, 
  Trophy,
  TrendingUp,
  Brain,
  Minus,
  Plus,
  Zap,
  Download,
  Sparkles,
  MessageSquare,
  Loader,
  Lightbulb,
  Key,
  Divide,
  Hash,
  Percent
} from 'lucide-react';

// --- FRACTION UTILITIES ---

const FractionLogic = {
  gcd: (a, b) => {
    return b === 0 ? a : FractionLogic.gcd(b, a % b);
  },
  
  toValue: (f) => {
    const whole = f.whole || 0;
    const n = f.n || 0;
    const d = f.d || 1;
    return whole + (n / d);
  },

  generate: (maxDenom, allowMixed) => {
    const d = Math.floor(Math.random() * (maxDenom - 2)) + 2; 
    let n = Math.floor(Math.random() * (d * 2)) + 1; 
    
    const common = FractionLogic.gcd(n, d);
    n = n / common;
    const finalD = d / common;

    let whole = 0;
    if (allowMixed && n > finalD) {
       whole = Math.floor(n / finalD);
       n = n % finalD;
    }

    return { whole, n, d: finalD };
  }
};

// --- DECIMAL UTILITIES ---
const DecimalLogic = {
  // Helper to fix floating point math issues (0.1 + 0.2 = 0.3000004)
  fix: (num) => parseFloat(num.toFixed(4)),

  generate: (intDigits, decPlaces) => {
    // Ensure at least 1 decimal place if decPlaces is set
    const dp = Math.max(1, decPlaces); 
    
    // Integer part generation
    const minInt = intDigits === 1 ? 0 : Math.pow(10, intDigits - 1);
    const maxInt = Math.pow(10, intDigits) - 1;
    const intPart = Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
    
    // Decimal part generation
    const maxDec = Math.pow(10, dp) - 1;
    const decPart = Math.floor(Math.random() * maxDec) + 1; // +1 to ensure non-zero decimal part sometimes
    
    // Create decimal string "0.decPart" then add intPart
    const decimalString = `${intPart}.${decPart.toString().padStart(dp, '0')}`;
    return parseFloat(decimalString);
  }
};

// --- THE BRAIN ENGINE (Algorithm) ---

const BRAIN_KEY = 'reckoning_brain_v2';

const BrainEngine = {
  loadModel: () => {
    try { return JSON.parse(localStorage.getItem(BRAIN_KEY)) || {}; } catch (e) { return {}; }
  },
  saveModel: (model) => {
    localStorage.setItem(BRAIN_KEY, JSON.stringify(model));
  },
  learn: (questionData) => {
    const model = BrainEngine.loadModel();
    const { type, complexity, isCorrect, timeTaken } = questionData;
    const settingKey = `${type}_level_${complexity}`;

    if (!model[settingKey]) model[settingKey] = { total: 0, mistakes: 0, slow: 0 };
    const category = model[settingKey];
    category.total += 1;

    if (!isCorrect) category.mistakes += 1;
    else if (timeTaken > 20) category.slow += 1;

    BrainEngine.saveModel(model);
  },
  exportData: () => {
    const model = BrainEngine.loadModel();
    return JSON.stringify(model, null, 2);
  },
  
  generateQuestion: (op, paramA, paramB) => {
    if (op.startsWith('frac_')) {
        return BrainEngine.generateFractionQuestion(op, paramA, paramB);
    } else if (op.startsWith('dec_')) {
        return BrainEngine.generateDecimalQuestion(op, paramA, paramB);
    } else {
        return BrainEngine.generateIntegerQuestion(op, paramA, paramB);
    }
  },

  generateFractionQuestion: (op, level, allowMixedVal) => {
    const allowMixed = allowMixedVal > 0;
    const maxDenom = level * 4 + 2; 
    
    let f1, f2, answer;
    f1 = FractionLogic.generate(maxDenom, allowMixed);
    f2 = FractionLogic.generate(maxDenom, allowMixed);

    const v1 = FractionLogic.toValue(f1);
    const v2 = FractionLogic.toValue(f2);

    switch (op) {
        case 'frac_add': answer = v1 + v2; break;
        case 'frac_sub': 
            if (v1 < v2) { [f1, f2] = [f2, f1]; } 
            answer = Math.abs(v1 - v2);
            break;
        case 'frac_mul': answer = v1 * v2; break;
        case 'frac_div':
            if (FractionLogic.toValue(f2) === 0) f2 = { whole: 1, n: 1, d: 2 };
            answer = v1 / FractionLogic.toValue(f2);
            break;
        default: return BrainEngine.generateIntegerQuestion('add', 1, 1);
    }

    return { 
        f1, f2, question: "Fraction", answer, type: op, complexity: level, isFraction: true 
    };
  },

  generateDecimalQuestion: (op, intDigits, decPlaces) => {
    let n1, n2, answer, q;
    const dp = Math.max(1, decPlaces); 

    switch(op) {
        case 'dec_add':
            n1 = DecimalLogic.generate(intDigits, dp);
            n2 = DecimalLogic.generate(intDigits, dp);
            answer = DecimalLogic.fix(n1 + n2);
            q = `${n1} + ${n2}`;
            break;
        case 'dec_sub':
            n1 = DecimalLogic.generate(intDigits, dp);
            n2 = DecimalLogic.generate(intDigits, dp);
            if(n1 < n2) [n1, n2] = [n2, n1]; 
            answer = DecimalLogic.fix(n1 - n2);
            q = `${n1} - ${n2}`;
            break;
        case 'dec_mul':
            // Keep decimal places low for mental math
            n1 = DecimalLogic.generate(Math.max(1, intDigits-1), Math.min(2, dp)); 
            n2 = DecimalLogic.generate(1, 1);
            answer = DecimalLogic.fix(n1 * n2);
            q = `${n1} × ${n2}`;
            break;
        case 'dec_div':
            // Generate Answer * Divisor = Dividend
            const answerMultiplier = Math.floor(Math.random() * 8) + 1;
            const divisor = (Math.floor(Math.random() * 5) + 1) / 10; // 0.1 to 0.5
            answer = answerMultiplier; 
            n2 = divisor;
            n1 = DecimalLogic.fix(answer * n2);
            q = `${n1} ÷ ${n2}`;
            break;
        default:
             q="Error"; answer=0;
    }

    return { question: q, answer, type: op, complexity: decPlaces, isFraction: false, isDecimal: true };
  },

  generateIntegerQuestion: (op, digitsA, digitsB) => {
    const getRange = (d) => ({ min: d === 1 ? 1 : Math.pow(10, d-1), max: Math.pow(10, d) - 1 });
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const rangeA = getRange(digitsA);
    const rangeB = getRange(digitsB);
    let n1 = rand(rangeA.min, rangeA.max);
    let n2 = rand(rangeB.min, rangeB.max);
    let q = '', a = 0;

    switch(op) {
        case 'add': q=`${n1} + ${n2}`; a=n1+n2; break;
        case 'sub': q=`${n1} - ${n2}`; a=n1-n2; break;
        case 'mul': q=`${n1} × ${n2}`; a=n1*n2; break;
        case 'div': n1 = n2 * rand(2, 12); q=`${n1} ÷ ${n2}`; a=n1/n2; break;
        case 'sq': q=`${n1}²`; a=n1*n1; break;
        case 'cb': q=`${n1}³`; a=n1*n1*n1; break;
        case 'sqrt': q=`√${n1*n1}`; a=n1; break;
        case 'cbrt': q=`∛${n1*n1*n1}`; a=n1; break;
    }
    return { question: q, answer: a, type: op, complexity: digitsA, isFraction: false };
  }
};

const OPERATIONS = [
  { id: 'add', label: 'Add', icon: '+', group: 'int' },
  { id: 'sub', label: 'Sub', icon: '-', group: 'int' },
  { id: 'mul', label: 'Mul', icon: '×', group: 'int' },
  { id: 'div', label: 'Div', icon: '÷', group: 'int' },
  { id: 'sq', label: 'Sqr', icon: 'x²', group: 'adv' },
  { id: 'sqrt', label: 'Root', icon: '√', group: 'adv' },
  { id: 'frac_add', label: 'Frac(+)', icon: '+', group: 'frac' },
  { id: 'frac_sub', label: 'Frac(-)', icon: '-', group: 'frac' },
  { id: 'frac_mul', label: 'Frac(×)', icon: '×', group: 'frac' },
  { id: 'frac_div', label: 'Frac(÷)', icon: '÷', group: 'frac' },
  { id: 'dec_add', label: 'Dec(+)', icon: '+', group: 'dec' },
  { id: 'dec_sub', label: 'Dec(-)', icon: '-', group: 'dec' },
  { id: 'dec_mul', label: 'Dec(×)', icon: '×', group: 'dec' },
  { id: 'dec_div', label: 'Dec(÷)', icon: '÷', group: 'dec' },
];

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>{children}</div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:active:scale-100";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50",
    ghost: "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
    gemini: "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-purple-200 hover:from-blue-600 hover:to-purple-700"
  };
  return <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant]} ${className}`}>{children}</button>;
};

const DigitCounter = ({ label, value, onChange, min = 1, max = 6 }) => {
    return (
      <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</span>
        <div className="flex items-center justify-between">
          <button onClick={() => onChange(Math.max(min, value - 1))} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-all" disabled={value <= min}><Minus size={16} /></button>
          <div className="text-center px-2">
            <div className="text-xl font-bold text-slate-800">{value}</div>
          </div>
          <button onClick={() => onChange(Math.min(max, value + 1))} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 active:scale-95 transition-all" disabled={value >= max}><Plus size={16} /></button>
        </div>
      </div>
    );
};

// --- FRACTION DISPLAY COMPONENT ---
const FractionDisplay = ({ f, size = "large" }) => {
    if (f.n === 0 || !f.d) {
        return <span className={`font-mono font-bold text-slate-800 ${size === "large" ? "text-5xl" : "text-xl"}`}>{f.whole}</span>;
    }
    const wholeClass = size === "large" ? "text-4xl mr-2" : "text-lg mr-1";
    const numClass = size === "large" ? "text-3xl" : "text-sm";
    const denomClass = size === "large" ? "text-3xl" : "text-sm";
    const barClass = size === "large" ? "h-0.5 my-1" : "h-px my-0.5";
    return (
        <div className="inline-flex items-center font-mono font-bold text-slate-800 align-middle">
            {f.whole !== 0 && <span className={wholeClass}>{f.whole}</span>}
            <div className="flex flex-col items-center justify-center">
                <span className={numClass}>{f.n}</span>
                <span className={`w-full bg-slate-800 ${barClass}`}></span>
                <span className={denomClass}>{f.d}</span>
            </div>
        </div>
    );
};

const FractionInput = ({ value, onChange }) => {
    const handleChange = (field, val) => onChange({ ...value, [field]: val });
    return (
        <div className="flex items-center justify-center gap-3 mt-4">
            <div className="flex flex-col items-center">
                <input type="number" placeholder="0" className="w-16 h-16 text-center text-2xl font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none" value={value.w} onChange={(e) => handleChange('w', e.target.value)} />
                <span className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Whole</span>
            </div>
            <div className="flex flex-col gap-1.5 items-center">
                <input type="number" placeholder="N" autoFocus className="w-16 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none" value={value.n} onChange={(e) => handleChange('n', e.target.value)} />
                <div className="h-0.5 bg-slate-300 w-full rounded-full"></div>
                <input type="number" placeholder="D" className="w-16 h-12 text-center text-xl font-bold border-2 border-slate-200 rounded-lg focus:border-indigo-500 outline-none" value={value.d} onChange={(e) => handleChange('d', e.target.value)} />
            </div>
        </div>
    );
};

export default function ReckoningSkillsApp() {
  const [view, setView] = useState('menu');
  const [userApiKey, setUserApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  
  const [settings, setSettings] = useState({
    operation: 'mul', digitsA: 2, digitsB: 1, count: 10, timePerQuestion: 20
  });
  
  const [session, setSession] = useState({
    questions: [], currentIndex: 0, userAnswers: [], startTime: null
  });

  const [currentInput, setCurrentInput] = useState('');
  const [fracInput, setFracInput] = useState({ w: '', n: '', d: '' });
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const [history, setHistory] = useState([]);
  const [aiCoachMessage, setAiCoachMessage] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem('reckoning_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setUserApiKey(savedKey);
  }, []);

  const saveApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key);
    setUserApiKey(key);
    setShowKeyInput(false);
  };

  const callGemini = async (prompt) => {
    if (!userApiKey) return "Please enter your API Key settings to use AI.";
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${userApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) { return "Connection failed."; }
  };

  useEffect(() => {
    if (view === 'playing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { handleSubmitAnswer(null, true); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  });

  const startSession = () => {
    const newQuestions = Array.from({ length: settings.count }, () => 
      BrainEngine.generateQuestion(settings.operation, settings.digitsA, settings.digitsB)
    );
    setSession({ questions: newQuestions, currentIndex: 0, userAnswers: [], startTime: Date.now() });
    setCurrentInput(''); 
    setFracInput({ w: '', n: '', d: '' });
    setTimeLeft(settings.timePerQuestion); 
    setView('playing');
  };

  const handleSubmitAnswer = (manualAnswer = null, isTimeout = false) => {
    clearInterval(timerRef.current);
    const currentQ = session.questions[session.currentIndex];
    
    let isCorrect = false;
    let userValDisplay = '';

    if (currentQ.isFraction) {
        const w = parseFloat(fracInput.w) || 0;
        const n = parseFloat(fracInput.n) || 0;
        const d = parseFloat(fracInput.d) || 1;
        const userVal = w + (n/d);
        isCorrect = !isTimeout && Math.abs(userVal - currentQ.answer) < 0.001;
        userValDisplay = w === 0 ? `${n}/${d}` : `${w} ${n}/${d}`;
        if (isTimeout) userValDisplay = "Timeout";
    } else {
        const val = manualAnswer !== null ? manualAnswer : currentInput;
        const numVal = parseFloat(val);
        isCorrect = !isTimeout && Math.abs(numVal - currentQ.answer) < 0.001;
        userValDisplay = isTimeout ? 'Timeout' : (val === '' ? 'Skipped' : numVal);
    }

    const timeTaken = settings.timePerQuestion - (isTimeout ? 0 : timeLeft);
    BrainEngine.learn({ type: currentQ.type, complexity: currentQ.complexity, isCorrect, timeTaken });
    
    const answerRecord = { ...currentQ, userAnswer: userValDisplay, isCorrect, timeTaken };
    const updatedAnswers = [...session.userAnswers, answerRecord];

    if (session.currentIndex < session.questions.length - 1) {
      setSession(prev => ({ ...prev, userAnswers: updatedAnswers, currentIndex: prev.currentIndex + 1 }));
      setCurrentInput(''); 
      setFracInput({ w: '', n: '', d: '' });
      setTimeLeft(settings.timePerQuestion);
    } else {
      finishSession(updatedAnswers);
    }
  };

  const finishSession = (finalAnswers) => {
    const totalTime = (Date.now() - session.startTime) / 1000;
    const score = finalAnswers.filter(a => a.isCorrect).length;
    const sessionRecord = { id: Date.now(), date: new Date().toISOString(), settings: { ...settings }, results: finalAnswers, score, totalQuestions: settings.count, totalTime };
    const newHistory = [sessionRecord, ...history];
    setHistory(newHistory);
    localStorage.setItem('reckoning_history', JSON.stringify(newHistory));
    setSession(prev => ({ ...prev, userAnswers: finalAnswers }));
    setView('results');
  };

  const handleAICoach = async () => {
    setLoadingAI(true); setAiCoachMessage('');
    const data = BrainEngine.exportData();
    const prompt = `Act as a math tutor. Analyze this fraction/decimal data: ${data.substring(0, 1500)}. Identify 1 weakness and give a tip.`;
    const response = await callGemini(prompt);
    setAiCoachMessage(response); setLoadingAI(false);
  };

  const renderMenu = () => {
    const currentOp = OPERATIONS.find(op => op.id === settings.operation);
    const isFrac = currentOp.group === 'frac';
    const isDec = currentOp.group === 'dec';

    return (
      <div className="space-y-6 max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 text-white rounded-2xl mb-3 shadow-lg shadow-indigo-200">
            <Brain size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Calculation Master</h1>
        </div>

        {showKeyInput ? (
           <Card className="p-5 bg-slate-800 text-white">
             <h3 className="font-bold mb-2 flex items-center gap-2"><Key size={16}/> API Key</h3>
             <input type="password" placeholder="Paste key here..." className="w-full p-2 rounded bg-slate-700 border border-slate-600 text-white text-sm mb-3" onBlur={(e) => saveApiKey(e.target.value)} />
             <Button variant="secondary" className="w-full py-2 text-sm" onClick={() => setShowKeyInput(false)}>Save</Button>
           </Card>
        ) : (
           <button onClick={() => setShowKeyInput(true)} className="text-xs text-center w-full text-indigo-500 hover:underline mb-2">{userApiKey ? "Update API Key" : "Enable AI Coach"}</button>
        )}

        <Card className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-2">
            {OPERATIONS.map(op => (
              <button key={op.id} onClick={() => setSettings({ ...settings, operation: op.id })} className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all h-20 ${settings.operation === op.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                <span className="text-lg font-bold mb-1">{op.icon}</span><span className="text-[10px] font-medium leading-tight">{op.label}</span>
              </button>
            ))}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-500 uppercase">
                    {isFrac ? "Difficulty Level" : isDec ? "Integer Digits" : "Left Digits"}
                </span>
                {isFrac && <span className="text-xs text-indigo-600 font-bold">Max Denom: {settings.digitsA * 4 + 2}</span>}
            </div>
            <DigitCounter label="" value={settings.digitsA} onChange={(v) => setSettings(s => ({ ...s, digitsA: v }))} />
            
            <div className="flex items-center justify-between px-1 mt-2">
                <span className="text-xs font-bold text-slate-500 uppercase">
                    {isFrac ? "Mixed Numbers?" : isDec ? "Decimal Places" : "Right Digits"}
                </span>
            </div>
            {isFrac ? (
                 <div className="flex gap-2">
                    <button onClick={() => setSettings(s => ({...s, digitsB: 0}))} className={`flex-1 p-3 rounded-xl font-bold border ${settings.digitsB === 0 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>No</button>
                    <button onClick={() => setSettings(s => ({...s, digitsB: 1}))} className={`flex-1 p-3 rounded-xl font-bold border ${settings.digitsB === 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200'}`}>Yes</button>
                 </div>
            ) : (
                <DigitCounter label="" value={settings.digitsB} onChange={(v) => setSettings(s => ({ ...s, digitsB: v }))} />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Qs</label><input type="number" value={settings.count} onChange={(e) => setSettings({...settings, count: Number(e.target.value)})} className="w-full bg-white p-2 text-center font-bold text-slate-800 border border-slate-200 rounded-lg outline-none" /></div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secs/Q</label><input type="number" value={settings.timePerQuestion} onChange={(e) => setSettings({...settings, timePerQuestion: Number(e.target.value)})} className="w-full bg-white p-2 text-center font-bold text-slate-800 border border-slate-200 rounded-lg outline-none" /></div>
          </div>
          <Button onClick={startSession} className="w-full py-4 text-lg"><Play size={20} fill="currentColor" /> Start Training</Button>
        </Card>
        <div className="flex justify-center"><Button variant="ghost" onClick={() => setView('history')}><History size={18} className="mr-2" /> Performance Data</Button></div>
      </div>
    );
  };

  const renderGame = () => {
    const currentQ = session.questions[session.currentIndex];
    const progress = ((session.currentIndex) / settings.count) * 100;
    const opMap = { 'frac_add': '+', 'frac_sub': '-', 'frac_mul': '×', 'frac_div': '÷' };
    
    return (
      <div className="max-w-md mx-auto h-full flex flex-col justify-center py-4">
        <div className="mb-4 flex items-center justify-between text-slate-500 px-2">
          <span className="text-sm font-medium">Q {session.currentIndex + 1} / {settings.count}</span>
          <div className="flex items-center gap-1.5 bg-slate-200/50 px-3 py-1 rounded-full"><Clock size={14} /><span className={`font-mono font-bold ${timeLeft <= 5 ? 'text-red-600' : 'text-slate-700'}`}>{timeLeft}s</span></div>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-8 mx-2"><div className="h-full bg-indigo-500 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} /></div>
        <Card className="p-8 mb-6 text-center relative shadow-md ring-1 ring-slate-900/5">
          <div className="mb-6 mt-4 flex items-center justify-center gap-6">
              {currentQ.isFraction ? (
                  <>
                      <FractionDisplay f={currentQ.f1} />
                      <span className="text-3xl font-bold text-slate-400">{opMap[currentQ.type]}</span>
                      <FractionDisplay f={currentQ.f2} />
                  </>
              ) : (
                  <span className="text-4xl sm:text-5xl font-bold text-slate-800 tracking-tight font-mono">{currentQ.question}</span>
              )}
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleSubmitAnswer(); }} className="flex flex-col gap-4">
            {currentQ.isFraction ? (
                <FractionInput value={fracInput} onChange={setFracInput} />
            ) : (
                <input autoFocus type="number" step="any" value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} placeholder="?" className="w-full text-center text-4xl p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-mono bg-slate-50 focus:bg-white" />
            )}
            <Button className="w-full py-4 text-lg mt-4">Submit Answer</Button>
          </form>
        </Card>
        <div className="text-center"><button onClick={() => setView('menu')} className="text-slate-400 hover:text-red-500 text-sm font-medium transition-colors">Quit Session</button></div>
      </div>
    );
  };

  const renderResults = () => {
    const score = session.userAnswers.filter(a => a.isCorrect).length;
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-in fade-in zoom-in duration-300">
        <Card className="p-8 text-center bg-gradient-to-b from-white to-indigo-50/30">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-sm mb-6 ring-4 ring-indigo-50"><Trophy size={48} className="text-yellow-500" /></div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Complete!</h2>
          <p className="text-slate-500 mb-8">Score: <span className="text-slate-900 font-bold">{score}</span> / {settings.count}</p>
          <div className="grid grid-cols-2 gap-4"><Button onClick={() => setView('menu')} variant="secondary">Settings</Button><Button onClick={startSession}>Retry Set</Button></div>
        </Card>
        <div className="space-y-3">
          {session.userAnswers.map((ans, idx) => (
            <div key={idx} className={`bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-2 ${ans.isCorrect ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
              <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                     {ans.isFraction ? (
                         <div className="flex items-center gap-2 scale-75 origin-left">
                            <FractionDisplay f={ans.f1} size="small" />
                            <span className="font-bold text-slate-400 text-lg">
                                {ans.type === 'frac_add' ? '+' : ans.type === 'frac_sub' ? '-' : ans.type === 'frac_mul' ? '×' : '÷'}
                            </span>
                            <FractionDisplay f={ans.f2} size="small" />
                         </div>
                     ) : (
                         <span className="font-mono font-bold text-lg text-slate-800">{ans.question}</span>
                     )}
                  </div>
                  <div className="text-xs text-slate-400">{ans.timeTaken.toFixed(1)}s</div>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                  <div className="text-sm text-slate-500">Correct: <span className="font-bold text-green-600">{typeof ans.answer === 'number' && ans.isFraction ? ans.answer.toFixed(2) : ans.answer}</span></div>
                  {!ans.isCorrect && <div className="text-sm text-red-500 font-bold">You: {ans.userAnswer}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6 px-2"><h2 className="text-xl font-bold text-slate-800">History</h2><button onClick={() => setView('menu')} className="text-sm font-medium text-indigo-600 hover:underline">Back</button></div>
      <Card className="p-6 mb-6 border-indigo-100 bg-gradient-to-br from-white to-purple-50/50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles size={16}/> AI Coach</h3>
          {aiCoachMessage ? <p className="text-sm mt-2">{aiCoachMessage}</p> : <Button variant="gemini" onClick={handleAICoach} disabled={loadingAI} className="w-full text-sm mt-4 py-2">{loadingAI ? "Analyzing..." : "Analyze Performance"}</Button>}
      </Card>
      <div className="space-y-3">{history.map((h, i) => <div key={i} className="bg-white p-4 rounded-xl border shadow-sm flex justify-between"><span className="font-bold text-slate-700">{OPERATIONS.find(o=>o.id===h.settings.operation)?.label}</span><span className="font-bold">{h.score}/{h.totalQuestions}</span></div>)}</div>
    </div>
  );
  return (<div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-indigo-100 pb-12"><div className="max-w-4xl mx-auto px-4 py-6">{view === 'menu' ? renderMenu() : view === 'playing' ? renderGame() : view === 'results' ? renderResults() : renderHistory()}</div></div>);
}
