import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useOutletContext } from 'react-router-dom';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
	FiMessageCircle, FiSearch, FiSend, FiPaperclip,
	FiFile, FiArrowLeft, FiPlus,
	FiLoader, FiChevronDown, FiTrash2, FiDownload, FiSmile,
	FiUsers, FiUserPlus, FiLogOut, FiEdit2, FiX, FiCheck, FiInfo, FiCamera
} from 'react-icons/fi';
import api from '../../api';
import toast from 'react-hot-toast';
import useConfirm from '../../hooks/useConfirm';

const EmojiPicker = lazy(() => import('emoji-picker-react'));
const EMOJI_CATEGORIES = [
	{ category: 'suggested', name: 'Terbaru' },
	{ category: 'smileys_people', name: 'Emoji & Orang' },
	{ category: 'animals_nature', name: 'Hewan & Alam' },
	{ category: 'food_drink', name: 'Makanan & Minuman' },
	{ category: 'travel_places', name: 'Perjalanan' },
	{ category: 'activities', name: 'Aktivitas' },
	{ category: 'objects', name: 'Objek' },
	{ category: 'symbols', name: 'Simbol' },
	{ category: 'flags', name: 'Bendera' },
];

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
	desa: ['desa'], kelurahan: ['desa'], kecamatan: ['kecamatan'], dinas: ['dinas_terkait', 'verifikator_dinas'],
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
			<path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#53bdeb" />
			<path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.648.8 1.526 1.59a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="#53bdeb" />
		</svg>
	) : (
		<svg width="12" height="11" viewBox="0 0 12 11" className="inline-block ml-1 -mb-px flex-shrink-0">
			<path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.659.003.423.423 0 0 0 .003.63l2.319 2.415a.534.534 0 0 0 .347.152.47.47 0 0 0 .373-.176l6.548-8.085a.418.418 0 0 0-.045-.556z" fill="rgba(255,255,255,0.7)" />
		</svg>
	);
}

/* ── Quick Reaction Emojis ── */
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

