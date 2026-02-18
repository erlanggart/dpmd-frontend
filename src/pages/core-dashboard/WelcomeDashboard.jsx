import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './WelcomeDashboard.css';
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  UserCheck,
  MapPin, 
  DollarSign,
  BarChart3,
  Activity,
  Zap,
  ArrowRight,
  FileText,
  Target,
  Star,
  Calendar
} from 'lucide-react';

const WelcomeDashboard = () => {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return { text: 'Selamat Pagi', emoji: '☀️', emojiColor: 'text-orange-500', color: 'from-orange-500 to-yellow-500' };
    if (hour < 15) return { text: 'Selamat Siang', emoji: '🌤️', emojiColor: 'text-amber-500', color: 'from-yellow-500 to-amber-500' };
    if (hour < 18) return { text: 'Selamat Sore', emoji: '🌆', emojiColor: 'text-orange-600', color: 'from-amber-500 to-orange-600' };
    return { text: 'Selamat Malam', emoji: '🌙', emojiColor: 'text-indigo-500', color: 'from-indigo-500 to-purple-600' };
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = () => {
    return currentTime.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const greeting = getGreeting();

  const features = [
    {
      icon: <BarChart3 className="w-10 h-10" />,
      title: "Bantuan Keuangan",
      description: "Monitor bantuan keuangan desa tahap 1 & 2",
      gradient: "from-cyan-400 via-blue-500 to-indigo-600",
      bgGradient: "from-cyan-500/20 to-blue-600/20",
      iconBg: "bg-gradient-to-br from-orange-400 to-amber-500",
      path: "/core-dashboard/statistik-bankeu",
      stat: "120 Desa"
    },
    {
      icon: <TrendingUp className="w-10 h-10" />,
      title: "Alokasi Dana Desa",
      description: "Analisis dan monitoring ADD",
      gradient: "from-emerald-400 via-green-500 to-teal-600",
      bgGradient: "from-emerald-500/20 to-green-600/20",
      iconBg: "bg-gradient-to-br from-rose-400 to-pink-500",
      path: "/core-dashboard/statistik-add",
      stat: "100% Tersalur"
    },
    {
      icon: <DollarSign className="w-10 h-10" />,
      title: "BHPRD",
      description: "Bagi Hasil Pajak & Retribusi Daerah",
      gradient: "from-purple-400 via-violet-500 to-indigo-600",
      bgGradient: "from-purple-500/20 to-indigo-600/20",
      iconBg: "bg-gradient-to-br from-amber-400 to-orange-500",
      path: "/core-dashboard/statistik-bhprd",
      stat: "Aktif"
    },
    {
      icon: <Activity className="w-10 h-10" />,
      title: "Dana Desa",
      description: "Monitoring dana desa earmarked & non-earmarked",
      gradient: "from-pink-400 via-rose-500 to-red-600",
      bgGradient: "from-pink-500/20 to-red-600/20",
      iconBg: "bg-gradient-to-br from-cyan-400 to-blue-500",
      path: "/core-dashboard/statistik-dd",
      stat: "Monitoring"
    },
    {
      icon: <Users className="w-10 h-10" />,
      title: "BUMDes",
      description: "Data Badan Usaha Milik Desa",
      gradient: "from-orange-400 via-amber-500 to-yellow-600",
      bgGradient: "from-orange-500/20 to-yellow-600/20",
      iconBg: "bg-gradient-to-br from-purple-400 to-violet-500",
      path: "/core-dashboard/statistik-bumdes",
      stat: "85 Unit"
    },
    {
      icon: <UserCheck className="w-10 h-10" />,
      title: "Aparatur Desa",
      description: "Statistik Kepala Desa, Perangkat & BPD",
      gradient: "from-teal-400 via-emerald-500 to-green-600",
      bgGradient: "from-teal-500/20 to-green-600/20",
      iconBg: "bg-gradient-to-br from-teal-400 to-emerald-500",
      path: "/core-dashboard/statistik-aparatur-desa",
      stat: "10.000+ Data"
    },
    {
      icon: <FileText className="w-10 h-10" />,
      title: "Laporan Desa",
      description: "Rekapitulasi laporan per desa",
      gradient: "from-fuchsia-400 via-pink-500 to-rose-600",
      bgGradient: "from-fuchsia-500/20 to-rose-600/20",
      iconBg: "bg-gradient-to-br from-emerald-400 to-teal-500",
      path: "/core-dashboard/laporan-desa",
      stat: "Updated"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-y-auto relative flex items-center p-4 sm:p-6">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-400/20 via-blue-400/10 to-transparent blur-3xl animate-blob"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-400/20 via-pink-400/10 to-transparent blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full bg-gradient-to-br from-pink-400/15 via-transparent to-transparent blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-cyan-300/40 to-blue-400/40 rounded-full blur-3xl animate-float"></div>
      <div className="absolute top-20 right-10 w-80 h-80 bg-gradient-to-br from-purple-300/40 to-pink-400/40 rounded-full blur-3xl animate-float animation-delay-2000"></div>
      <div className="absolute bottom-10 left-1/3 w-72 h-72 bg-gradient-to-br from-emerald-300/40 to-teal-400/40 rounded-full blur-3xl animate-float animation-delay-4000"></div>

      {/* Main Container with Border Radius */}
      <div className="relative z-10 w-full max-w-7xl mx-auto bg-white/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8 my-4">
        {/* Header with Clock */}
        <div className="text-center mb-6 space-y-3 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 backdrop-blur-md rounded-full border border-cyan-500/50 shadow-lg">
            <Sparkles className="w-4 h-4 text-cyan-600 animate-pulse" />
            <span className="text-cyan-700 text-xs font-bold tracking-wide">CORE DASHBOARD DPMD</span>
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
          </div>

          {/* Greeting */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-center gap-3 py-2">
              <span className={`text-4xl md:text-5xl ${greeting.emojiColor} drop-shadow-lg`}>{greeting.emoji}</span>
              <h1 className={`text-3xl md:text-5xl font-black bg-gradient-to-r ${greeting.color} bg-clip-text text-transparent drop-shadow-lg animate-gradient-shift leading-tight pb-1`}>
                {greeting.text}
              </h1>
            </div>
            {user?.nama && (
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 py-1">
                {user.nama}! 👋
              </h2>
            )}
          </div>

          {/* Info Cards Container - Responsive */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-4xl mx-auto">
            {/* Clock Card */}
            <div className="w-full sm:w-auto animate-scale-in">
              <div className="bg-gradient-to-br from-white/70 to-white/50 backdrop-blur-md rounded-xl px-6 py-3 border border-white/80 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent font-mono">
                    {formatTime()}
                  </div>
                  <div className="hidden sm:block w-px h-8 bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-600" />
                    <span className="text-gray-600 text-xs md:text-sm font-medium">{formatDate()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* User Info Bar */}
            <div className="w-full sm:w-auto">
              <div className="inline-flex items-center gap-4 px-6 py-3 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-rose-500/30 backdrop-blur-md rounded-xl border border-purple-400/50 shadow-xl">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-700" />
                  <span className="text-gray-800 text-sm font-bold capitalize">{user?.role?.replace(/_/g, ' ')}</span>
                </div>
                <div className="w-px h-5 bg-gray-400"></div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-600 animate-pulse" />
                  <span className="text-gray-700 text-sm font-semibold">Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Access Title */}
        <div className="text-center mb-6">
          <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span>Akses Cepat Statistik</span>
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </h3>
          <p className="text-gray-600 text-sm">Pilih modul untuk melihat data statistik</p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {features.map((feature, index) => (
            <a
              key={index}
              href={feature.path}
              className="group relative"
              style={{
                animation: `slideUpBounce 0.6s ease-out ${index * 0.1}s both`
              }}
            >
              {/* Glow Effect */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-500`}></div>
              
              {/* Card */}
              <div className="relative bg-white/80 backdrop-blur-md rounded-xl p-5 border border-white/90 hover:border-white/100 transition-all duration-500 group-hover:scale-105 group-hover:shadow-2xl overflow-hidden">
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-500`}></div>
                
                {/* Animated Corner Accent */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.gradient} opacity-30 rounded-bl-full transform translate-x-10 -translate-y-10 group-hover:translate-x-5 group-hover:-translate-y-5 transition-transform duration-500`}></div>
                
                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-14 h-14 ${feature.iconBg} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                    <div className="text-white">
                      {feature.icon}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-lg font-bold text-gray-800 mb-1.5 group-hover:translate-x-1 transition-transform duration-300">
                    {feature.title}
                  </h4>
                  <p className="text-gray-600 text-xs mb-2.5 group-hover:text-gray-700 transition-colors leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Stat Badge */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r ${feature.gradient} rounded-full text-white text-xs font-bold shadow-md`}>
                    <Star className="w-3 h-3" />
                    {feature.stat}
                  </div>

                  {/* Arrow */}
                  <div className="absolute bottom-5 right-5 w-8 h-8 bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-3 group-hover:translate-x-0 transition-all duration-300 shadow-lg">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center space-y-0.5">
          <p className="text-gray-700 text-xs font-semibold">Dinas Pemberdayaan Masyarakat dan Desa</p>
          <p className="text-gray-500 text-xs">Dashboard Terpadu Monitoring & Evaluasi © 2024</p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDashboard;
