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
	superadmin: 'Superadmin', kepala_dinas: 'Kepala Dinas', sekretaris_dinas: 'Sekretaris Dinas',
	kepala_bidang: 'Kepala Bidang', ketua_tim: 'Ketua Tim', pegawai: 'Pegawai',
	desa: 'Desa', kecamatan: 'Kecamatan', dinas_terkait: 'Dinas Terkait', verifikator_dinas: 'Verifikator Dinas',
};
const ROLE_COLORS = {
	superadmin: 'bg-red-100 text-red-700', kepala_dinas: 'bg-purple-100 text-purple-700',
	sekretaris_dinas: 'bg-indigo-100 text-indigo-700', kepala_bidang: 'bg-blue-100 text-blue-700',
	ketua_tim: 'bg-cyan-100 text-cyan-700', pegawai: 'bg-teal-100 text-teal-700',
	desa: 'bg-green-100 text-green-700', kecamatan: 'bg-orange-100 text-orange-700',
	dinas_terkait: 'bg-amber-100 text-amber-700', verifikator_dinas: 'bg-rose-100 text-rose-700',
};
const ROLE_GROUPS = {
	dpmd: ['superadmin', 'kepala_dinas', 'sekretaris_dinas', 'kepala_bidang', 'ketua_tim', 'pegawai'],
	desa: ['desa'], kecamatan: ['kecamatan'], dinas: ['dinas_terkait', 'verifikator_dinas'],
};

