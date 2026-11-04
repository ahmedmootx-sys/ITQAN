import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ==========================================
// 1. Emotion Types & Asset Definitions
// ==========================================
export type RobotEmotion = 'idle' | 'explaining' | 'success' | 'reading' | 'settings' | 'fire';

interface CompanionRobotProps {
  emotion?: RobotEmotion;
  speechText?: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  showConfetti?: boolean;
}

// Replace these URLs or base64 imports with your local asset paths
export const ROBOT_ASSETS: Record<RobotEmotion, string> = {
  idle: '/assets/robot_idle.webp',
  explaining: '/assets/robot_explaining.webp',
  reading: '/assets/robot_reading.webp',
  settings: '/assets/robot_settings.webp',
  success: '/assets/robot_trophy.webp',
  fire: '/assets/robot_fire.webp',
};

// ==========================================
// 2. Confetti Particle Burst Component
// ==========================================
export const ConfettiBurst: React.FC = () => {
  const particles = Array.from({ length: 32 });
  const colors = ['#F97316', '#22C55E', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6'];

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360 * (Math.PI / 180);
        const distance = 80 + Math.random() * 90;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;

        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
            animate={{
              x,
              y,
              scale: 0.3,
              opacity: 0,
              rotate: Math.random() * 720 - 360,
            }}
            transition={{
              duration: 1.2 + Math.random() * 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: colors[i % colors.length] }}
          />
        );
      })}
    </div>
  );
};

