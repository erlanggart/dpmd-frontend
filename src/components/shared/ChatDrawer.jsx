import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiMessageCircle, FiSend, FiPaperclip, FiX, FiFile, FiDownload,
  FiLoader, FiChevronDown, FiTrash2, FiArrowLeft, FiImage
} from 'react-icons/fi';
import api from '../../api';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';

const REFERENCE_LABELS = {
  bankeu_lpj: 'LPJ Bankeu',
  bankeu_proposal: 'Proposal Bankeu',
};

function shortTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}
function chatDate(d) {
  if (!d) return '';
  const dt = new Date(d), now = new Date();
  if (dt.toDateString() === now.toDateString()) return 'Hari Ini';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (dt.toDateString() === y.toDateString()) return 'Kemarin';
  return dt.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
}
function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

const AVATAR_COLORS = [
  ['#3b82f6', '#2563eb'],
  ['#10b981', '#059669'],
  ['#8b5cf6', '#7c3aed'],
  ['#f59e0b', '#d97706'],
  ['#ec4899', '#db2777'],
  ['#06b6d4', '#0891b2'],
  ['#6366f1', '#4f46e5'],
];

function Avatar({ user, online, size = 'md' }) {
  const colors = AVATAR_COLORS[(user?.id || 0) % AVATAR_COLORS.length];
  const dim = size === 'sm' ? 28 : size === 'lg' ? 44 : 36;
  const fontSize = size === 'sm' ? 10 : size === 'lg' ? 15 : 12;
  const dotDim = size === 'sm' ? 8 : 10;

  return (
    <div className="relative flex-shrink-0">
      {user?.avatar ? (
        <img
          src={`${API_URL}${user.avatar}`}
          alt=""
          style={{ width: dim, height: dim }}
          className="rounded-full object-cover ring-2 ring-white/30"
        />
      ) : (
        <div
          style={{
            width: dim,
            height: dim,
            fontSize,
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
          }}
          className="rounded-full text-white flex items-center justify-center font-semibold tracking-wide"
        >
          {initials(user?.name)}
        </div>
      )}
      {online !== undefined && (
        <span
          style={{ width: dotDim, height: dotDim }}
          className={`absolute -bottom-0.5 -right-0.5 rounded-full border-[2px] border-white ${online ? 'bg-emerald-400' : 'bg-gray-300'}`}
        />
      )}
    </div>
  );
}

/* ── Read receipt check marks ── */
function ReadReceipt({ isRead }) {
  return isRead ? (
    <svg width="16" height="11" viewBox="0 0 16 11" className="inline-block ml-0.5 -mb-px">
      <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#34d399" />
      <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.648.8 1.526 1.59a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#34d399" />
    </svg>
  ) : (
    <svg width="12" height="11" viewBox="0 0 12 11" className="inline-block ml-0.5 -mb-px">
      <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#9ca3af" />
    </svg>
  );
}

