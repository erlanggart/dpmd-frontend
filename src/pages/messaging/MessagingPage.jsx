import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
	FiMessageCircle, FiSearch, FiSend, FiPaperclip,
	FiFile, FiArrowLeft, FiPlus,
	FiLoader, FiChevronDown, FiTrash2, FiDownload
} from 'react-icons/fi';
import api from '../../api';

const API_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://localhost:3001';

const ROLE_LABELS = {
	superadmin: 'Superadmin', admin: 'Admin', kepala_dinas: 'Kepala Dinas', sekretaris_dinas: 'Sekretaris Dinas',
	kepala_bidang: 'Kepala Bidang', ketua_tim: 'Ketua Tim', pegawai: 'Pegawai', sarpras: 'Sarpras', sekretariat: 'Sekretariat',
	desa: 'Desa', kecamatan: 'Kecamatan', dinas_terkait: 'Dinas Terkait', verifikator_dinas: 'Verifikator Dinas',
};
const ROLE_COLORS = {
	superadmin: 'bg-red-50 text-red-600', admin: 'bg-red-50 text-red-600',
	kepala_dinas: 'bg-purple-50 text-purple-600', sekretaris_dinas: 'bg-indigo-50 text-indigo-600',
	kepala_bidang: 'bg-blue-50 text-blue-600', ketua_tim: 'bg-cyan-50 text-cyan-600',
	pegawai: 'bg-teal-50 text-teal-600', sarpras: 'bg-sky-50 text-sky-600', sekretariat: 'bg-slate-100 text-slate-600',
	desa: 'bg-emerald-50 text-emerald-600', kecamatan: 'bg-orange-50 text-orange-600',
	dinas_terkait: 'bg-amber-50 text-amber-600', verifikator_dinas: 'bg-rose-50 text-rose-600',
};
const ROLE_GROUPS = {
	dpmd: ['superadmin', 'admin', 'kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai', 'sarpras', 'sekretariat'],
	desa: ['desa'], kecamatan: ['kecamatan'], dinas: ['dinas_terkait', 'verifikator_dinas'],
};

