/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import { analyzeData } from './services/geminiService';
import { 
  FileUp, Send, Loader2, Database, BarChart2, 
  MessageSquare, TrendingUp, AlertCircle, CheckCircle2,
  Trash2, Download, Sun, Moon, LogIn, LogOut, User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { auth, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

interface AnalysisMessage {
  role: 'user' | 'assistant';
  content: string;
  chartData?: any[];
  chartType?: string;
  timestamp: Date;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];

const ChartRenderer = ({ type, data, isDark }: { type?: string, data?: any[], isDark: boolean }) => {
  if (!data || !type) return null;

  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? '#334155' : '#e2e8f0';

  return (
    <div className="mt-8 p-6 glass-card rounded-[2rem] h-[350px] w-full transition-all hover:shadow-2xl">
      <ResponsiveContainer width="100%" height="100%">
        {type.toLowerCase() === 'bar' ? (
          <BarChart data={data}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fill: textColor, fontWeight: 600 }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: textColor, fontWeight: 600 }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid rgba(99, 102, 241, 0.2)', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                color: isDark ? '#f1f5f9' : '#0f172a',
                fontWeight: 'bold',
                padding: '12px'
              }}
              itemStyle={{ color: '#6366f1', fontSize: '12px' }}
            />
            <Bar 
              dataKey="value" 
              fill="url(#barGradient)" 
              radius={[6, 6, 0, 0]} 
              animationDuration={1500}
              animationBegin={200}
            />
          </BarChart>
        ) : type.toLowerCase() === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={90}
              paddingAngle={8}
              dataKey="value"
              animationDuration={1500}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  stroke={isDark ? '#0f172a' : '#fff'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip 
               contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid rgba(99, 102, 241, 0.2)', 
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                color: isDark ? '#f1f5f9' : '#0f172a'
              }}
            />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }} />
          </PieChart>
        ) : (
          <LineChart data={data}>
            <defs>
              <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fill: textColor, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: textColor, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
               contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid rgba(99, 102, 241, 0.2)', 
                backgroundColor: isDark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                color: isDark ? '#f1f5f9' : '#0f172a'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#6366f1" 
              strokeWidth={4} 
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: isDark ? '#020617' : '#fff' }} 
              activeDot={{ r: 8, strokeWidth: 0 }}
              animationDuration={2000}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

