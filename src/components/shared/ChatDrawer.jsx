import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiMessageCircle, FiSend, FiPaperclip, FiX, FiFile, FiDownload,
  FiLoader, FiChevronDown, FiTrash2
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

const AVATAR_BG = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];

function Avatar({ user, online }) {
  const bg = AVATAR_BG[(user?.id || 0) % AVATAR_BG.length];
  return (
    <div className="relative flex-shrink-0">
      {user?.avatar ? (
        <img src={`${API_URL}/storage/uploads/avatars/${user.avatar}`} alt="" className="w-9 h-9 rounded-full object-cover" />
      ) : (
        <div className={`w-9 h-9 rounded-full ${bg} text-white flex items-center justify-center font-semibold text-xs`}>
          {initials(user?.name)}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
      )}
    </div>
  );
}

function MessageBubble({ msg, isOwn, isRead, onDelete }) {
  const [showMenu, setShowMenu] = useState(false);
  const isSystem = msg.message_type === 'system';
  const isFile = msg.message_type === 'file' || msg.message_type === 'image';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 max-w-[85%] whitespace-pre-line text-center">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}>
      <div
        className={`relative max-w-[80%] px-3 py-1.5 rounded-lg text-[13px] leading-relaxed ${
          isOwn ? 'bg-[#d9fdd3] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none shadow-sm'
        }`}
        onMouseEnter={() => isOwn && setShowMenu(true)}
        onMouseLeave={() => setShowMenu(false)}
      >
        {isFile ? (
          <div className="flex items-center gap-2 min-w-[180px]">
            <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
              <FiFile className="text-blue-500" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{msg.file_name || 'File'}</p>
              <p className="text-[10px] text-gray-400">{formatFileSize(msg.file_size)}</p>
            </div>
            <a href={`${API_URL}${msg.file_url}`} target="_blank" rel="noopener noreferrer"
              className="p-1 rounded hover:bg-gray-100">
              <FiDownload size={14} className="text-gray-500" />
            </a>
          </div>
        ) : (
          <span className="whitespace-pre-wrap break-words">{msg.content}</span>
        )}
        <span className={`text-[10px] float-right mt-1 ml-2 ${isOwn ? 'text-gray-500' : 'text-gray-400'}`}>
          {shortTime(msg.created_at)}
          {isOwn && (
            <span className="ml-0.5">
              {isRead ? (
                <svg width="16" height="11" viewBox="0 0 16 11" className="inline-block">
                  <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#53bdeb" />
                  <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.648.8 1.526 1.59a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#53bdeb" />
                </svg>
              ) : (
                <svg width="12" height="11" viewBox="0 0 12 11" className="inline-block">
                  <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#8696a0" />
                </svg>
              )}
            </span>
          )}
        </span>
        {showMenu && isOwn && (
          <button onClick={() => onDelete(msg.id)}
            className="absolute -top-2 -left-2 bg-white shadow rounded-full p-1 hover:bg-red-50 transition-colors z-10">
            <FiTrash2 size={12} className="text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * ChatDrawer - Contextual chat drawer for verification pages
 * 
 * Props:
 * - referenceType: 'bankeu_lpj' | 'bankeu_proposal'
 * - referenceId: number/string - the entity ID
 * - targetUserId: number/string - the other participant's user ID (optional, auto-resolved from context endpoint)
 * - title: string - optional custom drawer title
 * - disabled: boolean - if true, don't show the chat button
 * - isOpen: boolean - controlled mode: externally control open/close
 * - onClose: function - controlled mode: callback when drawer closes
 * - floating: boolean - if true (default), show floating button; if false, parent manages open trigger
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
    // Reset state when reference changes
    setConversation(null);
    setMessages([]);
    setUnreadCount(0);
    checkExistingConversation();
  }, [referenceType, referenceId]);

  const checkExistingConversation = async () => {
    try {
      const res = await api.get(`/api/messaging/conversations/reference/${referenceType}/${referenceId}`);
      if (res.data.success && res.data.data.length > 0) {
        const conv = res.data.data[0];
        setConversation(conv);
        setUnreadCount(conv.unread_count || 0);
      }
    } catch {
      // No conversation yet — that's fine
    }
  };

  // Socket connection — connect when drawer is opened
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
          api.put(`/api/messaging/conversations/${msg.conversation_id}/read`).catch(() => {});
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

  // Load conversation when drawer opens
  useEffect(() => {
    if (!open) return;
    loadOrCreateConversation();
  }, [open]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0 && open) {
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open]);

  const loadOrCreateConversation = async () => {
    if (!referenceType || !referenceId) return;
    setLoading(true);
    try {
      // If we already have a conversation, just load messages
      if (conversation) {
        await loadMessages(conversation.id);
        if (conversation.unread_count > 0) {
          api.put(`/api/messaging/conversations/${conversation.id}/read`).catch(() => {});
          setUnreadCount(0);
        }
        setLoading(false);
        return;
      }

      // Try to find existing conversation for this reference
      const refRes = await api.get(`/api/messaging/conversations/reference/${referenceType}/${referenceId}`);
      if (refRes.data.success && refRes.data.data.length > 0) {
        const conv = refRes.data.data[0];
        setConversation(conv);
        await loadMessages(conv.id);
        if (conv.unread_count > 0) {
          api.put(`/api/messaging/conversations/${conv.id}/read`).catch(() => {});
          setUnreadCount(0);
        }
      } else if (targetUserId) {
        // Create new contextual conversation
        const createRes = await api.post('/api/messaging/conversations/context', {
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
      const res = await api.get(`/api/messaging/conversations/${convId}/messages`, { params });
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
      await api.post(`/api/messaging/conversations/${conversation.id}/messages`, { content });
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
      await api.post(`/api/messaging/conversations/${conversation.id}/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    } catch (e) { console.error(e); }
    finally { setSending(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const deleteMessage = async (msgId) => {
    try { await api.delete(`/api/messaging/messages/${msgId}`); } catch (e) { console.error(e); }
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
  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const handleScroll = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    if (c.scrollTop < 50 && hasMore && !loadingMsgs && conversation) loadMessages(conversation.id, nextCursor);
  }, [hasMore, loadingMsgs, conversation, nextCursor]);

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

  const otherUser = conversation?.other_user;
  const drawerTitle = title || (REFERENCE_LABELS[referenceType] ? `Chat - ${REFERENCE_LABELS[referenceType]}` : 'Chat Verifikasi');
  const hasConversation = !!conversation;

  if (disabled || (!referenceType || !referenceId)) return null;

  return (
    <>
      {/* Floating chat button (only when floating mode) */}
      {floating && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-green-600 hover:bg-green-700 text-white rounded-full p-3.5 shadow-lg transition-all hover:scale-105 active:scale-95"
          title="Buka chat verifikasi"
        >
          <FiMessageCircle size={22} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Drawer overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#075e54] text-white flex-shrink-0">
                <button onClick={() => setOpen(false)} className="p-1 rounded-full hover:bg-white/10">
                  <FiX size={20} />
                </button>
                {otherUser && <Avatar user={otherUser} online={onlineOther} />}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold truncate">
                    {otherUser ? (otherUser.name + (otherUser.desas?.nama ? ` - ${otherUser.desas.nama}` : '')) : drawerTitle}
                  </h3>
                  <p className="text-[11px] text-green-100 truncate">
                    {typingUser ? 'sedang mengetik...'
                      : onlineOther ? 'Online'
                      : (conversation?.reference_label || REFERENCE_LABELS[referenceType] || '')}
                  </p>
                </div>
              </div>

              {/* Messages area */}
              <div
                ref={containerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 py-2 bg-[#efeae2]"
                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'200\' height=\'200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cdefs%3E%3Cpattern id=\'p\' width=\'40\' height=\'40\' patternUnits=\'userSpaceOnUse\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1\' fill=\'%23d4cfc6\' opacity=\'.3\'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=\'200\' height=\'200\' fill=\'url(%23p)\'/%3E%3C/svg%3E")' }}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <FiLoader className="animate-spin text-gray-400" size={24} />
                  </div>
                ) : !hasConversation ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm text-center px-4">
                    <FiMessageCircle size={40} className="mb-3 text-gray-300" />
                    <p>Belum ada percakapan untuk {REFERENCE_LABELS[referenceType] || 'item'} ini.</p>
                    <p className="text-xs mt-1">Chat akan otomatis dibuat saat verifikator meminta revisi.</p>
                  </div>
                ) : (
                  <>
                    {loadingMsgs && messages.length > 0 && (
                      <div className="text-center py-2">
                        <FiLoader className="animate-spin text-gray-400 mx-auto" size={16} />
                      </div>
                    )}
                    {groupedMessages.map((item, i) =>
                      item.type === 'date' ? (
                        <div key={`d-${i}`} className="flex justify-center my-2">
                          <span className="bg-white/80 rounded-md px-3 py-0.5 text-[11px] text-gray-500 shadow-sm">{item.date}</span>
                        </div>
                      ) : (
                        <MessageBubble
                          key={item.data.id}
                          msg={item.data}
                          isOwn={item.data.sender_id === currentUser.id || String(item.data.sender_id) === String(currentUser.id)}
                          isRead={item.data.is_read}
                          onDelete={deleteMessage}
                        />
                      )
                    )}
                    {typingUser && (
                      <div className="flex justify-start mb-1">
                        <div className="bg-white rounded-lg px-3 py-2 text-xs text-gray-400 shadow-sm">
                          <span className="animate-pulse">mengetik...</span>
                        </div>
                      </div>
                    )}
                    <div ref={endRef} />
                  </>
                )}
              </div>

              {/* Input area */}
              {hasConversation && (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f2f5] border-t border-gray-200 flex-shrink-0">
                  <input type="file" ref={fileRef} className="hidden" onChange={handleFile} />
                  <button onClick={() => fileRef.current?.click()} className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200">
                    <FiPaperclip size={18} />
                  </button>
                  <div className="flex-1 relative">
                    <textarea
                      value={inputText}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      placeholder="Ketik pesan..."
                      rows={1}
                      className="w-full px-3 py-2 bg-white rounded-lg text-[13px] resize-none focus:outline-none border border-gray-200 focus:border-green-400 max-h-20"
                      style={{ minHeight: '36px' }}
                    />
                  </div>
                  <button
                    onClick={sendMessage}
                    disabled={!inputText.trim() || sending}
                    className="p-2 rounded-full bg-green-600 text-white disabled:bg-gray-300 hover:bg-green-700 transition-colors"
                  >
                    {sending ? <FiLoader className="animate-spin" size={18} /> : <FiSend size={18} />}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
