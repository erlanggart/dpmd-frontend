/**
 * useUnreadMessages
 *
 * Menghitung pesan belum dibaca untuk lencana navigasi, lewat dua jalur:
 *  1. Seketika — event socket.io `new_message` menaikkan lencana.
 *  2. Cadangan — polling HTTP /messaging/unread-count tiap 30 detik.
 *
 * Lencana dinolkan saat pengguna berada di halaman pesan, dan disinkronkan
 * ulang ke server begitu ia meninggalkannya.
 *
 * CATATAN PENTING. Efek socket sengaja hanya berjalan sekali (deps kosong):
 * memasangnya ulang tiap perpindahan halaman berarti memutus dan menyambung
 * koneksi socket terus-menerus. Konsekuensinya, penangan `new_message` TIDAK
 * boleh membaca `location.pathname` langsung — nilai itu terkunci di render
 * pertama. Dulu di sini memang begitu, lengkap dengan komentar yang mengaku
 * "closure-safe" padahal tidak ada ref-nya sama sekali, sehingga:
 *
 *   • bila aplikasi dibuka di luar halaman pesan, `onPage` selamanya false —
 *     lencana tetap naik walau pengguna sedang membaca percakapannya;
 *   • bila dibuka tepat di halaman pesan lalu pindah, `onPage` selamanya true —
 *     lencana tidak pernah naik lagi sampai halaman dimuat ulang.
 *
 * Jalur cadangan 30 detik menutupi sebagian gejalanya, jadi bug ini tampak
 * sebagai "lencana kadang salah" alih-alih rusak total. Sekarang jalurnya
 * lewat ref yang selalu mutakhir.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api';
import { asalSocket } from '../utils/asalServer';


/** Id dari JWT/localStorage bisa number, dari API selalu string (BigInt). */
const samaId = (a, b) =>
  a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);

/**
 * @param {string} messagingPath - awalan path halaman pesan, mis. '/desa/pesan'
 * @returns {{ unreadMessages: number, refreshUnread: () => void }}
 */
export function useUnreadMessages(messagingPath = '/pesan') {
  const [unreadMessages, setUnreadMessages] = useState(0);
  const socketRef = useRef(null);
  const location = useLocation();
  const currentUser = useRef(null);

  // Dibaca oleh penangan socket yang dipasang sekali di awal.
  const diHalamanPesan = useRef(false);
  const pathPesanRef = useRef(messagingPath);

  useEffect(() => {
    try {
      currentUser.current = JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      currentUser.current = {};
    }
  }, []);

  const syncCount = useCallback(async () => {
    try {
      const res = await api.get('/messaging/unread-count');
      if (res.data.success) {
        setUnreadMessages(res.data.data?.unread_count ?? 0);
      }
    } catch {
      // diam — lencana bertahan di nilai sebelumnya
    }
  }, []);

  // Nolkan lencana selama di halaman pesan, sinkronkan ulang saat meninggalkannya.
  useEffect(() => {
    pathPesanRef.current = messagingPath;
    const onPage = location.pathname.startsWith(messagingPath);
    diHalamanPesan.current = onPage;

    if (onPage) setUnreadMessages(0);
    else syncCount();
  }, [location.pathname, messagingPath, syncCount]);

  useEffect(() => {
    syncCount();
    const interval = setInterval(syncCount, 30_000);
    return () => clearInterval(interval);
  }, [syncCount]);

  useEffect(() => {
    const token = localStorage.getItem('expressToken');
    if (!token) return undefined;

    const s = io(asalSocket(), { auth: { token }, transports: ['polling', 'websocket'] });
    socketRef.current = s;

    s.on('new_message', (msg) => {
      // Pesan sendiri tidak pernah menaikkan lencana. Perbandingannya lewat
      // String(): id dari localStorage bisa number, sedangkan sender_id dari
      // server selalu string karena kolomnya BigInt — `!==` langsung akan
      // menganggap keduanya berbeda dan menghitung pesan sendiri.
      if (samaId(msg?.sender_id, currentUser.current?.id)) return;
      if (diHalamanPesan.current) return;
      setUnreadMessages((prev) => prev + 1);
    });

    s.on('messages_read', () => {
      // Sinkron ulang ke server: jumlah yang dibaca bisa lebih dari satu.
      syncCount();
    });

    // Socket bisa putus-sambung sendiri (jaringan, layar terkunci). Setiap
    // tersambung lagi, hitungannya diambil ulang karena event yang terjadi
    // selama terputus tidak dikirim susulan.
    s.on('connect', syncCount);

    return () => {
      s.off('new_message');
      s.off('messages_read');
      s.off('connect');
      s.disconnect();
      socketRef.current = null;
    };
  }, [syncCount]);

  return { unreadMessages, refreshUnread: syncCount };
}