/* ── Message bubble ── */
function MessageBubble({ message, isOwn, onDelete, isGroup, onReply, onReact, currentUserId }) {
	const [hovered, setHovered] = useState(false);
	const [showReactions, setShowReactions] = useState(false);
	const longPressRef = useRef(null);
	const isFile = message.message_type === 'file';
	const isImage = message.message_type === 'image';
	const isSystem = message.message_type === 'system';
	const isStatusReply = message.message_type === 'status_reply';

	// Parse status reply metadata
	const statusMeta = useMemo(() => {
		if (!isStatusReply || !message.file_name) return null;
		try { return JSON.parse(message.file_name); } catch { return null; }
	}, [isStatusReply, message.file_name]);

	if (isSystem) {
		return (
			<div className="flex justify-center my-4">
				<span className="bg-white/80 backdrop-blur-sm text-slate-500 text-[11px] px-4 py-1.5 rounded-full shadow-sm border border-slate-100 font-medium">
					{message.content}
				</span>
			</div>
		);
	}

	// Long press for reactions on mobile
	const handleTouchStart = () => {
		longPressRef.current = setTimeout(() => setShowReactions(true), 500);
	};
	const handleTouchEnd = () => {
		if (longPressRef.current) clearTimeout(longPressRef.current);
	};

	// Reactions grouped
	const reactionEntries = message.reactions ? Object.entries(message.reactions) : [];
	const hasReactions = reactionEntries.length > 0;

	return (
		<motion.div
			initial={{ opacity: 0, y: 4, scale: 0.98 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{ duration: 0.15 }}
			className={`flex ${isOwn ? 'justify-end' : 'justify-start'} ${hasReactions ? 'mb-4' : 'mb-1.5'} group min-w-0`}
			onMouseEnter={() => setHovered(true)}
			onMouseLeave={() => { setHovered(false); setShowReactions(false); }}
		>
			<div className="relative max-w-[75%] lg:max-w-[60%] min-w-0"
				onTouchStart={handleTouchStart}
				onTouchEnd={handleTouchEnd}
				onTouchMove={handleTouchEnd}
			>
				<div className={`rounded-2xl px-3.5 py-2 ${
					isOwn
						? 'bg-emerald-500 text-white rounded-br-[4px]'
						: 'bg-white text-slate-800 rounded-bl-[4px] shadow-sm border border-slate-50'
				}`}>
					{isGroup && !isOwn && message.sender && (
						<p className="text-[11px] font-semibold mb-0.5 text-emerald-600 truncate">{message.sender.name}</p>
					)}

					{/* Reply quote */}
					{message.reply_to && (
						<div className={`rounded-xl mb-2 overflow-hidden border-l-[3px] ${
							isOwn ? 'bg-emerald-600/30 border-emerald-200' : 'bg-slate-50 border-emerald-400'
						}`}>
							<div className="px-3 py-1.5">
								<p className={`text-[10px] font-semibold ${isOwn ? 'text-emerald-100' : 'text-emerald-600'}`}>
									{message.reply_to.sender?.name || 'Unknown'}
								</p>
								<p className={`text-[11px] truncate ${isOwn ? 'text-white/70' : 'text-slate-500'}`}>
									{message.reply_to.message_type === 'image' ? '📷 Foto'
										: message.reply_to.message_type === 'file' ? `📎 ${message.reply_to.file_name || 'File'}`
										: message.reply_to.content || '...'}
								</p>
							</div>
						</div>
					)}

					{/* Status reply context banner */}
					{isStatusReply && statusMeta && (
						<div className={`rounded-xl mb-2 overflow-hidden ${isOwn ? 'bg-emerald-600/30' : 'bg-slate-50'}`}>
							<div className="flex items-center gap-2 px-3 py-2">
								{statusMeta.status_media ? (
									<img src={`${API_URL}/${statusMeta.status_media}`} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
								) : (
									<div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: statusMeta.status_bg || '#059669' }}>
										<span className="text-white text-[9px] font-bold leading-tight line-clamp-2 text-center px-0.5">
											{statusMeta.status_content?.substring(0, 20) || ''}
										</span>
									</div>
								)}
								<div className="flex-1 min-w-0">
									<p className={`text-[10px] font-semibold ${isOwn ? 'text-emerald-100' : 'text-slate-500'}`}>
										{statusMeta.is_reaction ? '⚡ Reaksi terhadap status' : '↩ Balasan status'}
									</p>
									<p className={`text-[11px] truncate ${isOwn ? 'text-white/70' : 'text-slate-400'}`}>
										{statusMeta.status_content || 'Status'}
									</p>
								</div>
							</div>
						</div>
					)}
					{isImage && message.file_path && (
						<a href={`${API_URL}/${message.file_path}`} target="_blank" rel="noopener noreferrer" className="block mb-1.5 overflow-hidden rounded-xl">
							<img src={`${API_URL}/${message.file_path}`} alt="" className="rounded-xl w-full max-h-64 object-cover" loading="lazy" />
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

				{/* Reactions display */}
				{hasReactions && (
					<div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
						{reactionEntries.map(([emoji, users]) => {
							const isMine = users.some(u => u.user_id === currentUserId);
							return (
								<button key={emoji}
									onClick={() => onReact(message.id, emoji)}
									className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors ${
										isMine
											? 'bg-emerald-50 border-emerald-300 text-emerald-700'
											: 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
									}`}
									title={users.map(u => u.user_name).join(', ')}
								>
									<span>{emoji}</span>
									{users.length > 1 && <span className="font-medium">{users.length}</span>}
								</button>
							);
						})}
					</div>
				)}

				{/* Hover action buttons */}
				<AnimatePresence>
					{(hovered || showReactions) && !isSystem && (
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.8 }}
							transition={{ duration: 0.1 }}
							className={`absolute -top-8 ${isOwn ? 'right-0' : 'left-0'} flex items-center gap-0.5 bg-white rounded-full shadow-lg border border-slate-200 px-1 py-0.5 z-20`}
						>
							{/* Quick reaction emojis */}
							{QUICK_REACTIONS.map(emoji => (
								<button key={emoji}
									onClick={() => { onReact(message.id, emoji); setShowReactions(false); }}
									className="w-7 h-7 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors text-sm"
								>
									{emoji}
								</button>
							))}
							<div className="w-px h-5 bg-slate-200 mx-0.5" />
							<button onClick={() => { onReply(message); setShowReactions(false); }}
								className="w-7 h-7 flex items-center justify-center hover:bg-emerald-50 rounded-full transition-colors"
								title="Balas">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
									<polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" />
								</svg>
							</button>
							{isOwn && (
								<button onClick={() => { onDelete(message.id); setShowReactions(false); }}
									className="w-7 h-7 flex items-center justify-center hover:bg-red-50 rounded-full transition-colors">
									<FiTrash2 size={12} className="text-red-400" />
								</button>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</motion.div>
	);
}

/* ── Conversation list item ── */
function ConversationItem({ conversation, isActive, onClick, isOnline, onDelete }) {
	const [showDelete, setShowDelete] = useState(false);
	const { other_user, last_message, last_message_at, unread_count, reference_label, is_group, group_name, member_count } = conversation;
	const convName = is_group ? (group_name || 'Grup') : displayName(other_user);
	const preview = last_message
		? last_message.message_type === 'image' ? '📷 Foto'
			: last_message.message_type === 'file' ? `📎 ${last_message.file_name || 'File'}`
				: last_message.message_type === 'system' ? `ℹ️ ${last_message.content}`
					: last_message.message_type === 'status_reply' ? `💬 ${last_message.content}`
						: (is_group && last_message.sender ? `${last_message.sender.name?.split(' ')[0]}: ${last_message.content}` : last_message.content)
		: '';

	return (
		<div className="relative group"
			onMouseEnter={() => setShowDelete(true)}
			onMouseLeave={() => setShowDelete(false)}
			onContextMenu={(e) => { e.preventDefault(); setShowDelete(true); }}
		>
			<button onClick={onClick}
				className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
					isActive ? 'bg-emerald-50/80' : 'hover:bg-slate-50'
				}`}>
				{is_group ? (
					<div className="relative flex-shrink-0">
						{conversation.group_avatar ? (
							<img src={`${API_URL}/${conversation.group_avatar}`} alt="" style={{ width: 44, height: 44 }} className="rounded-full object-cover" />
						) : (
							<div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
								className="rounded-full text-white flex items-center justify-center font-semibold text-sm">
								<FiUsers size={20} />
							</div>
						)}
					</div>
				) : (
					<Avatar user={other_user} online={isOnline} />
				)}
				<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between mb-0.5">
					<span className={`truncate text-[14px] ${
						unread_count > 0 ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
					}`}>
						{convName}
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
				{is_group && !reference_label && (
					<p className="text-[10px] text-violet-500 truncate mb-0.5 font-medium">{member_count || 0} anggota</p>
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
		{/* Delete button on hover / long-press */}
		<AnimatePresence>
			{showDelete && (
				<motion.button
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0, scale: 0.8 }}
					onClick={(e) => { e.stopPropagation(); onDelete(conversation.id); }}
					className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors z-10 border border-red-200"
					title="Hapus percakapan"
				>
					<FiTrash2 size={14} />
				</motion.button>
			)}
		</AnimatePresence>
		</div>
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
	const { confirmDialog, showConfirm } = useConfirm();
	const { setHideBottomNav } = useOutletContext() || {};
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
	const [showEmoji, setShowEmoji] = useState(false);
	const [showGroupCreate, setShowGroupCreate] = useState(false);
	const [groupName, setGroupName] = useState('');
	const [selectedMembers, setSelectedMembers] = useState([]);
	const [showGroupInfo, setShowGroupInfo] = useState(false);
	const [groupMembers, setGroupMembers] = useState([]);
	const [showAddMembers, setShowAddMembers] = useState(false);
	const [replyTo, setReplyTo] = useState(null);

	const socketRef = useRef(null);
	const endRef = useRef(null);
	const containerRef = useRef(null);
	const inputRef = useRef(null);
	const fileRef = useRef(null);
	const typingTORef = useRef(null);
	const activeConvRef = useRef(null);
	const groupAvatarRef = useRef(null);

	const currentUser = useMemo(() => {
		const u = JSON.parse(localStorage.getItem('user') || '{}');
		if (u.id) u.id = Number(u.id);
		return u;
	}, []);

	useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);

	// Hide bottom nav when in mobile chat view
	useEffect(() => {
		setHideBottomNav?.(mobileChat);
		return () => setHideBottomNav?.(false);
	}, [mobileChat, setHideBottomNav]);

	// ── Socket ──
	useEffect(() => {
		const token = localStorage.getItem('expressToken');
		if (!token) return;

		const s = io(API_URL, { auth: { token }, transports: ['polling'] });
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

		s.on('conversation_deleted', (data) => {
			setConversations(prev => prev.filter(c => c.id !== data.conversation_id));
			if (activeConvRef.current?.id === data.conversation_id) {
				setActiveConv(null);
				setMessages([]);
				setMobileChat(false);
				setShowGroupInfo(false);
			}
		});

		s.on('group_created', (conv) => {
			setConversations(prev => prev.find(c => c.id === conv.id) ? prev : [conv, ...prev]);
		});

		s.on('group_updated', (data) => {
			setConversations(prev => prev.map(c => c.id === data.conversation_id ? { ...c, group_name: data.group_name || c.group_name, group_avatar: data.group_avatar !== undefined ? data.group_avatar : c.group_avatar } : c));
			if (activeConvRef.current?.id === data.conversation_id) {
				setActiveConv(prev => prev ? { ...prev, group_name: data.group_name || prev.group_name, group_avatar: data.group_avatar !== undefined ? data.group_avatar : prev.group_avatar } : prev);
			}
		});

		s.on('group_member_added', (data) => {
			loadConversations();
		});

		s.on('group_member_removed', (data) => {
			if (data.removed_user_id === currentUser.id) {
				setConversations(prev => prev.filter(c => c.id !== data.conversation_id));
				if (activeConvRef.current?.id === data.conversation_id) {
					setActiveConv(null); setMessages([]); setMobileChat(false); setShowGroupInfo(false);
				}
			} else {
				loadConversations();
			}
		});

		s.on('message_reaction', (data) => {
			if (activeConvRef.current && data.conversation_id === activeConvRef.current.id) {
				setMessages(prev => prev.map(m =>
					m.id === data.message_id ? { ...m, reactions: data.reactions } : m
				));
			}
		});

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

	const loadContacts = async (search = '', roleGroup = '') => {
		try {
			const params = {};
			if (search) params.search = search;
			if (roleGroup && roleGroup !== 'all') params.role_group = roleGroup;
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
		setShowEmoji(false);
		setShowGroupInfo(false);
		setShowAddMembers(false);
		setReplyTo(null);
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
		const replyId = replyTo?.id || null;
		setInputText('');
		setShowEmoji(false);
		setReplyTo(null);
		setSending(true);
		try {
			const body = { content };
			if (replyId) body.reply_to_id = replyId;
			await api.post(`/messaging/conversations/${activeConv.id}/messages`, body);
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

	const handleReply = (message) => {
		setReplyTo(message);
		inputRef.current?.focus();
	};

	const handleReact = async (msgId, emoji) => {
		try {
			const res = await api.post(`/messaging/messages/${msgId}/reactions`, { emoji });
			if (res.data.success) {
				// Update local message reactions
				setMessages(prev => prev.map(m =>
					m.id === msgId ? { ...m, reactions: res.data.data.reactions } : m
				));
			}
		} catch (e) { console.error(e); }
	};

	const deleteConversation = async (convId) => {
		const confirmed = await showConfirm({
			title: 'Hapus Percakapan',
			message: 'Hapus seluruh percakapan ini? Semua pesan akan dihapus permanen.',
			confirmText: 'Hapus',
			cancelText: 'Batal',
			type: 'danger'
		});
		if (!confirmed) return;
		try {
			await api.delete(`/messaging/conversations/${convId}`);
			setConversations(prev => prev.filter(c => c.id !== convId));
			if (activeConv?.id === convId) {
				setActiveConv(null);
				setMessages([]);
				setMobileChat(false);
			}
		} catch (e) { console.error(e); }
	};

	const emitStopTyping = () => {
		if (socketRef.current && activeConv) {
			if (activeConv.is_group) {
				const rids = (activeConv.members || []).filter(m => m.id !== currentUser.id).map(m => m.id);
				socketRef.current.emit('stop_typing', { conversation_id: activeConv.id, receiver_ids: rids });
			} else {
				socketRef.current.emit('stop_typing', { conversation_id: activeConv.id, receiver_id: activeConv.other_user?.id });
			}
		}
	};
	const handleInput = (e) => {
		setInputText(e.target.value);
		if (socketRef.current && activeConv) {
			if (activeConv.is_group) {
				const rids = (activeConv.members || []).filter(m => m.id !== currentUser.id).map(m => m.id);
				socketRef.current.emit('typing', { conversation_id: activeConv.id, receiver_ids: rids });
			} else {
				socketRef.current.emit('typing', { conversation_id: activeConv.id, receiver_id: activeConv.other_user?.id });
			}
			clearTimeout(typingTORef.current);
			typingTORef.current = setTimeout(emitStopTyping, 2000);
		}
	};
	const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

	const onEmojiClick = (emojiData) => {
		setInputText(prev => prev + emojiData.emoji);
		setShowEmoji(false);
		inputRef.current?.focus();
	};

	// ── Group actions ──
	const openGroupCreate = () => {
		setShowGroupCreate(true);
		setGroupName('');
		setSelectedMembers([]);
		if (contacts.length === 0) loadContacts();
	};

	const toggleMemberSelect = (contact) => {
		setSelectedMembers(prev =>
			prev.find(m => m.id === contact.id) ? prev.filter(m => m.id !== contact.id) : [...prev, contact]
		);
	};

	const createGroup = async () => {
		if (!groupName.trim()) {
			toast.error('Nama grup harus diisi');
			return;
		}
		if (selectedMembers.length < 1) {
			toast.error('Pilih minimal 1 anggota');
			return;
		}
		try {
			setSending(true);
			const res = await api.post('/messaging/groups', { name: groupName.trim(), member_ids: selectedMembers.map(m => m.id) });
			if (res.data.success) {
				const conv = res.data.data;
				setConversations(prev => [conv, ...prev]);
				setShowGroupCreate(false);
				setView('chats');
				selectConversation(conv);
			}
		} catch (e) { console.error(e); } finally { setSending(false); }
	};

	const loadGroupMembers = async (convId) => {
		try {
			const res = await api.get(`/messaging/groups/${convId}/members`);
			if (res.data.success) setGroupMembers(res.data.data);
		} catch (e) { console.error(e); }
	};

	const openGroupInfo = () => {
		if (!activeConv?.is_group) return;
		setShowGroupInfo(true);
		setShowAddMembers(false);
		loadGroupMembers(activeConv.id);
	};

	const addMembersToGroup = async (userIds) => {
		if (!activeConv?.is_group) return;
		try {
			await api.post(`/messaging/groups/${activeConv.id}/members`, { user_ids: userIds });
			loadGroupMembers(activeConv.id);
			loadConversations();
			setShowAddMembers(false);
		} catch (e) { console.error(e); }
	};

	const removeMemberFromGroup = async (targetUserId) => {
		if (!activeConv?.is_group) return;
		const confirmed = await showConfirm({
			title: 'Keluarkan Anggota', message: 'Yakin ingin mengeluarkan anggota ini dari grup?',
			confirmText: 'Keluarkan', cancelText: 'Batal', type: 'danger'
		});
		if (!confirmed) return;
		try {
			await api.delete(`/messaging/groups/${activeConv.id}/members/${targetUserId}`);
			loadGroupMembers(activeConv.id);
			loadConversations();
		} catch (e) { console.error(e); }
	};

	const leaveGroup = async () => {
		if (!activeConv?.is_group) return;
		const confirmed = await showConfirm({
			title: 'Keluar Grup', message: 'Yakin ingin keluar dari grup ini?',
			confirmText: 'Keluar', cancelText: 'Batal', type: 'danger'
		});
		if (!confirmed) return;
		try {
			await api.delete(`/messaging/groups/${activeConv.id}/members/${currentUser.id}`);
			setConversations(prev => prev.filter(c => c.id !== activeConv.id));
			setActiveConv(null); setMessages([]); setMobileChat(false); setShowGroupInfo(false);
		} catch (e) { console.error(e); }
	};

	const isGroupAdmin = activeConv?.is_group && activeConv.members?.some(m => m.id === currentUser.id && m.participant_role === 'admin');

	const uploadGroupAvatar = async (e) => {
		const file = e.target.files?.[0];
		if (!file || !activeConv?.is_group) return;
		const allowed = ['image/jpeg', 'image/png', 'image/webp'];
		if (!allowed.includes(file.type)) { toast.error('Format: JPG, PNG, atau WebP'); return; }
		if (file.size > 5 * 1024 * 1024) { toast.error('Maks 5MB'); return; }
		try {
			const fd = new FormData();
			fd.append('avatar', file);
			const res = await api.put(`/messaging/groups/${activeConv.id}/avatar`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			if (res.data.success) {
				const newAvatar = res.data.data.group_avatar;
				setActiveConv(prev => prev ? { ...prev, group_avatar: newAvatar } : prev);
				setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, group_avatar: newAvatar } : c));
				toast.success('Foto grup diperbarui');
			}
		} catch (err) { toast.error('Gagal mengubah foto grup'); }
		if (groupAvatarRef.current) groupAvatarRef.current.value = '';
	};

	// auto-resize textarea
	useEffect(() => {
		const el = inputRef.current;
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = Math.min(el.scrollHeight, 112) + 'px';
	}, [inputText]);

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
			if (contactFilter === 'desa') {
				list = list.filter(c => c.role === 'desa' && c.status_pemerintahan === 'desa');
			} else if (contactFilter === 'kelurahan') {
				list = list.filter(c => c.role === 'desa' && c.status_pemerintahan === 'kelurahan');
			} else {
				const roles = ROLE_GROUPS[contactFilter] || [];
				list = list.filter(c => roles.includes(c.role));
			}
		}
		return list;
	}, [contacts, contactFilter]);

	const isOnline = (userId) => onlineUserIds.has(String(userId));
	const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

	const openContacts = () => {
		setView('contacts');
		setContactFilter('all');
		setContactSearch('');
		loadContacts('', 'all');
	};

	/* ════════════════════════════════════════
	   RENDER
	   ════════════════════════════════════════ */
	return (
		<div className="relative flex h-[100dvh] md:h-[calc(100vh-80px)] bg-white md:rounded-2xl overflow-hidden md:shadow-sm md:border md:border-slate-200/80">

			{/* ── LEFT PANEL ── */}
			<div className={`w-full md:w-[360px] lg:w-[400px] flex-shrink-0 bg-white md:border-r border-slate-100 flex flex-col ${mobileChat ? 'hidden md:flex' : 'flex'}`}>
				{/* Header */}
				<div className="px-4 pt-4 pb-3 flex-shrink-0 border-b border-slate-100">
					{view === 'chats' ? (
						<>
							<div className="flex items-center justify-between mb-3">
								<h2 className="text-xl font-bold text-slate-800">Chat</h2>
								<div className="flex items-center gap-1">
									<button onClick={openGroupCreate}
										className="p-2 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition-all" title="Buat Grup">
										<FiUsers size={18} strokeWidth={2.5} />
									</button>
									<button onClick={openContacts}
										className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all" title="Chat baru">
										<FiPlus size={20} strokeWidth={2.5} />
									</button>
								</div>
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
									onChange={(e) => { setContactSearch(e.target.value); loadContacts(e.target.value, contactFilter); }}
									className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-[13px] focus:outline-none border border-transparent focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder:text-slate-400"
									autoFocus />
							</div>
							<div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
								<FilterTab label="Semua" active={contactFilter === 'all'} count={contacts.length} onClick={() => { setContactFilter('all'); loadContacts(contactSearch, 'all'); }} />
								<FilterTab label="Internal" active={contactFilter === 'dpmd'} count={contacts.filter(c => ROLE_GROUPS.dpmd.includes(c.role)).length} onClick={() => { setContactFilter('dpmd'); loadContacts(contactSearch, 'dpmd'); }} />
								<FilterTab label="Desa" active={contactFilter === 'desa'} count={contacts.filter(c => c.role === 'desa' && c.status_pemerintahan === 'desa').length} onClick={() => { setContactFilter('desa'); loadContacts(contactSearch, 'desa'); }} />
								<FilterTab label="Kelurahan" active={contactFilter === 'kelurahan'} count={contacts.filter(c => c.role === 'desa' && c.status_pemerintahan === 'kelurahan').length} onClick={() => { setContactFilter('kelurahan'); loadContacts(contactSearch, 'kelurahan'); }} />
								<FilterTab label="Kecamatan" active={contactFilter === 'kecamatan'} count={contacts.filter(c => ROLE_GROUPS.kecamatan.includes(c.role)).length} onClick={() => { setContactFilter('kecamatan'); loadContacts(contactSearch, 'kecamatan'); }} />
								<FilterTab label="Dinas" active={contactFilter === 'dinas'} count={contacts.filter(c => ROLE_GROUPS.dinas.includes(c.role)).length} onClick={() => { setContactFilter('dinas'); loadContacts(contactSearch, 'dinas'); }} />
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
										onClick={() => selectConversation(conv)} isOnline={isOnline(conv.other_user?.id)}
										onDelete={deleteConversation} />
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

			{/* ── RIGHT PANEL - CHAT (mobile: animated overlay, desktop: flex panel) ── */}
			{/* Desktop always-visible panel */}
			<div className={`hidden md:flex flex-1 flex-col bg-slate-50`}>
				{activeConv ? (
					<>
						{/* Chat header */}
						<div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center gap-3 flex-shrink-0">
							{activeConv.is_group ? (
								<button onClick={openGroupInfo} className="relative flex-shrink-0">
									{activeConv.group_avatar ? (
										<img src={`${API_URL}/${activeConv.group_avatar}`} alt="" style={{ width: 44, height: 44 }} className="rounded-full object-cover" />
									) : (
										<div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
											className="rounded-full text-white flex items-center justify-center font-semibold">
											<FiUsers size={20} />
										</div>
									)}
								</button>
							) : (
								<Avatar user={activeConv.other_user} online={isOnline(activeConv.other_user?.id)} />
							)}
							<div className="flex-1 min-w-0" onClick={activeConv.is_group ? openGroupInfo : undefined} role={activeConv.is_group ? 'button' : undefined}>
								<h3 className="font-semibold text-[15px] text-slate-800 truncate">
									{activeConv.is_group ? activeConv.group_name : displayName(activeConv.other_user)}
								</h3>
								<p className="text-[12px] text-slate-400 truncate leading-tight mt-0.5">
									{typingUser ? (
										<span className="text-emerald-500 font-medium">{activeConv.is_group ? `${typingUser} sedang mengetik...` : 'sedang mengetik...'}</span>
									) : activeConv.is_group ? (
										<span className="text-slate-400">{activeConv.member_count || activeConv.members?.length || 0} anggota</span>
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
							{activeConv.is_group && (
								<button onClick={openGroupInfo}
									className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex-shrink-0" title="Info Grup">
									<FiInfo size={20} />
								</button>
							)}
						</div>

						{/* Messages area */}
						<div className="flex-1 relative overflow-hidden">
							<div ref={!mobileChat ? containerRef : undefined} onScroll={!mobileChat ? handleScroll : undefined}
								className="absolute inset-0 overflow-y-auto overflow-x-hidden px-8 lg:px-16 py-4 chat-bg">
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
											onDelete={deleteMessage} isGroup={activeConv?.is_group}
											onReply={handleReply} onReact={handleReact} currentUserId={currentUser.id} />
									)
								)}
								{typingUser && <TypingDots />}
								<div ref={!mobileChat ? endRef : undefined} />
							</div>

							<AnimatePresence>
								{showScrollBtn && !mobileChat && (
									<motion.button
										initial={{ opacity: 0, scale: 0.8, y: 10 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.8, y: 10 }}
										onClick={scrollToBottom}
										className="absolute bottom-3 right-4 bg-white p-2.5 rounded-full shadow-lg shadow-slate-900/10 border border-slate-200 hover:bg-slate-50 transition-colors z-10">
										<FiChevronDown size={18} className="text-slate-600" />
									</motion.button>
								)}
							</AnimatePresence>
						</div>

						{/* Input area */}
						<div className="relative px-4 py-3 bg-white border-t border-slate-100 flex-shrink-0">
							{/* Reply preview banner */}
							<AnimatePresence>
								{replyTo && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										className="mb-2 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
									>
										<div className="flex items-center gap-2 px-3 py-2">
											<div className="w-1 h-8 bg-emerald-500 rounded-full flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<p className="text-[10px] font-semibold text-emerald-600">{replyTo.sender?.name || 'Unknown'}</p>
												<p className="text-[11px] text-slate-500 truncate">
													{replyTo.message_type === 'image' ? '📷 Foto' : replyTo.message_type === 'file' ? `📎 ${replyTo.file_name || 'File'}` : replyTo.content}
												</p>
											</div>
											<button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0">
												<FiX size={14} className="text-slate-400" />
											</button>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
							{showEmoji && <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />}
							<AnimatePresence>
								{showEmoji && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 10 }}
										className="absolute bottom-full right-0 z-20 pb-2"
									>
										<Suspense fallback={<div className="h-[400px] w-[350px] bg-[#222] rounded-xl flex items-center justify-center"><FiLoader className="animate-spin text-slate-400" size={20}/></div>}>
											<EmojiPicker onEmojiClick={onEmojiClick} width={350} height={400} searchPlaceholder="Cari emoji..." emojiStyle="native" theme="dark" autoFocusSearch={false} categories={EMOJI_CATEGORIES} lazyLoadEmojis previewConfig={{ showPreview: false }} skinTonesDisabled />
										</Suspense>
									</motion.div>
								)}
							</AnimatePresence>
							<div className="flex items-end gap-2">
								<button onClick={() => fileRef.current?.click()}
									className="p-2.5 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50/80 transition-all flex-shrink-0" title="Lampiran">
									<FiPaperclip size={20} />
								</button>
								<button onClick={() => setShowEmoji(v => !v)}
									className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${showEmoji ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80'}`} title="Emoji">
									<FiSmile size={20} />
								</button>
								<input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" />
								<div className="flex-1 min-w-0">
									<textarea ref={inputRef} value={inputText} onChange={handleInput} onKeyDown={handleKeyDown}
										onFocus={() => setShowEmoji(false)}
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

			{/* Mobile chat overlay - slides from right */}
			<AnimatePresence>
			{mobileChat && (
			<motion.div
				key="mobile-chat"
				initial={{ x: '100%' }}
				animate={{ x: 0 }}
				exit={{ x: '100%' }}
				transition={{ type: 'tween', duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
				className="absolute inset-0 md:hidden flex flex-col bg-slate-50 z-10"
			>
				{activeConv && (
					<>
						{/* Chat header - mobile */}
						<div className="px-3 pb-2.5 bg-white border-b border-slate-100 flex items-center gap-2.5 flex-shrink-0" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top))' }}>
							<button onClick={() => setMobileChat(false)}
								className="p-1.5 text-slate-500 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-all flex-shrink-0">
								<FiArrowLeft size={20} />
							</button>
							{activeConv.is_group ? (
								<button onClick={openGroupInfo} className="relative flex-shrink-0">
									{activeConv.group_avatar ? (
										<img src={`${API_URL}/${activeConv.group_avatar}`} alt="" style={{ width: 40, height: 40 }} className="rounded-full object-cover" />
									) : (
										<div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
											className="rounded-full text-white flex items-center justify-center font-semibold">
											<FiUsers size={18} />
										</div>
									)}
								</button>
							) : (
								<Avatar user={activeConv.other_user} online={isOnline(activeConv.other_user?.id)} />
							)}
							<div className="flex-1 min-w-0" onClick={activeConv.is_group ? openGroupInfo : undefined}>
								<h3 className="font-semibold text-[15px] text-slate-800 truncate">
									{activeConv.is_group ? activeConv.group_name : displayName(activeConv.other_user)}
								</h3>
								<p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">
									{typingUser ? (
										<span className="text-emerald-500 font-medium">sedang mengetik...</span>
									) : isOnline(activeConv.other_user?.id) ? (
										<span className="text-emerald-600 font-medium">Online</span>
									) : activeConv.other_user?.last_active_at ? (
										`terakhir dilihat ${lastSeenText(activeConv.other_user.last_active_at)}`
									) : activeConv.is_group ? (
										`${activeConv.member_count || 0} anggota`
									) : (
										<span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-medium ${ROLE_COLORS[activeConv.other_user?.role] || ''}`}>
											{ROLE_LABELS[activeConv.other_user?.role] || ''}
										</span>
									)}
								</p>
							</div>
							{activeConv.is_group && (
								<button onClick={openGroupInfo}
									className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all flex-shrink-0">
									<FiInfo size={18} />
								</button>
							)}
						</div>

						{/* Messages area - mobile */}
						<div className="flex-1 relative overflow-hidden">
							<div ref={mobileChat ? containerRef : undefined} onScroll={mobileChat ? handleScroll : undefined}
								className="absolute inset-0 overflow-y-auto overflow-x-hidden px-3 py-4 chat-bg">
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
											onDelete={deleteMessage} isGroup={activeConv?.is_group}
											onReply={handleReply} onReact={handleReact} currentUserId={currentUser.id} />
									)
								)}
								{typingUser && <TypingDots />}
								<div ref={mobileChat ? endRef : undefined} />
							</div>

							<AnimatePresence>
								{showScrollBtn && mobileChat && (
									<motion.button
										initial={{ opacity: 0, scale: 0.8, y: 10 }}
										animate={{ opacity: 1, scale: 1, y: 0 }}
										exit={{ opacity: 0, scale: 0.8, y: 10 }}
										onClick={scrollToBottom}
										className="absolute bottom-3 right-4 bg-white p-2.5 rounded-full shadow-lg shadow-slate-900/10 border border-slate-200 hover:bg-slate-50 transition-colors z-10">
										<FiChevronDown size={18} className="text-slate-600" />
									</motion.button>
								)}
							</AnimatePresence>
						</div>

						{/* Input area - mobile */}
						<div className="relative px-3 pt-2 pb-3 bg-white border-t border-slate-100 flex-shrink-0 safe-area-bottom">
							{/* Reply preview banner - mobile */}
							<AnimatePresence>
								{replyTo && (
									<motion.div
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										className="mb-2 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden"
									>
										<div className="flex items-center gap-2 px-3 py-2">
											<div className="w-1 h-8 bg-emerald-500 rounded-full flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<p className="text-[10px] font-semibold text-emerald-600">{replyTo.sender?.name || 'Unknown'}</p>
												<p className="text-[11px] text-slate-500 truncate">
													{replyTo.message_type === 'image' ? '📷 Foto' : replyTo.message_type === 'file' ? `📎 ${replyTo.file_name || 'File'}` : replyTo.content}
												</p>
											</div>
											<button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors flex-shrink-0">
												<FiX size={14} className="text-slate-400" />
											</button>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
							{showEmoji && <div className="fixed inset-0 z-10" onClick={() => setShowEmoji(false)} />}
							<AnimatePresence>
								{showEmoji && (
									<motion.div
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 10 }}
										className="absolute bottom-full right-0 left-0 z-20 pb-2 flex justify-center"
									>
										<Suspense fallback={<div className="h-[350px] w-full bg-[#222] rounded-xl flex items-center justify-center"><FiLoader className="animate-spin text-slate-400" size={20}/></div>}>
											<EmojiPicker onEmojiClick={onEmojiClick} width="100%" height={350} searchPlaceholder="Cari emoji..." emojiStyle="native" theme="dark" autoFocusSearch={false} categories={EMOJI_CATEGORIES} lazyLoadEmojis previewConfig={{ showPreview: false }} skinTonesDisabled />
										</Suspense>
									</motion.div>
								)}
							</AnimatePresence>
							<div className="flex items-end gap-1.5">
								<button onClick={() => fileRef.current?.click()}
									className="p-2.5 text-slate-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50/80 transition-all flex-shrink-0">
									<FiPaperclip size={20} />
								</button>
								<button onClick={() => setShowEmoji(v => !v)}
									className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${showEmoji ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/80'}`}>
									<FiSmile size={20} />
								</button>
								<input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar" />
								<div className="flex-1 min-w-0">
									<textarea ref={inputRef} value={inputText} onChange={handleInput} onKeyDown={handleKeyDown}
										onFocus={() => setShowEmoji(false)}
										placeholder="Tulis pesan..." rows={1}
										className="w-full px-3.5 py-2.5 bg-slate-50 rounded-2xl text-[14px] focus:outline-none border border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 resize-none max-h-28 leading-5 transition-all placeholder:text-slate-400"
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
				)}
			</motion.div>
			)}
			</AnimatePresence>

			{/* ── GROUP CREATE MODAL ── */}
			<AnimatePresence>
				{showGroupCreate && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
						onClick={() => setShowGroupCreate(false)}
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-xl"
						>
							{/* Modal header */}
							<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
								<h3 className="text-lg font-bold text-slate-800">Buat Grup Baru</h3>
								<button onClick={() => setShowGroupCreate(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
									<FiX size={20} />
								</button>
							</div>

							{/* Group name input */}
							<div className="px-5 pt-4 pb-3 flex-shrink-0">
								<input type="text" placeholder="Nama grup..." value={groupName}
									onChange={(e) => setGroupName(e.target.value)}
									maxLength={100}
									className="w-full px-4 py-2.5 bg-slate-50 rounded-xl text-[14px] focus:outline-none border border-slate-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/10" autoFocus />
							</div>

							{/* Selected members */}
							{selectedMembers.length > 0 && (
								<div className="px-5 pb-2 flex-shrink-0">
									<div className="flex flex-wrap gap-1.5">
										{selectedMembers.map(m => (
											<span key={m.id} className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-[11px] font-medium px-2.5 py-1 rounded-full">
												{m.name?.split(' ')[0]}
												<button onClick={() => toggleMemberSelect(m)} className="hover:text-violet-900">
													<FiX size={12} />
												</button>
											</span>
										))}
									</div>
								</div>
							)}

							{/* Contact search */}
							<div className="px-5 pb-2 flex-shrink-0">
								<div className="relative">
									<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
									<input type="text" placeholder="Cari kontak..." value={contactSearch}
										onChange={(e) => { setContactSearch(e.target.value); loadContacts(e.target.value, contactFilter); }}
										className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl text-[13px] focus:outline-none border border-transparent focus:border-violet-300" />
								</div>
							</div>

							{/* Contact list */}
							<div className="flex-1 overflow-y-auto px-2 min-h-0">
								{contacts.map(c => {
									const selected = selectedMembers.some(m => m.id === c.id);
									return (
										<button key={c.id} onClick={() => toggleMemberSelect(c)}
											className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${selected ? 'bg-violet-50' : 'hover:bg-slate-50'}`}>
											<Avatar user={c} size="sm" />
											<div className="flex-1 min-w-0">
												<p className="text-[13px] text-slate-800 truncate font-medium">{displayName(c)}</p>
												<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[c.role] || 'bg-slate-100 text-slate-500'}`}>
													{ROLE_LABELS[c.role] || c.role}
												</span>
											</div>
											<div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${selected ? 'bg-violet-600 border-violet-600' : 'border-slate-300'}`}>
												{selected && <FiCheck size={12} className="text-white" />}
											</div>
										</button>
									);
								})}
							</div>

							{/* Create button */}
							<div className="px-5 py-4 border-t border-slate-100 flex-shrink-0">
								<button onClick={createGroup}
									disabled={sending}
									className="w-full py-2.5 bg-violet-600 text-white rounded-xl font-semibold text-[14px] hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all">
									{sending ? 'Membuat...' : `Buat Grup (${selectedMembers.length} anggota)`}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* ── GROUP INFO SLIDE-OVER ── */}
			<AnimatePresence>
				{showGroupInfo && activeConv?.is_group && (
					<motion.div
						initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/40 z-50 flex justify-end"
						onClick={() => setShowGroupInfo(false)}
					>
						<motion.div
							initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
							transition={{ type: 'spring', damping: 25, stiffness: 300 }}
							onClick={(e) => e.stopPropagation()}
							className="bg-white w-full max-w-sm h-full flex flex-col shadow-xl"
						>
							{/* Header */}
							<div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
								<h3 className="text-lg font-bold text-slate-800">Info Grup</h3>
								<button onClick={() => setShowGroupInfo(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
									<FiX size={20} />
								</button>
							</div>

							{/* Group avatar + name */}
							<div className="px-5 py-6 text-center border-b border-slate-100 flex-shrink-0">
								<div className="relative w-20 h-20 mx-auto mb-3">
									{activeConv.group_avatar ? (
										<img src={`${API_URL}/${activeConv.group_avatar}`} alt="" className="w-20 h-20 rounded-full object-cover" />
									) : (
										<div className="w-20 h-20 rounded-full flex items-center justify-center text-white"
											style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}>
											<FiUsers size={32} />
										</div>
									)}
									{isGroupAdmin && (
										<button onClick={() => groupAvatarRef.current?.click()}
											className="absolute bottom-0 right-0 w-7 h-7 bg-violet-600 hover:bg-violet-700 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white transition-colors">
											<FiCamera size={13} />
										</button>
									)}
									<input ref={groupAvatarRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadGroupAvatar} className="hidden" />
								</div>
								<h4 className="text-lg font-bold text-slate-800">{activeConv.group_name}</h4>
								<p className="text-sm text-slate-400 mt-1">Grup · {groupMembers.length} anggota</p>
							</div>

							{/* Members */}
							<div className="flex-1 overflow-y-auto min-h-0">
								<div className="px-5 py-3 flex items-center justify-between sticky top-0 bg-white z-10">
									<h5 className="text-[13px] font-semibold text-slate-600">Anggota ({groupMembers.length})</h5>
									{isGroupAdmin && (
										<button onClick={() => { setShowAddMembers(true); loadContacts(); }}
											className="text-[12px] text-violet-600 font-semibold flex items-center gap-1 hover:text-violet-700">
											<FiUserPlus size={14} /> Tambah
										</button>
									)}
								</div>

								{/* Add members inline */}
								{showAddMembers && (
									<div className="px-5 pb-3">
										<div className="bg-slate-50 rounded-xl p-3">
											<div className="relative mb-2">
												<FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
												<input type="text" placeholder="Cari..." value={contactSearch}
													onChange={(e) => { setContactSearch(e.target.value); loadContacts(e.target.value); }}
													className="w-full pl-8 pr-3 py-1.5 bg-white rounded-lg text-[12px] border border-slate-200 focus:outline-none focus:border-violet-300" autoFocus />
											</div>
											<div className="max-h-40 overflow-y-auto space-y-0.5">
												{contacts.filter(c => !groupMembers.some(m => m.id === c.id)).map(c => (
													<button key={c.id} onClick={() => addMembersToGroup([c.id])}
														className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-white transition-all">
														<Avatar user={c} size="sm" />
														<span className="text-[12px] text-slate-700 truncate flex-1">{c.name}</span>
														<FiPlus size={14} className="text-violet-500 flex-shrink-0" />
													</button>
												))}
											</div>
											<button onClick={() => setShowAddMembers(false)} className="w-full text-[11px] text-slate-400 mt-2 hover:text-slate-600">Tutup</button>
										</div>
									</div>
								)}

								{/* Member list */}
								<div className="px-3">
									{groupMembers.map(member => (
										<div key={member.id} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-slate-50 transition-all">
											<Avatar user={member} size="sm" online={isOnline(member.id)} />
											<div className="flex-1 min-w-0">
												<p className="text-[13px] font-medium text-slate-800 truncate">
													{member.name}{member.id === currentUser.id ? ' (Anda)' : ''}
												</p>
												<div className="flex items-center gap-1.5">
													<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ROLE_COLORS[member.role] || 'bg-slate-100 text-slate-500'}`}>
														{ROLE_LABELS[member.role] || member.role}
													</span>
													{member.participant_role === 'admin' && (
														<span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-600">Admin</span>
													)}
												</div>
											</div>
											{isGroupAdmin && member.id !== currentUser.id && (
												<button onClick={() => removeMemberFromGroup(member.id)}
													className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-all" title="Keluarkan">
													<FiX size={14} />
												</button>
											)}
										</div>
									))}
								</div>
							</div>

							{/* Actions */}
							<div className="px-5 py-4 border-t border-slate-100 space-y-2 flex-shrink-0">
								<button onClick={leaveGroup}
									className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-500 hover:bg-red-50 font-medium text-[14px] transition-all border border-red-200">
									<FiLogOut size={16} /> Keluar Grup
								</button>
								{isGroupAdmin && (
									<button onClick={() => deleteConversation(activeConv.id)}
										className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-red-600 hover:bg-red-100 font-medium text-[14px] transition-all border border-red-300">
										<FiTrash2 size={16} /> Hapus Grup
									</button>
								)}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>

			{confirmDialog}
		</div>
	);
}