/* ── Helpers ── */
function displayName(user) {
	if (!user) return 'Unknown';
	let n = user.name;
	if (user.desas?.nama) n += ` · ${user.desas.nama}`;
	else if (user.kecamatans?.nama) n += ` · Kec. ${user.kecamatans.nama}`;
	return n;
}
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
function sidebarTime(d) {
	if (!d) return '';
	const dt = new Date(d), now = new Date();
	if (dt.toDateString() === now.toDateString()) return shortTime(d);
	const y = new Date(now); y.setDate(y.getDate() - 1);
	if (dt.toDateString() === y.toDateString()) return 'Kemarin';
	return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: '2-digit' });
}
function lastSeenText(lastActive) {
	if (!lastActive) return '';
	const d = new Date(lastActive), now = new Date(), diff = (now - d) / 60000;
	if (diff < 1) return 'baru saja';
	if (diff < 60) return `${Math.floor(diff)} menit lalu`;
	if (diff < 1440) return `${Math.floor(diff / 60)} jam lalu`;
	return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' ' + shortTime(lastActive);
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

/* ── Avatar ── */
const AVATAR_COLORS = [
	['#3b82f6', '#2563eb'], ['#10b981', '#059669'], ['#8b5cf6', '#7c3aed'],
	['#f59e0b', '#d97706'], ['#ec4899', '#db2777'], ['#06b6d4', '#0891b2'], ['#6366f1', '#4f46e5'],
];

function Avatar({ user, size = 'md', online }) {
	const colors = AVATAR_COLORS[(user?.id || 0) % AVATAR_COLORS.length];
	const dim = size === 'sm' ? 36 : size === 'lg' ? 48 : 44;
	const fontSize = size === 'sm' ? 12 : size === 'lg' ? 16 : 14;
	const dotDim = size === 'sm' ? 9 : 11;
	return (
		<div className="relative flex-shrink-0">
			{user?.avatar ? (
				<img src={`${API_URL}${user.avatar}`} alt=""
					style={{ width: dim, height: dim }}
					className="rounded-full object-cover" />
			) : (
				<div style={{ width: dim, height: dim, fontSize, background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
					className="rounded-full text-white flex items-center justify-center font-semibold tracking-wide">
					{initials(user?.name)}
				</div>
			)}
			{online !== undefined && (
				<span style={{ width: dotDim, height: dotDim }}
					className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${online ? 'bg-emerald-400' : 'bg-slate-300'}`} />
			)}
		</div>
	);
}

/* ── Read receipt ── */
function ReadReceipt({ isOwn, isRead }) {
	if (!isOwn) return null;
	return isRead ? (
		<svg width="16" height="11" viewBox="0 0 16 11" className="inline-block ml-1 -mb-px flex-shrink-0">
			<path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#34d399" />
			<path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.648.8 1.526 1.59a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#34d399" />
		</svg>
	) : (
		<svg width="12" height="11" viewBox="0 0 12 11" className="inline-block ml-1 -mb-px flex-shrink-0">
			<path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#9ca3af" />
		</svg>
	);
}

/* ── Message bubble ── */
function MessageBubble({ message, isOwn, onDelete }) {
	const [hovered, setHovered] = useState(false);
	const isFile = message.message_type === 'file';
	const isImage = message.message_type === 'image';
	const isSystem = message.message_type === 'system';

	if (isSystem) {
		return (
			<div className="flex justify-center my-4">
				<span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[11px] px-4 py-1.5 rounded-full shadow-sm border border-slate-100 font-medium">
					{message.content}
				</span>
			</div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0, y: 4, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.15 }}
			className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1.5 group`}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => setHovered(false)}
		>
			<div className="relative max-w-[75%] lg:max-w-[60%]">
				<div className={`rounded-2xl px-3.5 py-2 ${
					isOwn
						? 'bg-emerald-500 text-white rounded-br-[4px]'
						: 'bg-white text-slate-800 rounded-bl-[4px] shadow-sm border border-slate-50'
				}`}>
					{isImage && message.file_path && (
						<a href={`${API_URL}/${message.file_path}`} target="_blank" rel="noopener noreferrer" className="block mb-1.5">
							<img src={`${API_URL}/${message.file_path}`} alt="" className="rounded-xl max-w-full max-h-64" loading="lazy" />
						</a>
					)}
					{isFile && (
						<a href={`${API_URL}/${message.file_path}`} target="_blank" rel="noopener noreferrer"
							className={`flex items-center gap-2.5 rounded-xl px-3 py-2 mb-1.5 transition-colors ${
								isOwn ? 'bg-emerald-600/30 hover:bg-emerald-600/40' : 'bg-slate-50 hover:bg-slate-100'
							}`}>
							<div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
								isOwn ? 'bg-emerald-400/30' : 'bg-blue-100'
							}`}>
								<FiFile className={isOwn ? 'text-white' : 'text-blue-500'} size={18} />
							</div>
							<div className="flex-1 min-w-0">
								<p className={`text-sm font-medium truncate ${isOwn ? 'text-white' : 'text-slate-800'}`}>
									{message.file_name || 'File'}
								</p>
								<p className={`text-[10px] ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`}>
									{formatFileSize(message.file_size)}
								</p>
							</div>
							<FiDownload className={`flex-shrink-0 ${isOwn ? 'text-emerald-100' : 'text-slate-400'}`} size={16} />
						</a>
					)}
					{!isImage && (
						<p className="text-[13.5px] whitespace-pre-wrap break-words leading-[1.4]">{message.content}</p>
					)}
					<div className="flex items-center justify-end gap-0.5 mt-0.5">
						<span className={`text-[10px] ${isOwn ? 'text-white/60' : 'text-slate-400'}`}>
							{shortTime(message.created_at)}
						</span>
						<ReadReceipt isOwn={isOwn} isRead={message.is_read} />
					</div>
				</div>

				<AnimatePresence>
					{hovered && isOwn && (
						<motion.button
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ duration: 0.1 }}
							onClick={() => onDelete(message.id)}
							className="absolute -top-2 -left-2 bg-white shadow-md rounded-full p-1.5 hover:bg-red-50 transition-colors z-10 border border-slate-200"
						>
							<FiTrash2 size={11} className="text-red-400" />
						</motion.button>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

/* ── Conversation list item ── */
function ConversationItem({ conversation, isActive, onClick, isOnline }) {
	const { other_user, last_message, last_message_at, unread_count, reference_label } = conversation;
	const preview = last_message
		? last_message.message_type === 'image' ? '📷 Foto'
			: last_message.message_type === 'file' ? `📎 ${last_message.file_name || 'File'}`
				: last_message.content
		: '';

	return (
		<button onClick={onClick}
			className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
				isActive ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
			}`}>
			<Avatar user={other_user} online={isOnline} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between mb-0.5">
					<span className={`truncate text-[14px] ${
						unread_count > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
					}`}>
						{displayName(other_user)}
					</span>
					<span className={`text-[11px] flex-shrink-0 ml-2 ${
						unread_count > 0 ? 'text-emerald-600 font-semibold' : 'text-slate-400'
					}`}>
						{sidebarTime(last_message_at)}
					</span>
				</div>
				{reference_label && (
					<p className="text-[10px] text-blue-500 truncate mb-0.5 flex items-center gap-1 font-medium">
						<span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
						{reference_label}
					</p>
				)}
				<div className="flex items-center justify-between">
					<p className={`text-[13px] truncate pr-2 ${
						unread_count > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'
					}`}>
						{preview || <span className="italic">Belum ada pesan</span>}
					</p>
					{unread_count > 0 && (
						<span className="bg-emerald-500 text-white text-[10px] rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0 font-semibold">
							{unread_count > 99 ? '99+' : unread_count}
						</span>
					)}
				</div>
			</div>
		</button>
	);
}

/* ── Contact item ── */
function ContactItem({ contact, onClick, isOnline }) {
	return (
		<button onClick={() => onClick(contact)}
			className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
			<Avatar user={contact} size="sm" online={isOnline} />
			<div className="flex-1 min-w-0">
				<p className="text-[14px] text-slate-800 truncate font-medium">{displayName(contact)}</p>
				<span className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-0.5 ${
					ROLE_COLORS[contact.role] || 'bg-slate-100 text-slate-500'
				}`}>
					{ROLE_LABELS[contact.role] || contact.role}
				</span>
			</div>
		</button>
	);
}

/* ── Filter tab ── */
function FilterTab({ label, active, count, onClick }) {
	return (
		<button onClick={onClick}
			className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all whitespace-nowrap ${
				active
					? 'bg-emerald-600 text-white shadow-sm'
					: 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
			}`}>
			{label}{count > 0 ? ` (${count})` : ''}
		</button>
	);
}

/* ── Typing dots ── */
function TypingDots() {
	return (
		<div className="flex justify-start mb-1.5">
			<div className="bg-white rounded-2xl rounded-bl-[4px] px-4 py-3 shadow-sm border border-slate-50">
				<div className="flex items-center gap-1">
					{[0, 1, 2].map(i => (
						<motion.span key={i} className="w-[6px] h-[6px] bg-slate-400 rounded-full"
							animate={{ y: [0, -4, 0] }}
							transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }} />
					))}
				</div>
			</div>
		</div>
	);
}

