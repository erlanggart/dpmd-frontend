import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cake, PartyPopper, Gift } from 'lucide-react';
import api from '../api';
import { getAvatarUrl } from '../utils/avatarUtils';
import confetti from 'canvas-confetti';

const SWEET_MESSAGES = [
  'Semoga panjang umur, sehat selalu, dan sukses dalam berkarya! 🌟',
  'Semoga selalu diberkahi kebahagiaan dan kesuksesan! ✨',
  'Semoga semua harapan dan cita-cita tercapai! 🙏',
  'Semoga tahun ini penuh kebahagiaan dan pencapaian! 🎉',
  'Semoga selalu diberikan kesehatan dan rezeki yang berlimpah! 💫',
];

const BirthdayPopup = () => {
  const [birthdayPeople, setBirthdayPeople] = useState([]);
  const [show, setShow] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    checkBirthdays();
  }, []);

  const checkBirthdays = async () => {
    try {
      // Check if already dismissed today
      const dismissedDate = localStorage.getItem('birthday_popup_dismissed');
      const today = new Date().toISOString().split('T')[0];
      if (dismissedDate === today) return;

      const res = await api.get('/pegawai/birthdays/today');
      if (res.data.success && res.data.data?.length > 0) {
        setBirthdayPeople(res.data.data);
        setShow(true);
        // Fire confetti
        setTimeout(() => fireConfetti(), 300);
      }
    } catch (err) {
      // Silent fail - not critical
    }
  };

  // Listen for push notification birthday events
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED' && event.data?.payload?.type === 'birthday') {
        const people = event.data.payload.birthdayPeople;
        if (people?.length > 0) {
          setBirthdayPeople(people);
          setShow(true);
          setTimeout(() => fireConfetti(), 300);
        }
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  const fireConfetti = () => {
    try {
      const duration = 3000;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
        confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    } catch (e) {
      // confetti library not available, skip
    }
  };

  const handleDismiss = () => {
    setShow(false);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('birthday_popup_dismissed', today);
  };

  const person = birthdayPeople[currentIndex];
  if (!person) return null;

  const message = SWEET_MESSAGES[currentIndex % SWEET_MESSAGES.length];
  const birthDate = person.tanggal_lahir ? new Date(person.tanggal_lahir) : null;
  const age = birthDate ? new Date().getFullYear() - birthDate.getFullYear() : null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600" />
            
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute top-20 right-4 w-16 h-16 rounded-full bg-yellow-400/20" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            >
              <X size={18} />
            </button>

            <div className="relative z-10 flex flex-col items-center px-6 pt-8 pb-6 text-center text-white">
              {/* Cake icon */}
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
                className="mb-4"
              >
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                  <Cake size={32} className="text-yellow-300" />
                </div>
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold mb-1"
              >
                🎉 Selamat Ulang Tahun! 🎉
              </motion.h2>

              {/* Photo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
                className="my-4"
              >
                <div className="w-28 h-28 rounded-full border-4 border-white/50 shadow-xl overflow-hidden bg-white/20">
                  {person.avatar ? (
                    <img
                      src={getAvatarUrl(person.avatar)}
                      alt={person.nama}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div
                    className={`w-full h-full items-center justify-center text-3xl font-bold text-white bg-gradient-to-br from-pink-400 to-purple-400 ${person.avatar ? 'hidden' : 'flex'}`}
                  >
                    {person.nama?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                </div>
              </motion.div>

              {/* Name */}
              <motion.h3
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-bold"
              >
                {person.nama}
              </motion.h3>

              {/* Position & Department */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/80 text-sm mt-1"
              >
                {person.jabatan} {person.bidang && person.bidang !== '-' ? `• ${person.bidang}` : ''}
              </motion.p>

              {age && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6, type: 'spring' }}
                  className="mt-2 px-4 py-1 rounded-full bg-white/20 text-sm font-medium"
                >
                  🎂 {age} Tahun
                </motion.div>
              )}

              {/* Sweet message */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-4 text-white/90 text-sm leading-relaxed px-2"
              >
                {message}
              </motion.p>

              {/* Navigation dots if multiple people */}
              {birthdayPeople.length > 1 && (
                <div className="flex items-center gap-2 mt-4">
                  {birthdayPeople.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentIndex(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        i === currentIndex ? 'bg-white scale-125' : 'bg-white/40 hover:bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-5 w-full">
                {birthdayPeople.length > 1 && currentIndex < birthdayPeople.length - 1 && (
                  <button
                    onClick={() => setCurrentIndex(prev => prev + 1)}
                    className="flex-1 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <Gift size={16} />
                    Berikutnya
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2.5 rounded-xl bg-white text-purple-600 hover:bg-white/90 transition-colors font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <PartyPopper size={16} />
                  Selamat! 🎊
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BirthdayPopup;