function displayName(user) {
	if (!user) return 'Unknown';
	let n = user.name;
	if (user.desas?.nama) n += ` - ${user.desas.nama}`;
	else if (user.kecamatans?.nama) n += ` - Kec. ${user.kecamatans.nama}`;
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

const AVATAR_BG = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-cyan-500', 'bg-rose-500'];
function Avatar({ user, size = 'md', online }) {
	const sz = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-11 h-11 text-sm';
	const dotSz = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
	const bg = AVATAR_BG[(user?.id || 0) % AVATAR_BG.length];
	return (
		<div className="relative flex-shrink-0">
			{user?.avatar ? (
				<img src={`${API_URL}/storage/uploads/avatars/${user.avatar}`} alt="" className={`${sz} rounded-full object-cover`} />
			) : (
				<div className={`${sz} rounded-full ${bg} text-white flex items-center justify-center font-semibold`}>{initials(user?.name)}</div>
			)}
			{online !== undefined && (
				<span className={`absolute bottom-0 right-0 ${dotSz} rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-300'}`} />
			)}
		</div>
	);
}

function MessageStatus({ isOwn, isRead }) {
	if (!isOwn) return null;
	return isRead ? (
		<svg width="16" height="11" viewBox="0 0 16 11" className="inline-block ml-1 flex-shrink-0">
			<path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#53bdeb" />
			<path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.648.8 1.526 1.59a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#53bdeb" />
		</svg>
	) : (
		<svg width="12" height="11" viewBox="0 0 12 11" className="inline-block ml-1 flex-shrink-0">
			<path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#8696a0" />
		</svg>
	);
}

function DateSeparator({ date }) {
	return (
		<div className="flex items-center justify-center my-3">
			<span className="bg-white/90 text-[11px] text-gray-500 px-3 py-1 rounded-lg shadow-sm border border-gray-100 font-medium">{date}</span>
		</div>
	);
}

function MessageBubble({ message, isOwn, onDelete }) {
	const [showMenu, setShowMenu] = useState(false);
	const isFile = message.message_type === 'file';
	const isImage = message.message_type === 'image';
	const isSystem = message.message_type === 'system';

	if (isSystem) {
		return (
			<div className="flex justify-center my-2">
				<span className="bg-amber-50 text-amber-700 text-[11px] px-3 py-1 rounded-lg">{message.content}</span>
			</div>
		);
	}

	return (
		<div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`} onMouseLeave={() => setShowMenu(false)}>
			<div className="relative max-w-[75%] lg:max-w-[65%]">
				{isOwn && (
					<button onClick={() => setShowMenu(!showMenu)}
						className="absolute -left-7 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 p-0.5">
						<FiChevronDown size={14} />
					</button>
				)}
				{showMenu && (
					<div className="absolute -left-7 top-6 bg-white rounded-lg shadow-lg border border-gray-200 z-10 py-1 min-w-[120px]">
						<button onClick={() => { onDelete(message.id); setShowMenu(false); }}
							className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 w-full text-xs">
							<FiTrash2 size={12} /> Hapus
						</button>
					</div>
				)}
				<div className={`rounded-xl px-3 py-1.5 ${isOwn ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-sm' : 'bg-white text-gray-900 rounded-tl-sm shadow-sm'}`}>
					{isImage && message.file_path && (
						<a href={`${API_URL}/${message.file_path}`} target="_blank" rel="noopener noreferrer" className="block mb-1">
							<img src={`${API_URL}/${message.file_path}`} alt="" className="rounded-lg max-w-full max-h-64" loading="lazy" />
						</a>
					)}
					{isFile && (
						<a href={`${API_URL}/${message.file_path}`} target="_blank" rel="noopener noreferrer"
							className="flex items-center gap-2.5 bg-gray-50/80 rounded-lg px-3 py-2 mb-1 hover:bg-gray-100/80 transition-colors">
							<div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
								<FiFile className="text-white" size={18} />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-gray-800 truncate">{message.file_name || 'File'}</p>
								<p className="text-[10px] text-gray-400">{formatFileSize(message.file_size)}</p>
							</div>
							<FiDownload className="text-gray-400 flex-shrink-0" size={16} />
						</a>
					)}
					{!isImage && <p className="text-[13.5px] whitespace-pre-wrap break-words leading-[1.35]">{message.content}</p>}
					<div className={`flex items-center justify-end gap-0.5 -mb-0.5 ${isOwn ? 'text-gray-500' : 'text-gray-400'}`}>
						<span className="text-[10.5px]">{shortTime(message.created_at)}</span>
						<MessageStatus isOwn={isOwn} isRead={message.is_read} />
					</div>
				</div>
			</div>
		</div>
	);
}

function ConversationItem({ conversation, isActive, onClick, isOnline }) {
	const { other_user, last_message, last_message_at, unread_count, reference_type, reference_label } = conversation;
	const preview = last_message
		? last_message.message_type === 'image' ? '\ud83d\udcf7 Foto'
			: last_message.message_type === 'file' ? `\ud83d\udcce ${last_message.file_name || 'File'}`
				: last_message.content
		: '';

	return (
		<div onClick={onClick}
			className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b border-gray-50 ${isActive ? 'bg-[#f0f2f5]' : 'hover:bg-[#f5f6f6]'}`}>
			<Avatar user={other_user} online={isOnline} />
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between">
					<span className={`truncate text-[14.5px] ${unread_count > 0 ? 'font-semibold text-gray-900' : 'font-normal text-gray-800'}`}>
						{displayName(other_user)}
					</span>
					<span className={`text-[11px] flex-shrink-0 ml-2 ${unread_count > 0 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
						{sidebarTime(last_message_at)}
					</span>
				</div>
				{reference_label && (
					<p className="text-[10px] text-blue-600 truncate mt-0.5 flex items-center gap-1">
						<span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
						{reference_label}
					</p>
				)}
				<div className="flex items-center justify-between mt-0.5">
					<p className={`text-[13px] truncate ${unread_count > 0 ? 'text-gray-700' : 'text-gray-500'}`}>
						{preview || <span className="italic text-gray-400">Belum ada pesan</span>}
					</p>
					{unread_count > 0 && (
						<span className="bg-green-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0 ml-2 font-medium">
							{unread_count > 99 ? '99+' : unread_count}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

function ContactItem({ contact, onClick, isOnline }) {
	return (
		<div onClick={() => onClick(contact)} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#f5f6f6] transition-colors">
			<Avatar user={contact} size="sm" online={isOnline} />
			<div className="flex-1 min-w-0">
				<p className="text-[14px] text-gray-900 truncate font-medium">{displayName(contact)}</p>
				<span className={`text-[11px] px-1.5 py-0.5 rounded-full ${ROLE_COLORS[contact.role] || 'bg-gray-100 text-gray-600'}`}>
					{ROLE_LABELS[contact.role] || contact.role}
				</span>
			</div>
		</div>
	);
}

function FilterTab({ label, active, count, onClick }) {
	return (
		<button onClick={onClick}
			className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors whitespace-nowrap ${active ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
			{label} {count > 0 && <span className="ml-0.5">({count})</span>}
		</button>
	);
}

export default function MessagingPage() {
	const [conversations, setConversations] = useState([]);
	const [activeConv, setActiveConv] = useState(null);
	const [messages, setMessages] = useState([]);
	const [contacts, setContacts] = useState([]);
	const [inputText, setInputText] = useState('');
	const [searchQ, setSearchQ] = useState('');
	const [contactSearch, setContactSearch] = useState('');
	const [contactFilter, setContactFilter] = useState('all');
	const [showContacts, setShowContacts] = useState(false);
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

	// Socket connection
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
					api.put(`/api/messaging/conversations/${msg.conversation_id}/read`).catch(() => {});
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

	const loadConversations = async () => {
		try {
			setLoading(true);
			const res = await api.get('/api/messaging/conversations');
			if (res.data.success) setConversations(res.data.data);
		} catch (e) { console.error(e); } finally { setLoading(false); }
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
		} catch (e) { console.error(e); } finally { setLoadingMsgs(false); }
	};

	const loadContacts = async (search = '') => {
		try {
			const params = {};
			if (search) params.search = search;
			const res = await api.get('/api/messaging/contacts', { params });
			if (res.data.success) setContacts(res.data.data);
		} catch (e) { console.error(e); }
	};

	const selectConversation = async (conv) => {
		setActiveConv(conv);
		setMobileChat(true);
		setMessages([]);
		setTypingUser(null);
		setShowScrollBtn(false);
		await loadMessages(conv.id);
		if (conv.unread_count > 0) {
			api.put(`/api/messaging/conversations/${conv.id}/read`).catch(() => {});
			setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
		}
		setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'auto' }), 50);
	};

	const startConversation = async (contact) => {
		try {
			const res = await api.post('/api/messaging/conversations', { target_user_id: contact.id });
			if (res.data.success) {
				const conv = res.data.data;
				setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
				setShowContacts(false);
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
			await api.post(`/api/messaging/conversations/${activeConv.id}/messages`, { content });
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
			await api.post(`/api/messaging/conversations/${activeConv.id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
		} catch (e) { console.error(e); } finally { setSending(false); if (fileRef.current) fileRef.current.value = ''; }
	};

	const deleteMessage = async (msgId) => {
		try { await api.delete(`/api/messaging/messages/${msgId}`); } catch (e) { console.error(e); }
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

	return (
		<div className="flex h-[calc(100vh-80px)] bg-[#eae6df] rounded-xl overflow-hidden shadow-sm border border-gray-200">

			{/* LEFT PANEL */}
			<div className={`w-full md:w-[380px] lg:w-[420px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col ${mobileChat ? 'hidden md:flex' : 'flex'}`}>

				<div className="px-4 pt-3 pb-2 bg-[#f0f2f5] border-b border-gray-200">
					<div className="flex items-center justify-between mb-2.5">
						<div className="flex items-center gap-2">
							<h2 className="text-[17px] font-bold text-gray-800">Chat</h2>
							{totalUnread > 0 && (
								<span className="bg-green-500 text-white text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium">
									{totalUnread > 99 ? '99+' : totalUnread}
								</span>
							)}
						</div>
						<button onClick={() => { setShowContacts(!showContacts); if (!showContacts) loadContacts(); }}
							className="p-2 rounded-full text-gray-500 hover:bg-gray-200 transition-colors" title="Chat baru">
							<FiPlus size={20} />
						</button>
					</div>
					<div className="relative">
						<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
						<input type="text" placeholder="Cari atau mulai chat baru" value={searchQ}
							onChange={(e) => setSearchQ(e.target.value)}
							className="w-full pl-9 pr-3 py-1.5 bg-white rounded-lg text-[13px] focus:outline-none border border-gray-200 focus:border-green-400" />
					</div>
				</div>

				<AnimatePresence>
					{showContacts && (
						<motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.15 }}
							className="absolute inset-0 md:right-auto md:w-[380px] lg:w-[420px] bg-white z-30 flex flex-col">
							<div className="px-4 pt-3 pb-2 bg-[#f0f2f5] border-b border-gray-200">
								<div className="flex items-center gap-3 mb-2.5">
									<button onClick={() => setShowContacts(false)} className="p-1 text-gray-600 hover:text-gray-900">
										<FiArrowLeft size={20} />
									</button>
									<h3 className="text-[17px] font-bold text-gray-800">Chat Baru</h3>
								</div>
								<input type="text" placeholder="Cari nama kontak..." value={contactSearch}
									onChange={(e) => { setContactSearch(e.target.value); loadContacts(e.target.value); }}
									className="w-full pl-3 pr-3 py-1.5 bg-white rounded-lg text-[13px] focus:outline-none border border-gray-200 focus:border-green-400" autoFocus />
								<div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
									<FilterTab label="Semua" active={contactFilter === 'all'} count={contacts.length} onClick={() => setContactFilter('all')} />
									<FilterTab label="DPMD" active={contactFilter === 'dpmd'} count={contacts.filter(c => ROLE_GROUPS.dpmd.includes(c.role)).length} onClick={() => setContactFilter('dpmd')} />
									<FilterTab label="Desa" active={contactFilter === 'desa'} count={contacts.filter(c => ROLE_GROUPS.desa.includes(c.role)).length} onClick={() => setContactFilter('desa')} />
									<FilterTab label="Kecamatan" active={contactFilter === 'kecamatan'} count={contacts.filter(c => ROLE_GROUPS.kecamatan.includes(c.role)).length} onClick={() => setContactFilter('kecamatan')} />
									<FilterTab label="Dinas" active={contactFilter === 'dinas'} count={contacts.filter(c => ROLE_GROUPS.dinas.includes(c.role)).length} onClick={() => setContactFilter('dinas')} />
								</div>
							</div>
							<div className="flex-1 overflow-auto">
								{filteredContacts.length === 0 ? (
									<p className="text-center text-gray-400 text-sm py-8">Tidak ada kontak</p>
								) : (
									filteredContacts.map(c => (
										<ContactItem key={c.id} contact={c} onClick={startConversation} isOnline={isOnline(c.id)} />
									))
								)}
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				<div className="flex-1 overflow-auto">
					{loading ? (
						<div className="flex items-center justify-center py-16"><FiLoader className="animate-spin text-gray-400" size={24} /></div>
					) : filteredConvs.length === 0 ? (
						<div className="text-center py-16 px-6">
							<FiMessageCircle className="mx-auto text-gray-200 mb-3" size={56} />
							<p className="text-gray-400 text-sm">Belum ada percakapan</p>
							<button onClick={() => { setShowContacts(true); loadContacts(); }}
								className="mt-3 text-green-600 text-sm font-medium hover:underline">Mulai chat baru</button>
						</div>
					) : (
						filteredConvs.map(conv => (
							<ConversationItem key={conv.id} conversation={conv} isActive={activeConv?.id === conv.id}
								onClick={() => selectConversation(conv)} isOnline={isOnline(conv.other_user?.id)} />
						))
					)}
				</div>
			</div>

			{/* RIGHT PANEL - CHAT */}
			<div className={`flex-1 flex flex-col ${!mobileChat ? 'hidden md:flex' : 'flex'}`}>
				{activeConv ? (
					<>
						<div className="px-4 py-2.5 bg-[#f0f2f5] border-b border-gray-200 flex items-center gap-3">
							<button onClick={() => setMobileChat(false)} className="md:hidden p-1 text-gray-500 hover:text-gray-700 mr-1">
								<FiArrowLeft size={20} />
							</button>
							<Avatar user={activeConv.other_user} online={isOnline(activeConv.other_user?.id)} />
							<div className="flex-1 min-w-0">
								<h3 className="font-semibold text-[15px] text-gray-900 truncate">{displayName(activeConv.other_user)}</h3>
								{activeConv.reference_label && (
									<p className="text-[10px] text-blue-600 truncate flex items-center gap-1">
										<span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
										{activeConv.reference_label}
									</p>
								)}
								<p className="text-[11.5px] text-gray-500 truncate">
									{typingUser ? (
										<span className="text-green-600 italic">sedang mengetik...</span>
									) : isOnline(activeConv.other_user?.id) ? (
										<span className="text-green-600">online</span>
									) : activeConv.other_user?.last_active_at ? (
										<span>terakhir dilihat {lastSeenText(activeConv.other_user.last_active_at)}</span>
									) : (
										<span className={`px-1.5 py-0.5 rounded-full text-[10px] ${ROLE_COLORS[activeConv.other_user?.role] || ''}`}>
											{ROLE_LABELS[activeConv.other_user?.role] || ''}
										</span>
									)}
								</p>
							</div>
						</div>

						<div ref={containerRef} onScroll={handleScroll}
							className="flex-1 overflow-auto px-4 md:px-12 lg:px-20 py-2 relative"
							style={{ backgroundColor: '#efeae2', backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4cfc6' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
							{loadingMsgs && messages.length === 0 && (
								<div className="flex justify-center py-12"><FiLoader className="animate-spin text-gray-400" size={24} /></div>
							)}
							{hasMore && (
								<div className="text-center py-2">
									<button onClick={() => loadMessages(activeConv.id, nextCursor)} disabled={loadingMsgs}
										className="text-[11px] text-gray-500 bg-white/80 px-3 py-1 rounded-full shadow-sm hover:bg-white">
										{loadingMsgs ? 'Memuat...' : '\u2191 Pesan sebelumnya'}
									</button>
								</div>
							)}
							{groupedMessages.map((item, i) =>
								item.type === 'date' ? (
									<DateSeparator key={`d-${i}`} date={item.date} />
								) : (
									<MessageBubble key={item.data.id} message={item.data}
										isOwn={item.data.sender_id === currentUser.id} onDelete={deleteMessage} />
								)
							)}
							{typingUser && (
								<div className="flex justify-start mb-1">
									<div className="bg-white rounded-xl px-4 py-2 shadow-sm">
										<div className="flex gap-1">
											<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
											<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
											<span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
										</div>
									</div>
								</div>
							)}
							<div ref={endRef} />
						</div>

						<AnimatePresence>
							{showScrollBtn && (
								<motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
									onClick={scrollToBottom}
									className="absolute bottom-20 right-6 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-gray-700 z-10 border border-gray-200">
									<FiChevronDown size={20} />
								</motion.button>
							)}
						</AnimatePresence>

						<div className="px-4 py-2.5 bg-[#f0f2f5] border-t border-gray-200">
							<div className="flex items-end gap-2">
								<button onClick={() => fileRef.current?.click()}
									className="p-2 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0 mb-0.5" title="Lampiran">
									<FiPaperclip size={20} />
								</button>
								<input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" />
								<div className="flex-1">
									<textarea ref={inputRef} value={inputText} onChange={handleInput} onKeyDown={handleKeyDown}
										placeholder="Ketik pesan" rows={1}
										className="w-full px-4 py-2 bg-white rounded-lg text-[13.5px] focus:outline-none border border-gray-200 focus:border-green-400 resize-none max-h-28 leading-5"
										style={{ minHeight: '36px' }} />
								</div>
								<button onClick={sendMessage} disabled={!inputText.trim() || sending}
									className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 mb-0.5">
									{sending ? <FiLoader className="animate-spin" size={18} /> : <FiSend size={18} />}
								</button>
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center bg-[#f0f2f5]">
						<div className="text-center max-w-sm">
							<div className="w-[160px] h-[160px] mx-auto mb-6 bg-[#e0e0e0] rounded-full flex items-center justify-center">
								<FiMessageCircle className="text-gray-400" size={64} />
							</div>
							<h3 className="text-2xl font-light text-gray-700 mb-2">DPMD Bogor Chat</h3>
							<p className="text-sm text-gray-500 leading-relaxed">
								Kirim dan terima pesan secara langsung.<br />Pilih percakapan dari daftar atau mulai chat baru.
							</p>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