// ==========================================
// 3. Speech Bubble Component
// ==========================================
interface SpeechBubbleProps {
  text: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ text }) => {
  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.div
          key={text}
          initial={{ opacity: 0, y: 8, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.94 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 whitespace-nowrap rounded-2xl border border-gray-200/80 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-100"
          dir="rtl"
        >
          {text}
          {/* Subtle speech tail pointing towards the robot */}
          <div className="absolute -bottom-1.5 end-4 h-2.5 w-2.5 rotate-45 border-b border-e border-gray-200/80 bg-white dark:border-white/10 dark:bg-slate-900" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ==========================================
// 4. The <CompanionRobot /> Cross-Fader Component
// ==========================================
export const CompanionRobot: React.FC<CompanionRobotProps> = ({
  emotion = 'idle',
  speechText,
  size = 116,
  className = '',
  onClick,
  showConfetti = false,
}) => {
  const [isBouncing, setIsBouncing] = useState(false);

  const handleClick = () => {
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 500);
    onClick?.();
  };

  const emotionsList: RobotEmotion[] = ['idle', 'explaining', 'reading', 'settings', 'success', 'fire'];

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`} dir="rtl">
      {/* Speech bubble positioned above */}
      {speechText && (
        <div className="mb-2">
          <SpeechBubble text={speechText} />
        </div>
      )}

      {/* Floating container with continuous gentle Y-axis spring */}
      <motion.div
        animate={{
          y: isBouncing ? [-12, 2, 0] : [0, -7, 0],
          scale: isBouncing ? [1.14, 0.94, 1] : 1,
        }}
        transition={{
          y: isBouncing
            ? { duration: 0.48, ease: [0.175, 0.885, 0.32, 1.275] }
            : { duration: 4.4, ease: 'easeInOut', repeat: Infinity },
          scale: { duration: 0.48, ease: [0.175, 0.885, 0.32, 1.275] },
        }}
        onClick={handleClick}
        style={{ width: size, height: size }}
        className="relative cursor-pointer transition-transform hover:scale-105 active:scale-95"
      >
        {/* State Machine Cross-Fader: All state images are pre-rendered in absolute position */}
        {emotionsList.map((state) => {
          const isActive = emotion === state;

          return (
            <motion.img
              key={state}
              src={ROBOT_ASSETS[state]}
              alt={state}
              draggable={false}
              initial={false}
              animate={{
                opacity: isActive ? 1 : 0,
                scale: isActive ? 1 : 0.95,
              }}
              transition={{
                duration: 0.35,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />
          );
        })}

        {/* Confetti burst trigger */}
        {showConfetti && <ConfettiBurst />}
      </motion.div>
    </div>
  );
};

// ==========================================
// 5. Example Application UI Layout Integration
// ==========================================
export const ItqanAppLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'review' | 'words' | 'settings'>('home');
  const [robotEmotion, setRobotEmotion] = useState<RobotEmotion>('idle');
  const [speechText, setSpeechText] = useState('أنا معك، مستعد للمذاكرة؟ 🚀');
  const [showConfetti, setShowConfetti] = useState(false);
  const [exerciseMode, setExerciseMode] = useState<'read' | 'listen' | 'write'>('read');

  // React to tab changes
  useEffect(() => {
    if (activeTab === 'home') {
      setRobotEmotion('idle');
      setSpeechText('الاستمرار هو سر الإتقان!');
    } else if (activeTab === 'review') {
      setRobotEmotion('explaining');
      setSpeechText('اقرأ أو استمع وخمّن المعنى!');
    } else if (activeTab === 'words') {
      setRobotEmotion('reading');
      setSpeechText('مكتبة كلماتك الخاصة ومراجعاتك 📖');
    } else if (activeTab === 'settings') {
      setRobotEmotion('settings');
      setSpeechText('تخصيص الإعدادات ومزامنة الصوت ⚙️');
    }
  }, [activeTab]);

  // Handle Mode Switch on Home
  const handleModeChange = (mode: 'read' | 'listen' | 'write') => {
    setExerciseMode(mode);
    if (mode === 'read') {
      setRobotEmotion('explaining');
      setSpeechText('انظر واستمع!');
    } else if (mode === 'listen') {
      setRobotEmotion('explaining');
      setSpeechText('استمع وفكر!');
    } else {
      setRobotEmotion('reading');
      setSpeechText('اكتب ما تسمعه!');
    }
  };

  // Simulate correct answer action
  const handleCorrectAnswer = () => {
    setRobotEmotion('success');
    setSpeechText('إجابة صحيحة! أحسنت 🏆');
    setShowConfetti(true);

    setTimeout(() => {
      setShowConfetti(false);
      setRobotEmotion('idle');
      setSpeechText('أحسنت! إلى البطاقة التالية');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-['Tajawal'] text-slate-900 dark:bg-[#070A12] dark:text-slate-100" dir="rtl">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 px-4 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-[#070A12]/80">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <button className="flex items-center gap-2.5 rounded-xl transition hover:opacity-90">
            <img src="/icon-192.png" alt="ITQAN" className="h-9 w-9 rounded-xl object-cover shadow-sm ring-1 ring-black/5" />
            <span className="font-['Inter'] text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">ITQAN</span>
          </button>
          <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-slate-200">
            <b>12</b> للمراجعة
          </div>
        </div>
      </header>

      {/* Main View Shell */}
      <main className="mx-auto max-w-lg px-4 pt-6 pb-28">
        {/* HOME SCREEN */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div>
                <h1 className="text-2xl font-black">مرحباً بك! 👋</h1>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">تابع تقدمك اليومي بالتكرار المتباعد</p>
              </div>
              <CompanionRobot emotion={robotEmotion} speechText={speechText} size={118} />
            </div>

            {/* Mode Selector Segmented Pills */}
            <div className="grid grid-cols-3 gap-2 rounded-2xl border border-gray-200 bg-gray-100/70 p-1.5 dark:border-white/10 dark:bg-slate-800/60">
              {(['read', 'listen', 'write'] as const).map((m) => {
                const isSelected = exerciseMode === m;
                const label = m === 'read' ? 'قراءة' : m === 'listen' ? 'استماع' : 'كتابة';
                return (
                  <button
                    key={m}
                    onClick={() => handleModeChange(m)}
                    className={`rounded-xl py-2.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'border border-gray-200 bg-white text-orange-600 shadow-sm dark:border-white/10 dark:bg-slate-900 dark:text-orange-400'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* REVIEW SCREEN */}
        {activeTab === 'review' && (
          <div className="space-y-5 text-center">
            <CompanionRobot emotion={robotEmotion} speechText={speechText} showConfetti={showConfetti} size={110} />

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <span className="text-3xl font-extrabold font-['Inter']">Perseverance</span>
              <p className="mt-2 text-sm text-slate-500">المثابرة / الإصرار</p>

              <div className="mt-8 flex gap-3 justify-center">
                <button
                  onClick={handleCorrectAnswer}
                  className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-500/20 transition hover:bg-emerald-600 active:scale-95"
                >
                  صحيح (Correct) ✨
                </button>
                <button
                  onClick={() => {
                    setRobotEmotion('explaining');
                    setSpeechText('ركز في نطق الكلمة ومعناها');
                  }}
                  className="rounded-full border border-gray-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-gray-50 active:scale-95 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
                >
                  مرة أخرى
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WORDS SCREEN */}
        {activeTab === 'words' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <div>
                <h2 className="text-lg font-bold">بنك المفردات</h2>
                <p className="text-xs text-slate-500">كلماتك الخاصة والمفردات المحفوظة</p>
              </div>
              <CompanionRobot emotion="reading" size={90} />
            </div>
          </div>
        )}

        {/* SETTINGS SCREEN */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900">
              <CompanionRobot emotion="settings" size={72} />
              <div>
                <h2 className="text-lg font-bold">إعدادات التطبيق</h2>
                <p className="text-xs text-slate-500">ضبط النطق، المظهر، وسرعة الصوت</p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Floating Navigation Dock */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#151835]/95 px-4 pb-safe pt-2 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {(['home', 'review', 'words', 'settings'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const labels = { home: 'الرئيسية', review: 'المذاكرة', words: 'كلماتي', settings: 'الإعدادات' };

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex flex-col items-center py-1.5 text-[11px] font-bold transition-colors ${
                  isActive ? 'text-orange-500' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavWave"
                    className="absolute -top-1 h-8 w-12 rounded-full border border-orange-500/30 bg-orange-500/15 shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{labels[tab]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default CompanionRobot;

