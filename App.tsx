import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Phone, Menu, X, Instagram, Facebook, ArrowRight, ShoppingBag, Search, UserPlus, Upload, Eye, EyeOff, LayoutDashboard, Boxes, BarChart3, Settings, LogOut, ChevronRight, ChevronDown, Edit2, Trash2, Share2, Truck, RefreshCcw, Star, FileText, Layers, Send, Twitter, Music, Zap, AlertCircle, MapPin, Link, Plus, MessageCircle, Youtube, Download, Bell, Sun, Moon, Globe, Home } from 'lucide-react';
import QRCode from 'qrcode';
import { motion, AnimatePresence, useMotionValue } from 'motion/react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { PRODUCTS, Product, Category, CategoryTable, Order, ContactLink, LayoutConfig, BannerSlide, Comment } from './data';
import { translations, Language } from './translations';
import { LayoutManagement } from './components/LayoutManagement';
import { supabaseStorage as idb, resetNetworkError } from './supabaseStorage';
import { getNetworkError, setNetworkError, subscribeToNetworkError } from './networkState';
import { supabase } from './supabase';
import { db, testFirebaseConnection, handleFirestoreError, OperationType, getIsQuotaExceeded } from './firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/webp', quality));
    };
    img.onerror = () => resolve(base64Str);
  });
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

const parseLinksToIds = (input: string): number[] => {
  return input.split(',').map(link => {
    const match = link.match(/product=(\d+)/);
    if (match) return parseInt(match[1]);
    const num = parseInt(link.trim());
    return isNaN(num) ? null : num;
  }).filter(id => id !== null) as number[];
};

const CustomSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: {value: string, label: string}[], placeholder?: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none hover:border-[#ed1c24] transition-all font-bold flex justify-between items-center cursor-pointer"
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder || "Select..."}
        </span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute z-20 w-full mt-2 bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                {options.map((option) => (
                  <div
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-3 rounded-2xl cursor-pointer transition-all font-bold text-sm ${
                      value === option.value 
                        ? 'bg-[#ed1c24] text-white' 
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = ({ cartCount, onNavigate, user, logoUrl, isAdminPage, isAdminAuthenticated, onAdminProfileClick, onLoginClick, language, setLanguage, searchQuery, setSearchQuery, deferredPrompt, setDeferredPrompt, orders, currentPage, isDarkMode, setIsDarkMode, isAdminVisible }: { cartCount: number; onNavigate: (page: string) => void; user: any; logoUrl: string; isAdminPage?: boolean; isAdminAuthenticated?: boolean; onAdminProfileClick?: () => void; onLoginClick: () => void; language: Language; setLanguage: (lang: Language) => void; searchQuery: string; setSearchQuery: (query: string) => void; deferredPrompt: any; setDeferredPrompt: (prompt: any) => void; orders: Order[]; currentPage: string; isDarkMode: boolean; setIsDarkMode: (mode: boolean) => void; isAdminVisible: boolean }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [showLocationMap, setShowLocationMap] = useState(false);

  const t = translations[language];
  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinkStyle = "px-6 py-1.5 rounded-lg text-xs font-bold transition-all bg-white/40 dark:bg-gray-800/40 backdrop-blur-md text-gray-700 dark:text-gray-200 border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md hover:bg-white/60 dark:hover:bg-gray-800/60 hover:text-[#ed1c24] dark:hover:text-[#ed1c24] hover:scale-[1.02] active:scale-[0.98]";

  return (
    <>
      {isAdminAuthenticated && currentPage !== 'admin' && pendingOrdersCount > 0 && (
        <div className="fixed top-20 right-4 z-[60]">
          <div className="relative">
            <div className="w-6 h-6 bg-red-500 rounded-full animate-ping absolute"></div>
            <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
              {pendingOrdersCount}
            </div>
          </div>
        </div>
      )}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg shadow-lg border-b border-white/20 dark:border-gray-800/40' : 'bg-white/30 dark:bg-gray-900/30 backdrop-blur-md border-b border-white/10 dark:border-gray-800/20'}`}>
      <div className="max-w-7xl mx-auto px-6 py-2">
        {/* Header with Logo and Search */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full lg:w-auto gap-4">
            <div className="flex items-center gap-3">
              {/* Logo - Always visible, no hamburger on mobile as requested */}
              <button onClick={() => onNavigate('home')} className="flex items-center gap-3">
                <img 
                  src={logoUrl || undefined} 
                  alt="Logo" 
                  className="h-8 lg:h-10 w-8 lg:w-10 object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://api.dicebear.com/7.x/initials/svg?seed=ICC&backgroundColor=ed1c24&fontFamily=Arial&fontWeight=700";
                  }}
                />
                <h1 className="text-xl lg:text-2xl font-bold font-bengali text-[#ed1c24] whitespace-nowrap">
                  রশশোই
                </h1>
              </button>
            </div>

            {/* Mobile Cart Icon */}
            <div className="flex lg:hidden items-center gap-2">
              {deferredPrompt && (
                <button 
                  onClick={async () => {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    if (outcome === 'accepted') {
                      setDeferredPrompt(null);
                    }
                  }} 
                  className="p-1.5 bg-[#ed1c24] text-white rounded-lg shadow-md"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
              <button onClick={() => onNavigate('cart')} className="p-2 text-gray-700">
                <ShoppingCart className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Search Bar - Glassmorphism */}
          <div className="relative w-full lg:max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-12 pr-4 py-1.5 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-lg text-sm shadow-sm focus:shadow-md focus:border-[#ed1c24] transition-all font-bengali outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {/* Language Toggle Icon */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="p-2.5 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md text-gray-700 dark:text-gray-200 border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all group"
              title={language === 'en' ? 'Switch to Bangla' : 'Switch to English'}
            >
              <Globe className="w-5 h-5 group-hover:text-[#ed1c24] transition-colors" />
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-md text-gray-700 dark:text-gray-200 border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all group"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-500 group-hover:rotate-90 transition-transform duration-500" />
              ) : (
                <Moon className="w-5 h-5 text-red-600 group-hover:-rotate-12 transition-transform duration-500" />
              )}
            </button>
            {isAdminPage && isAdminAuthenticated ? (
              <div 
                onClick={onAdminProfileClick}
                className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/30 dark:border-gray-700/30 rounded-2xl pl-5 pr-2 py-1 shadow-sm flex items-center gap-4 cursor-pointer group hover:border-[#ed1c24]/50 transition-all"
              >
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900 dark:text-white group-hover:text-[#ed1c24] transition-colors">
                    {localStorage.getItem('admin_username')}
                  </p>
                </div>
                <div className="w-8 h-8 flex-shrink-0 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white/50 dark:border-gray-600 shadow-sm overflow-hidden group-hover:border-[#ed1c24]/50 transition-all">
                  <img src={localStorage.getItem('admin_photo') || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localStorage.getItem('admin_username')}`} alt="Admin" className="w-full h-full object-cover" />
                </div>
              </div>
            ) : user ? (
              <button
                onClick={() => onNavigate('profile')}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all bg-white/40 dark:bg-gray-800/40 backdrop-blur-md text-[#ed1c24] border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md"
              >
                {user.photoURL && <img src={user.photoURL} className="w-5 h-5 rounded-full" alt="User" />}
                <span>{user.displayName}</span>
              </button>
            ) : (
              <button
                onClick={onLoginClick}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all bg-[#ed1c24]/90 backdrop-blur-md text-white border border-[#ed1c24]/50 shadow-sm hover:shadow-md hover:bg-black/90 hover:border-black/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                <span>{t.signUp}</span>
              </button>
            )
            }
            
            <button 
              onClick={() => onNavigate('cart')}
              className="relative flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold transition-all bg-white/40 dark:bg-gray-800/40 backdrop-blur-md text-gray-700 dark:text-gray-200 border border-white/30 dark:border-gray-700/30 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{t.cart}</span>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#ed1c24] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="hidden lg:flex items-center justify-center mt-2 pt-1 w-full">
          <div className="flex items-center gap-6">
            <button onClick={() => onNavigate('home')} className={navLinkStyle}>{t.home}</button>
            <button onClick={() => onNavigate('categories')} className={navLinkStyle}>{t.categories}</button>
            <button onClick={() => onNavigate('featured')} className={navLinkStyle}>{t.featured}</button>
            <button onClick={() => onNavigate('contact')} className={navLinkStyle}>{t.contact}</button>
            <button onClick={() => setShowLocationMap(true)} className={navLinkStyle}>{t.ourLocation}</button>
            {isAdminVisible && <button onClick={() => onNavigate('admin')} className={navLinkStyle}>{t.admin}</button>}
          </div>
        </div>
      </div>
    </nav>

    <AnimatePresence>
      {showLocationMap && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLocationMap(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden w-full max-w-4xl border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-xl font-black text-gray-900 dark:text-white">{t.ourLocation}</h3>
              <button
                onClick={() => setShowLocationMap(false)}
                className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full h-[60vh]">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.9024424301397!2d90.39108011536269!3d23.75085809467995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8bd552c2b3b%3A0x48467ac4711b7a5a!2sKarwan%20Bazar%2C%20Dhaka!5e0!3m2!1sen!2sbd!4v1680000000000!5m2!1sen!2sbd" 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen={true} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

const AuthModal = ({ isOpen, onClose, onAuthSuccess, initialUser, language }: { isOpen: boolean; onClose: () => void; onAuthSuccess: (user: any) => void; initialUser?: any; language: Language }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'edit'>(initialUser ? 'edit' : 'signup');
  const [name, setName] = useState(initialUser?.displayName || '');
  const [email, setEmail] = useState(initialUser?.email || '');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(initialUser?.phone || '');
  const [address, setAddress] = useState(initialUser?.address || '');
  const [photo, setPhoto] = useState(initialUser?.photoURL || '');
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  const t = translations[language];

  useEffect(() => {
    if (initialUser) {
      setMode('edit');
      setName(initialUser.displayName || '');
      setEmail(initialUser.email || '');
      setPhone(initialUser.phone || '');
      setAddress(initialUser.address || '');
      setPhoto(initialUser.photoURL || '');
    } else {
      setMode('signup');
      setName('');
      setEmail('');
      setPassword('');
      setPhone('');
      setAddress('');
      setPhoto('');
    }
  }, [initialUser, isOpen]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (mode === 'signin') {
      if (!email || !password) {
        setAuthError('Please enter your email and password.');
        return;
      }
    } else if (mode === 'signup') {
      if (!name || !email || !password || !phone || !address) {
        setAuthError('Please fill in all required fields: Name, Email, Password, Phone, and Address.');
        return;
      }
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters long.');
        return;
      }
    } else if (mode === 'edit') {
      if (!name || !email || !phone || !address) {
        setAuthError('Name, Email, Phone, and Address are required.');
        return;
      }
    }
    
    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              displayName: name,
              phone: phone,
              address: address,
              photoURL: photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          alert('Registration successful! You can now log in.');
          setMode('signin');
        }
      } else if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        if (data.user) {
          const userData = {
            uid: data.user.id,
            email: data.user.email,
            displayName: data.user.user_metadata?.displayName || email.split('@')[0],
            phone: data.user.user_metadata?.phone || '',
            address: data.user.user_metadata?.address || '',
            photoURL: data.user.user_metadata?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            role: data.user.user_metadata?.role || 'user'
          };
          onAuthSuccess(userData);
          if (!initialUser) {
            setName('');
            setEmail('');
            setPassword('');
            setPhone('');
            setAddress('');
            setPhoto('');
          }
        }
      } else if (mode === 'edit') {
        const { data, error } = await supabase.auth.updateUser({
          data: {
            displayName: name,
            phone: phone,
            address: address,
            photoURL: photo
          }
        });
        if (error) throw error;
        if (data.user) {
          const userData = {
            uid: data.user.id,
            email: data.user.email,
            displayName: data.user.user_metadata?.displayName || email.split('@')[0],
            phone: data.user.user_metadata?.phone || '',
            address: data.user.user_metadata?.address || '',
            photoURL: data.user.user_metadata?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
            role: data.user.user_metadata?.role || 'user'
          };
          onAuthSuccess(userData);
        }
      }
    } catch (error: any) {
      const errStr = (error?.message || error?.toString() || '').toLowerCase();
      if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('fetch')) {
        setAuthError('Network error: Could not connect to authentication server. Please check your internet connection.');
      } else {
        setAuthError(error.message || 'An error occurred during authentication.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className={`relative w-full ${mode === 'signin' ? 'max-w-[420px]' : 'max-w-[720px]'} bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2rem] shadow-2xl overflow-hidden p-6 lg:p-8 border border-white/30 dark:border-gray-700/30 transition-all duration-300`}
          >
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 rounded-full hover:bg-gray-100 z-10"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ed1c24] to-[#c4161c] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg rotate-3">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-1">
                {mode === 'edit' ? 'Update Profile' : mode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-gray-500 text-[10px] font-medium uppercase tracking-wider">
                {mode === 'edit' ? 'Update your details' : mode === 'signin' ? 'Sign in to continue' : 'Sign up to get started'}
              </p>
            </div>

            {mode !== 'edit' && (
              <div className="flex bg-gray-100 p-1 rounded-xl mb-5 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'signin' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  {t.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'signup' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                  {t.signUp}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {authError && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2 mb-4 max-w-sm mx-auto">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>{authError}</p>
                </div>
              )}
              {mode === 'signin' ? (
                <div className="space-y-4 max-w-sm mx-auto">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">{t.email} <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-gray-900 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">{t.password} <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-gray-900 text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Side: Photo */}
                  <div className="flex flex-col items-center justify-start pt-2 md:w-1/4">
                    <div className="relative w-24 h-24 mb-3 group cursor-pointer">
                      <div className="w-full h-full rounded-full border-4 border-gray-50 overflow-hidden bg-gray-100 shadow-md transition-all group-hover:border-[#ed1c24]/20">
                        {photo ? (
                          <img src={photo || undefined} alt="Profile Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 group-hover:text-gray-400 transition-colors">
                            <UserPlus className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-premium-cream rounded-full shadow-lg border border-gray-100 flex items-center justify-center cursor-pointer hover:text-[#ed1c24] hover:scale-110 transition-all">
                        <Upload className="w-4 h-4" />
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                      </label>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Profile Photo</span>
                  </div>

                  {/* Right Side: Fields */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Full Name <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-gray-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Phone Number <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-gray-900 text-sm"
                        />
                      </div>
                      <div className={mode === 'edit' ? "sm:col-span-2" : ""}>
                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">{t.email} <span className="text-red-500">*</span></label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-gray-900 text-sm"
                        />
                      </div>
                      {mode === 'signup' && (
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">{t.password} <span className="text-red-500">*</span></label>
                          <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-gray-900 text-sm"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Shipping Address <span className="text-red-500">*</span></label>
                      <textarea
                        value={address}
                        required
                        onChange={(e) => setAddress(e.target.value)}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-gray-900 text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className={`mt-6 ${mode === 'signin' ? 'max-w-sm mx-auto' : ''}`}>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-[#ed1c24] text-white rounded-xl font-black text-base hover:bg-black hover:-translate-y-1 active:translate-y-0 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-[#ed1c24]"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{mode === 'edit' ? t.updateProfile : mode === 'signin' ? t.signIn : t.signUp}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
                
                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
                  Secured by রশশোই Authentication
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


const Hero = ({ bannerImageUrl, bannerSlides = [], language, onAnalyze }: { bannerImageUrl: string; bannerSlides?: BannerSlide[]; language: Language; onAnalyze: (slide: BannerSlide) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const t = translations[language];

  // No fallback to dummy slides
  const slides = bannerSlides;

  useEffect(() => {
    if (slides.length === 0) return;

    const currentDuration = (slides[currentIndex]?.duration || 4) * 1000;
    const timer = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, currentDuration);

    return () => clearTimeout(timer);
  }, [currentIndex, slides]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  const currentSlide = slides[currentIndex];

  return (
    <section 
      id="home" 
      className="relative h-screen flex items-center justify-center pt-24 overflow-hidden"
    >
      {/* Background Image - Keeping as is */}
      <div className="absolute inset-0 z-0">
        <img 
          src={bannerImageUrl || undefined} 
          alt="Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Side: Button Only */}
          <div className="flex flex-col items-start mt-[22rem] lg:mt-[28rem] lg:-translate-x-8 lg:translate-y-3">
            <motion.a
              href="#featured"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="px-12 py-5 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-black text-2xl flex items-center gap-4 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-white/20 hover:scale-105 active:scale-95 group"
            >
              {t.viewCollection}
              <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
            </motion.a>
          </div>

          {/* Right Side: Smaller Glass Specimen Display Widget */}
          <div className="flex justify-center lg:justify-end lg:translate-x-32 lg:-translate-y-3">
            {slides.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-[320px] bg-white/5 backdrop-blur-xl rounded-[32px] p-5 border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.3)] overflow-hidden"
              >
                {/* Widget Header */}
                <div className="flex justify-between items-center mb-4 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#ed1c24] animate-pulse" />
                    <span className="text-[9px] font-mono tracking-widest text-white/60 uppercase">{t.liveSpecimen}</span>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="w-3 h-1 rounded-full bg-[#ed1c24]" />
                  </div>
                </div>

                {/* Specimen Image Area */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/20 border border-white/5 group">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={currentSlide.id}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      src={currentSlide.image || undefined}
                      alt={currentSlide.productName}
                      className="w-full h-full object-cover"
                    />
                  </AnimatePresence>
                  
                  {/* Overlay Info */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="text-sm font-bold text-white mb-0.5">{currentSlide.productName}</h3>
                  </div>
                </div>

                {/* Widget Controls - Compact */}
                <div className="mt-4 flex items-center gap-3">
                  <button 
                    onClick={prevSlide}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                  >
                    <ArrowRight className="w-3 h-3 rotate-180" />
                  </button>
                  <button 
                    onClick={() => onAnalyze(currentSlide)}
                    className="flex-grow py-3 bg-white/10 border border-white/10 rounded-xl text-white font-mono text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all text-center flex items-center justify-center"
                  >
                    {t.analyze}
                  </button>
                  <button 
                    onClick={nextSlide}
                    className="p-3 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Static Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <div className="w-1 h-12 bg-gradient-to-b from-white/40 to-transparent rounded-full" />
      </div>
    </section>
  );
};


const CategorySection = ({ onCategoryClick, products, categoryAds, language, categories, staticBannerUrl }: { onCategoryClick: (category: string) => void; products: Product[]; categoryAds: string[]; language: Language; categories: Category[]; staticBannerUrl: string }) => {
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const t = translations[language];

  useEffect(() => {
    if (!categoryAds || categoryAds.length === 0) return;
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % categoryAds.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [categoryAds]);

  const ad1 = categoryAds && categoryAds.length > 0 ? categoryAds[currentAdIndex] : null;
  const ad2 = categoryAds && categoryAds.length > 1 ? categoryAds[(currentAdIndex + 1) % categoryAds.length] : null;

  return (
    <section id="categories" className="pt-4 pb-24 bg-premium-cream dark:bg-premium-charcoal transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
          <div className="flex-shrink-0 lg:max-w-2xl">
            {/* Static Banner - Now at the top */}
            <div className="w-full h-[110px] lg:h-[155px] rounded-[2rem] overflow-hidden shadow-lg border-4 border-white/60 dark:border-gray-800/60 mb-8">
              <img 
                src={staticBannerUrl || undefined} 
                alt="Static Banner" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <h2 className="text-4xl font-bold tracking-tight mb-4 font-bengali text-gray-900 dark:text-white">{t.shopByCategory}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-bengali">{t.categoryDesc}</p>
          </div>
          
          {/* Animated Ads - Aligned to the top to reduce empty space */}
          {categoryAds.length > 0 && (
            <div className="flex gap-4 h-[140px] lg:h-[180px] w-full lg:w-auto lg:flex-1 lg:justify-end pt-2">
              {ad1 && (
                <div className="flex-1 lg:w-72 lg:flex-none rounded-3xl overflow-hidden shadow-xl border-4 border-white/60 dark:border-gray-800/60 relative">
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={ad1}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      src={ad1 || undefined} 
                      alt="Fashion 1" 
                      className="w-full h-full object-cover" 
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute inset-0 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black tracking-[0.2em] uppercase drop-shadow-md">{t.new}</span>
                  </div>
                </div>
              )}
              
              {ad2 && (
                <div className="flex-1 lg:w-72 lg:flex-none rounded-3xl overflow-hidden shadow-xl border-4 border-white/60 dark:border-gray-800/60 relative">
                  <AnimatePresence mode="wait">
                    <motion.img 
                      key={ad2}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.8 }}
                      src={ad2 || undefined} 
                      alt="Fashion 2" 
                      className="w-full h-full object-cover" 
                    />
                  </AnimatePresence>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute inset-0 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white text-[10px] font-black tracking-[0.2em] uppercase drop-shadow-md">{t.trend}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              whileHover={{ y: -10 }}
              onClick={() => onCategoryClick(cat.value)}
              className="relative group cursor-pointer overflow-hidden rounded-3xl aspect-[4/5]"
            >
              <img
                src={cat.image || undefined}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-8 left-8 text-white">
                <p className="text-xs tracking-[0.2em] uppercase mb-1 opacity-80">{products.filter(p => p.category === cat.value).length}+ {t.items}</p>
                <h3 className="text-3xl font-bold font-bengali">{cat.name}</h3>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
const CategoryProductsPage = ({ products, category, onBack, onAddToCart, onProductClick, onCategoryChange, language, categories, contactLinks }: { products: Product[]; category: string; onBack: () => void; onAddToCart: (product: Product, quantity?: number) => void; onProductClick: (p: Product) => void; onCategoryChange: (cat: string) => void; language: Language; categories: Category[]; contactLinks?: ContactLink[] }) => {
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const t = translations[language];
  
  const currentCategory = categories.find(c => c.value === category);
  const currentCategoryName = currentCategory?.name || category;

  const filteredProducts = useMemo(() => products.filter(p => {
    if (p.category !== category) return false;
    if (selectedSubCategory && p.subCategory !== selectedSubCategory) return false;
    return true;
  }), [products, category, selectedSubCategory]);

  // Reset sub-category when main category changes
  useEffect(() => {
    setSelectedSubCategory(null);
  }, [category]);

  return (
    <div className="pt-32 pb-24 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <table className="mx-auto mb-8">
          <tbody>
            <tr>
              <td>
                <button 
                  onClick={onBack}
                  className="flex items-center gap-2 text-gray-500 hover:text-[#ed1c24] transition-colors font-bold"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  {t.backToHome}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mb-12">
          <h1 className="text-5xl font-black mb-8 font-bengali">{currentCategoryName} {t.collection}</h1>
          
          {/* Sub-Category Tabs (User calls these "Tables") */}
          {currentCategory?.subCategories && currentCategory.subCategories.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-12">
              <button
                onClick={() => setSelectedSubCategory(null)}
                className={`px-8 py-3 rounded-xl font-bold font-bengali transition-all shadow-sm ${
                  selectedSubCategory === null
                    ? 'bg-[#ed1c24] text-white shadow-lg scale-105' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                }`}
              >
                All
              </button>
              {currentCategory.subCategories.map((subCat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSubCategory(subCat)}
                  className={`px-8 py-3 rounded-xl font-bold font-bengali transition-all shadow-sm ${
                    selectedSubCategory === subCat 
                      ? 'bg-[#ed1c24] text-white shadow-lg scale-105' 
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {subCat}
                </button>
              ))}
            </div>
          )}
          
          <p className="text-gray-500 font-bengali mb-8">
            {language === 'en' 
              ? `We have a total of ${filteredProducts.length} ${selectedSubCategory || currentCategoryName} items in our collection.` 
              : `আমাদের সংগ্রহে মোট ${filteredProducts.length}টি ${selectedSubCategory || currentCategoryName} রয়েছে।`
            }
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id}>
              <ProductCard 
                product={product} 
                onAddToCart={onAddToCart} 
                onClick={() => onProductClick(product)} 
                language={language}
                contactLinks={contactLinks}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const ProductCard = ({ product, onAddToCart, onClick, language, contactLinks }: { product: Product; onAddToCart: (product: Product, quantity?: number) => void; onClick: () => void; language?: Language; contactLinks?: ContactLink[] }) => {
  const t = translations[language || 'en'];

  const handleWhatsAppOrder = (e: React.MouseEvent) => {
    e.stopPropagation();
    const message = `Hello Inqilab Collection! I want to order: ${product.name} (Price: ৳${product.price})`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappLink = contactLinks?.find(l => l.type === 'number' && l.label.toLowerCase().includes('whatsapp'));
    const phoneNumber = whatsappLink ? whatsappLink.value.replace(/\D/g, '') : '8801700000000';
    window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="group bg-premium-cream dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 dark:bg-gray-800">
        {(product.images && product.images.length > 0) ? (
          <img
            src={product.images[0] || undefined}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : product.image ? (
          <img
            src={product.image || undefined}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">No Image</div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          <span className="bg-[#ed1c24] text-white px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider shadow-md">
            RED
          </span>
          <span className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider text-premium-charcoal">
            {product.category}
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/60 to-transparent">
          <button
            onClick={(e) => { e.stopPropagation(); onAddToCart(product); }}
            className="w-full bg-premium-cream text-premium-charcoal py-2 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 hover:bg-[#ed1c24] hover:text-white transition-colors"
          >
            <ShoppingBag className="w-3 h-3" />
            {t.addToCart}
          </button>
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-bold mb-0.5 group-hover:text-[#ed1c24] transition-colors line-clamp-1 text-gray-900 dark:text-white">
          {language === 'bn' && product.nameBn ? product.nameBn : product.name}
        </h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-premium-charcoal dark:text-gray-300">BDT {product.price}</span>
          <button
            onClick={handleWhatsAppOrder}
            className="p-1.5 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-white transition-all"
            title={t.orderOnWhatsApp}
          >
            <WhatsAppIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const VerificationModal = ({ isOpen, onClose, onVerify, product, language, user }: { isOpen: boolean; onClose: () => void; onVerify: (order: Order) => void; product: Product; language: Language; user?: any }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [customerInfo, setCustomerInfo] = useState({
    name: user?.displayName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'Bkash' | 'Nagad' | 'Rocket'>('Cash on Delivery');
  const [transactionId, setTransactionId] = useState('');

  useEffect(() => {
    if (user) {
      setCustomerInfo({
        name: user.displayName || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const t = translations[language];

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleConfirmPayment = () => {
    setIsLoading(true);
    
    const newOrder: Order = {
      id: `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email || 'guest@example.com',
      customerPhone: customerInfo.phone,
      customerAddress: customerInfo.address,
      amount: product.price + 60, // Price + Delivery
      status: 'Pending',
      date: new Date().toISOString(),
      items: product.name,
      paymentMethod,
      transactionId: paymentMethod !== 'Cash on Delivery' ? transactionId : undefined
    };

    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
      onVerify(newOrder);
      setTimeout(() => {
        onClose();
        setStep(1);
        setCustomerInfo({ name: '', phone: '', email: '', address: '' });
        setPaymentMethod('Cash on Delivery');
        setTransactionId('');
      }, 2000);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/30 dark:border-gray-700/30"
          >
            {step === 1 ? (
              <div className="p-8 lg:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t.quickOrder}</h3>
                    <p className="text-gray-500 text-sm font-medium">Complete your purchase in seconds</p>
                  </div>
                  <div className="w-12 h-12 bg-[#ed1c24]/10 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-6 h-6 text-[#ed1c24]" />
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 mb-8">
                  {product.image && <img src={product.image || undefined} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt={product.name} />}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">{product.name}</h4>
                    <p className="text-[#ed1c24] font-black">৳{product.price}</p>
                  </div>
                </div>
                
                <form onSubmit={handleNextStep} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.fullName}</label>
                      <div className="relative">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="text" 
                          required
                          value={customerInfo.name}
                          onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})} 
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white dark:focus:bg-gray-800 transition-all font-bold text-sm text-gray-900 dark:text-white" 
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.phoneNumber}</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                          type="tel" 
                          required
                          value={customerInfo.phone}
                          onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})} 
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white dark:focus:bg-gray-800 transition-all font-bold text-sm text-gray-900 dark:text-white" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.email}</label>
                    <div className="relative">
                      <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input 
                        type="email" 
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})} 
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white dark:focus:bg-gray-800 transition-all font-bold text-sm text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.location}</label>
                    <div className="relative">
                      <Truck className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                      <textarea 
                        required
                        rows={2}
                        value={customerInfo.address}
                        onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})} 
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white dark:focus:bg-gray-800 transition-all font-bold text-sm resize-none text-gray-900 dark:text-white" 
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-[#ed1c24] text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                    >
                      <span>{t.checkoutNow}</span>
                      <ArrowRight className="w-5 h-5" />
                    </button>
                    <p className="text-center text-[10px] text-gray-400 mt-4 font-bold uppercase tracking-widest">
                      Total Amount: ৳{product.price + 60} (Inc. Delivery)
                    </p>
                  </div>
                </form>
              </div>
            ) : step === 2 ? (
              <div className="p-8 lg:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white">{t.paymentMethod}</h3>
                    <p className="text-gray-500 text-sm font-medium">Select your preferred payment option</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-gray-400 hover:text-[#ed1c24] transition-colors">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                </div>

                <div className="space-y-2 mb-6">
                  {[
                    { id: 'Cash on Delivery', label: t.cashOnDelivery, color: 'bg-gray-100', iconColor: 'text-gray-600', icon: Truck },
                    { id: 'Bkash', label: t.bkash, color: 'bg-[#D12053]', iconColor: 'text-white', isCustom: true },
                    { id: 'Nagad', label: t.nagad, color: 'bg-[#F7941D]', iconColor: 'text-white', isCustom: true },
                    { id: 'Rocket', label: t.rocket, color: 'bg-[#8C3494]', iconColor: 'text-white', isCustom: true }
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                        paymentMethod === method.id 
                          ? 'border-[#ed1c24] bg-red-50 dark:bg-red-900/20' 
                          : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${method.color} ${method.iconColor}`}>
                          {method.isCustom ? method.label[0] : <method.icon className="w-4 h-4" />}
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-sm">{method.label}</span>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        paymentMethod === method.id ? 'border-[#ed1c24] bg-[#ed1c24]' : 'border-gray-200'
                      }`}>
                        {paymentMethod === method.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </button>
                  ))}
                </div>

                {paymentMethod !== 'Cash on Delivery' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100"
                  >
                    <p className="text-[10px] font-bold text-amber-800 mb-3 leading-tight">{t.paymentInstructions}</p>
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-1">{t.transactionId}</label>
                      <input 
                        type="text" 
                        required
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)} 
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-lg outline-none focus:border-[#ed1c24] transition-all font-bold text-xs" 
                      />
                    </div>
                  </motion.div>
                )}

                <button
                  onClick={handleConfirmPayment}
                  disabled={isLoading || (paymentMethod !== 'Cash on Delivery' && !transactionId)}
                  className="w-full bg-[#ed1c24] text-white py-3.5 rounded-xl font-black text-base shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t.confirmOrder}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8"
                >
                  <RefreshCcw className="w-12 h-12 animate-spin-slow" />
                </motion.div>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4">{t.orderSuccess}</h3>
                <p className="text-gray-500 font-medium mb-8">Thank you for your order! We will contact you shortly for confirmation.</p>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2 }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

interface CartItem {
  product: Product;
  quantity: number;
}

const ProductDetailPage = ({ product, onBack, onAddToCart, language, categories, contactLinks, products, comments, user, isOrderPreview, orderId, onCancelOrder, onProductSelect }: { product: Product; onBack: () => void; onAddToCart: (product: Product, quantity: number) => void; language: Language; categories?: Category[]; contactLinks?: ContactLink[]; products: Product[]; comments: Comment[]; user: any; isOrderPreview?: boolean; orderId?: string; onCancelOrder?: (orderId: string) => void; onProductSelect?: (product: Product) => void }) => {
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const images = (product.images && product.images.length > 0) ? product.images : (product.image ? [product.image] : []);

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Please login to comment');
      return;
    }
    if (getIsQuotaExceeded()) {
      alert('Commenting is temporarily unavailable due to server capacity. Your comment will not be saved to the cloud.');
      setIsSubmitting(false);
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        productId: product.id,
        userName: user.displayName,
        userEmail: user.email,
        comment,
        date: new Date().toISOString(),
        status: 'Approved' // Auto-approve so others can see it immediately
      });
      
      // Create a notification for the admin
      await addDoc(collection(db, 'notifications'), {
        type: 'comment',
        message: `New comment from ${user.email} on product ${product.name}`,
        userEmail: user.email,
        productId: product.id,
        date: new Date().toISOString(),
        read: false
      });
      
      setComment('');
      alert('Comment submitted successfully');
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'comments/notifications');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productComments = useMemo(() => comments.filter(c => c.productId === product.id), [comments, product.id]);
  const [activeTab, setActiveTab] = useState<'description' | 'delivery' | 'reviews' | 'size-guide'>('description');

  const t = translations[language];

  const handleCopyLink = () => {
    const link = `${window.location.origin}?product=${product.id}`;
    navigator.clipboard.writeText(link);
    alert('Product link copied to clipboard!');
  };

  const relatedProducts = useMemo(() => product.relatedProductIds && product.relatedProductIds.length > 0 
    ? products.filter(p => product.relatedProductIds?.includes(p.id)) 
    : products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4), [products, product]);
  const currentCategory = categories?.find(c => c.value === product.category);

  return (
    <>
      <div className="pt-28 pb-20 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center mb-8">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-[#ed1c24] transition-colors font-bold text-sm bg-white border border-gray-100 rounded-full px-4 py-2 shadow-sm">
              <ArrowRight className="w-4 h-4 rotate-180" />
              {t.back}
            </button>
            <button 
              onClick={handleCopyLink}
              className="flex items-center gap-2 text-gray-500 hover:text-[#ed1c24] transition-colors font-bold text-xs bg-white border border-gray-100 px-4 py-2 rounded-full shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5" />
              {t.shareLink}
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
            {/* Left Column: Premium Image Area */}
            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[48px] p-8 border border-white/30 dark:border-gray-700/30 shadow-2xl relative overflow-hidden h-fit">
              {/* Specimen Header (Like Hero Widget & Inventory Card) */}
              <div className="flex justify-between items-center mb-8 px-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#ed1c24] animate-pulse" />
                  <span className="text-[11px] font-mono tracking-[0.2em] text-gray-400 uppercase font-bold">Product Showcase</span>
                </div>
                <div className="flex gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-100" />
                  <div className="w-6 h-1.5 rounded-full bg-[#ed1c24]" />
                </div>
              </div>

              {/* Image Area - Aspect Square */}
              <div className="relative aspect-square rounded-[32px] overflow-hidden bg-white/30 backdrop-blur-xl border border-white/40 shadow-2xl group">
                {images.length > 0 ? (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.img 
                        key={currentImageIndex}
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        src={images[currentImageIndex] || undefined} 
                        alt={product.name} 
                        className="w-full h-full object-cover" 
                      />
                    </AnimatePresence>
                    
                    {images.length > 1 && (
                      <div className="absolute inset-x-6 bottom-8 flex justify-between items-center z-20">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length); }} 
                          className="p-4 bg-white/90 backdrop-blur-md text-gray-900 rounded-2xl hover:bg-[#ed1c24] hover:text-white transition-all shadow-xl border border-white/20"
                        >
                          <ArrowRight className="w-5 h-5 rotate-180" />
                        </button>
                        <div className="flex gap-2 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                          {images.map((_, i) => (
                            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? 'bg-white w-4' : 'bg-white/40'}`} />
                          ))}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % images.length); }} 
                          className="p-4 bg-white/90 backdrop-blur-md text-gray-900 rounded-2xl hover:bg-[#ed1c24] hover:text-white transition-all shadow-xl border border-white/20"
                        >
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-lg uppercase tracking-widest">No Image</div>
                )}
                
                <div className="absolute top-6 right-6 bg-black/60 backdrop-blur-md px-5 py-2 rounded-full text-[10px] font-black text-white shadow-lg z-10 uppercase tracking-widest border border-white/10">
                  {images.length} Photos Available
                </div>
              </div>
            </div>
            
            {/* Right Column: Product Details */}
            <div className="flex flex-col pt-4">
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-[#ed1c24]/10 text-[#ed1c24] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-[#ed1c24]/20">
                  {product.category}
                </span>
                <div className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">In Stock</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-black mb-6 text-gray-900 leading-tight tracking-tight">
                {language === 'bn' && product.nameBn ? product.nameBn : product.name}
              </h1>
              
              <div className="flex items-center gap-6 mb-6">
                <p className="text-4xl font-black text-[#ed1c24]">৳{product.price}</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 mb-10">
                <div className="flex items-center bg-gray-100 rounded-2xl p-1 border border-gray-200">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors font-black text-xl"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-black text-gray-900">{quantity}</span>
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors font-black text-xl"
                  >
                    +
                  </button>
                </div>
                <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                <div className="flex items-center gap-1.5 text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setUserRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star className={`w-5 h-5 ${(hoverRating || userRating) >= star ? 'fill-current text-amber-400' : 'fill-current text-gray-200'}`} />
                    </button>
                  ))}
                  <span className="text-gray-400 text-sm font-black ml-2">{userRating > 0 ? userRating.toFixed(1) : '4.8'}</span>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                {isOrderPreview ? (
                  <button 
                    onClick={() => {
                      if (orderId && onCancelOrder) {
                        onCancelOrder(orderId);
                        onBack();
                      }
                    }}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 py-5 rounded-[24px] font-black text-lg shadow-sm hover:bg-red-100 hover:text-red-700 transition-all flex items-center justify-center gap-4 hover:-translate-y-1 active:scale-95"
                  >
                    Cancel Order
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={() => onAddToCart(product, quantity)}
                      className="flex-1 bg-gray-900 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl hover:bg-[#ed1c24] transition-all flex items-center justify-center gap-4 hover:-translate-y-1 active:scale-95 group"
                    >
                      <ShoppingCart className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                      {t.addToCart}
                    </button>
                    <button 
                      onClick={() => {
                        const message = `Hello Inqilab Collection! I want to order: ${product.name} (Price: ৳${product.price})`;
                        const encodedMessage = encodeURIComponent(message);
                        const whatsappLink = contactLinks?.find(l => l.type === 'number' && l.label.toLowerCase().includes('whatsapp'));
                        const phoneNumber = whatsappLink ? whatsappLink.value.replace(/\D/g, '') : '8801700000000';
                        window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
                      }}
                      className="flex-1 bg-[#25D366] text-white py-5 rounded-[24px] font-black text-lg shadow-2xl hover:bg-[#128C7E] transition-all flex items-center justify-center gap-4 hover:-translate-y-1 active:scale-95"
                    >
                      <WhatsAppIcon className="w-6 h-6" />
                      Order on WhatsApp
                    </button>
                  </>
                )}
              </div>

              {/* Tabs */}
              <div className="w-full grid grid-cols-5 gap-3 mb-8">
                {[
                  { id: 'description', icon: FileText, label: t.description },
                  { id: 'material', icon: Layers, label: t.material },
                  { id: 'care', icon: Settings, label: t.care },
                  { id: 'delivery', icon: Truck, label: t.delivery },
                  { id: 'reviews', icon: Star, label: t.reviews }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex flex-col items-center gap-3 p-4 rounded-[24px] border transition-all ${
                      activeTab === tab.id 
                        ? 'bg-[#ed1c24] text-white border-[#ed1c24] shadow-xl scale-105 z-10' 
                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-[#ed1c24] hover:text-[#ed1c24]'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{tab.label}</span>
                  </button>
                ))}
              </div>
              
              <div className="w-full min-h-[200px] bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-8 rounded-[32px] border border-white/30 dark:border-gray-700/30 shadow-sm">
              {activeTab === 'description' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm text-gray-600 dark:text-gray-300">
                  <p className="whitespace-pre-wrap">{language === 'bn' && product.descriptionBn ? product.descriptionBn : product.description}</p>
                </motion.div>
              )}
              {activeTab === 'material' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 dark:text-gray-300 text-sm">
                  <p className="font-bold mb-2 text-gray-900 dark:text-white">{t.material}</p>
                  <p>Our products are made from the finest premium cotton and silk blends, ensuring maximum comfort and durability for all-day wear.</p>
                  <ul className="list-disc ml-5 mt-3 space-y-1">
                    <li>100% Premium Cotton</li>
                    <li>Breathable fabric</li>
                    <li>High thread count</li>
                  </ul>
                </motion.div>
              )}
              {activeTab === 'care' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 dark:text-gray-300 text-sm">
                  <p className="font-bold mb-2 text-gray-900 dark:text-white">{t.care}</p>
                  <p>To maintain the quality and longevity of your garment, please follow these care instructions:</p>
                  <ul className="list-disc ml-5 mt-3 space-y-1">
                    <li>Hand wash in cold water</li>
                    <li>Do not bleach</li>
                    <li>Iron on low heat</li>
                    <li>Dry in shade</li>
                  </ul>
                </motion.div>
              )}
              {activeTab === 'delivery' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 dark:text-gray-300 text-sm">
                  <p className="font-bold mb-2 text-gray-900 dark:text-white">{t.deliveryInfo || 'Delivery Information'}</p>
                  <p>{t.deliveryDetails || 'Standard delivery within 3-5 business days.'}</p>
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Shipping Fee</p>
                    <p className="font-bold text-gray-900 dark:text-white">Inside Dhaka: ৳80 | Outside Dhaka: ৳150</p>
                  </div>
                </motion.div>
              )}
              {activeTab === 'reviews' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  {productComments.length > 0 ? (
                    <div className="space-y-4">
                      {productComments.map(c => (
                        <div key={c.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                          <p className="font-bold text-gray-900">{c.userName}</p>
                          <p className="text-gray-600">{c.comment}</p>
                          <p className="text-xs text-gray-400">{new Date(c.date).toLocaleDateString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic mb-4">{t.noReviews || 'No reviews yet.'}</p>
                  )}
                  
                  <form onSubmit={handleCommentSubmit} className="space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="font-bold text-gray-900">{t.addComment}</h3>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={t.writeComment}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:border-[#ed1c24] outline-none"
                      rows={3}
                      required
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-6 py-3 bg-[#ed1c24] text-white rounded-xl font-bold hover:bg-black transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? t.submitting : t.submitComment}
                    </button>
                  </form>
                  
                  {/* Sample Review for visual feedback */}
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-900 text-xs">Rahim Ahmed</h5>
                          <div className="flex text-amber-400 text-[10px]">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <Star className="w-2.5 h-2.5 fill-current" />
                            <Star className="w-2.5 h-2.5 fill-current" />
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">2 days ago</span>
                    </div>
                    <p className="text-gray-600 text-xs leading-relaxed">Excellent quality fabric and fitting. Very satisfied with the purchase!</p>
                  </div>
                </motion.div>
              )}
              {activeTab === 'size-guide' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-600 text-sm">
                  <p className="font-bold mb-4">{t.sizeGuide}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-xl overflow-hidden border border-white/30 dark:border-gray-700/30">
                      <thead>
                        <tr className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-700/20">
                          <th className="py-2 font-bold text-xs uppercase tracking-widest text-gray-400">Size</th>
                          <th className="py-2 font-bold text-xs uppercase tracking-widest text-gray-400">Chest</th>
                          <th className="py-2 font-bold text-xs uppercase tracking-widest text-gray-400">Length</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        <tr className="border-b border-gray-50">
                          <td className="py-2 font-bold">M</td>
                          <td className="py-2">40"</td>
                          <td className="py-2">40"</td>
                        </tr>
                        <tr className="border-b border-gray-50">
                          <td className="py-2 font-bold">L</td>
                          <td className="py-2">42"</td>
                          <td className="py-2">42"</td>
                        </tr>
                        <tr className="border-b border-gray-50">
                          <td className="py-2 font-bold">XL</td>
                          <td className="py-2">44"</td>
                          <td className="py-2">44"</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-gray-100 pt-12 mt-12">
            <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">{t.youMightAlsoLike}</h2>
            <div className="flex flex-wrap justify-center gap-6">
              {relatedProducts.map(p => (
                <div key={p.id} className="group cursor-pointer w-36 md:w-48" onClick={() => onProductSelect && onProductSelect(p)}>
                  <div className="rounded-2xl overflow-hidden mb-3 bg-white/30 backdrop-blur-md border border-white/40 shadow-lg aspect-[3/4] flex items-center justify-center">
                    <img 
                      src={p.image || 'https://picsum.photos/seed/product/200/300'} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1 text-center truncate">{p.name}</h3>
                  <p className="text-[#ed1c24] font-black text-sm text-center">৳{p.price}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const UserProfilePage = ({ user, onBack, onLogout, onEdit, language, orders, onCancelOrder, onOrderClick }: { user: any; onBack: () => void; onLogout: () => void; onEdit: () => void; language: Language; orders: Order[]; onCancelOrder: (orderId: string) => void; onOrderClick?: (order: Order) => void }) => {
  const t = translations[language];

  if (!user) return null;

  const userOrders = useMemo(() => orders.filter(order => order.customerEmail === user.email), [orders, user.email]);

  return (
    <div className="pt-32 pb-24 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6">
        <table className="mx-auto mb-8">
          <tbody>
            <tr>
              <td>
                <button 
                  onClick={onBack}
                  className="flex items-center gap-2 text-gray-500 hover:text-[#ed1c24] transition-colors font-bold"
                >
                  <ArrowRight className="w-5 h-5 rotate-180" />
                  {t.backToHome}
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white/30 dark:border-gray-700/30 overflow-hidden"
        >
          {/* Cover Header */}
          <div className="h-48 bg-gradient-to-br from-[#ed1c24] to-[#c4161c] relative">
            <div className="absolute -bottom-16 left-12 w-32 h-32 bg-white rounded-full p-2 shadow-xl">
              <img src={user.photoURL || undefined} className="w-full h-full rounded-full object-cover" alt="Profile" />
            </div>
          </div>

          <div className="pt-20 p-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-1">{user.displayName}</h1>
                <p className="text-gray-500 dark:text-gray-400 font-medium">{user.email}</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={onEdit}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  {t.editProfile}
                </button>
                <button 
                  onClick={onLogout}
                  className="px-6 py-3 bg-red-50 hover:bg-red-100 text-[#ed1c24] rounded-xl font-bold text-sm transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  {t.logout}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t.contactInformation}</h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <UserPlus className="w-5 h-5 text-[#ed1c24]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.fullName}</p>
                        <p className="font-bold text-gray-900">{user.displayName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <ShoppingCart className="w-5 h-5 text-[#ed1c24]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.gmailAddress}</p>
                        <p className="font-bold text-gray-900">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Phone className="w-5 h-5 text-[#ed1c24]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.phoneNumber}</p>
                        <p className="font-bold text-gray-900">{user.phone || t.notProvided}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{t.shippingDetails}</h3>
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 h-full">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
                      <Truck className="w-5 h-5 text-[#ed1c24]" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.defaultAddress}</p>
                      <p className="font-bold text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {user.address || t.noAddressAdded}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity / Orders History */}
            <div className="mt-12">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">{t.orderHistory}</h3>
              {userOrders.length > 0 ? (
                <div className="space-y-4">
                  {userOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="bg-gray-50 rounded-2xl border border-gray-100 p-6 transition-all hover:shadow-md cursor-pointer"
                      onClick={() => onOrderClick && onOrderClick(order)}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                            <ShoppingBag className="w-6 h-6 text-[#ed1c24]" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order #{order.id.slice(0, 8)}</p>
                            <p className="font-bold text-gray-900">{order.items || t.itemsDetailNotAvailable}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                {new Date(order.date).toLocaleDateString()}
                              </p>
                              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <Truck className="w-3 h-3" />
                                {order.customerAddress.slice(0, 30)}... {order.city && `(${order.city})`}
                              </p>
                              {order.paymentMethod && (
                                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  {order.paymentMethod}
                                </p>
                              )}
                              {order.transactionId && (
                                <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                  <Star className="w-3 h-3" />
                                  TX: {order.transactionId}
                                </p>
                              )}
                            </div>
                            {order.note && (
                              <p className="text-[10px] text-gray-400 italic mt-1">Note: {order.note}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-row md:flex-col items-center md:items-end gap-4 md:gap-2 w-full md:w-auto">
                          <p className="text-lg font-black text-[#ed1c24]">৳{order.amount}</p>
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'Delivered' ? 'bg-green-100 text-green-600' :
                            order.status === 'Cancelled' ? 'bg-red-100 text-red-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {order.status}
                          </span>
                          {(order.status === 'Pending' || order.status === 'Processing') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCancelOrder(order.id);
                              }}
                              className="text-[10px] font-bold text-red-500 hover:text-red-700 underline mt-1"
                            >
                              {t.cancelOrder}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl border border-gray-100 p-12 text-center">
                  <ShoppingBag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">You haven't placed any orders yet.</p>
                  <button 
                    onClick={onBack}
                    className="mt-4 text-[#ed1c24] font-black text-sm uppercase tracking-widest hover:underline"
                  >
                    Start Shopping
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const CartProfilePage = ({ cartItems, onBack, user, language, onPlaceOrder, onRemoveFromCart, contactLinks }: { cartItems: CartItem[]; onBack: () => void; user: any; language: Language; onPlaceOrder: (order: Order) => void; onRemoveFromCart: (index: number) => void; contactLinks?: ContactLink[] }) => {
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPaymentStep, setIsPaymentStep] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Cash on Delivery' | 'Bkash' | 'Nagad' | 'Rocket'>('Cash on Delivery');
  const [transactionId, setTransactionId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [customerInfo, setCustomerInfo] = useState({
    name: user?.displayName || '',
    phone: user?.phone || '',
    email: user?.email || '',
    address: user?.address || '',
    city: 'Dhaka',
    note: ''
  });

  useEffect(() => {
    if (user) {
      setCustomerInfo(prev => ({
        ...prev,
        name: user.displayName || prev.name,
        phone: user.phone || prev.phone,
        email: user.email || prev.email,
        address: user.address || prev.address
      }));
    }
  }, [user]);

  const t = translations[language];
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const deliveryFee = 60;
  const total = subtotal + deliveryFee;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setIsPaymentStep(true);
  };

  const handleConfirmOrder = () => {
    const newOrder: Order = {
      id: `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
      customerName: customerInfo.name,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      customerAddress: customerInfo.address,
      amount: total - discount,
      status: 'Pending',
      date: new Date().toISOString(),
      items: cartItems.map(item => `${item.product.name} (x${item.quantity})`).join(', '),
      city: customerInfo.city,
      note: customerInfo.note,
      paymentMethod,
      transactionId: paymentMethod !== 'Cash on Delivery' ? transactionId : undefined
    };
    onPlaceOrder(newOrder);
    alert(`Order placed successfully!\nName: ${customerInfo.name}\nPhone: ${customerInfo.phone}\nAddress: ${customerInfo.address}\nTotal: ৳${total}\nPayment: ${paymentMethod}`);
    setIsCheckingOut(false);
    setIsPaymentStep(false);
    onBack();
  };

  return (
    <div className="pt-28 pb-24 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between mb-12">
          <table className="mx-auto">
            <tbody>
              <tr>
                <td>
                  <button onClick={onBack} className="flex items-center gap-3 text-gray-900 hover:text-[#ed1c24] transition-all font-black uppercase tracking-widest text-xs group border border-gray-300 rounded-full p-2">
                    <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-[#ed1c24] transition-colors">
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </div>
                    {t.back}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{t.shoppingSession}</p>
              <p className="text-xs font-bold text-gray-900">{user ? user.displayName : t.guestCustomer}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5 text-[#ed1c24]" />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[3rem] p-8 lg:p-12 shadow-xl border border-white/30 dark:border-gray-700/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#ed1c24]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-12">
                  <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                    {isPaymentStep ? t.paymentMethod : isCheckingOut ? t.checkoutDetails : t.shoppingCart}
                  </h1>
                  <span className="px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                    {cartCount} {t.items}
                  </span>
                </div>

                {isPaymentStep ? (
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ed1c24]" />
                        {t.selectPaymentMethod}
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          { id: 'Cash on Delivery', label: t.cashOnDelivery, color: 'bg-gray-100', iconColor: 'text-gray-600', icon: Truck },
                          { id: 'Bkash', label: t.bkash, color: 'bg-[#D12053]', iconColor: 'text-white', isCustom: true },
                          { id: 'Nagad', label: t.nagad, color: 'bg-[#F7941D]', iconColor: 'text-white', isCustom: true },
                          { id: 'Rocket', label: t.rocket, color: 'bg-[#8C3494]', iconColor: 'text-white', isCustom: true }
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id as any)}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                              paymentMethod === method.id 
                                ? 'border-[#ed1c24] bg-red-50' 
                                : 'border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${method.color} ${method.iconColor}`}>
                                {method.isCustom ? method.label[0] : <method.icon className="w-5 h-5" />}
                              </div>
                              <span className="font-bold text-gray-900 text-sm">{method.label}</span>
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              paymentMethod === method.id ? 'border-[#ed1c24] bg-[#ed1c24]' : 'border-gray-200'
                            }`}>
                              {paymentMethod === method.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {paymentMethod !== 'Cash on Delivery' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-amber-50 rounded-2xl border border-amber-100"
                      >
                        <p className="text-xs font-bold text-amber-800 mb-4">{t.paymentInstructions}</p>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest ml-1">{t.transactionId}</label>
                          <input 
                            type="text" 
                            required
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            className="w-full px-5 py-3 bg-white border border-amber-200 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-sm"
                          />
                        </div>
                      </motion.div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsPaymentStep(false)}
                        className="flex-1 py-4 border-2 border-gray-100 text-gray-500 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
                      >
                        {t.backToShipping}
                      </button>
                      <button 
                        onClick={handleConfirmOrder}
                        disabled={paymentMethod !== 'Cash on Delivery' && !transactionId}
                        className="flex-[2] py-4 bg-[#ed1c24] text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-black hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {t.confirmOrder}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : isCheckingOut ? (
                  <form onSubmit={handleCheckout} className="space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#ed1c24]" />
                          {t.personalInformation}
                        </h2>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.fullName}</label>
                            <div className="relative">
                              <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input 
                                type="text" 
                                required
                                value={customerInfo.name}
                                onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.email}</label>
                            <div className="relative">
                              <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input 
                                type="email" 
                                required
                                value={customerInfo.email}
                                onChange={(e) => setCustomerInfo({...customerInfo, email: e.target.value})}
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-sm"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-6">
                        <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#ed1c24]" />
                          {t.shippingDetails}
                        </h2>
                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.phoneNumber}</label>
                            <div className="relative">
                              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                              <input 
                                type="tel" 
                                required
                                value={customerInfo.phone}
                                onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-sm"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t.deliveryAddress}</label>
                            <div className="relative">
                              <Truck className="absolute left-4 top-4 w-4 h-4 text-gray-400" />
                              <textarea 
                                required
                                rows={3}
                                value={customerInfo.address}
                                onChange={(e) => setCustomerInfo({...customerInfo, address: e.target.value})}
                                className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-sm resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-6">
                      <button 
                        type="button"
                        onClick={() => setIsCheckingOut(false)}
                        className="flex-1 py-5 border-2 border-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all"
                      >
                        {t.backToCart}
                      </button>
                      <button 
                        type="submit"
                        className="flex-[2] py-5 bg-[#ed1c24] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                      >
                        {t.confirmOrder}
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    {cartCount === 0 ? (
                      <div className="py-24 text-center">
                        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                          <ShoppingBag className="w-10 h-10 text-gray-200" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 mb-2">{t.cartEmpty}</h2>
                        <p className="text-gray-500 mb-8 font-medium">Add some premium items to your collection</p>
                        <button 
                          onClick={onBack}
                          className="px-8 py-4 bg-premium-charcoal text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-[#ed1c24] transition-all"
                        >
                          Explore Collection
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {cartItems.map((item, idx) => (
                            <motion.div 
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={`${item.product.id}-${idx}`} 
                              className="flex items-center gap-6 p-6 bg-gray-50 rounded-3xl border border-gray-100 group hover:bg-white hover:shadow-lg transition-all duration-500"
                            >
                              <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-sm flex-shrink-0">
                                <img src={(item.product.images && item.product.images.length > 0 ? item.product.images[0] : item.product.image) || undefined} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.product.name} />
                              </div>
                              <div className="flex-grow">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{item.product.category}</p>
                                <h4 className="text-lg font-black text-gray-900 mb-1">{item.product.name}</h4>
                                <div className="flex items-center gap-4">
                                  <p className="text-[#ed1c24] font-black">৳{item.product.price}</p>
                                  <span className="text-gray-400 text-xs font-bold">Quantity: {item.quantity}</span>
                                </div>
                              </div>
                              <button 
                                onClick={() => onRemoveFromCart(idx)}
                                className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-100 transition-all shadow-sm"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </motion.div>
                          ))}
                        </div>
                        
                        <div className="pt-8 flex flex-col sm:flex-row justify-end gap-4">
                          <button 
                            onClick={() => {
                              const itemsList = cartItems.map(item => `- ${item.product.name} (x${item.quantity}) (৳${item.product.price * item.quantity})`).join('\n');
                              const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
                              const total = subtotal + 60;
                              const message = `Hello রশশোই! I want to order the following items:\n\n${itemsList}\n\nSubtotal: ৳${subtotal}\nDelivery: ৳60\nTotal: ৳${total}\n\nPlease confirm my order.`;
                              const encodedMessage = encodeURIComponent(message);
                              const whatsappLink = contactLinks?.find(l => l.type === 'number' && l.label.toLowerCase().includes('whatsapp'));
                              const phoneNumber = whatsappLink ? whatsappLink.value.replace(/\D/g, '') : '8801700000000';
                              window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
                            }}
                            className="w-full sm:w-auto px-12 py-5 bg-[#25D366] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-[#128C7E] hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                          >
                            <WhatsAppIcon className="w-5 h-5" />
                            WhatsApp Order
                          </button>
                          <button 
                            onClick={() => setIsCheckingOut(true)}
                            className="w-full sm:w-auto px-12 py-5 bg-[#ed1c24] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-sm shadow-xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                          >
                            {t.checkoutNow}
                            <ArrowRight className="w-5 h-5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Summary */}
          <div className="lg:col-span-4">
            <div className="bg-premium-charcoal rounded-[3rem] p-10 text-white shadow-2xl sticky top-32">
              <h2 className="text-2xl font-black mb-8 tracking-tight">{t.orderSummary}</h2>
              
              <div className="space-y-6 mb-10">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold text-sm">{t.subtotal}</span>
                  <span className="font-black">৳{subtotal}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold text-sm">Discount</span>
                  <span className="font-black text-green-400">-৳{discount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold text-sm">{t.deliveryFee}</span>
                  <span className="font-black">৳{deliveryFee}</span>
                </div>
                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                  <span className="text-lg font-black">{t.total}</span>
                  <span className="text-2xl font-black text-[#ed1c24]">৳{total - discount}</span>
                </div>
              </div>

              {!isCheckingOut && cartCount > 0 && (
                <div className="mb-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <input 
                    type="text"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder-gray-500 mb-2"
                  />
                  <button 
                    onClick={() => {
                      if (couponCode === 'SAVE10') {
                        setDiscount(subtotal * 0.1);
                      } else {
                        alert('Invalid Coupon Code');
                      }
                    }}
                    className="w-full py-2 bg-[#ed1c24] rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white hover:text-[#ed1c24] transition-all"
                  >
                    Apply Coupon
                  </button>
                </div>
              )}

              <div className="bg-white/5 rounded-3xl p-6 border border-white/10 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-[#ed1c24]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Method</p>
                    <p className="text-xs font-bold">Standard Home Delivery</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                    <RefreshCcw className="w-5 h-5 text-[#ed1c24]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Return Policy</p>
                    <p className="text-xs font-bold">7 Days Easy Return</p>
                  </div>
                </div>
              </div>

              {!isCheckingOut && cartCount > 0 && (
                <p className="mt-8 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                  Secure Checkout Powered by রশশোই
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FeaturedProducts = ({ products, onAddToCart, onProductClick, language, categories, contactLinks, searchQuery }: { products: Product[]; onAddToCart: (product: Product, quantity?: number) => void; onProductClick: (product: Product) => void; language: Language; categories: Category[]; contactLinks?: ContactLink[]; searchQuery: string }) => {
  const [filter, setFilter] = useState<string>('All');

  const t = translations[language];

  const filteredProducts = useMemo(() => (filter === 'All'
    ? products
    : filter.includes(':')
      ? products.filter(p => `${p.category}:${p.subCategory}` === filter)
      : products.filter(p => p.category === filter)
  ).filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.nameBn && p.nameBn.toLowerCase().includes(searchQuery.toLowerCase()))
  ), [products, filter, searchQuery]);

  const categoryOptions = [
    { name: language === 'en' ? 'All' : 'সব', value: 'All' },
    ...categories.flatMap(cat => [
      { name: cat.name, value: cat.value },
      ...(cat.subCategories?.map(sub => ({ name: sub, value: `${cat.value}:${sub}` })) || [])
    ])
  ].filter(option => !["Cloth", "Library", "library", "Bamboo shop", "সব লাইব্রেরী", "ক্লথ", "ব্যাম্বো শপ"].includes(option.name));

  return (
    <section id="featured" className="py-24 bg-premium-cream dark:bg-premium-charcoal transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 font-bengali">{t.featuredCollection}</h2>
          <p className="text-gray-500 font-bengali">{t.featuredDesc}</p>
          <div className="flex justify-center gap-4 mt-8 flex-wrap">
            {categoryOptions.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setFilter(cat.value)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all font-bengali ${filter === cat.value ? 'bg-premium-charcoal dark:bg-white dark:text-gray-900 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((product) => (
              <div key={product.id}>
                <ProductCard product={product} onAddToCart={onAddToCart} onClick={() => onProductClick(product)} language={language} contactLinks={contactLinks} />
              </div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

const Footer = ({ language, contactLinks, setIsAdminVisible, isAdminVisible, isDarkMode }: { language: Language; contactLinks: ContactLink[]; setIsAdminVisible: (visible: boolean) => void; isAdminVisible: boolean; isDarkMode?: boolean }) => {
  const t = translations[language];
  const [adminEmail, setAdminEmail] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');

  const handleAdminSubscribe = () => {
    setIsAdminVisible(true);
  };

  const handleNewsletterSubscribe = () => {
    if (newsletterEmail.trim() !== '') {
      alert(language === 'en' ? 'Thank you for subscribing!' : 'সাবস্ক্রাইব করার জন্য ধন্যবাদ!');
      setNewsletterEmail('');
    }
  };

  return (
    <footer id="contact" className="bg-gradient-to-b from-[#111111] to-[#000000] text-white py-24 relative overflow-hidden border-t border-gray-800 transition-colors duration-300 shadow-[0_-20px_40px_rgba(0,0,0,0.1)]">
      {/* Subtle background glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#d4af37]/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#ed1c24]/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#ed1c24] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
                <span className="text-white font-black text-xl">র</span>
              </div>
              <h3 className="text-2xl font-black font-bengali text-white tracking-tight">রশশোই</h3>
            </div>
            <p className="text-gray-400 font-medium leading-relaxed">
              {language === 'en' 
                ? 'Premium quality traditional and modern kitchenware for your home. Quality you can trust.' 
                : 'আপনার বাড়ির জন্য প্রিমিয়াম কোয়ালিটির ঐতিহ্যবাহী এবং আধুনিক কিচেনওয়্যার। বিশ্বস্ত গুণমান।'}
            </p>
            <div className="flex flex-wrap gap-4">
              {contactLinks && contactLinks.filter(link => link.type === 'link').map((link, idx) => {
                const url = link.value.toLowerCase();
                let Icon = Link;
                let hoverClass = 'hover:bg-[#d4af37] hover:border-[#d4af37]';
                if (url.includes('youtube.com')) { Icon = Youtube; hoverClass = 'hover:bg-red-600 hover:border-red-600'; }
                else if (url.includes('facebook.com')) { Icon = Facebook; hoverClass = 'hover:bg-blue-600 hover:border-blue-600'; }
                else if (url.includes('instagram.com')) { Icon = Instagram; hoverClass = 'hover:bg-pink-600 hover:border-pink-600'; }
                else if (url.includes('twitter.com') || url.includes('x.com')) { Icon = Twitter; hoverClass = 'hover:bg-blue-400 hover:border-blue-400'; }
                
                return (
                  <a key={idx} href={link.value} target="_blank" rel="noopener noreferrer" className={`w-11 h-11 flex items-center justify-center bg-white/5 border border-white/10 rounded-xl text-white ${hoverClass} transition-all duration-300 group`} title={link.label}>
                    <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-[0.2em] mb-10">{t.quickLinks}</h4>
            <ul className="space-y-5 text-gray-400 font-medium">
              <li><a href="#home" className="hover:text-[#d4af37] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#d4af37] transition-colors"></span>{t.home}</a></li>
              <li><a href="#categories" className="hover:text-[#d4af37] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#d4af37] transition-colors"></span>{t.categories}</a></li>
              <li><a href="#featured" className="hover:text-[#d4af37] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#d4af37] transition-colors"></span>{t.featured}</a></li>
              <li><a href="#" className="hover:text-[#d4af37] transition-colors flex items-center gap-2 group"><span className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-[#d4af37] transition-colors"></span>{t.sizeGuide}</a></li>
            </ul>
          </div>

          {!isAdminVisible && (
            <div>
              <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-[0.2em] mb-10">{t.adminPortal}</h4>
              <div className="space-y-5">
                <p className="text-gray-500 text-sm font-medium">{t.adminPortalDesc}</p>
                <div className="flex flex-col gap-3">
                  <input 
                    type="email" 
                    placeholder={t.adminEmailPlaceholder} 
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-[#d4af37] focus:bg-white/10 transition-all placeholder:text-gray-500"
                  />
                  <button onClick={handleAdminSubscribe} className="px-5 py-3.5 bg-[#d4af37] text-black font-black rounded-xl hover:bg-white hover:text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#d4af37]/10">
                    {t.accessDashboard}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-xs font-black text-[#d4af37] uppercase tracking-[0.2em] mb-10">{t.newsletter}</h4>
            <p className="text-gray-500 mb-6 font-medium text-sm leading-relaxed">
              {language === 'en' 
                ? 'Subscribe to our newsletter for exclusive offers and new arrivals.' 
                : 'এক্সক্লুসিভ অফার এবং নতুন কালেকশন সম্পর্কে জানতে আমাদের নিউজলেটারে সাবস্ক্রাইব করুন।'}
            </p>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <input
                  type="email"
                  placeholder={t.yourEmailPlaceholder}
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 w-full focus:outline-none focus:border-[#d4af37] focus:bg-white/10 transition-all placeholder:text-gray-500 text-white"
                />
              </div>
              <button onClick={handleNewsletterSubscribe} className="w-full bg-white text-black px-5 py-3.5 rounded-xl font-black hover:bg-[#d4af37] hover:text-white hover:scale-[1.02] active:scale-[0.98] transition-all">
                {t.subscribe}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-500 font-bold uppercase tracking-widest">
          <p>{t.copyright}</p>
          <div className="flex gap-10">
            <a href="#" className="hover:text-white transition-colors">{t.privacyPolicy}</a>
            <a href="#" className="hover:text-white transition-colors">{t.termsOfService}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const CategoryManagement = ({ categories, onUpdateCategories }: { categories: Category[]; onUpdateCategories: (categories: Category[]) => void }) => {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState<Category>({ id: '', name: '', image: '', value: '' });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      onUpdateCategories(categories.map(c => c.id === editingCategory.id ? editingCategory : c));
      setEditingCategory(null);
      alert('Category updated successfully!');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.name && newCategory.value) {
      const categoryToAdd = {
        ...newCategory,
        id: Date.now().toString(),
        image: newCategory.image || `https://picsum.photos/seed/${newCategory.name}/800/1000`
      };
      onUpdateCategories([...categories, categoryToAdd]);
      setIsAddingCategory(false);
      setNewCategory({ id: '', name: '', image: '', value: '' });
      alert('Category added successfully!');
    } else {
      alert('Please fill in Name and Value/Link');
    }
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      onUpdateCategories(categories.filter(c => c.id !== categoryToDelete));
      setCategoryToDelete(null);
    }
  };

  const handleCategoryImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isNew: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        const compressed = await compressImage(result);
        if (isNew) {
          setNewCategory({ ...newCategory, image: compressed });
        } else if (editingCategory) {
          setEditingCategory({ ...editingCategory, image: compressed });
        }
      };
      reader.onerror = () => {
        alert('Failed to upload image. Please try again.');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Category Management</h2>
        <button 
          onClick={() => setIsAddingCategory(true)}
          className="px-6 py-2 bg-[#ed1c24] text-white rounded-xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categories.map(category => (
          <div key={category.id} className="bg-premium-cream dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative group">
            <img src={category.image || undefined} alt={category.name} className="w-full h-48 object-cover rounded-xl mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{category.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{category.value}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setEditingCategory(category)}
                className="flex-1 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-gray-800 transition-all"
              >
                Edit
              </button>
              <button 
                onClick={() => setCategoryToDelete(category.id)}
                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <form onSubmit={handleUpdate} className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-8 rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto border border-white/30 dark:border-gray-700/30">
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Edit Category: {editingCategory.name}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingCategory.name} 
                  onChange={e => setEditingCategory({...editingCategory, name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category Image URL</label>
                <input 
                  type="text" 
                  value={editingCategory.image} 
                  onChange={e => setEditingCategory({...editingCategory, image: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2"
                />
                <div className="flex items-center gap-4">
                  <img src={editingCategory.image || undefined} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => handleCategoryImageUpload(e, false)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Value/Link (Unique ID)</label>
                <input 
                  type="text" 
                  value={editingCategory.value} 
                  onChange={e => setEditingCategory({...editingCategory, value: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              {/* Sub-Category (User calls them Tables) Management */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Tables (Sub-Categories)</label>
                </div>

                <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                  <div className="flex flex-wrap gap-3 mb-4">
                    {editingCategory.subCategories?.map((subCat, idx) => (
                      <div key={idx} className="relative group">
                        <button
                          type="button"
                          className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold font-bengali hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                        >
                          {subCat}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newSubCats = editingCategory.subCategories?.filter((_, i) => i !== idx);
                            setEditingCategory({ ...editingCategory, subCategories: newSubCats });
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="new-table-input-edit"
                      className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:border-gray-400 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          if (input.value.trim()) {
                            const newSubCats = [...(editingCategory.subCategories || []), input.value.trim()];
                            setEditingCategory({ ...editingCategory, subCategories: newSubCats });
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('new-table-input-edit') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const newSubCats = [...(editingCategory.subCategories || []), input.value.trim()];
                          setEditingCategory({ ...editingCategory, subCategories: newSubCats });
                          input.value = '';
                        }
                      }}
                      className="px-6 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm whitespace-nowrap"
                    >
                      + Create Table
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setEditingCategory(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#ed1c24] text-white rounded-xl font-bold text-sm">Save</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Add Modal */}
      {isAddingCategory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <form onSubmit={handleAdd} className="bg-white p-10 rounded-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-100">
            <h3 className="text-2xl font-black text-gray-900 mb-8">Add New Category</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                <input 
                  type="text" 
                  value={newCategory.name} 
                  onChange={e => setNewCategory({...newCategory, name: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category Image URL</label>
                <input 
                  type="text" 
                  value={newCategory.image} 
                  onChange={e => setNewCategory({...newCategory, image: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2"
                />
                <div className="flex items-center gap-4">
                  {newCategory.image && <img src={newCategory.image || undefined} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />}
                  <label className="flex-1 cursor-pointer p-3 bg-white border border-dashed border-gray-300 rounded-xl text-sm text-center font-bold text-gray-500 hover:border-[#ed1c24] hover:text-[#ed1c24] transition-colors">
                    Upload File
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => handleCategoryImageUpload(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Value/Link (Unique ID)</label>
                <input 
                  type="text" 
                  value={newCategory.value} 
                  onChange={e => setNewCategory({...newCategory, value: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              {/* Sub-Category (User calls them Tables) Management */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase">Tables (Sub-Categories)</label>
                </div>

                <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                  <div className="flex flex-wrap gap-3 mb-4">
                    {newCategory.subCategories?.map((subCat, idx) => (
                      <div key={idx} className="relative group">
                        <button
                          type="button"
                          className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold font-bengali hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
                        >
                          {subCat}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const newSubCats = newCategory.subCategories?.filter((_, i) => i !== idx);
                            setNewCategory({ ...newCategory, subCategories: newSubCats });
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="new-table-input-add"
                      className="flex-1 p-4 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:border-[#ed1c24] outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const input = e.currentTarget;
                          if (input.value.trim()) {
                            const newSubCats = [...(newCategory.subCategories || []), input.value.trim()];
                            setNewCategory({ ...newCategory, subCategories: newSubCats });
                            input.value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('new-table-input-add') as HTMLInputElement;
                        if (input && input.value.trim()) {
                          const newSubCats = [...(newCategory.subCategories || []), input.value.trim()];
                          setNewCategory({ ...newCategory, subCategories: newSubCats });
                          input.value = '';
                        }
                      }}
                      className="px-8 py-4 bg-[#ed1c24] text-white rounded-xl font-black text-sm hover:bg-black transition-colors shadow-lg whitespace-nowrap"
                    >
                      + Create Table
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setIsAddingCategory(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Cancel</button>
                <button type="submit" className="flex-1 py-3 bg-[#ed1c24] text-white rounded-xl font-bold text-sm">Add Category</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Category Delete Confirmation Modal */}
      <AnimatePresence>
        {categoryToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-white/30 dark:border-gray-700/30 text-center"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Delete Category?</h3>
              <p className="text-gray-500 text-sm font-medium mb-8">
                Are you sure you want to remove this category? All products in this category will remain but their category link might be broken.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setCategoryToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteCategory}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 shadow-lg transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ContactLinksManagement = ({ contactLinks, onUpdateContactLinks }: { contactLinks: ContactLink[]; onUpdateContactLinks: (links: ContactLink[]) => void }) => {
  const [editingLink, setEditingLink] = useState<ContactLink | null>(null);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState<ContactLink>({ id: '', type: 'link', label: '', value: '' });

  const handleSave = () => {
    let finalLink = editingLink || newLink;
    
    // Ensure links have http:// or https://
    if (finalLink.type === 'link' && finalLink.value && !/^https?:\/\//i.test(finalLink.value)) {
      finalLink = { ...finalLink, value: `https://${finalLink.value}` };
    }

    if (editingLink) {
      onUpdateContactLinks(contactLinks.map(l => l.id === editingLink.id ? finalLink : l));
      setEditingLink(null);
    } else {
      onUpdateContactLinks([...contactLinks, { ...finalLink, id: Date.now().toString() }]);
      setIsAddingLink(false);
      setNewLink({ id: '', type: 'link', label: '', value: '' });
    }
  };

  const handleDelete = (id: string) => {
    onUpdateContactLinks(contactLinks.filter(l => l.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Contacts & Links</h2>
        <div className="flex gap-2">
          <button onClick={() => { setIsAddingLink(true); setNewLink({ id: '', type: 'link', label: 'YouTube', value: '' }); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Link
          </button>
          <button onClick={() => { setIsAddingLink(true); setNewLink({ id: '', type: 'number', label: 'WhatsApp', value: '' }); }} className="px-4 py-2 bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-green-700">
            <Plus className="w-4 h-4" /> Add Number
          </button>
          <button onClick={() => { setIsAddingLink(true); setNewLink({ id: '', type: 'email', label: 'Support Email', value: '' }); }} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-red-700">
            <Plus className="w-4 h-4" /> Add Email
          </button>
          <button onClick={() => { setIsAddingLink(true); setNewLink({ id: '', type: 'courier', label: 'Pathao', value: '' }); }} className="px-4 py-2 bg-red-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-red-700">
            <Plus className="w-4 h-4" /> Add Courier
          </button>
        </div>
      </div>

      <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-3xl shadow-sm border border-white/30 dark:border-gray-700/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-700/20">
              <tr>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Type</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Label</th>
                <th className="text-left py-4 px-6 font-semibold text-gray-900 dark:text-white">Value</th>
                <th className="text-right py-4 px-6 font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contactLinks.map(link => (
                <tr key={link.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      link.type === 'link' ? 'bg-blue-100 text-blue-700' :
                      link.type === 'number' ? 'bg-green-100 text-green-700' :
                      link.type === 'courier' ? 'bg-red-100 text-red-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {link.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-4 px-6 font-medium text-gray-900">{link.label}</td>
                  <td className="py-4 px-6 text-gray-500">{link.value}</td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingLink(link)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(link.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {contactLinks.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">No contacts or links added yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {(isAddingLink || editingLink) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold mb-6">{editingLink ? 'Edit Contact/Link' : 'Add Contact/Link'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select 
                  value={editingLink ? editingLink.type : newLink.type}
                  onChange={(e) => {
                    const type = e.target.value as 'link' | 'number' | 'email' | 'courier';
                    if (editingLink) setEditingLink({ ...editingLink, type });
                    else setNewLink({ ...newLink, type });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent"
                >
                  <option value="link">Link</option>
                  <option value="number">Number</option>
                  <option value="email">Email</option>
                  <option value="courier">Courier</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Label (e.g., Courier Service, YouTube)</label>
                <input 
                  type="text"
                  value={editingLink ? editingLink.label : newLink.label}
                  onChange={(e) => {
                    if (editingLink) setEditingLink({ ...editingLink, label: e.target.value });
                    else setNewLink({ ...newLink, label: e.target.value });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value (URL, Phone, or Email)</label>
                <input 
                  type="text"
                  value={editingLink ? editingLink.value : newLink.value}
                  onChange={(e) => {
                    if (editingLink) setEditingLink({ ...editingLink, value: e.target.value });
                    else setNewLink({ ...newLink, value: e.target.value });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => { setIsAddingLink(false); setEditingLink(null); }} className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="flex-1 py-3 px-4 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductInventoryCard = ({ 
  product, 
  onShare, 
  onEdit, 
  onDelete 
}: { 
  product: Product; 
  onShare: (product: Product) => void; 
  onEdit: (product: Product) => void; 
  onDelete: (id: number) => void;
  key?: any;
}) => {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const images = product.images && product.images.length > 0 ? product.images : (product.image ? [product.image] : []);
  
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImgIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (images.length > 1) {
      setCurrentImgIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden flex flex-col">
      {/* Specimen Header (Like Hero Widget) */}
      <div className="flex justify-between items-center mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#ed1c24] animate-pulse" />
          <span className="text-[9px] font-mono tracking-widest text-gray-400 uppercase">Inventory Item</span>
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-gray-100" />
          <div className="w-3 h-1 rounded-full bg-[#ed1c24]" />
        </div>
      </div>

      {/* Image Area - Aspect Square */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-4 group/img">
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImgIndex}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            src={images[currentImgIndex] || undefined}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>
        
        {images.length === 0 && (
          <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-xs uppercase tracking-widest">No Image</div>
        )}

        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-black text-white shadow-sm z-10">
          {images.length} Photos
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
      </div>

      {/* Info Area */}
      <div className="flex-1 px-1">
        <h3 className="font-black text-gray-900 text-lg truncate mb-0.5 group-hover:text-[#ed1c24] transition-colors">{product.name}</h3>
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-3">{product.category}</p>
        <div className="flex items-center justify-between">
          <span className="text-xl font-black text-[#ed1c24]">৳{product.price}</span>
          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg uppercase tracking-wider">In Stock</span>
        </div>
      </div>

      {/* Controls Area - Row of Buttons (Like Hero Widget) */}
      <div className="mt-5 flex items-center gap-2">
        <button 
          onClick={prevImg}
          className={`p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all ${images.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
          disabled={images.length <= 1}
          title="Previous Image"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
        </button>
        
        <div className="flex-grow flex gap-2">
          <button 
            onClick={() => onShare(product)}
            className="flex-1 py-3.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all border border-transparent hover:border-gray-200 flex items-center justify-center"
            title="Share Link"
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onEdit(product)}
            className="flex-[2] py-3.5 bg-gray-900 text-white rounded-xl font-mono text-[10px] uppercase tracking-widest hover:bg-[#ed1c24] transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-gray-200 hover:shadow-[#ed1c24]/20"
            title="Edit Product"
          >
            <Settings className="w-3.5 h-3.5" />
            Edit
          </button>
          <button 
            onClick={() => onDelete(product.id)}
            className="flex-1 py-3.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100 flex items-center justify-center"
            title="Delete Product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <button 
          onClick={nextImg}
          className={`p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all ${images.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
          disabled={images.length <= 1}
          title="Next Image"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const AdminPanel = ({ onBack, logoUrl, onUpdateLogo, bannerImageUrl, onUpdateBanner, staticBannerUrl, onUpdateStaticBanner, categoryAds, onUpdateCategoryAds, contactLinks, onUpdateContactLinks, categories, onUpdateCategories, products, onAddProduct, onUpdateProduct, onDeleteProduct, isAuthenticated, setIsAuthenticated, activeTab, setActiveTab, bannerSlides, onUpdateBannerSlides, language, setLanguage, orders, onUpdateOrders, isSaving, setIsSaving, syncStatus, onInitializeDatabase, onUpdateAdminProfile, courierSettings, onUpdateCourierSettings, bkashSettings, onUpdateBkashSettings, layoutConfig, onUpdateLayoutConfig, visitorCount, notifications, onUpdateNotifications }: { 
  onBack: () => void; 
  logoUrl: string; 
  onUpdateLogo: (url: string) => void; 
  bannerImageUrl: string; 
  onUpdateBanner: (url: string) => void;
  staticBannerUrl: string;
  onUpdateStaticBanner: (url: string) => void;
  categoryAds: string[];
  onUpdateCategoryAds: (urls: string[]) => void;
  contactLinks: ContactLink[];
  onUpdateContactLinks: (links: ContactLink[]) => void;
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  products: Product[];
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
  isAuthenticated: boolean;
  setIsAuthenticated: (val: boolean) => void;
  activeTab: string;
  setActiveTab: (val: string) => void;
  bannerSlides: BannerSlide[];
  onUpdateBannerSlides: (slides: BannerSlide[]) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  orders: Order[];
  onUpdateOrders: (orders: Order[]) => void;
  isSaving: boolean;
  setIsSaving: (val: boolean) => void;
  syncStatus: 'connected' | 'disconnected' | 'checking';
  onInitializeDatabase: () => void;
  onUpdateAdminProfile: (data: any) => void;
  courierSettings: { apiKey: string; service: string };
  onUpdateCourierSettings: (settings: { apiKey: string; service: string }) => void;
  bkashSettings: { merchantNumber: string; apiKey: string; secretKey: string; appKey: string; appSecret: string };
  onUpdateBkashSettings: (settings: { merchantNumber: string; apiKey: string; secretKey: string; appKey: string; appSecret: string }) => void;
  layoutConfig: LayoutConfig;
  onUpdateLayoutConfig: (config: LayoutConfig) => void;
  visitorCount: number;
  notifications: any[];
  onUpdateNotifications: (notifications: any[]) => void;
}) => {
  const t = translations[language];
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 'Panjabi',
    description: '',
    image: '',
    images: [],
    inventoryCode: 101
  });
  const [newSlide, setNewSlide] = useState<Partial<BannerSlide>>({
    image: '',
    duration: 4,
    productName: '',
    productLink: ''
  });
  const [adminData, setAdminData] = useState({ 
    username: localStorage.getItem('admin_username') || '', 
    businessName: localStorage.getItem('admin_business_name') || 'রশশোই',
    email: localStorage.getItem('admin_email') || '', 
    phone: localStorage.getItem('admin_phone') || '',
    emailPassword: '',
    password: '', 
    photoUrl: localStorage.getItem('admin_photo') || ''
  });
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
    onUpdateOrders(updatedOrders);
  };

  const handleUpdateOrderCourier = (orderId: string, courierService: string) => {
    const updatedOrders = orders.map(o => o.id === orderId ? { ...o, courierService } : o);
    onUpdateOrders(updatedOrders);
  };
  const [showPassword, setShowPassword] = useState(false);
  const [newLogoUrl, setNewLogoUrl] = useState(logoUrl);
  const [newBannerUrl, setNewBannerUrl] = useState(bannerImageUrl);
  const [newStaticBannerUrl, setNewStaticBannerUrl] = useState(staticBannerUrl);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [adminBannerUrl, setAdminBannerUrl] = useState(() => localStorage.getItem('admin_banner') || '');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('All');
  const [inventoryFilter, setInventoryFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);

  const filteredOrders = useMemo(() => orders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.customerPhone.includes(orderSearchQuery);
    const matchesStatus = orderStatusFilter === 'All' || order.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  }), [orders, orderSearchQuery, orderStatusFilter]);

  const handleDeleteOrder = () => {
    if (orderToDelete) {
      const updatedOrders = orders.filter(o => o.id !== orderToDelete.id);
      onUpdateOrders(updatedOrders);
      setOrderToDelete(null);
    }
  };

  const handlePrintInvoice = async (order: Order) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const qrCodeDataUrl = await QRCode.toDataURL(window.location.origin);
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice #${order.id}</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; background: #f9f9f9; }
              .invoice-box { background: white; padding: 40px; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); max-width: 800px; margin: auto; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ed1c24; padding-bottom: 20px; margin-bottom: 30px; }
              .header img { height: 60px; }
              .header h1 { margin: 0; color: #ed1c24; font-size: 2em; }
              .details { display: flex; justify-content: space-between; margin-bottom: 40px; }
              .details div { flex: 1; }
              .total { text-align: right; font-size: 1.5em; font-weight: bold; color: #ed1c24; margin-top: 20px; }
              .qr-code { text-align: center; margin-top: 40px; }
              .qr-code img { width: 120px; height: 120px; }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
              <h1>${adminData.businessName}</h1>
            </div>
            <div class="details">
              <div>
                <h3>Billed To:</h3>
                <p>${order.customerName}</p>
                <p>${order.customerPhone}</p>
                <p>${order.customerAddress}</p>
                ${order.city ? `<p>${order.city}</p>` : ''}
              </div>
              <div>
                <h3>Payment Details:</h3>
                <p>Method: ${order.paymentMethod || 'Cash on Delivery'}</p>
                ${order.transactionId ? `<p>Transaction ID: ${order.transactionId}</p>` : ''}
                <p>Status: ${order.status}</p>
              </div>
            </div>
            <div style="white-space: pre-wrap; margin-bottom: 40px; padding: 20px; background: #f9f9f9; border-radius: 8px;">
              <h3>Order Items</h3>
              ${order.items || 'No items details available.'}
            </div>
            <div class="total">
              Total Amount: ৳${order.amount.toLocaleString()}
            </div>
            <div class="qr-code">
              <p>Scan to visit our website</p>
              ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" alt="QR Code" />` : ''}
            </div>
            <script>
              window.onload = () => window.print();
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const validatePassword = (pass: string) => {
    return pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass);
  };

  const handleAdminPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setAdminData({ ...adminData, photoUrl: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1200, 400);
        setAdminBannerUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.identifier,
        password: loginData.password
      });

      if (error) throw error;

      if (data.user) {
        const role = data.user.user_metadata?.role;
        if (role === 'admin') {
          setIsAuthenticated(true);
        } else {
          // If not admin, sign them out from this session to be safe, or just show error
          await supabase.auth.signOut();
          throw new Error('Access denied. You do not have administrator privileges.');
        }
      }
    } catch (error: any) {
      const errStr = (error?.message || error?.toString() || '').toLowerCase();
      if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('fetch')) {
        // Fallback for demo if network is down and they use the old hardcoded creds
        if (loginData.identifier === 'zulkarnain4982@gmail.com' && loginData.password === 'Zulkarnain@787898') {
          setIsAuthenticated(true);
          return;
        }
      }
      setLoginError(error.message || t.invalidLogin);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateAdminProfile({
      ...adminData,
      bannerUrl: adminBannerUrl
    });
    setIsEditingProfile(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'static-banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const compressed = await compressImage(base64String, type === 'logo' ? 200 : 1200, type === 'logo' ? 200 : 400);
        if (type === 'logo') {
          setNewLogoUrl(compressed);
          onUpdateLogo(compressed);
        } else if (type === 'banner') {
          setNewBannerUrl(compressed);
          onUpdateBanner(compressed);
        } else if (type === 'static-banner') {
          setNewStaticBannerUrl(compressed);
          onUpdateStaticBanner(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setNewProduct({ ...newProduct, image: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (editingProduct) {
          const compressed = await compressImage(reader.result as string);
          const newImages = editingProduct.images ? [...editingProduct.images] : [];
          newImages[index] = compressed;
          setEditingProduct({ ...editingProduct, images: newImages });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSlideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 1200, 400);
        setNewSlide({ ...newSlide, image: compressed });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSlide = () => {
    if (!newSlide.image || !newSlide.productName || !newSlide.productLink) {
      alert('Please fill all required fields and upload an image.');
      return;
    }
    const slide: BannerSlide = {
      id: Date.now().toString(),
      image: newSlide.image,
      duration: newSlide.duration || 4,
      productName: newSlide.productName,
      productLink: newSlide.productLink
    };
    onUpdateBannerSlides([...bannerSlides, slide]);
    setNewSlide({ image: '', duration: 4, productName: '', productLink: '' });
  };

  const handleDeleteSlide = (id: string) => {
    onUpdateBannerSlides(bannerSlides.filter(s => s.id !== id));
  };

  const handleUpdateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProduct) {
      if (!editingProduct.name || !editingProduct.price || (editingProduct.images && editingProduct.images.length === 0)) {
        alert('Please fill all required fields and upload at least one image.');
        return;
      }
      setIsSaving(true);
      setTimeout(() => {
        onUpdateProduct(editingProduct);
        setIsSaving(false);
        setEditingProduct(null);
        alert('Product updated successfully!');
      }, 800);
    }
  };

  const [productToDelete, setProductToDelete] = useState<number | null>(null);

  const handleDeleteProductClick = (productId: number) => {
    setProductToDelete(productId);
  };

  const confirmDelete = () => {
    if (productToDelete !== null) {
      onDeleteProduct(productToDelete);
      setProductToDelete(null);
      setEditingProduct(null);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price || (newProduct.images && newProduct.images.length === 0)) {
      alert('Please fill all required fields and upload at least one image.');
      return;
    }
    setIsSaving(true);
    setTimeout(() => {
      const maxId = Math.max(...products.map(p => p.id), 100);
      const productToSave: Product = {
        ...newProduct as Product,
        id: maxId + 1,
      };
      onAddProduct(productToSave);
      setIsSaving(false);
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: 0, category: 'Panjabi', description: '', images: [], inventoryCode: 101 });
      alert('Product added successfully!');
    }, 800);
  };

  if (!isAuthenticated) {
    return (
      <div className="pt-24 pb-16 bg-premium-cream dark:bg-premium-charcoal min-h-screen flex items-center justify-center px-6 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[400px] bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] py-2 px-6 lg:py-4 lg:px-8 shadow-[0_40px_120px_rgba(0,0,0,0.12)] border border-white/30 dark:border-gray-700/30 relative overflow-hidden transition-all duration-500"
        >
          {/* Decorative background element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-premium-gold/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-[#ed1c24]/10 rounded-full blur-3xl" />

          <div className="text-center mb-6 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-premium-gold/30 to-premium-gold/10 text-premium-gold rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
              <UserPlus className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">{t.adminAccess}</h2>
            <p className="text-gray-500 text-xs font-medium">{t.secureAccess}</p>
          </div>

          <form className="space-y-4 relative z-10" onSubmit={handleSignIn}>
            {loginError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-2">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{loginError}</p>
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-700 uppercase mb-1.5 tracking-widest ml-1">{t.email}</label>
                <input 
                  type="email" 
                  required
                  value={loginData.identifier}
                  onChange={(e) => setLoginData({...loginData, identifier: e.target.value})} 
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-premium-gold focus:bg-white transition-all shadow-sm font-bold text-sm" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-700 uppercase mb-1.5 tracking-widest ml-1">{t.password}</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-premium-gold focus:bg-white transition-all shadow-sm pr-12 font-bold text-sm" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-premium-gold transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-premium-charcoal text-white py-3.5 rounded-xl font-black text-sm shadow-xl hover:bg-black hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{t.signIn}</span>
                )}
              </button>
            </div>
          </form>
          
          <table className="w-full mt-6 mx-auto">
            <tbody>
              <tr>
                <td className="text-center">
                  <button 
                    onClick={onBack}
                    className="text-gray-400 text-[10px] font-bold hover:text-gray-600 transition-colors uppercase tracking-widest"
                  >
                    Return to Storefront
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </motion.div>
      </div>
    );
  }

  const pendingOrdersCount = orders.filter(o => o.status === 'Pending').length;
  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'inventory', label: 'Inventory Management', icon: Boxes },
    { id: 'categories', label: 'Category Management', icon: ShoppingBag },
    { id: 'contacts', label: 'Contacts & Links', icon: Link },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'integrations', label: 'Integrations', icon: Zap },
    { id: 'layout', label: 'Layout Customization', icon: LayoutDashboard },
    { id: 'settings', label: 'Store Settings', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const totalRevenue = orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.amount, 0);
  const totalSales = orders.reduce((sum, o) => sum + o.amount, 0);
  const totalProductsValue = products.reduce((sum, p) => sum + p.price, 0);

  const stats = [
    { label: 'Total Revenue (Delivered)', value: `৳${totalRevenue.toLocaleString()}`, icon: BarChart3, color: 'text-emerald-600', trend: '' },
    { label: 'Total Sales (All Orders)', value: `৳${totalSales.toLocaleString()}`, icon: ShoppingCart, color: 'text-blue-600', trend: '' },
    { label: 'Total Products Value', value: `৳${totalProductsValue.toLocaleString()}`, icon: Boxes, color: 'text-red-600', trend: '' },
    { label: 'Store Visitors', value: visitorCount.toLocaleString(), icon: Eye, color: 'text-amber-600', trend: '' },
  ];

  return (
    <div className="flex min-h-screen bg-premium-cream dark:bg-premium-charcoal pt-20 transition-colors duration-300">
      {/* Sidebar - Google AI Studio Style */}
      <aside className={`${isSidebarCollapsed ? 'w-20' : 'w-72'} bg-white/40 dark:bg-gray-800/40 backdrop-blur-md border border-white/30 dark:border-gray-700/30 flex flex-col fixed h-[calc(100vh-7rem)] top-[6rem] left-6 rounded-3xl shadow-2xl z-20 transition-all duration-300 overflow-hidden`}>
        <div 
          className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          title="Toggle Sidebar"
        >
          <div className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <img src={logoUrl || undefined} alt="Logo" className="w-full h-full object-cover" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-black text-xl tracking-tighter text-gray-900 dark:text-white truncate">
              {localStorage.getItem('admin_business_name') || 'ADMIN PANEL'}
            </span>
          )}
        </div>

        <nav className="flex-grow p-4 space-y-2 mt-4 overflow-y-auto pb-20 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isSidebarCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-4 px-4'} py-3.5 rounded-xl transition-all font-bold text-sm ${
                activeTab === item.id 
                  ? 'bg-[#ed1c24]/5 dark:bg-[#ed1c24]/10 text-[#ed1c24] shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="relative">
                <item.icon className={`w-5 h-5 flex-shrink-0 ${activeTab === item.id ? 'text-[#ed1c24]' : 'text-gray-400'}`} />
                {(item.id === 'notifications' && notifications.filter(n => !n.read).length > 0) || (item.id === 'orders' && pendingOrdersCount > 0) ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                ) : null}
              </div>
              {!isSidebarCollapsed && (
                <>
                  <span className="truncate">{item.label}</span>
                  {(item.id === 'notifications' && notifications.filter(n => !n.read).length > 0) || (item.id === 'orders' && pendingOrdersCount > 0) ? (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.id === 'notifications' ? notifications.filter(n => !n.read).length : pendingOrdersCount}
                    </span>
                  ) : null}
                  {activeTab === item.id && item.id !== 'notifications' && item.id !== 'orders' && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ed1c24] flex-shrink-0" />}
                </>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-grow ${isSidebarCollapsed ? 'ml-[7.5rem]' : 'ml-[20.5rem]'} p-8 lg:p-12 transition-all duration-300`}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] border border-white/30 dark:border-gray-700/30 shadow-sm p-8 min-h-[calc(100vh-10rem)]"
        >
          {activeTab === 'layout' && (
            <LayoutManagement layoutConfig={layoutConfig} onUpdateLayoutConfig={onUpdateLayoutConfig} />
          )}
          {activeTab === 'categories' && (
            <CategoryManagement categories={categories} onUpdateCategories={onUpdateCategories} />
          )}
          {activeTab === 'integrations' && (
            <div className="space-y-12">
              <h2 className="text-3xl font-black text-gray-900">Integrations</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Courier Settings */}
                <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-8 rounded-[2rem] shadow-sm border border-white/30 dark:border-gray-700/30">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">Courier Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Courier Service</label>
                      <select 
                        value={courierSettings.service}
                        onChange={(e) => onUpdateCourierSettings({ ...courierSettings, service: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-premium-charcoal border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 dark:text-white text-sm"
                      >
                        <option value="Pathao">Pathao</option>
                        <option value="Steadfast">Steadfast</option>
                        <option value="RedX">RedX</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">API Key</label>
                      <input
                        type="password"
                        value={courierSettings.apiKey}
                        onChange={(e) => onUpdateCourierSettings({ ...courierSettings, apiKey: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-premium-charcoal border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
                {/* bKash Settings */}
                <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-8 rounded-[2rem] shadow-sm border border-white/30 dark:border-gray-700/30">
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6">bKash Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Merchant Number</label>
                      <input
                        type="text"
                        value={bkashSettings.merchantNumber}
                        onChange={(e) => onUpdateBkashSettings({ ...bkashSettings, merchantNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-premium-charcoal border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">App Key</label>
                      <input
                        type="password"
                        value={bkashSettings.appKey}
                        onChange={(e) => onUpdateBkashSettings({ ...bkashSettings, appKey: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-premium-charcoal border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">App Secret</label>
                      <input
                        type="password"
                        value={bkashSettings.appSecret}
                        onChange={(e) => onUpdateBkashSettings({ ...bkashSettings, appSecret: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-premium-charcoal border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-1.5 ml-1 tracking-widest">Secret Key</label>
                      <input
                        type="password"
                        value={bkashSettings.secretKey}
                        onChange={(e) => onUpdateBkashSettings({ ...bkashSettings, secretKey: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] transition-all font-bold text-gray-900 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'profile' && (
            <div className="max-w-4xl mx-auto bg-premium-cream dark:bg-gray-800 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className={`h-48 relative ${!adminBannerUrl ? 'bg-gradient-to-br from-[#ed1c24] to-[#c4161c]' : ''}`}>
                {adminBannerUrl && (
                  <img src={adminBannerUrl || undefined} alt="Profile Banner" className="w-full h-full object-cover" />
                )}
                {isEditingProfile && (
                  <label className="absolute top-4 right-4 bg-white/90 backdrop-blur px-4 py-2 rounded-xl shadow-lg border border-gray-100 flex items-center gap-2 cursor-pointer hover:bg-white transition-colors text-sm font-bold text-gray-700">
                    <Upload className="w-4 h-4" />
                    Change Banner
                    <input type="file" accept="image/*" className="hidden" onChange={handleAdminBannerUpload} />
                  </label>
                )}
                <div className="absolute -bottom-16 left-12 w-32 h-32 bg-white rounded-full p-2 shadow-xl">
                  <img src={localStorage.getItem('admin_photo') || `https://api.dicebear.com/7.x/avataaars/svg?seed=${localStorage.getItem('admin_username')}`} className="w-full h-full rounded-full object-cover" alt="Profile" />
                  {isEditingProfile && (
                    <label className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-100 flex items-center justify-center cursor-pointer hover:text-[#ed1c24] transition-colors">
                      <Upload className="w-5 h-5" />
                      <input type="file" accept="image/*" className="hidden" onChange={handleAdminPhotoUpload} />
                    </label>
                  )}
                </div>
              </div>
              
              <div className="pt-24 p-12">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-gray-900">Profile Settings</h2>
                  {!isEditingProfile && (
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setIsEditingProfile(true)}
                        className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Profile
                      </button>
                      <button 
                        onClick={() => setIsAuthenticated(false)}
                        className="px-6 py-2.5 bg-red-50 hover:bg-red-100 text-[#ed1c24] rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {!isEditingProfile ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Username</p>
                      <p className="text-lg font-bold text-gray-900">{adminData.username}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Business Name</p>
                      <p className="text-lg font-bold text-gray-900">{adminData.businessName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gmail Address</p>
                      <p className="text-lg font-bold text-gray-900">{adminData.email}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                      <p className="text-lg font-bold text-gray-900">{adminData.phone}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleUpdateProfile} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                      <input 
                        type="text"
                        required
                        value={adminData.username}
                        onChange={(e) => setAdminData({...adminData, username: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Business Name</label>
                      <input 
                        type="text"
                        required
                        value={adminData.businessName}
                        onChange={(e) => setAdminData({...adminData, businessName: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Gmail Address</label>
                      <input 
                        type="email"
                        required
                        value={adminData.email}
                        onChange={(e) => setAdminData({...adminData, email: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                      <input 
                        type="tel"
                        required
                        value={adminData.phone}
                        onChange={(e) => setAdminData({...adminData, phone: e.target.value})}
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div className="md:col-span-2 flex justify-end gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-8 py-4 rounded-2xl font-black text-sm transition-all border-2 border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="px-10 py-4 bg-[#ed1c24] text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

        {activeTab === 'dashboard' && (
          <div className="space-y-12">
            {/* Cloud Sync Status Banner */}
            <div className={`p-6 rounded-[2rem] border flex flex-col md:flex-row items-center justify-between gap-6 ${
              syncStatus === 'connected' 
                ? 'bg-emerald-50 border-emerald-100' 
                : syncStatus === 'checking'
                ? 'bg-blue-50 border-blue-100'
                : 'bg-amber-50 border-amber-100'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  syncStatus === 'connected' 
                    ? 'bg-emerald-500 text-white' 
                    : syncStatus === 'checking'
                    ? 'bg-blue-500 text-white animate-pulse'
                    : 'bg-amber-500 text-white'
                }`}>
                  {syncStatus === 'connected' ? <Zap className="w-6 h-6" /> : <RefreshCcw className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className={`text-lg font-black ${
                    syncStatus === 'connected' ? 'text-emerald-900' : syncStatus === 'checking' ? 'text-blue-900' : 'text-amber-900'
                  }`}>
                    {syncStatus === 'connected' ? 'Cloud Sync Active' : syncStatus === 'checking' ? 'Checking Cloud Sync...' : 'Cloud Sync Inactive'}
                  </h3>
                  <p className={`text-sm font-medium ${
                    syncStatus === 'connected' ? 'text-emerald-600' : syncStatus === 'checking' ? 'text-blue-600' : 'text-amber-600'
                  }`}>
                    {syncStatus === 'connected' 
                      ? 'All your data is safely saved in the cloud and will be available everywhere.' 
                      : syncStatus === 'checking'
                      ? 'Verifying connection to your Supabase database...'
                      : 'Data is only being saved locally. Click setup to enable cloud persistence.'}
                  </p>
                </div>
              </div>
              {syncStatus === 'disconnected' && (
                <button 
                  onClick={onInitializeDatabase}
                  disabled={isSaving}
                  className="px-8 py-3 bg-amber-600 text-white rounded-xl font-black text-sm shadow-lg hover:bg-amber-700 transition-all flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {isSaving ? 'Setting up...' : 'Setup Cloud Database'}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-premium-cream dark:bg-gray-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all group">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl bg-gray-50 ${stat.color} group-hover:scale-110 transition-transform`}>
                      <stat.icon className="w-6 h-6" />
                    </div>
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                      {stat.trend}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">{stat.label}</p>
                    <p className="text-3xl font-black text-gray-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white/30 dark:border-gray-700/30 overflow-hidden">
                <div className="p-10 border-b border-white/20 dark:border-gray-700/20 flex items-center justify-between bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Recent Orders</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Latest transactions from your store</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className="px-6 py-3 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-white/40 dark:border-gray-700/40 rounded-xl text-sm font-black text-[#ed1c24] hover:shadow-md transition-all"
                  >
                    View All Orders
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm text-[10px] uppercase font-black text-gray-700 dark:text-gray-300 tracking-widest border-b border-white/20 dark:border-gray-700/20">
                      <tr>
                        <th className="px-10 py-6">Order ID</th>
                        <th className="px-10 py-6">Customer</th>
                        <th className="px-10 py-6">Amount</th>
                        <th className="px-10 py-6">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50/30 dark:hover:bg-gray-700/30 transition-colors group">
                          <td className="px-10 py-8 font-mono text-xs text-gray-500">#{order.id}</td>
                          <td className="px-10 py-8">
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 dark:text-white">{order.customerName}</span>
                              <span className="text-xs text-gray-400">{order.customerEmail}</span>
                            </div>
                          </td>
                          <td className="px-10 py-8 font-black text-[#ed1c24]">৳{order.amount.toLocaleString()}</td>
                          <td className="px-10 py-8">
                            <span className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
                              {order.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-gradient-to-br from-[#ed1c24] to-[#c4161c] p-10 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative z-10">
                    <h3 className="text-lg font-black mb-2">Need Help?</h3>
                    <p className="text-sm text-white/80 mb-6 leading-relaxed">Our support team is available 24/7 to assist you with your store management.</p>
                    <button onClick={() => window.location.href = 'mailto:support@inqlab.com'} className="px-6 py-3 bg-white text-[#ed1c24] rounded-xl text-xs font-black uppercase tracking-widest hover:shadow-lg transition-all">Contact Support</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="space-y-8">
            {isAddingProduct ? (
              <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/30 dark:border-gray-700/30 shadow-xl max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white">Add New Product</h2>
                    <p className="text-sm text-gray-400 font-medium">Create a new premium item for your store</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingProduct(false)}
                    className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Product Name</label>
                      <input 
                        type="text"
                        required
                        value={newProduct.name}
                        onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Price (BDT)</label>
                        <input 
                          type="number"
                          required
                          value={newProduct.price || ''}
                          onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Category</label>
                        <CustomSelect 
                          value={newProduct.category}
                          onChange={(val) => setNewProduct({...newProduct, category: val as any, subCategory: ''})}
                          options={categories.map(cat => ({ value: cat.value, label: cat.name }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Table (Sub-Category)</label>
                      <CustomSelect 
                        value={newProduct.subCategory || ''}
                        onChange={(val) => setNewProduct({...newProduct, subCategory: val})}
                        options={[
                          { value: '', label: 'None' },
                          ...(categories.find(c => c.value === newProduct.category)?.subCategories || []).map(subCat => ({ value: subCat, label: subCat }))
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Inventory Secret Code</label>
                      <input 
                        type="number"
                        value={newProduct.inventoryCode || ''}
                        onChange={(e) => setNewProduct({...newProduct, inventoryCode: Number(e.target.value)})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Description</label>
                      <textarea 
                        rows={4}
                        value={newProduct.description}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Description (Bengali)</label>
                      <textarea 
                        rows={4}
                        value={newProduct.descriptionBn || ''}
                        onChange={(e) => setNewProduct({...newProduct, descriptionBn: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold resize-none"
                        placeholder="বাংলায় বিবরণ লিখুন..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Related Product Links or IDs (Comma separated)</label>
                      <input 
                        type="text"
                        value={newProduct.relatedProductIds?.join(', ') || ''}
                        onChange={(e) => setNewProduct({...newProduct, relatedProductIds: parseLinksToIds(e.target.value)})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Coupon Code (Optional)</label>
                      <input 
                        type="text"
                        value={newProduct.couponCode || ''}
                        onChange={(e) => setNewProduct({...newProduct, couponCode: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Product Images (Up to 4)</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[0, 1, 2, 3].map((index) => (
                          <div key={index} className="relative group aspect-square rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:border-[#ed1c24] transition-all">
                            {newProduct.images && newProduct.images[index] ? (
                              <>
                                <img src={newProduct.images[index] || undefined} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newImages = [...(newProduct.images || [])];
                                    newImages.splice(index, 1);
                                    setNewProduct({...newProduct, images: newImages});
                                  }}
                                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full font-black shadow-xl"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <Upload className="w-6 h-6 text-gray-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload</p>
                                <input 
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        const newImages = [...(newProduct.images || [])];
                                        newImages[index] = event.target?.result as string;
                                        setNewProduct({...newProduct, images: newImages});
                                      };
                                      reader.readAsDataURL(e.target.files[0]);
                                    }
                                  }}
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-5 bg-[#ed1c24] text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black hover:-translate-y-1 transition-all disabled:opacity-50"
                    >
                      {isSaving ? 'Adding...' : 'Add Product to Store'}
                    </button>
                  </div>
                </form>
              </div>
            ) : editingProduct ? (
              <div className="bg-premium-cream p-10 rounded-[2.5rem] border border-gray-100 shadow-xl max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-black text-gray-900">Edit Product</h2>
                    <p className="text-sm text-gray-400 font-medium">Update product details and images</p>
                  </div>
                  <button 
                    onClick={() => setEditingProduct(null)}
                    className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpdateProductSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Product Name</label>
                      <input 
                        type="text"
                        required
                        value={editingProduct.name}
                        onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Price (BDT)</label>
                        <input 
                          type="number"
                          required
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                          className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Category</label>
                        <CustomSelect 
                          value={editingProduct.category}
                          onChange={(val) => setEditingProduct({...editingProduct, category: val as any, subCategory: ''})}
                          options={categories.map(cat => ({ value: cat.value, label: cat.name }))}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Table (Sub-Category)</label>
                      <CustomSelect 
                        value={editingProduct.subCategory || ''}
                        onChange={(val) => setEditingProduct({...editingProduct, subCategory: val})}
                        options={[
                          { value: '', label: 'None' },
                          ...(categories.find(c => c.value === editingProduct.category)?.subCategories || []).map(subCat => ({ value: subCat, label: subCat }))
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Description</label>
                      <textarea 
                        rows={4}
                        value={editingProduct.description}
                        onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Description (Bengali)</label>
                      <textarea 
                        rows={4}
                        value={editingProduct.descriptionBn || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, descriptionBn: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold resize-none"
                        placeholder="বাংলায় বিবরণ লিখুন..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Related Product Links or IDs (Comma separated)</label>
                      <input 
                        type="text"
                        value={editingProduct.relatedProductIds?.join(', ') || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, relatedProductIds: parseLinksToIds(e.target.value)})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Coupon Code (Optional)</label>
                      <input 
                        type="text"
                        value={editingProduct.couponCode || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, couponCode: e.target.value})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Inventory Code</label>
                      <input 
                        type="number"
                        value={editingProduct.inventoryCode || ''}
                        onChange={(e) => setEditingProduct({...editingProduct, inventoryCode: Number(e.target.value)})}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Product Images (Up to 4)</label>
                      <div className="grid grid-cols-2 gap-4">
                        {[0, 1, 2, 3].map((index) => (
                          <div key={index} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                            {editingProduct.images && editingProduct.images[index] ? (
                              <>
                                <img src={editingProduct.images[index] || undefined} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                <button onClick={() => {
                                  const newImages = [...(editingProduct.images || [])];
                                  newImages.splice(index, 1);
                                  setEditingProduct({...editingProduct, images: newImages});
                                }} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"><X className="w-4 h-4" /></button>
                              </>
                            ) : (
                              <label className="cursor-pointer p-4 text-gray-400">
                                <Upload className="w-8 h-8 mx-auto mb-2" />
                                <span className="text-xs">Upload</span>
                                <input type="file" accept="image/*" onChange={(e) => handleEditProductImageUpload(e, index)} className="hidden" />
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => handleDeleteProductClick(editingProduct.id)}
                        className="flex-1 py-5 bg-gray-100 text-red-600 rounded-2xl font-black text-lg hover:bg-red-50 transition-all"
                      >
                        Delete
                      </button>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="flex-[2] py-5 bg-[#ed1c24] text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black hover:-translate-y-1 transition-all disabled:opacity-50"
                      >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-premium-cream p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex flex-col gap-6 mb-10">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-black text-gray-900">Product Inventory</h2>
                    <button 
                      onClick={() => setIsAddingProduct(true)}
                      className="px-8 py-4 bg-[#ed1c24] text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-black transition-all"
                    >
                      Add New Product
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={() => setInventoryFilter('All')}
                      className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${inventoryFilter === 'All' ? 'bg-[#ed1c24] text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                    >
                      All
                    </button>
                    {categories.map(cat => (
                      <button 
                        key={cat.value}
                        onClick={() => setInventoryFilter(cat.value)}
                        className={`px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${inventoryFilter === cat.value ? 'bg-[#ed1c24] text-white' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.filter(p => inventoryFilter === 'All' || p.category === inventoryFilter).map(product => (
                    <ProductInventoryCard 
                      key={product.id}
                      product={product}
                      onShare={(p) => {
                        const link = `${window.location.origin}?product=${p.id}`;
                        navigator.clipboard.writeText(link);
                        alert('Product link copied: ' + link);
                      }}
                      onEdit={(p) => setEditingProduct({
                        ...p,
                        images: p.images && p.images.length > 0 ? p.images : (p.image ? [p.image] : [])
                      })}
                      onDelete={(id) => handleDeleteProductClick(id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-black text-gray-900">Order Management</h2>
                <p className="text-sm text-gray-500 font-medium">View and manage customer orders</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="text" 
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#ed1c24] transition-colors w-full md:w-64"
                  />
                </div>
                <select 
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none focus:border-[#ed1c24] transition-colors"
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Processing">Processing</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Delivering">Delivering</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
                <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  {filteredOrders.length} Orders
                </span>
              </div>
            </div>

            <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] shadow-sm overflow-hidden border border-white/30 dark:border-gray-700/30">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-b border-white/20 dark:border-gray-700/20">
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Courier</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredOrders.length > 0 ? filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <span className="font-black text-gray-900 text-sm">#{order.id.slice(0, 8)}</span>
                          <p className="text-[10px] text-gray-400 font-bold mt-1">{new Date(order.date).toLocaleDateString()}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 text-sm">{order.customerName}</span>
                            <span className="text-xs text-gray-500">{order.customerPhone}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="font-black text-[#ed1c24]">৳{order.amount.toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{order.paymentMethod || 'COD'}</span>
                            {order.transactionId && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg w-fit">
                                {order.transactionId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value as any)}
                            className={`px-4 py-2 rounded-xl text-xs font-black outline-none border-2 transition-all ${
                              order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              order.status === 'Delivering' ? 'bg-red-50 text-red-600 border-red-100' :
                              order.status === 'Packaging' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              order.status === 'Processing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              order.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-amber-50 text-amber-600 border-amber-100'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="Processing">Processing</option>
                            <option value="Packaging">Packaging</option>
                            <option value="Delivering">Delivering</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="px-8 py-6">
                          <select
                            value={order.courierService || ''}
                            onChange={(e) => handleUpdateOrderCourier(order.id, e.target.value)}
                            className="px-4 py-2 rounded-xl text-xs font-bold outline-none border-2 border-gray-100 focus:border-black transition-all"
                          >
                            <option value="">Select</option>
                            {contactLinks.filter(l => l.type === 'courier').map(courier => (
                              <option key={courier.id} value={courier.label}>{courier.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handlePrintInvoice(order)}
                              className="p-2 bg-gray-50 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Print Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setOrderToDelete(order)}
                              className="p-2 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Order"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-8 py-12 text-center text-gray-500 font-bold">
                          No orders found matching your criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Sales', value: `৳${orders.reduce((sum, order) => sum + order.amount, 0).toLocaleString()}`, change: '+12.5%', icon: <BarChart3 className="w-6 h-6" />, color: 'text-emerald-600' },
                { label: 'Total Orders', value: orders.length.toString(), change: '+8.2%', icon: <ShoppingBag className="w-6 h-6" />, color: 'text-blue-600' },
                { label: 'Total Products', value: products.length.toString(), change: '+15.3%', icon: <UserPlus className="w-6 h-6" />, color: 'text-red-600' },
                { label: 'Total Inventory Value', value: `৳${products.reduce((sum, p) => sum + (p.price || 0), 0).toLocaleString()}`, change: '-1.1%', icon: <BarChart3 className="w-6 h-6" />, color: 'text-amber-600' },
              ].map((stat, i) => (
                <div key={i} className="bg-premium-cream p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl bg-gray-50 ${stat.color}`}>
                      {stat.icon}
                    </div>
                    <span className={`text-xs font-black ${stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                  </div>
                  <h3 className="text-gray-400 text-xs font-black uppercase tracking-widest mb-1">{stat.label}</h3>
                  <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Main Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-premium-cream p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-black text-gray-900">Revenue Overview</h2>
                  <select className="bg-gray-50 border-none text-xs font-black uppercase tracking-widest rounded-xl px-4 py-2 outline-none">
                    <option>Last 7 Days</option>
                    <option>Last 30 Days</option>
                  </select>
                </div>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'Sat', value: 4000 },
                      { name: 'Sun', value: 3000 },
                      { name: 'Mon', value: 2000 },
                      { name: 'Tue', value: 2780 },
                      { name: 'Wed', value: 1890 },
                      { name: 'Thu', value: 2390 },
                      { name: 'Fri', value: 3490 },
                    ]}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ed1c24" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ed1c24" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#9ca3af' }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 900 }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#ed1c24" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-premium-cream p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <h2 className="text-xl font-black text-gray-900 mb-8">Sales by Category</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Panjabi', value: 400 },
                          { name: 'Genji', value: 300 },
                          { name: 'Rumal', value: 300 },
                          { name: 'Sari', value: 200 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {[
                          { color: '#ed1c24' },
                          { color: '#1a1a1a' },
                          { color: '#d4af37' },
                          { color: '#9ca3af' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 mt-4">
                  {[
                    { label: 'Panjabi', value: '40%', color: 'bg-[#ed1c24]' },
                    { label: 'Genji', value: '30%', color: 'bg-black' },
                    { label: 'Rumal', value: '20%', color: 'bg-premium-gold' },
                    { label: 'Others', value: '10%', color: 'bg-gray-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${item.color}`} />
                        <span className="text-xs font-black text-gray-600 uppercase tracking-widest">{item.label}</span>
                      </div>
                      <span className="text-xs font-black text-gray-900">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <ContactLinksManagement contactLinks={contactLinks} onUpdateContactLinks={onUpdateContactLinks} />
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-gray-900 mb-6">Notifications</h2>
            {notifications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-gray-100">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No new notifications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-6 rounded-2xl border ${notif.read ? 'bg-white border-gray-100' : 'bg-red-50 border-red-100'} flex items-start gap-4 transition-colors`}
                  >
                    <div className={`p-3 rounded-full ${notif.read ? 'bg-gray-100 text-gray-500' : 'bg-red-100 text-[#ed1c24]'}`}>
                      <Bell className="w-6 h-6" />
                    </div>
                    <div className="flex-grow">
                      <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-gray-900 font-bold'}`}>{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(notif.date).toLocaleString()}</p>
                    </div>
                    {!notif.read && (
                      <button 
                        onClick={async () => {
                          if (getIsQuotaExceeded()) {
                            console.warn('Cannot update notification status: Quota exceeded');
                            return;
                          }
                          try {
                            await updateDoc(doc(db, 'notifications', notif.id), { read: true });
                          } catch (e) {
                            console.error('Error marking notification as read', e);
                          }
                        }}
                        className="text-xs font-bold text-[#ed1c24] hover:text-red-700 underline"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-12">
            <div className="bg-premium-cream rounded-[2.5rem] shadow-xl border border-gray-100 p-10">
              <h2 className="text-2xl font-black text-gray-900 mb-10">Store Customization</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                {/* Logo Section */}
                <div className="space-y-8">
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
                    <div className="w-2 h-8 bg-[#ed1c24] rounded-full" />
                    Store Logo
                  </h3>
                  <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex flex-col gap-6">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-white rounded-2xl border border-gray-200 p-3 flex items-center justify-center overflow-hidden shadow-sm">
                          <img src={logoUrl || undefined} alt="Current Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-gray-900">Main Logo</p>
                          <p className="text-xs text-gray-400 font-medium">Appears in the navbar and footer</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Change Logo</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'logo')}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full py-5 px-8 bg-premium-charcoal text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 group-hover:bg-black transition-all shadow-lg">
                              <Upload className="w-6 h-6" />
                              Upload New Logo
                            </div>
                          </div>
                          <p className="mt-3 text-[10px] text-gray-400 text-center italic font-medium">Recommended: PNG with transparent background</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Section */}
                <div className="space-y-8">
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
                    <div className="w-2 h-8 bg-premium-gold rounded-full" />
                    Hero Banner
                  </h3>
                  <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex flex-col gap-6">
                      <div className="w-full h-32 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <img src={bannerImageUrl || undefined} alt="Current Banner" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Change Banner</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'banner')}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full py-5 px-8 bg-premium-charcoal text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 group-hover:bg-black transition-all shadow-lg">
                              <Upload className="w-6 h-6" />
                              Upload New Banner
                            </div>
                          </div>
                          <p className="mt-3 text-[10px] text-gray-400 text-center italic font-medium">Recommended: High resolution (1920x1080)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Static Banner Section */}
                <div className="space-y-8">
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
                    <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                    Static Banner (Above Categories)
                  </h3>
                  <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex flex-col gap-6">
                      <div className="w-full h-32 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                        <img src={staticBannerUrl || undefined} alt="Current Static Banner" className="w-full h-full object-cover" />
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Change Static Banner</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'static-banner')}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full py-5 px-8 bg-premium-charcoal text-white rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 group-hover:bg-black transition-all shadow-lg">
                              <Upload className="w-6 h-6" />
                              Upload New Static Banner
                            </div>
                          </div>
                          <p className="mt-3 text-[10px] text-gray-400 text-center italic font-medium">Recommended: High resolution (1200x400)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Ads Section */}
                <div className="space-y-8 lg:col-span-2">
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-500 rounded-full" />
                    Category Promotional Ads
                  </h3>
                  <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex flex-col gap-6">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {categoryAds.map((adUrl, idx) => (
                          <div key={idx} className="relative group aspect-[4/3] rounded-2xl overflow-hidden shadow-sm border border-gray-200">
                            <img src={adUrl || undefined} alt={`Ad ${idx + 1}`} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button 
                                onClick={() => {
                                  const newAds = categoryAds.filter((_, i) => i !== idx);
                                  onUpdateCategoryAds(newAds);
                                }}
                                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest">Add New Ad Image</label>
                          <div className="relative group">
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    onUpdateCategoryAds([...categoryAds, reader.result as string]);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full py-5 px-8 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-4 group-hover:border-premium-charcoal group-hover:text-premium-charcoal transition-all">
                              <Upload className="w-6 h-6" />
                              Upload Ad Image
                            </div>
                          </div>
                          <p className="mt-3 text-[10px] text-gray-400 text-center italic font-medium">Recommended: 800x600 resolution</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner Slider Configuration */}
                <div className="space-y-8 lg:col-span-2">
                  <h3 className="text-lg font-black text-gray-800 flex items-center gap-3">
                    <div className="w-2 h-8 bg-red-500 rounded-full" />
                    Banner Slider Configuration
                  </h3>
                  <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100">
                    <div className="flex flex-col gap-8">
                      {/* Existing Slides List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {bannerSlides.map((slide) => (
                          <div key={slide.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex gap-4 items-center">
                            <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                              <img src={slide.image || undefined} alt={slide.productName} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-grow min-w-0">
                              <h4 className="font-black text-gray-900 truncate">{slide.productName}</h4>
                              <p className="text-xs text-gray-500 truncate">{slide.productLink}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                  {slide.duration}s
                                </span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleDeleteSlide(slide.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add New Slide Form */}
                      <div className="bg-premium-cream p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h4 className="font-black text-gray-900 mb-4">Add New Slide</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Product Image</label>
                            <div className="relative group h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-red-500 transition-colors">
                              {newSlide.image ? (
                                <img src={newSlide.image || undefined} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="text-center text-gray-400">
                                  <Upload className="w-6 h-6 mx-auto mb-1" />
                                  <span className="text-xs font-bold">Upload</span>
                                </div>
                              )}
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={handleSlideImageUpload}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                              />
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Product Name</label>
                              <input 
                                type="text"
                                value={newSlide.productName}
                                onChange={(e) => setNewSlide({...newSlide, productName: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Product Link</label>
                              <input 
                                type="text"
                                value={newSlide.productLink}
                                onChange={(e) => setNewSlide({...newSlide, productLink: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Duration (Seconds)</label>
                              <input 
                                type="number"
                                min="1"
                                value={newSlide.duration}
                                onChange={(e) => setNewSlide({...newSlide, duration: Number(e.target.value)})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500 font-bold text-sm"
                              />
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={handleAddSlide}
                          className="w-full mt-6 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 transition-colors shadow-lg"
                        >
                          Add Slide
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </motion.div>
      </main>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-premium-cream rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Delete Product?</h3>
              <p className="text-gray-500 text-sm font-medium mb-8">
                Are you sure you want to remove this product? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 shadow-lg transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-premium-cream rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Order Details</h3>
                  <p className="text-sm text-gray-500 font-bold">#{selectedOrder.id}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Customer Information</h4>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Name</p>
                        <p className="font-black text-gray-900">{selectedOrder.customerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Phone</p>
                        <p className="font-bold text-gray-700">{selectedOrder.customerPhone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Address</p>
                        <p className="font-bold text-gray-700">{selectedOrder.customerAddress}</p>
                      </div>
                      {selectedOrder.city && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">City</p>
                          <p className="font-bold text-gray-700">{selectedOrder.city}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Order Status</h4>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 mb-4">
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => {
                          handleUpdateOrderStatus(selectedOrder.id, e.target.value as any);
                          setSelectedOrder({ ...selectedOrder, status: e.target.value as any });
                        }}
                        className={`w-full px-4 py-3 rounded-xl text-sm font-black outline-none border-2 transition-all ${
                          selectedOrder.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          selectedOrder.status === 'Delivering' ? 'bg-red-50 text-red-600 border-red-100' :
                          selectedOrder.status === 'Packaging' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          selectedOrder.status === 'Processing' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          selectedOrder.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Packaging">Packaging</option>
                        <option value="Delivering">Delivering</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </div>

                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Courier Service</h4>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100">
                      <select
                        value={selectedOrder.courierService || ''}
                        onChange={(e) => {
                          handleUpdateOrderCourier(selectedOrder.id, e.target.value);
                          setSelectedOrder({ ...selectedOrder, courierService: e.target.value });
                        }}
                        className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none border-2 border-gray-200 focus:border-black transition-all"
                      >
                        <option value="">Select Courier Service</option>
                        {contactLinks.filter(l => l.type === 'courier').map(courier => (
                          <option key={courier.id} value={courier.label}>{courier.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Payment Details</h4>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Amount</p>
                        <p className="text-xl font-black text-[#ed1c24]">৳{selectedOrder.amount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Method</p>
                        <p className="font-bold text-gray-700">{selectedOrder.paymentMethod || 'Cash on Delivery'}</p>
                      </div>
                      {selectedOrder.transactionId && (
                        <div>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">Transaction ID</p>
                          <p className="font-mono text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg inline-block mt-1">
                            {selectedOrder.transactionId}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Order Items</h4>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100">
                      <p className="font-medium text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                        {selectedOrder.items || 'No items details available.'}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.note && (
                    <div>
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Customer Note</h4>
                      <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100">
                        <p className="font-medium text-amber-800 text-sm italic">
                          "{selectedOrder.note}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Delete Confirmation Modal */}
      <AnimatePresence>
        {orderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-premium-cream rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-gray-100 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Delete Order?</h3>
              <p className="text-gray-500 text-sm font-medium mb-8">
                Are you sure you want to delete order #{orderToDelete.id}? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setOrderToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-black text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 shadow-lg transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CategoriesPage = ({ categories, onCategoryClick, language }: { categories: Category[]; onCategoryClick: (category: string) => void; language: Language }) => {
  const t = translations[language];
  return (
    <div className="pt-32 pb-24 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-12 text-center">{t.categories}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categories.map(category => (
            <div 
              key={category.id}
              onClick={() => onCategoryClick(category.value)}
              className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all cursor-pointer group border border-white/30 dark:border-gray-700/30 text-center"
            >
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-50 dark:bg-gray-700 group-hover:scale-110 transition-transform duration-500">
                <img src={category.image || undefined} alt={category.name} className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-[#ed1c24] transition-colors">{category.name}</h3>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FeaturedPage = ({ products, onProductClick, onAddToCart, language, contactLinks }: { products: Product[]; onProductClick: (product: Product) => void; onAddToCart: (product: Product, quantity?: number) => void; language: Language; contactLinks?: ContactLink[] }) => {
  const t = translations[language];
  return (
    <div className="pt-32 pb-24 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-12 text-center">{t.featured}</h1>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id}>
              <ProductCard 
                product={product} 
                onAddToCart={onAddToCart} 
                onClick={() => onProductClick(product)} 
                language={language} 
                contactLinks={contactLinks}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ContactPage = ({ language, contactLinks }: { language: Language; contactLinks: ContactLink[] }) => {
  const t = translations[language];
  return (
    <div className="pt-32 pb-24 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-6">
        <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-12 text-center">{t.contact}</h1>
        <div className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[2.5rem] shadow-xl p-8 md:p-12 border border-white/30 dark:border-gray-700/30">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{t.getInTouch}</h2>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-[#ed1c24]">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.phone}</p>
                    {contactLinks.filter(l => l.type === 'number').length > 0 ? (
                      contactLinks.filter(l => l.type === 'number').map(link => (
                        <p key={link.id} className="font-bold text-gray-900 dark:text-white">{link.value}</p>
                      ))
                    ) : (
                      <p className="font-bold text-gray-900 dark:text-white">+880 1700 000 000</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#ed1c24]">
                    <Send className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.emailLabel}</p>
                    {contactLinks.filter(l => l.type === 'email').length > 0 ? (
                      contactLinks.filter(l => l.type === 'email').map(link => (
                        <p key={link.id} className="font-bold text-gray-900">{link.value}</p>
                      ))
                    ) : (
                      <p className="font-bold text-gray-900">info@inqlabcollection.com</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-[#ed1c24]">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t.address}</p>
                    <p className="font-bold text-gray-900">{t.dhakaBangladesh}</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Message sent!'); }}>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.name}</label>
                  <input type="text" required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.emailLabel}</label>
                  <input type="email" required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{t.message}</label>
                  <textarea required rows={4} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:border-[#ed1c24] focus:bg-white transition-all font-bold text-sm resize-none"></textarea>
                </div>
                <button type="submit" className="w-full py-3 bg-[#ed1c24] text-white rounded-xl font-bold hover:bg-black transition-all">{t.sendMessage}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [isNetworkError, setIsNetworkErrorState] = useState(getNetworkError());

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    return subscribeToNetworkError((val) => {
      setIsNetworkErrorState(val);
      if (val) setSyncStatus('disconnected');
    });
  }, []);

  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [comments, setComments] = useState<Comment[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'comments'), where('status', '==', 'Approved'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment));
      setComments(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'comments');
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'notifications'), orderBy('date', 'desc'));
    let isInitialLoad = true;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(data);
      
      if (!isInitialLoad) {
        const hasNew = snapshot.docChanges().some(change => change.type === 'added');
        if (hasNew) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(e => console.warn('Audio play failed', e));
        }
      }
      isInitialLoad = false;
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'notifications');
    });
    return unsubscribe;
  }, []);
  const [visitorCount, setVisitorCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([
    { id: 'Panjabi', name: 'Panjabi', image: 'https://picsum.photos/seed/panjabi-cat/800/1000', value: 'Panjabi' },
    { id: 'Genji', name: 'Genji', image: 'https://picsum.photos/seed/tee-cat/800/1000', value: 'Genji' },
    { id: 'Rumal', name: 'Rumal', image: 'https://picsum.photos/seed/shawl-cat/800/1000', value: 'Rumal' },
  ]);
  const [bannerSlides, setBannerSlides] = useState<BannerSlide[]>([]);
  const [categoryAds, setCategoryAds] = useState<string[]>([]);
  const [contactLinks, setContactLinks] = useState<ContactLink[]>([]);

  // Initial load from IndexedDB
  useEffect(() => {
    // Global handler for fetch errors to prevent them from bubbling up to the user
    const handleGlobalError = (event: PromiseRejectionEvent) => {
      const errStr = (event.reason?.message || event.reason?.toString() || '').toLowerCase();
      if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('fetch')) {
        console.warn('Caught global fetch error:', errStr);
        setNetworkError(true);
        setSyncStatus('disconnected');
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleGlobalError);

    const loadData = async () => {
      setIsSaving(true);
      try {
        // Check Supabase connection
        const ok = await idb.initialize();
        await testFirebaseConnection();
        setSyncStatus(ok ? 'connected' : 'disconnected');

        const savedProducts = await idb.get('products');
        if (savedProducts) setProducts(savedProducts);

        const savedOrders = await idb.get('orders');
        if (savedOrders) setOrders(savedOrders);

        const savedCategories = await idb.get('categories');
        if (savedCategories) {
          setCategories(savedCategories);
        }

        const savedSlides = await idb.get('banner_slides');
        if (savedSlides) setBannerSlides(savedSlides);

        const savedVisitorCount = await idb.get('visitorCount');
        let currentVisitorCount = savedVisitorCount ? parseInt(savedVisitorCount, 10) : 0;
        
        // Increment visitor count if it's a new session/visit
        if (!sessionStorage.getItem('has_visited')) {
          currentVisitorCount += 1;
          await idb.set('visitorCount', currentVisitorCount.toString(), true);
          sessionStorage.setItem('has_visited', 'true');
        }
        setVisitorCount(currentVisitorCount);

        const savedAds = await idb.get('category_ads');
        if (savedAds) setCategoryAds(savedAds);

        const savedLogo = await idb.get('store_logo');
        if (savedLogo) setLogoUrl(savedLogo);

        const savedBanner = await idb.get('hero_banner');
        if (savedBanner) setBannerImageUrl(savedBanner);

        const savedStaticBanner = await idb.get('static_banner');
        if (savedStaticBanner) setStaticBannerUrl(savedStaticBanner);

        const savedContactLinks = await idb.get('contact_links');
        if (savedContactLinks) setContactLinks(savedContactLinks);

        const savedAdminData = await idb.get('admin_profile');
        if (savedAdminData) {
          localStorage.setItem('admin_username', savedAdminData.username || '');
          localStorage.setItem('admin_business_name', savedAdminData.businessName || '');
          localStorage.setItem('admin_email', savedAdminData.email || '');
          localStorage.setItem('admin_phone', savedAdminData.phone || '');
          localStorage.setItem('admin_photo', savedAdminData.photoUrl || '');
          localStorage.setItem('admin_banner', savedAdminData.bannerUrl || '');
        }
      } catch (e) {
        console.error('Failed to load data from IndexedDB:', e);
      } finally {
        setIsDataLoaded(true);
        setIsSaving(false);
      }
    };
    loadData();

    return () => {
      window.removeEventListener('unhandledrejection', handleGlobalError);
    };
  }, []);

  // Save to IndexedDB (Local only to save Firestore quota)
  useEffect(() => {
    if (isDataLoaded) idb.set('products', products, true).catch(e => console.error('Failed to save products:', e));
  }, [products, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) idb.set('categories', categories, true).catch(e => console.error('Failed to save categories:', e));
  }, [categories, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) idb.set('banner_slides', bannerSlides, true).catch(e => console.error('Failed to save banner_slides:', e));
  }, [bannerSlides, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) idb.set('category_ads', categoryAds, true).catch(e => console.error('Failed to save category_ads:', e));
  }, [categoryAds, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded) idb.set('contact_links', contactLinks, true).catch(e => console.error('Failed to save contact_links:', e));
  }, [contactLinks, isDataLoaded]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });
  const [isAdminVisible, setIsAdminVisible] = useState(false);

  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDarkMode]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isOrderPreview, setIsOrderPreview] = useState(false);
  const [previewOrderId, setPreviewOrderId] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(() => {
    try { return localStorage.getItem('store_logo') || "https://api.dicebear.com/7.x/initials/svg?seed=ICC&backgroundColor=ed1c24&fontFamily=Arial&fontWeight=700"; }
    catch { return "https://api.dicebear.com/7.x/initials/svg?seed=ICC&backgroundColor=ed1c24&fontFamily=Arial&fontWeight=700"; }
  });
  const [bannerImageUrl, setBannerImageUrl] = useState(() => {
    try { return localStorage.getItem('hero_banner') || "https://images.unsplash.com/photo-1541339907198-e08756edd811?q=80&w=2070&auto=format&fit=crop"; }
    catch { return "https://images.unsplash.com/photo-1541339907198-e08756edd811?q=80&w=2070&auto=format&fit=crop"; }
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  const [staticBannerUrl, setStaticBannerUrl] = useState("https://picsum.photos/seed/static-banner/1200/400");
  const [isSaving, setIsSaving] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [courierSettings, setCourierSettings] = useState({ apiKey: '', service: 'Pathao' });
  const [bkashSettings, setBkashSettings] = useState({ merchantNumber: '', apiKey: '', secretKey: '', appKey: '', appSecret: '' });

  const updateCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
  };

  const handleInitializeDatabase = async () => {
    setIsSaving(true);
    resetNetworkError();
    try {
      const ok = await idb.initialize();
      setSyncStatus(ok ? 'connected' : 'disconnected');
      if (ok) alert('Cloud Database connected and synced successfully!');
      else alert('Failed to connect to the Cloud Database. Please check your internet connection or if the Supabase project is active.');
    } catch (e) {
      alert('Database setup failed. Please check your connection.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAdminProfile = async (data: any) => {
    setIsSaving(true);
    try {
      localStorage.setItem('admin_username', data.username);
      localStorage.setItem('admin_business_name', data.businessName);
      localStorage.setItem('admin_email', data.email);
      localStorage.setItem('admin_phone', data.phone);
      if (data.photoUrl) localStorage.setItem('admin_photo', data.photoUrl);
      if (data.bannerUrl) localStorage.setItem('admin_banner', data.bannerUrl);
      
      await idb.set('admin_profile', data);
      alert('Profile updated and synced to cloud!');
    } catch (e) {
      console.error('Failed to save admin profile:', e);
      alert('Profile saved locally but failed to sync to cloud.');
    } finally {
      setIsSaving(false);
    }
  };
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [quickOrderProduct, setQuickOrderProduct] = useState<Product | null>(null);
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>({
    addButtonPosition: { top: '20px', left: '20px' },
    addButtonSize: { width: '3.5rem', height: '3.5rem' },
    showAddButton: true,
    addButtonLabel: "Add Product",
    viewCollectionButtonPosition: { top: '20px', left: '100px' },
    viewCollectionButtonSize: { width: 'auto', height: 'auto' },
    showViewCollectionButton: true,
    viewCollectionButtonLabel: "View Collection",
    widgetPosition: { top: "0px", left: "0px" },
    widgetSize: { width: '320px', height: 'auto' },
    glassEffect: true
  });

  useEffect(() => {
    try {
      localStorage.setItem('language', language);
    } catch (e) {
      console.error('Failed to save language:', e);
    }
  }, [language]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('product');
    if (productId) {
      const product = products.find(p => p.id === Number(productId));
      if (product) {
        setSelectedProduct(product);
        setCurrentPage('product-detail');
      }
    }
  }, [products]);

  const handleAddProduct = (newProduct: Product) => {
    setProducts(prev => [newProduct, ...prev]);
  };

  const handlePlaceOrder = async (newOrder: Order) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    setCartItems([]);
    await idb.set('orders', updatedOrders);

    // Play sound on order confirmation
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.error("Error playing sound:", e));

    // Create a notification for the admin
    if (!getIsQuotaExceeded()) {
      try {
        await addDoc(collection(db, 'notifications'), {
          type: 'order',
          message: `New order #${newOrder.id.slice(0, 8)} placed by ${newOrder.customerName}`,
          userEmail: user.email,
          orderId: newOrder.id,
          date: new Date().toISOString(),
          read: false
        });
      } catch (e) {
        handleFirestoreError(e, OperationType.CREATE, 'notifications');
      }
    } else {
      console.warn('Skipping order notification due to quota exhaustion.');
    }
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => Number(p.id) === Number(updatedProduct.id) ? updatedProduct : p));
  };

  const handleDeleteProduct = (productId: number) => {
    setProducts(prev => prev.filter(p => Number(p.id) !== Number(productId)));
  };

  useEffect(() => {
    // Check active session
    if (isNetworkError) {
      console.log('Skipping Supabase session check due to previous network error.');
      return;
    }

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session?.user) {
          const userData = {
            uid: session.user.id,
            email: session.user.email,
            displayName: session.user.user_metadata?.displayName || session.user.email?.split('@')[0],
            phone: session.user.user_metadata?.phone || '',
            address: session.user.user_metadata?.address || '',
            photoURL: session.user.user_metadata?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`
          };
          setUser(userData);
        }
      })
      .catch(err => {
        const errStr = (err?.message || err?.toString() || '').toLowerCase();
        if (errStr.includes('failed to fetch') || errStr.includes('networkerror') || errStr.includes('fetch')) {
          setNetworkError(true);
          setSyncStatus('disconnected');
          console.warn('Supabase session check failed (network error). Falling back to local auth state.');
        } else {
          console.warn('Supabase session check failed:', err.message);
        }
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const userData = {
          uid: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.displayName || session.user.email?.split('@')[0],
          phone: session.user.user_metadata?.phone || '',
          address: session.user.user_metadata?.address || '',
          photoURL: session.user.user_metadata?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${session.user.email}`
        };
        setUser(userData);
      } else {
        setUser(null);
        setIsAdminAuthenticated(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.product.id === product.id);
      if (existingItem) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity } 
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
    
    setCurrentPage('cart');
  };

  const handleConfirmOrder = (order: Order) => {
    handlePlaceOrder(order);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setCurrentPage('product-detail');
    window.scrollTo(0, 0);
  };

  const handleNavigate = (page: string) => {
    if (page !== 'admin') {
      setIsAdminAuthenticated(false);
    }
    setCurrentPage(page);
    setSelectedCategory(null);
    window.scrollTo(0, 0);
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage('category-view');
    window.scrollTo(0, 0);
  };

  const updateLogo = (url: string) => {
    setLogoUrl(url);
    try { localStorage.setItem('store_logo', url); } catch (e) { console.warn('localStorage full'); }
    idb.set('store_logo', url).catch(e => console.error('Failed to save store_logo:', e));
  };

  const updateBanner = (url: string) => {
    setBannerImageUrl(url);
    try { localStorage.setItem('hero_banner', url); } catch (e) { console.warn('localStorage full'); }
    idb.set('hero_banner', url).catch(e => console.error('Failed to save hero_banner:', e));
  };

  const updateStaticBanner = (url: string) => {
    setStaticBannerUrl(url);
    idb.set('static_banner', url).catch(e => console.error('Failed to save static_banner:', e));
  };

  const updateCategoryAds = (urls: string[]) => {
    setCategoryAds(urls);
  };

  const updateBannerSlides = (slides: BannerSlide[]) => {
    setBannerSlides(slides);
  };

  const handleAnalyze = (slide: BannerSlide) => {
    if (!slide.productLink && !slide.productName) return;

    // 1. Handle anchor links first
    if (slide.productLink && slide.productLink.trim().startsWith('#')) {
      const element = document.querySelector(slide.productLink.trim());
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }

    // 2. Try to find product by ID or Name
    let product: Product | undefined;

    if (slide.productLink) {
      const link = slide.productLink.trim();
      
      // Try to extract product ID from query parameter if it's a full URL
      try {
        if (link.includes('?product=')) {
          const url = new URL(link.startsWith('http') ? link : `http://dummy.com${link.startsWith('/') ? '' : '/'}${link}`);
          const productId = url.searchParams.get('product');
          if (productId) {
            product = products.find(p => p.id.toString() === productId);
          }
        }
      } catch (e) {
        console.warn('Failed to parse URL in handleAnalyze:', e);
      }

      if (!product) {
        const cleanLink = link.replace(/\/$/, '');
        const parts = cleanLink.split('/');
        const lastPart = parts[parts.length - 1];
        
        // Try by ID (last part of link)
        product = products.find(p => p.id.toString() === lastPart);
        
        // Try by Name (last part of link) if ID failed
        if (!product) {
          const decodedLastPart = decodeURIComponent(lastPart).replace(/-/g, ' ');
          product = products.find(p => 
            p.name.toLowerCase() === decodedLastPart.toLowerCase() ||
            p.name.toLowerCase().includes(decodedLastPart.toLowerCase())
          );
        }
      }
    }

    // 3. Try by Slide's Product Name if still not found
    if (!product && slide.productName) {
      product = products.find(p => 
        p.name.toLowerCase() === slide.productName.toLowerCase() ||
        (p.nameBn && p.nameBn === slide.productName)
      );
    }

    // 4. Final attempt: partial match on name
    if (!product && slide.productName) {
      product = products.find(p => p.name.toLowerCase().includes(slide.productName.toLowerCase()));
    }

    if (product) {
      setSelectedProduct(product);
      setCurrentPage('product-detail');
      window.scrollTo(0, 0);
    } else if (slide.productLink && slide.productLink.trim().startsWith('http')) {
      const link = slide.productLink.trim();
      // Check if it's an internal link
      const isInternal = link.includes(window.location.hostname) || link.includes('run.app');
      
      if (isInternal) {
        // For internal links, don't open a new tab. 
        // If we reached here, it means we couldn't find the product object.
        // We can try to navigate the current window instead of opening a new one.
        window.location.href = link;
      } else {
        window.open(link, '_blank');
      }
    }
  };

  const filteredProducts = useMemo(() => products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.nameBn && p.nameBn.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(searchQuery.toLowerCase()) || (a.nameBn && a.nameBn.toLowerCase().startsWith(searchQuery.toLowerCase()));
    const bStarts = b.name.toLowerCase().startsWith(searchQuery.toLowerCase()) || (b.nameBn && b.nameBn.toLowerCase().startsWith(searchQuery.toLowerCase()));
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return 0;
  }), [products, searchQuery]);

  return (
    <div className="min-h-screen bg-premium-cream dark:bg-premium-charcoal text-premium-charcoal dark:text-gray-100 selection:bg-premium-gold selection:text-white transition-colors duration-300">
      <Navbar 
        cartCount={cartCount} 
        onNavigate={handleNavigate} 
        user={user} 
        logoUrl={logoUrl} 
        isAdminPage={currentPage === 'admin'}
        isAdminAuthenticated={isAdminAuthenticated}
        onAdminProfileClick={() => setAdminActiveTab(prev => prev === 'profile' ? 'dashboard' : 'profile')}
        onLoginClick={() => setIsAuthModalOpen(true)}
        language={language}
        setLanguage={setLanguage}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        deferredPrompt={deferredPrompt}
        setDeferredPrompt={setDeferredPrompt}
        orders={orders}
        currentPage={currentPage}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        isAdminVisible={isAdminVisible}
      />

      {/* Network Error Banner */}
      <AnimatePresence>
        {isNetworkError && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-100 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] font-bold uppercase tracking-wider">
                  Offline Mode: Cloud sync is currently unavailable. Your changes are being saved locally.
                </p>
              </div>
              <button 
                onClick={handleInitializeDatabase}
                className="text-[10px] font-black text-amber-800 hover:text-amber-900 underline uppercase tracking-widest flex items-center gap-1"
              >
                <RefreshCcw className="w-3 h-3" />
                Retry Connection
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialUser={user}
        onAuthSuccess={(userData) => {
          setUser(userData);
          setIsAuthModalOpen(false);
        }}
        language={language}
      />

      {/* Global Windows 11 Style Loading Overlay - Removed initial loading */}
      <AnimatePresence>
        {isSaving && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden">
            {/* Backdrop blur */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/5 backdrop-blur-[2px]"
            />
            
            {/* Windows 11 Style Glass Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-[180px] h-[180px] bg-white/0 backdrop-blur-[6px] border border-white/20 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] flex flex-col items-center justify-center gap-5"
            >
              {/* Spinner */}
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-[3px] border-[#ed1c24]/10 rounded-full" />
                <div className="absolute inset-0 border-[3px] border-[#ed1c24] border-t-transparent rounded-full animate-spin shadow-[0_0_10px_rgba(237,28,36,0.3)]" />
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <h2 className="text-[#ed1c24] text-sm font-black tracking-tight">
                  {!isDataLoaded 
                    ? (language === 'en' ? 'Loading Data...' : 'ডাটা লোড হচ্ছে...')
                    : (language === 'en' ? 'Saving Changes' : 'সেভ হচ্ছে')
                  }
                </h2>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                      className="w-1 h-1 bg-[#ed1c24] rounded-full"
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main>
        {currentPage === 'home' && (
          <>
            {searchQuery ? (
              <div className="pt-32 pb-24 bg-premium-cream dark:bg-premium-charcoal min-h-screen transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h2 className="text-3xl font-black text-gray-900 mb-2">
                        {language === 'en' ? 'Search Results' : 'অনুসন্ধান ফলাফল'}
                      </h2>
                      <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                        {filteredProducts.length} {language === 'en' ? 'Items found for' : 'টি পণ্য পাওয়া গেছে'} "{searchQuery}"
                      </p>
                    </div>
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="px-6 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-200 transition-all"
                    >
                      {language === 'en' ? 'Clear Search' : 'সার্চ মুছুন'}
                    </button>
                  </div>

                  {filteredProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6">
                      <AnimatePresence mode="popLayout">
                        {filteredProducts.map((product) => (
                          <motion.div 
                            key={product.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                          >
                            <ProductCard product={product} onAddToCart={handleAddToCart} onClick={() => handleProductClick(product)} language={language} contactLinks={contactLinks} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-gray-800/40 backdrop-blur-md rounded-[3rem] border border-white/30 dark:border-gray-700/30 shadow-sm">
                      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <Search className="w-10 h-10 text-gray-300" />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 mb-2">
                        {language === 'en' ? 'No products found' : 'কোন পণ্য পাওয়া যায়নি'}
                      </h3>
                      <p className="text-gray-400 font-medium">
                        {language === 'en' ? 'Try searching for something else' : 'অন্য কিছু লিখে অনুসন্ধান করুন'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Hero bannerImageUrl={bannerImageUrl} bannerSlides={bannerSlides} language={language} onAnalyze={handleAnalyze} />
                <CategorySection onCategoryClick={handleCategoryClick} products={filteredProducts} categoryAds={categoryAds} language={language} categories={categories} staticBannerUrl={staticBannerUrl} />
                <FeaturedProducts products={filteredProducts} onAddToCart={handleAddToCart} onProductClick={handleProductClick} language={language} categories={categories} contactLinks={contactLinks} searchQuery={searchQuery} />
              </>
            )}
          </>
        )}
        {currentPage === 'category-view' && selectedCategory && (
          <CategoryProductsPage 
            products={filteredProducts}
            category={selectedCategory} 
            onBack={() => setCurrentPage('home')} 
            onAddToCart={handleAddToCart} 
            onProductClick={handleProductClick} 
            onCategoryChange={(cat) => setSelectedCategory(cat)}
            language={language}
            categories={categories}
            contactLinks={contactLinks}
          />
        )}
        {currentPage === 'product-detail' && selectedProduct && (
          <ProductDetailPage 
            product={selectedProduct} 
            onBack={() => {
              setCurrentPage(isOrderPreview ? 'profile' : 'home');
              setIsOrderPreview(false);
              setPreviewOrderId(undefined);
            }} 
            onAddToCart={handleAddToCart} 
            language={language}
            categories={categories}
            contactLinks={contactLinks}
            products={products}
            comments={comments}
            user={user}
            isOrderPreview={isOrderPreview}
            orderId={previewOrderId}
            onCancelOrder={async (orderId) => {
              const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' as const } : o);
              setOrders(updatedOrders);
              await idb.set('orders', updatedOrders);
            }}
            onProductSelect={(product) => {
              setSelectedProduct(product);
              window.scrollTo(0, 0);
            }}
          />
        )}
        {currentPage === 'profile' && user && (
          <UserProfilePage 
            user={user}
            onBack={() => setCurrentPage('home')}
            onLogout={async () => {
              try {
                await supabase.auth.signOut();
              } catch (e: any) {
                console.warn("Sign out error:", e.message);
              } finally {
                setUser(null);
                setCurrentPage('home');
              }
            }}
            onEdit={() => setIsAuthModalOpen(true)}
            language={language}
            orders={orders}
            onCancelOrder={async (orderId) => {
              const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status: 'Cancelled' as const } : o);
              setOrders(updatedOrders);
              await idb.set('orders', updatedOrders);
            }}
            onOrderClick={(order) => {
              // Try to find the product based on the order items string
              // Since items is a string like "Product A (x1), Product B (x2)"
              // We'll find the first product whose name is included in the items string
              const product = products.find(p => order.items?.includes(p.name));
              if (product) {
                setSelectedProduct(product);
                setIsOrderPreview(true);
                setPreviewOrderId(order.id);
                setCurrentPage('product-detail');
                window.scrollTo(0, 0);
              }
            }}
          />
        )}
        {currentPage === 'cart' && (
          <CartProfilePage 
            cartItems={cartItems} 
            onBack={() => setCurrentPage('home')} 
            user={user}
            language={language}
            onPlaceOrder={handlePlaceOrder}
            onRemoveFromCart={handleRemoveFromCart}
            contactLinks={contactLinks}
          />
        )}
        {currentPage === 'admin' && (
          <AdminPanel 
            onBack={() => {
              setIsAdminAuthenticated(false);
              setCurrentPage('home');
            }} 
            logoUrl={logoUrl} 
            onUpdateLogo={updateLogo}
            bannerImageUrl={bannerImageUrl}
            onUpdateBanner={updateBanner}
            staticBannerUrl={staticBannerUrl}
            onUpdateStaticBanner={updateStaticBanner}
            categoryAds={categoryAds}
            onUpdateCategoryAds={setCategoryAds}
            contactLinks={contactLinks}
            onUpdateContactLinks={setContactLinks}
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            isAuthenticated={isAdminAuthenticated}
            setIsAuthenticated={setIsAdminAuthenticated}
            activeTab={adminActiveTab}
            setActiveTab={setAdminActiveTab}
            bannerSlides={bannerSlides}
            onUpdateBannerSlides={updateBannerSlides}
            categories={categories}
            onUpdateCategories={updateCategories}
            language={language}
            setLanguage={setLanguage}
            orders={orders}
            onUpdateOrders={async (updatedOrders) => {
              setOrders(updatedOrders);
              await idb.set('orders', updatedOrders);
            }}
            isSaving={isSaving}
            setIsSaving={setIsSaving}
            syncStatus={syncStatus}
            onInitializeDatabase={handleInitializeDatabase}
            onUpdateAdminProfile={handleUpdateAdminProfile}
            courierSettings={courierSettings}
            onUpdateCourierSettings={setCourierSettings}
            bkashSettings={bkashSettings}
            onUpdateBkashSettings={setBkashSettings}
            layoutConfig={layoutConfig}
            onUpdateLayoutConfig={setLayoutConfig}
            visitorCount={visitorCount}
            notifications={notifications}
            onUpdateNotifications={setNotifications}
          />
        )}
        {currentPage === 'categories' && (
          <CategoriesPage 
            categories={categories} 
            onCategoryClick={handleCategoryClick} 
            language={language} 
          />
        )}
        {currentPage === 'featured' && (
          <FeaturedPage 
            products={filteredProducts} 
            onProductClick={handleProductClick} 
            onAddToCart={handleAddToCart} 
            language={language} 
            contactLinks={contactLinks}
          />
        )}
        {currentPage === 'contact' && (
          <ContactPage language={language} contactLinks={contactLinks} />
        )}
        {quickOrderProduct && (
          <VerificationModal 
            isOpen={isQuickOrderModalOpen}
            onClose={() => setIsQuickOrderModalOpen(false)}
            onVerify={handleConfirmOrder}
            product={quickOrderProduct}
            language={language}
            user={user}
          />
        )}
      </main>
      <Footer language={language} contactLinks={contactLinks} setIsAdminVisible={setIsAdminVisible} isAdminVisible={isAdminVisible} isDarkMode={isDarkMode} />
    </div>
  );
}