/* ════════════════════════════════════════
   MAIN COMPONENT
   ════════════════════════════════════════ */
export default function MessagingPage() {
	const [conversations, setConversations] = useState([]);
	const [activeConv, setActiveConv] = useState(null);
	const [messages, setMessages] = useState([]);
	const [contacts, setContacts] = useState([]);
	const [inputText, setInputText] = useState('');
	const [searchQ, setSearchQ] = useState('');
	const [contactSearch, setContactSearch] = useState('');
	const [contactFilter, setContactFilter] = useState('all');
	const [view, setView] = useState('chats'); // 'chats' | 'contacts'
	const [loading, setLoading] = useState(false);
	const [sending, setSending] = useState(false);
	const [loadingMsgs, setLoadingMsgs] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const [nextCursor, setNextCursor] = useState(null);
	const [typingUser, setTypingUser] = useState(null);
	const [mobileChat, setMobileChat] = useState(false);
	const [onlineUserIds, setOnlineUserIds] = useState(new Set());
	const [showScrollBtn, setShowScrollBtn] = useState(false);

	const socketRef = useRef(null);
	const endRef = useRef(null);
	const containerRef = useRef(null);
	const inputRef = useRef(null);
	const fileRef = useRef(null);
	const typingTORef = useRef(null);
	const activeConvRef = useRef(null);

	const currentUser = useMemo(() => JSON.parse(localStorage.getItem('user') || '{}'), []);

	useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

	// ── Socket ──
	useEffect(() => {
		const token = localStorage.getItem('expressToken');
		if (!token) return;

		const s = io(API_URL, { auth: { token }, transports: ['websocket'] });
		socketRef.current = s;

		s.on('connect', () => {
			s.emit('get_online_users', (ids) => {
				if (Array.isArray(ids)) setOnlineUserIds(new Set(ids));
			});
		});

		s.on('new_message', (msg) => {
			const conv = activeConvRef.current;
			if (conv && msg.conversation_id === conv.id) {
				setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
				if (msg.sender_id !== currentUser.id) {
					api.put(`/messaging/conversations/${msg.conversation_id}/read`).catch(() => {});
				}
			}
			setConversations(prev => {
				const updated = prev.map(c => c.id === msg.conversation_id ? {
					...c, last_message: msg, last_message_at: msg.created_at,
					unread_count: (conv && conv.id === msg.conversation_id) ? 0
						: msg.sender_id !== currentUser.id ? (c.unread_count || 0) + 1 : c.unread_count,
				} : c);
				return updated.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0));
			});
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
			if (activeConvRef.current && data.conversation_id === activeConvRef.current.id) setTypingUser(data.user_name);
		});
		s.on('stop_typing', (data) => {
			if (activeConvRef.current && data.conversation_id === activeConvRef.current.id) setTypingUser(null);
		});

		s.on('user_online', ({ user_id }) => setOnlineUserIds(prev => new Set(prev).add(user_id)));
		s.on('user_offline', ({ user_id }) => setOnlineUserIds(prev => { const n = new Set(prev); n.delete(user_id); return n; }));

		return () => s.disconnect();
	}, []);

	useEffect(() => { loadConversations(); }, []);

	// ── Data loading ──
	const loadConversations = async () => {
		try {
			setLoading(true);
			const res = await api.get('/messaging/conversations');
			if (res.data.success) setConversations(res.data.data);
		} catch (e) { console.error(e); } finally { setLoading(false); }
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
		} catch (e) { console.error(e); } finally { setLoadingMsgs(false); }
	};

	const loadContacts = async (search = '') => {
		try {
			const params = {};
			if (search) params.search = search;
			const res = await api.get('/messaging/contacts', { params });
			if (res.data.success) setContacts(res.data.data);
		} catch (e) { console.error(e); }
	};

	// ── Actions ──
	const selectConversation = async (conv) => {
		setActiveConv(conv);
		setMobileChat(true);
		setMessages([]);
		setTypingUser(null);
		setShowScrollBtn(false);
		await loadMessages(conv.id);
		if (conv.unread_count > 0) {
			api.put(`/messaging/conversations/${conv.id}/read`).catch(() => {});
			setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
		}
		setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
	};

	const startConversation = async (contact) => {
		try {
			const res = await api.post('/messaging/conversations', { target_user_id: contact.id });
			if (res.data.success) {
				const conv = res.data.data;
				setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
				setView('chats');
				setContactSearch('');
				selectConversation(conv);
			}
		} catch (e) { console.error(e); }
	};

	const sendMessage = async () => {
		if (!inputText.trim() || !activeConv || sending) return;
		const content = inputText.trim();
		setInputText('');
		setSending(true);
		try {
			await api.post(`/messaging/conversations/${activeConv.id}/messages`, { content });
		} catch (e) { setInputText(content); console.error(e); }
		finally { setSending(false); }
		emitStopTyping();
	};

	const handleFile = async (e) => {
		const file = e.target.files[0];
		if (!file || !activeConv) return;
		const fd = new FormData();
		fd.append('file', file);
		try {
			setSending(true);
			await api.post(`/messaging/conversations/${activeConv.id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
		} catch (e) { console.error(e); } finally { setSending(false); if (fileRef.current) fileRef.current.value = ''; }
	};

	const deleteMessage = async (msgId) => {
		try { await api.delete(`/messaging/messages/${msgId}`); } catch (e) { console.error(e); }
	};

	const emitStopTyping = () => {
		if (socketRef.current && activeConv) {
			socketRef.current.emit('stop_typing', { conversation_id: activeConv.id, receiver_id: activeConv.other_user?.id });
		}
	};
	const handleInput = (e) => {
		setInputText(e.target.value);
		if (socketRef.current && activeConv) {
			socketRef.current.emit('typing', { conversation_id: activeConv.id, receiver_id: activeConv.other_user?.id });
			clearTimeout(typingTORef.current);
			typingTORef.current = setTimeout(emitStopTyping, 2000);
		}
	};
	const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

	useEffect(() => {
		if (messages.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleScroll = useCallback(() => {
		const c = containerRef.current;
		if (!c) return;
		setShowScrollBtn(c.scrollHeight - c.scrollTop - c.clientHeight > 300);
		if (c.scrollTop < 50 && hasMore && !loadingMsgs && activeConv) loadMessages(activeConv.id, nextCursor);
	}, [hasMore, loadingMsgs, activeConv, nextCursor]);

	const scrollToBottom = () => endRef.current?.scrollIntoView({ behavior: 'smooth' });

	// ── Derived ──
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

	const filteredConvs = conversations.filter(c => {
		if (!searchQ) return true;
		return displayName(c.other_user).toLowerCase().includes(searchQ.toLowerCase());
	});

	const filteredContacts = useMemo(() => {
		let list = contacts;
		if (contactFilter !== 'all') {
			const roles = ROLE_GROUPS[contactFilter] || [];
			list = list.filter(c => roles.includes(c.role));
		}
		return list;
	}, [contacts, contactFilter]);

	const isOnline = (userId) => onlineUserIds.has(String(userId));
	const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

	const openContacts = () => {
		setView('contacts');
		setContactFilter('all');
		setContactSearch('');
		loadContacts();
	};

	/* ════════════════════════════════════════
	   RENDER
	   ════════════════════════════════════════ */
	return (
		<div className="flex h-[calc(100vh-80px)] bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200/80">

			{/* ── LEFT PANEL ── */}
			<div className={`w-full md:w-[360px] lg:w-[400px] flex-shrink-0 bg-white border-r border-slate-100 flex flex-col ${mobileChat ? 'hidden md:flex' : 'flex'}`}>

				{/* Header */}
				<div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-slate-100">
					{view === 'chats' ? (
						<>
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-xl font-bold text-slate-800">Chat</h2>
								<button onClick={openContacts}
									className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all" title="Chat baru">
									<FiPlus size={20} strokeWidth={2.5} />
								</button>
							</div>
							<div className="relative">
								<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
								<input type="text" placeholder="Cari percakapan..." value={searchQ}
									onChange={(e) => setSearchQ(e.target.value)}
									className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-[13px] focus:outline-none border border-transparent focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400" />
							</div>
						</>
					) : (
						<>
							<div className="flex items-center gap-3 mb-3">
								<button onClick={() => setView('chats')}
									className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all">
									<FiArrowLeft size={20} />
								</button>
								<h2 className="text-xl font-bold text-slate-800">Kontak Baru</h2>
							</div>
							<div className="relative mb-2.5">
								<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
								<input type="text" placeholder="Cari nama kontak..." value={contactSearch}
									onChange={(e) => { setContactSearch(e.target.value); loadContacts(e.target.value); }}
									className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-[13px] focus:outline-none border border-transparent focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
									autoFocus />
							</div>
							<div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
								<FilterTab label="Semua" active={contactFilter === 'all'} count={contacts.length} onClick={() => setContactFilter('all')} />
								<FilterTab label="DPMD" active={contactFilter === 'dpmd'} count={contacts.filter(c => ROLE_GROUPS.dpmd.includes(c.role)).length} onClick={() => setContactFilter('dpmd')} />
								<FilterTab label="Desa" active={contactFilter === 'desa'} count={contacts.filter(c => ROLE_GROUPS.desa.includes(c.role)).length} onClick={() => setContactFilter('desa')} />
								<FilterTab label="Kecamatan" active={contactFilter === 'kecamatan'} count={contacts.filter(c => ROLE_GROUPS.kecamatan.includes(c.role)).length} onClick={() => setContactFilter('kecamatan')} />
								<FilterTab label="Dinas" active={contactFilter === 'dinas'} count={contacts.filter(c => ROLE_GROUPS.dinas.includes(c.role)).length} onClick={() => setContactFilter('dinas')} />
							</div>
						</>
					)}
				</div>

				{/* List: conversations or contacts */}
				<div className="flex-1 overflow-y-auto">
					{view === 'chats' ? (
						loading ? (
							<div className="flex items-center justify-center py-20">
								<div className="w-7 h-7 rounded-full border-[2.5px] border-slate-200 border-t-emerald-500 animate-spin" />
							</div>
						) : filteredConvs.length === 0 ? (
							<div className="text-center py-20 px-8">
								<div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
									<FiMessageCircle className="text-slate-300" size={28} />
								</div>
								<p className="text-slate-400 text-sm mb-1 font-medium">Belum ada percakapan</p>
								<p className="text-slate-400 text-xs mb-4">Mulai chat dengan menekan tombol +</p>
								<button onClick={openContacts}
									className="text-emerald-600 text-sm font-semibold hover:text-emerald-700 transition-colors">
									Mulai Chat Baru
								</button>
							</div>
						) : (
							<div className="divide-y divide-slate-50">
								{filteredConvs.map(conv => (
									<ConversationItem key={conv.id} conversation={conv} isActive={activeConv?.id === conv.id}
										onClick={() => selectConversation(conv)} isOnline={isOnline(conv.other_user?.id)} />
								))}
							</div>
						)
					) : (
						filteredContacts.length === 0 ? (
							<div className="text-center py-20 px-8">
								<p className="text-slate-400 text-sm font-medium">Tidak ada kontak ditemukan</p>
							</div>
						) : (
							<div className="divide-y divide-slate-50">
								{filteredContacts.map(c => (
									<ContactItem key={c.id} contact={c} onClick={startConversation} isOnline={isOnline(c.id)} />
								))}
							</div>
						)
					)}
				</div>
			</div>

			{/* ── RIGHT PANEL - CHAT ── */}
			<div className={`flex-1 flex flex-col bg-slate-50 ${!mobileChat ? 'hidden md:flex' : 'flex'}`}>
				{activeConv ? (
					<>
						{/* Chat header */}
						<div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
							<button onClick={() => setMobileChat(false)}
								className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all mr-0.5">
								<FiArrowLeft size={20} />
							</button>
							<Avatar user={activeConv.other_user} online={isOnline(activeConv.other_user?.id)} />
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-[15px] text-slate-800 truncate">
									{displayName(activeConv.other_user)}
								</h3>
								<p className="text-[12px] text-slate-400 truncate leading-tight mt-0.5">
									{typingUser ? (
										<span className="text-emerald-500 font-medium">sedang mengetik...</span>
									) : isOnline(activeConv.other_user?.id) ? (
										<span className="flex items-center gap-1.5">
											<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
											<span className="text-emerald-600 font-medium">Online</span>
										</span>
									) : activeConv.other_user?.last_active_at ? (
										`terakhir dilihat ${lastSeenText(activeConv.other_user.last_active_at)}`
									) : (
										<span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[activeConv.other_user?.role] || ''}`}>
											{ROLE_LABELS[activeConv.other_user?.role] || ''}
										</span>
									)}
								</p>
								{activeConv.reference_label && (
									<p className="text-[10px] text-blue-500 truncate flex items-center gap-1 font-medium mt-0.5">
										<span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
										{activeConv.reference_label}
									</p>
								)}
							</div>
						</div>

						{/* Messages area */}
						<div className="flex-1 relative overflow-hidden">
							<div ref={containerRef} onScroll={handleScroll}
								className="absolute inset-0 overflow-y-auto px-4 md:px-8 lg:px-16 py-4"
								style={{ backgroundColor: '#f8fafc' }}>
								{loadingMsgs && messages.length === 0 && (
									<div className="flex justify-center py-16">
										<div className="w-7 h-7 rounded-full border-[2.5px] border-slate-200 border-t-emerald-500 animate-spin" />
									</div>
								)}
								{hasMore && (
									<div className="text-center py-3">
										<button onClick={() => loadMessages(activeConv.id, nextCursor)} disabled={loadingMsgs}
											className="text-[11px] text-slate-500 bg-white px-4 py-1.5 rounded-full shadow-sm hover:bg-slate-50 border border-slate-200 font-medium transition-colors">
											{loadingMsgs ? 'Memuat...' : '↑ Pesan sebelumnya'}
										</button>
									</div>
								)}
								{groupedMessages.map((item, i) =>
									item.type === 'date' ? (
										<div key={`d-${i}`} className="flex justify-center my-4">
											<span className="bg-white text-slate-500 text-[11px] px-4 py-1.5 rounded-full shadow-sm border border-slate-100 font-semibold tracking-wide uppercase">
												{item.date}
											</span>
										</div>
									) : (
										<MessageBubble key={item.data.id} message={item.data}
											isOwn={item.data.sender_id === currentUser.id || String(item.data.sender_id) === String(currentUser.id)}
											onDelete={deleteMessage} />
									)
								)}
								{typingUser && <TypingDots />}
								<div ref={endRef} />
							</div>

							<AnimatePresence>
								{showScrollBtn && (
									<motion.button
										initial={{ opacity: 0, scale: 0.8, y: 10 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.8, y: 10 }}
										onClick={scrollToBottom}
										className="absolute bottom-3 right-4 bg-white p-2 rounded-full shadow-lg shadow-slate-900/10 border border-slate-200 hover:bg-slate-50 transition-colors z-10">
										<FiChevronDown size={18} className="text-slate-600" />
									</motion.button>
								)}
							</AnimatePresence>
						</div>

						{/* Input area */}
						<div className="px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
							<div className="flex items-end gap-2">
								<button onClick={() => fileRef.current?.click()}
									className="p-2.5 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50/80 transition-all flex-shrink-0" title="Lampiran">
									<FiPaperclip size={20} />
								</button>
								<input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" />
								<div className="flex-1 min-w-0">
									<textarea ref={inputRef} value={inputText} onChange={handleInput} onKeyDown={handleKeyDown}
										placeholder="Tulis pesan..." rows={1}
										className="w-full px-4 py-2.5 bg-slate-50 rounded-2xl text-[13.5px] focus:outline-none border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 resize-none max-h-28 leading-5 transition-all placeholder:text-slate-400"
										style={{ minHeight: '42px' }} />
								</div>
								<motion.button whileTap={{ scale: 0.9 }}
									onClick={sendMessage} disabled={!inputText.trim() || sending}
									className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all disabled:bg-slate-200 disabled:text-slate-400 flex-shrink-0">
									{sending ? (
										<div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
									) : (
										<FiSend size={20} />
									)}
								</motion.button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center">
						<div className="text-center max-w-sm px-8">
							<div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl flex items-center justify-center border border-emerald-100/50">
								<FiMessageCircle className="text-emerald-400" size={40} strokeWidth={1.5} />
							</div>
							<h3 className="text-xl font-semibold text-slate-700 mb-2">DPMD Bogor Chat</h3>
							<p className="text-sm text-slate-400 leading-relaxed">
								Kirim dan terima pesan secara langsung.<br />Pilih percakapan atau mulai chat baru.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
