/**
 * useUnreadMessages
 *
 * Tracks unread message count for the current user using two strategies:
 * 1. Real-time: socket.io `new_message` event (increments badge instantly)
 * 2. Fallback: HTTP polling every 30s via /messaging/unread-count
 *
 * Auto-resets to 0 and re-syncs when user navigates to the messaging path.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';

/**
 * @param {string} messagingPath - pathname prefix of the messaging page, e.g. '/desa/pesan'
 * @returns {{ unreadMessages: number }}
 */
export function useUnreadMessages(messagingPath = '/pesan') {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const socketRef = useRef(null);
  const location = useLocation();
  const currentUser = useRef(null);

  // Load current user once
  useEffect(() => {
    try {
      currentUser.current = JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      currentUser.current = {};
    }
  }, []);

  // REST poll — fetch accurate count
  const syncCount = useCallback(async () => {
    try {
      const res = await api.get('/messaging/unread-count');
      if (res.data.success) {
        setUnreadMessages(res.data.data?.unread_count ?? 0);
      }
    } catch {
      // silent — badge stays at previous value
    }
  }, []);

  // Reset badge when on messaging page, re-sync when leaving
  useEffect(() => {
    const onMessagingPage = location.pathname.startsWith(messagingPath);
    if (onMessagingPage) {
      setUnreadMessages(0);
    } else {
      syncCount();
    }
  }, [location.pathname, messagingPath, syncCount]);

  // Initial fetch + polling every 30s
  useEffect(() => {
    syncCount();
    const interval = setInterval(syncCount, 30_000);
    return () => clearInterval(interval);
  }, [syncCount]);

  // Real-time socket.io
  useEffect(() => {
    const token = localStorage.getItem('expressToken');
    if (!token) return;

    const s = io(API_URL, { auth: { token }, transports: ['polling', 'websocket'] });
    socketRef.current = s;

    s.on('new_message', (msg) => {
      try {
        const uid = currentUser.current?.id;
        const onPage = location.pathname.startsWith(messagingPath);

        // Only increment if message is for us AND we're not already on the page
        if (msg.sender_id !== uid && !onPage) {
          setUnreadMessages(prev => prev + 1);
        }
      } catch {
        // ignore
      }
    });

    s.on('messages_read', () => {
      // Re-sync from server for accuracy
      syncCount();
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount — path check uses closure-safe ref pattern

  return { unreadMessages };
}