interface Dataset {
  name: string;
  data: any[];
  headers: string[];
  size: number;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [messages, setMessages] = useState<AnalysisMessage[]>([]);
  const [input, setInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const body = window.document.body;
    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
      root.style.setProperty('color-scheme', 'dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
      root.style.setProperty('color-scheme', 'light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      clearDataset();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        complete: (results) => {
          setDataset({
            name: file.name,
            data: results.data,
            headers: results.meta.fields || [],
            size: file.size
          });
          setError(null);
          addSystemMessage(`Successfully loaded ${file.name}. ${results.data.length} rows detected.`);
        },
        error: (err) => setError(`Error parsing CSV: ${err.message}`)
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        setDataset({
          name: file.name,
          data: data,
          headers: Object.keys(data[0] || {}),
          size: file.size
        });
        setError(null);
        addSystemMessage(`Successfully loaded ${file.name}. ${data.length} rows detected.`);
      };
      reader.readAsBinaryString(file);
    } else {
      setError('Please upload a CSV or Excel file.');
    }
  };

  const addSystemMessage = (text: string) => {
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: text,
      timestamp: new Date()
    }]);
  };

  const loadSampleData = () => {
    const sampleData = [
      { Category: 'Tech', Product: 'Laptop', Sales: 1200, Growth: 15, Region: 'North' },
      { Category: 'Tech', Product: 'Phone', Sales: 2500, Growth: 25, Region: 'West' },
      { Category: 'Home', Product: 'Chair', Sales: 800, Growth: -5, Region: 'East' },
      { Category: 'Home', Product: 'Table', Sales: 1500, Growth: 10, Region: 'South' },
      { Category: 'Gadgets', Product: 'Watch', Sales: 3200, Growth: 40, Region: 'North' },
      { Category: 'Gadgets', Product: 'Hub', Sales: 600, Growth: 5, Region: 'East' },
    ];
    setDataset({
      name: 'Sample_Sales_Data.csv',
      data: sampleData,
      headers: Object.keys(sampleData[0]),
      size: 1024
    });
    setError(null);
    addSystemMessage('Sample dataset loaded. You can now ask questions like "Which category has highest sales?"');
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !dataset || isAnalyzing) return;

    const userQuery = input;
    setInput('');
    setMessages(prev => [...prev, {
      role: 'user',
      content: userQuery,
      timestamp: new Date()
    }]);

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeData(
        `Filename: ${dataset.name}, Total Rows: ${dataset.data.length}, Columns: ${dataset.headers.join(', ')}`,
        userQuery,
        dataset.data.slice(0, 50)
      );
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.analysis,
        chartData: result.chart?.data,
        chartType: result.chart?.chartType,
        timestamp: new Date()
      }]);
    } catch (err: any) {
      setError(err.message || 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearDataset = () => {
    setDataset(null);
    setMessages([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#020617] text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-500/20 transition-colors duration-500 overflow-x-hidden relative">
      {/* Atmospheric Backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-fuchsia-500/5 dark:bg-fuchsia-500/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-blue-500/5 dark:bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20"
            >
              <Database className="w-5 h-5 text-white" />
            </motion.div>
            <h1 className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
              InsightAI <span className="text-indigo-600">Analyst</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-600 dark:text-slate-400 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 active:scale-95"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />
            
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">{user.displayName}</span>
                  <button onClick={handleLogout} className="text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest">Logout</button>
                </div>
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-indigo-500/20" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.displayName?.charAt(0)}
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
            
            {dataset && (
              <button 
                onClick={clearDataset}
                className="group flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:text-red-500 transition-all rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 active:scale-95"
              >
                <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-full border border-indigo-100 dark:border-indigo-800/30">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest hidden sm:inline">Engine Active</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative">
        {authLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-12 rounded-[3rem] max-w-lg w-full border-indigo-100 dark:border-indigo-500/10"
            >
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
                <UserIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Welcome to InsightAI</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-10 font-medium italic">Your intelligent partner for data exploration. Sign in to start your journey.</p>
              
              <button 
                onClick={handleLogin}
                className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-95 transition-all shadow-xl dark:shadow-white/10"
              >
                <LogIn className="w-6 h-6" />
                Sign in with Google
              </button>
            </motion.div>
          </div>
        ) : !dataset ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-2xl px-4"
            >
              <div className="inline-flex relative mb-8">
                <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 -z-10" />
                <div className="p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 ring-4 ring-indigo-50 dark:ring-indigo-900/10">
                  <FileUp className="w-14 h-14 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              
              <h2 className="text-4xl sm:text-6xl font-[900] text-slate-900 dark:text-white tracking-tight leading-[1.1] mb-6">
                Turn your data into <br />
                <span className="text-indigo-600 italic">decisions.</span>
              </h2>
              <p className="text-xl text-slate-600 dark:text-slate-400 font-medium leading-relaxed mb-10 max-w-lg mx-auto">
                Upload your CSV or Excel files. Our AI cleans, analyzes, and visualizes everything in seconds.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <label 
                  htmlFor="file-upload"
                  className="cursor-pointer group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-indigo-600 px-10 py-5 rounded-2xl text-white font-extrabold text-lg shadow-2xl shadow-indigo-500/30 hover:bg-indigo-700 hover:-translate-y-1 transition-all active:scale-95 active:translate-y-0"
                >
                  <FileUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
                  Upload Dataset
                  <input id="file-upload" type="file" className="sr-only" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} ref={fileInputRef} />
                </label>
                
                <button 
                  onClick={loadSampleData}
                  className="w-full sm:w-auto px-10 py-5 rounded-2xl text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
                >
                  Load Sample Data
                </button>
              </div>
              
              <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                  { icon: TrendingUp, label: "AI Insights", desc: "Automatic trend detection" },
                  { icon: BarChart2, label: "Dynamic UI", desc: "Interactive visualizations" },
                  { icon: CheckCircle2, label: "Smart Cleaning", desc: "Handles nulls and duplicates" }
                ].map((feature, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 + (i * 0.1) }}
                    className="flex flex-col items-center p-6 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800/50 backdrop-blur-sm"
                  >
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl mb-4">
                      <feature.icon className="w-6 h-6 text-indigo-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white mb-1">{feature.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-500 text-center">{feature.desc}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sidebar Dash */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-3 space-y-6 sticky top-24"
            >
              <div className="glass-card rounded-[2rem] p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl" />
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  Properties
                </h3>
                
                <h4 className="font-extrabold text-slate-900 dark:text-white text-lg truncate mb-6">{dataset.name}</h4>
                
                <div className="space-y-4">
                  {[
                    { label: "Total Rows", value: dataset.data.length.toLocaleString(), icon: TrendingUp },
                    { label: "Data Points", value: (dataset.data.length * dataset.headers.length).toLocaleString(), icon: Database },
                    { label: "File Size", value: `${(dataset.size / 1024).toFixed(1)} KB`, icon: CheckCircle2 }
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center group">
                      <span className="text-xs font-bold text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors flex items-center gap-2">
                        <stat.icon className="w-3.5 h-3.5 opacity-50" />
                        {stat.label}
                      </span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-200">{stat.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">Quick Analysis</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Summarize Table", q: "Give me a statistical summary of all columns" },
                      { label: "Find Correlations", q: "Are there any strong correlations between numeric columns?" },
                      { label: "Predict Trends", q: "Based on the data, what are the likely future trends?" }
                    ].map((btn, i) => (
                      <button 
                        key={i}
                        onClick={() => { setInput(btn.q); handleSendMessage(); }}
                        className="w-full text-left px-4 py-2.5 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-indigo-400 transition-all active:scale-95 border border-indigo-100/50 dark:border-indigo-900/30"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (!dataset) return;
                      const csv = Papa.unparse(dataset.data);
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.body.appendChild(document.createElement('a'));
                      link.href = url;
                      link.download = `${dataset.name.split('.')[0]}_analyst_export.csv`;
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm shadow-xl shadow-slate-900/20 dark:shadow-white/10 hover:shadow-2xl transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download CSV
                  </motion.button>
                </div>
              </div>

              <div className="glass-card rounded-[2rem] p-6 max-h-[400px] flex flex-col">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                  <BarChart2 className="w-3.5 h-3.5" />
                  Schema
                </h3>
                <div className="overflow-y-auto space-y-2 pr-2 scrollbar-none">
                  {dataset.headers.map((h, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50 hover:border-indigo-200 dark:hover:border-indigo-900/30 transition-all cursor-default flex items-center gap-2"
                    >
                      <div className="w-1.5 h-1.5 bg-indigo-500/50 rounded-full" />
                      {h}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Analyst Chat */}
            <div className="lg:col-span-9 flex flex-col min-h-[600px]">
              <div className="flex-1 space-y-10 pb-10">
                {messages.length === 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-indigo-600/5 to-indigo-600/10 dark:from-indigo-600/10 dark:to-transparent rounded-[3rem] p-10 border border-indigo-200/30 dark:border-indigo-500/20 text-center flex flex-col items-center"
                  >
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center mb-6 ring-8 ring-indigo-500/5">
                      <MessageSquare className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Analyst is Ready</h3>
                    <p className="text-slate-600 dark:text-slate-400 font-medium mb-8 max-w-sm">
                      I've scanned your data. Ask me for summaries, charts, or specific insights.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                      {['Statistical summary', 'Identify outliers', 'Revenue by category', 'Month-over-month growth'].map((suggest, i) => (
                        <button 
                          key={i} 
                          onClick={() => setInput(`Give me a ${suggest.toLowerCase()}`)}
                          className="px-6 py-4 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl text-sm font-extrabold border border-indigo-100 dark:border-indigo-900/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                        >
                          {suggest}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
                
                <AnimatePresence initial={false}>
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex w-full gap-4 relative",
                        msg.role === 'user' ? "justify-end" : "justify-start"
                      )}
                    >
                      <div className={cn(
                        "max-w-[90%] sm:max-w-[85%] rounded-[2.5rem] p-8 shadow-2xl relative transition-colors duration-500",
                        msg.role === 'user' 
                          ? "bg-slate-900 dark:bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10" 
                          : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-slate-200/50 dark:shadow-black/20"
                      )}>
                        <div className={cn(
                          "prose max-w-none prose-sm sm:prose-base",
                          msg.role === 'user' ? "prose-invert" : "dark:prose-invert",
                          "prose-h3:text-indigo-600 dark:prose-h3:text-indigo-400 prose-h3:font-black prose-h3:text-xl prose-h3:mb-4",
                          "prose-p:font-medium prose-p:leading-relaxed prose-li:italic prose-li:text-slate-500 dark:prose-li:text-slate-400"
                        )}>
                          <ReactMarkdown
                            components={{
                              table: ({ children }) => (
                                <div className="my-6 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
                                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">{children}</table>
                                </div>
                              ),
                              th: ({ children }) => <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">{children}</th>,
                              td: ({ children }) => <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-700 dark:text-slate-300">{children}</td>,
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                        
                        {msg.chartData && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 }}
                          >
                            <ChartRenderer type={msg.chartType} data={msg.chartData} isDark={theme === 'dark'} />
                          </motion.div>
                        )}
                        
                        <div className="mt-8 flex items-center justify-between opacity-40 hover:opacity-100 transition-opacity">
                          <div className="flex gap-1">
                            <div className="w-1 h-1 rounded-full bg-current" />
                            <div className="w-1 h-1 rounded-full bg-current" />
                            <div className="w-1 h-1 rounded-full bg-current" />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest">
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isAnalyzing && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-4"
                  >
                    <div className="glass-card rounded-[2rem] rounded-tl-none p-8 flex items-center gap-4 bg-white/50 border-indigo-200/50">
                      <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-lg opacity-40 animate-pulse" />
                        <Loader2 className="w-6 h-6 text-indigo-600 animate-spin relative" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Analyzing Intelligence</p>
                        <p className="text-xs font-medium text-slate-500 italic">Thinking through columns and patterns...</p>
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 flex items-center gap-4 text-red-500 mx-auto max-w-md"
                  >
                    <div className="p-2 bg-red-500/10 rounded-xl">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    </div>
                    <p className="text-sm font-bold leading-snug">{error}</p>
                  </motion.div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Input Area */}
      {dataset && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="glass-surface rounded-[2.5rem] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-indigo-100 dark:border-slate-800"
          >
            <div className="relative flex items-center gap-3">
              <input
                type="text"
                placeholder="Ask your data analyst anything..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={isAnalyzing}
                className="flex-1 bg-transparent border-none rounded-2xl px-6 py-5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 font-medium text-lg outline-none"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSendMessage}
                disabled={!input.trim() || isAnalyzing}
                className="bg-indigo-600 text-white p-5 rounded-[1.5rem] shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center group"
              >
                {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </motion.button>
            </div>
          </motion.div>
          <div className="mt-4 flex justify-center gap-6 opacity-30 text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 pointer-events-none">
            <span>Neural Processor</span>
            <div className="w-1 h-1 bg-slate-500 rounded-full my-auto" />
            <span>Encrypted Stream</span>
            <div className="w-1 h-1 bg-slate-500 rounded-full my-auto" />
            <span>Gemini v2.0 Ultra</span>
          </div>
        </div>
      )}
    </div>
  );
}
