// src/pages/dpmd/InformasiPage.jsx
// Halaman Informasi - Landing page untuk semua notifikasi pegawai
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Mail, Calendar, Info, CheckCheck, ArrowLeft,
  Inbox, Clock, ChevronRight, RefreshCw, Filter, X
} from 'lucide-react';
import api from '../../api';
import { toast } from 'react-hot-toast';

const InformasiPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, disposisi, kegiatan, general

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/push-notification/notifications?limit=100');
      if (response.data.success) {
        setNotifications(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/push-notification/notifications/mark-read', { all: true });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('Semua notifikasi ditandai sudah dibaca');
    } catch (error) {
      toast.error('Gagal menandai notifikasi');
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await api.post('/push-notification/notifications/mark-read', { ids: [notification.id] });
        setNotifications(prev => prev.map(n => 
          n.id === notification.id ? { ...n, read: true } : n
        ));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }

    // Navigate based on type
    if (notification.data?.url) {
      navigate(notification.data.url);
    } else if (notification.type === 'disposisi') {
      navigate('/dpmd/disposisi');
    } else if (notification.type === 'kegiatan') {
      navigate('/dpmd/jadwal-kegiatan');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'disposisi':
        return <Mail className="h-5 w-5 text-purple-600" />;
      case 'kegiatan':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-orange-600" />;
    }
  };

  const getNotificationBg = (type) => {
    switch (type) {
      case 'disposisi': return 'bg-purple-100';
      case 'kegiatan': return 'bg-blue-100';
      default: return 'bg-orange-100';
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'disposisi': return { label: 'Disposisi', color: 'bg-purple-100 text-purple-700' };
      case 'kegiatan': return { label: 'Kegiatan', color: 'bg-blue-100 text-blue-700' };
      default: return { label: 'Umum', color: 'bg-orange-100 text-orange-700' };
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'read' && !n.read) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white">Informasi</h1>
              <p className="text-white/70 text-xs sm:text-sm mt-0.5">Pusat notifikasi & informasi</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchNotifications}
                className="h-9 w-9 bg-white/15 hover:bg-white/25 rounded-xl flex items-center justify-center backdrop-blur-sm transition-all"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 text-white ${loading ? 'animate-spin' : ''}`} />
              </button>
              <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5">
                <div className="flex items-center gap-1.5">
                  <Bell className="h-4 w-4 text-white" />
                  <span className="text-white text-sm font-semibold">{unreadCount}</span>
                  <span className="text-white/70 text-xs">belum dibaca</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Read/Unread Filter */}
            <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1 flex-1 sm:flex-none">
              {[
                { key: 'all', label: 'Semua' },
                { key: 'unread', label: 'Belum Dibaca' },
                { key: 'read', label: 'Sudah Dibaca' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f.key
                      ? 'bg-white text-orange-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="flex gap-1.5 flex-wrap">
              {[
                { key: 'all', label: 'Semua Tipe' },
                { key: 'disposisi', label: 'Disposisi' },
                { key: 'kegiatan', label: 'Kegiatan' },
                { key: 'general', label: 'Umum' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setTypeFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    typeFilter === f.key
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="sm:ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-all border border-green-200"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Tandai Semua Dibaca
              </button>
            )}
          </div>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-full" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Inbox className="h-10 w-10 text-orange-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              {filter === 'unread' ? 'Tidak Ada Notifikasi Baru' : 'Belum Ada Notifikasi'}
            </h3>
            <p className="text-sm text-gray-400">
              {filter === 'unread' 
                ? 'Semua notifikasi sudah dibaca' 
                : 'Notifikasi akan muncul di sini'}
            </p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredNotifications.map((notification) => {
              const badge = getTypeBadge(notification.type);
              return (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left bg-white rounded-2xl shadow-sm border transition-all hover:shadow-md hover:-translate-y-0.5 group ${
                    !notification.read 
                      ? 'border-orange-200 bg-gradient-to-r from-orange-50/50 to-white' 
                      : 'border-gray-100'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start gap-3 sm:gap-4">
                      {/* Icon */}
                      <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getNotificationBg(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className={`text-sm sm:text-base font-semibold truncate ${
                                !notification.read ? 'text-gray-900' : 'text-gray-700'
                              }`}>
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="h-2 w-2 bg-orange-500 rounded-full flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${badge.color}`}>
                                {badge.label}
                              </span>
                              <div className="flex items-center gap-1 text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span className="text-xs">{notification.time}</span>
                              </div>
                              {notification.sent_by_name && (
                                <span className="text-xs text-gray-400">
                                  dari {notification.sent_by_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-orange-500 flex-shrink-0 mt-1 transition-colors" />
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Summary Footer */}
        {!loading && notifications.length > 0 && (
          <div className="mt-6 text-center text-xs text-gray-400">
            Menampilkan {filteredNotifications.length} dari {notifications.length} notifikasi
          </div>
        )}
      </div>
    </div>
  );
};

export default InformasiPage;