/* ── File attachment card ── */
function FileCard({ msg, isOwn }) {
  const isImage = msg.message_type === 'image';
  return (
    <div className={`flex items-center gap-2.5 min-w-[200px] rounded-xl p-2 ${isOwn ? 'bg-emerald-600/10' : 'bg-slate-50'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isImage ? 'bg-purple-100' : 'bg-blue-100'}`}>
        {isImage ? <FiImage className="text-purple-500" size={18} /> : <FiFile className="text-blue-500" size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate leading-tight">{msg.file_name || 'File'}</p>
        <p className="text-[10px] text-gray-400 mt-0.5">{formatFileSize(msg.file_size)}</p>
      </div>
      <a
        href={`${API_URL}${msg.file_url}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${isOwn ? 'hover:bg-emerald-600/10 text-emerald-600' : 'hover:bg-blue-50 text-blue-500'}`}
      >
        <FiDownload size={15} />
      </a>
    </div>
  );
}

/* ── Message bubble ── */
function MessageBubble({ msg, isOwn, isRead, onDelete, senderName }) {
  const [hovered, setHovered] = useState(false);
  const isSystem = msg.message_type === 'system';
  const isFile = msg.message_type === 'file' || msg.message_type === 'image';

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-full px-4 py-1.5 text-[11px] text-slate-500 max-w-[85%] text-center shadow-sm font-medium">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}
    >
      <div
        className={`relative max-w-[78%] transition-all duration-150 ${
          isOwn
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-[18px] rounded-br-[4px] shadow-sm shadow-emerald-500/15'
            : 'bg-white text-slate-800 rounded-[18px] rounded-bl-[4px] shadow-sm shadow-slate-900/[0.04] border border-slate-100'
        } ${isFile ? 'px-2 pt-2 pb-1.5' : 'px-3.5 py-2'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {!isOwn && senderName && (
          <p className="text-[11px] font-semibold text-emerald-600 mb-1 tracking-wide">{senderName}</p>
        )}

        {isFile ? (
          <FileCard msg={msg} isOwn={isOwn} />
        ) : (
          <span className="text-[13.5px] leading-[1.45] whitespace-pre-wrap break-words">{msg.content}</span>
        )}

        <div className={`flex items-center justify-end gap-0.5 mt-1 ${isFile ? 'px-1' : ''}`}>
          <span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
            {shortTime(msg.created_at)}
          </span>
          {isOwn && <ReadReceipt isRead={isRead} />}
        </div>

        {/* Delete action */}
        <AnimatePresence>
          {hovered && isOwn && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.12 }}
              onClick={() => onDelete(msg.id)}
              className="absolute -top-2.5 -left-2.5 bg-white shadow-lg shadow-slate-900/10 rounded-full p-1.5 hover:bg-red-50 transition-colors z-10 border border-slate-200"
            >
              <FiTrash2 size={11} className="text-red-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ── Typing indicator ── */
function TypingIndicator() {
  return (
    <div className="flex justify-start mb-2">
      <div className="bg-white rounded-[18px] rounded-bl-[4px] px-4 py-3 shadow-sm border border-slate-100">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-[6px] h-[6px] bg-slate-400 rounded-full"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Scroll-to-bottom FAB ── */
function ScrollToBottom({ show, onClick }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 10 }}
          transition={{ duration: 0.2 }}
          onClick={onClick}
          className="absolute bottom-2 right-4 z-10 bg-white p-2 rounded-full shadow-lg shadow-slate-900/10 border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <FiChevronDown size={16} className="text-slate-600" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * ChatDrawer - Contextual chat drawer for verification pages
 */
export default function ChatDrawer({ referenceType, referenceId, targetUserId, title, disabled, isOpen: controlledOpen, onClose, floating = true }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (val) => {
    if (controlledOpen !== undefined) {
      if (!val && onClose) onClose();
    } else {
      setInternalOpen(val);
    }
  };
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [typingUser, setTypingUser] = useState(null);
  const [onlineOther, setOnlineOther] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const socketRef = useRef(null);
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const fileRef = useRef(null);
  const typingTORef = useRef(null);
  const convRef = useRef(null);

  const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

  useEffect(() => { convRef.current = conversation; }, [conversation]);

  // Check for existing conversation & unread count on mount
  useEffect(() => {
    if (!referenceType || !referenceId) return;
    setConversation(null);
    setMessages([]);
    setUnreadCount(0);
    checkExistingConversation();
  }, [referenceType, referenceId]);

  const checkExistingConversation = async () => {
    try {
      const res = await api.get(`/messaging/conversations/reference/${referenceType}/${referenceId}`);
      if (res.data.success && res.data.data.length > 0) {
        const conv = res.data.data[0];
        setConversation(conv);
        setUnreadCount(conv.unread_count || 0);
      }
    } catch {
      // No conversation yet
    }
  };

  // Socket connection
  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('expressToken');
    if (!token) return;

    const s = io(API_URL, { auth: { token }, transports: ['websocket'] });
    socketRef.current = s;

    s.on('connect', () => {
      if (conversation?.other_user?.id) {
        s.emit('get_online_users', (ids) => {
          if (Array.isArray(ids)) setOnlineOther(ids.includes(String(conversation.other_user.id)));
        });
      }
    });

    s.on('new_message', (msg) => {
      const conv = convRef.current;
      if (conv && msg.conversation_id === conv.id) {
        setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        if (msg.sender_id !== currentUser.id) {
          api.put(`/messaging/conversations/${msg.conversation_id}/read`).catch(() => {});
        }
      }
    });

    s.on('messages_read', (data) => {
      setMessages(prev => prev.map(m =>
        m.conversation_id === data.conversation_id && m.sender_id === currentUser.id
          ? { ...m, is_read: true, read_at: data.read_at } : m
      ));
    });

    s.on('message_deleted', (data) => {
      setMessages(prev => prev.filter(m => m.id !== data.message_id));
    });

    s.on('typing', (data) => {
      if (convRef.current && data.conversation_id === convRef.current.id) setTypingUser(data.user_name);
    });
    s.on('stop_typing', (data) => {
      if (convRef.current && data.conversation_id === convRef.current.id) setTypingUser(null);
    });

    s.on('user_online', ({ user_id }) => {
      if (conversation?.other_user && String(user_id) === String(conversation.other_user.id)) setOnlineOther(true);
    });
    s.on('user_offline', ({ user_id }) => {
      if (conversation?.other_user && String(user_id) === String(conversation.other_user.id)) setOnlineOther(false);
    });

    return () => s.disconnect();
  }, [open, conversation?.id]);

  useEffect(() => {
    if (!open) return;
    loadOrCreateConversation();
  }, [open]);

  useEffect(() => {
    if (messages.length > 0 && open) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open]);

  const loadOrCreateConversation = async () => {
    if (!referenceType || !referenceId) return;
    setLoading(true);
    try {
      if (conversation) {
        await loadMessages(conversation.id);
        if (conversation.unread_count > 0) {
          api.put(`/messaging/conversations/${conversation.id}/read`).catch(() => {});
          setUnreadCount(0);
        }
        setLoading(false);
        return;
      }

      const refRes = await api.get(`/messaging/conversations/reference/${referenceType}/${referenceId}`);
      if (refRes.data.success && refRes.data.data.length > 0) {
        const conv = refRes.data.data[0];
        setConversation(conv);
        await loadMessages(conv.id);
        if (conv.unread_count > 0) {
          api.put(`/messaging/conversations/${conv.id}/read`).catch(() => {});
          setUnreadCount(0);
        }
      } else if (targetUserId) {
        const createRes = await api.post('/messaging/conversations/context', {
          target_user_id: targetUserId,
          reference_type: referenceType,
          reference_id: referenceId,
        });
        if (createRes.data.success) {
          setConversation(createRes.data.data);
          await loadMessages(createRes.data.data.id);
        }
      }
    } catch (err) {
      console.error('ChatDrawer: failed to load conversation', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (convId, cursor = null) => {
    try {
      setLoadingMsgs(true);
      const params = { limit: 50 };
      if (cursor) params.cursor = cursor;
      const res = await api.get(`/messaging/conversations/${convId}/messages`, { params });
      if (res.data.success) {
        const msgs = res.data.data.reverse();
        cursor ? setMessages(prev => [...msgs, ...prev]) : setMessages(msgs);
        setHasMore(res.data.has_more);
        setNextCursor(res.data.next_cursor);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingMsgs(false); }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !conversation || sending) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      await api.post(`/messaging/conversations/${conversation.id}/messages`, { content });
    } catch {
      setInputText(content);
    } finally {
      setSending(false);
    }
    emitStopTyping();
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !conversation) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      setSending(true);
      await api.post(`/messaging/conversations/${conversation.id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (e) { console.error(e); }
    finally { setSending(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const deleteMessage = async (msgId) => {
    try { await api.delete(`/messaging/messages/${msgId}`); } catch (e) { console.error(e); }
  };

  const emitStopTyping = () => {
    if (socketRef.current && conversation) {
      socketRef.current.emit('stop_typing', { conversation_id: conversation.id, receiver_id: conversation.other_user?.id });
    }
  };
  const handleInput = (e) => {
    setInputText(e.target.value);
    if (socketRef.current && conversation) {
      socketRef.current.emit('typing', { conversation_id: conversation.id, receiver_id: conversation.other_user?.id });
      clearTimeout(typingTORef.current);
      typingTORef.current = setTimeout(emitStopTyping, 2000);
    }
  };

  const handleScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const distFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
    setShowScrollBtn(distFromBottom > 200);
    if (c.scrollTop < 50 && hasMore && !loadingMsgs && conversation) loadMessages(conversation.id, nextCursor);
  }, [hasMore, loadingMsgs, conversation, nextCursor]);

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const groupedMessages = useMemo(() => {
    const groups = [];
    let lastDate = '';
    messages.forEach(msg => {
      const d = chatDate(msg.created_at);
      if (d !== lastDate) { groups.push({ type: 'date', date: d }); lastDate = d; }
      groups.push({ type: 'msg', data: msg });
    });
    return groups;
  }, [messages]);

  const sendFirstMessage = async () => {
    if (!inputText.trim() || !targetUserId || sending) return;
    const content = inputText.trim();
    setInputText('');
    setSending(true);
    try {
      const createRes = await api.post('/messaging/conversations/context', {
        target_user_id: targetUserId,
        reference_type: referenceType,
        reference_id: referenceId,
      });
      if (createRes.data.success) {
        const conv = createRes.data.data;
        setConversation(conv);
        await api.post(`/messaging/conversations/${conv.id}/messages`, { content });
        await loadMessages(conv.id);
      }
    } catch (err) {
      console.error('Failed to create conversation:', err);
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const handleSend = () => {
    if (conversation) sendMessage();
    else if (targetUserId) sendFirstMessage();
  };

  const handleKeyDownWrapped = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const otherUser = conversation?.other_user;
  const drawerTitle = title || (REFERENCE_LABELS[referenceType] ? `Chat ${REFERENCE_LABELS[referenceType]}` : 'Chat Verifikasi');
  const hasConversation = !!conversation;
  const canSendMessage = hasConversation || !!targetUserId;

  if (disabled || (!referenceType || !referenceId)) return null;

  return (
    <>
      {/* ── Floating trigger button ── */}
      {floating && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl p-3.5 shadow-xl shadow-emerald-600/20 transition-colors"
          title="Buka chat verifikasi"
        >
          <FiMessageCircle size={22} strokeWidth={2.2} />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 font-bold ring-2 ring-white"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </motion.button>
      )}

      {/* ── Drawer ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ x: '100%', opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '100%', opacity: 0.5 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[420px] z-50 flex flex-col overflow-hidden bg-white sm:rounded-l-2xl shadow-2xl shadow-slate-900/20"
            >
              {/* ── Header ── */}
              <div className="flex items-center gap-3 px-4 h-[64px] bg-white border-b border-slate-100 flex-shrink-0">
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 -ml-1 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <FiArrowLeft size={20} />
                </button>

                {otherUser && <Avatar user={otherUser} online={onlineOther} />}

                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-slate-800 truncate leading-tight">
                    {otherUser?.name || drawerTitle}
                  </h3>
                  <p className="text-[12px] text-slate-400 truncate leading-tight mt-0.5">
                    {typingUser ? (
                      <span className="text-emerald-500 font-medium">sedang mengetik...</span>
                    ) : onlineOther ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-emerald-600 font-medium">Online</span>
                      </span>
                    ) : (
                      otherUser?.desas?.nama || conversation?.reference_label || REFERENCE_LABELS[referenceType] || ''
                    )}
                  </p>
                </div>

                {/* Reference badge */}
                {conversation?.reference_label && (
                  <span className="hidden sm:inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 leading-none">
                    {REFERENCE_LABELS[referenceType]}
                  </span>
                )}
              </div>

              {/* ── Messages area ── */}
              <div className="flex-1 relative overflow-hidden">
                <div
                  ref={containerRef}
                  onScroll={handleScroll}
                  className="absolute inset-0 overflow-y-auto px-4 py-4"
                  style={{ backgroundColor: '#f8fafc' }}
                >
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-8 h-8 rounded-full border-[2.5px] border-slate-200 border-t-emerald-500 animate-spin" />
                      <p className="text-xs text-slate-400 font-medium">Memuat percakapan...</p>
                    </div>
                  ) : !hasConversation && messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-8">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center mb-5 border border-emerald-100/50">
                        <FiMessageCircle size={32} className="text-emerald-400" strokeWidth={1.5} />
                      </div>
                      <p className="text-base font-semibold text-slate-700 mb-2">Belum ada pesan</p>
                      <p className="text-sm text-slate-400 leading-relaxed max-w-[260px]">
                        {targetUserId
                          ? `Mulai percakapan terkait ${REFERENCE_LABELS[referenceType] || 'item'} ini dengan mengirim pesan.`
                          : 'Chat akan otomatis dibuat saat verifikator meminta revisi.'
                        }
                      </p>
                    </div>
                  ) : (
                    <>
                      {loadingMsgs && messages.length > 0 && (
                        <div className="flex justify-center py-4">
                          <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                        </div>
                      )}

                      {groupedMessages.map((item, i) =>
                        item.type === 'date' ? (
                          <div key={`d-${i}`} className="flex justify-center my-4">
                            <span className="bg-white text-slate-500 text-[11px] font-semibold px-3.5 py-1 rounded-full shadow-sm border border-slate-100 tracking-wide uppercase">{item.date}</span>
                          </div>
                        ) : (
                          <MessageBubble
                            key={item.data.id}
                            msg={item.data}
                            isOwn={item.data.sender_id === currentUser.id || String(item.data.sender_id) === String(currentUser.id)}
                            isRead={item.data.is_read}
                            onDelete={deleteMessage}
                            senderName={
                              !(item.data.sender_id === currentUser.id || String(item.data.sender_id) === String(currentUser.id))
                                ? (item.data.sender?.name || otherUser?.name)
                                : null
                            }
                          />
                        )
                      )}

                      {typingUser && <TypingIndicator />}
                      <div ref={endRef} />
                    </>
                  )}
                </div>

                <ScrollToBottom show={showScrollBtn} onClick={scrollToBottom} />
              </div>

              {/* ── Input area ── */}
              {canSendMessage && (
                <div className="flex items-end gap-2 px-3 py-3 bg-white border-t border-slate-100 flex-shrink-0">
                  <input type="file" ref={fileRef} className="hidden" onChange={handleFile} />

                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={!hasConversation}
                    className="p-2.5 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <FiPaperclip size={19} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <textarea
                      value={inputText}
                      onChange={handleInput}
                      onKeyDown={handleKeyDownWrapped}
                      placeholder="Tulis pesan..."
                      rows={1}
                      className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl text-[13.5px] resize-none focus:outline-none border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 max-h-28 transition-all placeholder:text-slate-400"
                      style={{ minHeight: '42px' }}
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={handleSend}
                    disabled={!inputText.trim() || sending}
                    className="p-2.5 rounded-xl bg-emerald-600 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-emerald-700 transition-all flex-shrink-0"
                  >
                    {sending ? (
                      <div className="w-[19px] h-[19px] rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      <FiSend size={19} className="-rotate-[0deg]" />
                    )}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
