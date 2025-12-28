// src/components/JadwalKalenderView.jsx
import React, { useState, useMemo } from 'react';
import { 
LuChevronLeft, 
LuChevronRight, 
LuCalendar, 
LuMapPin, 
LuClock
} from 'react-icons/lu';

const JadwalKalenderView = ({ jadwals, onEventClick }) => {
	const [currentDate, setCurrentDate] = useState(new Date());
	const [showDateModal, setShowDateModal] = useState(false);
	const [selectedDate, setSelectedDate] = useState(null);

	// Debug: log jadwals props
	console.log('📅 JadwalKalenderView - Total jadwals:', jadwals?.length, jadwals);

	// Get month and year info
	const monthNames = [
		'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
		'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
	];

	const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

	const currentMonth = currentDate.getMonth();
	const currentYear = currentDate.getFullYear();

// Calculate calendar days
const { calendarDays, firstDayOfMonth } = useMemo(() => {
const firstDay = new Date(currentYear, currentMonth, 1);
const lastDay = new Date(currentYear, currentMonth + 1, 0);
const daysInMonth = lastDay.getDate();
const startingDayOfWeek = firstDay.getDay();

const days = [];
// Add empty slots for days before the first day of the month
for (let i = 0; i < startingDayOfWeek; i++) {
days.push(null);
}
// Add all days of the month
for (let i = 1; i <= daysInMonth; i++) {
days.push(i);
}

return { calendarDays: days, firstDayOfMonth: startingDayOfWeek };
}, [currentMonth, currentYear]);

	// Group jadwals by date
	const jadwalsByDate = useMemo(() => {
		const grouped = {};
		console.log('🔄 Computing jadwalsByDate for month:', currentMonth, 'year:', currentYear);
		console.log('📊 Input jadwals:', jadwals);
		
		jadwals.forEach(jadwal => {
			const startDate = new Date(jadwal.tanggal_mulai);
			const endDate = new Date(jadwal.tanggal_selesai);
			
			console.log('📅 Processing jadwal:', jadwal.judul, 'from', startDate, 'to', endDate);

			// Add jadwal to all dates in range
			let currentLoop = new Date(startDate);
			while (currentLoop <= endDate) {
				if (currentLoop.getMonth() === currentMonth && currentLoop.getFullYear() === currentYear) {
					const day = currentLoop.getDate();
					if (!grouped[day]) grouped[day] = [];
					grouped[day].push(jadwal);
					console.log('  ✅ Added to day', day);
				}
				currentLoop.setDate(currentLoop.getDate() + 1);
			}
		});
		
		console.log('✅ Final grouped by date:', grouped);
		return grouped;
	}, [jadwals, currentMonth, currentYear]);

// Navigate months
const goToPreviousMonth = () => {
setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
};

const goToNextMonth = () => {
setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
};

const goToToday = () => {
setCurrentDate(new Date());
};

// Check if date is today
const isToday = (day) => {
const today = new Date();
return day === today.getDate() && 
 currentMonth === today.getMonth() && 
 currentYear === today.getFullYear();
};

// Priority badge color
const getPriorityColor = (prioritas) => {
switch(prioritas) {
case 'urgent': return 'bg-red-500 text-white';
case 'tinggi': return 'bg-orange-500 text-white';
case 'sedang': return 'bg-blue-500 text-white';
case 'rendah': return 'bg-gray-400 text-white';
default: return 'bg-gray-500 text-white';
}
};

// Status badge color
const getStatusColor = (status) => {
switch(status) {
case 'approved': return 'border-l-green-500';
case 'pending': return 'border-l-yellow-500';
case 'draft': return 'border-l-gray-400';
case 'rejected': return 'border-l-red-500';
case 'completed': return 'border-l-purple-500';
case 'cancelled': return 'border-l-gray-600';
default: return 'border-l-gray-400';
}
};

	// Handle date click
	const handleDateClick = (day) => {
		console.log('🖱️ Date clicked:', day);
		const eventsForDay = jadwalsByDate[day] || [];
		console.log('📋 Events for day', day, ':', eventsForDay.length, eventsForDay);
		
		if (eventsForDay.length > 0) {
			setSelectedDate(day);
			setShowDateModal(true);
		} else {
			console.log('⚠️ No events for this day');
		}
	};

return (
<div className="bg-white rounded-2xl shadow-sm p-6">
{/* Header */}
<div className="flex items-center justify-between mb-6">
<div>
<h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
<LuCalendar className="w-6 h-6 text-indigo-600" />
{monthNames[currentMonth]} {currentYear}
</h2>
<p className="text-sm text-gray-500 mt-1">
{jadwals.length} kegiatan bulan ini
</p>
</div>

<div className="flex gap-2">
<button
onClick={goToToday}
className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all text-sm font-medium"
>
Hari Ini
</button>
<button
onClick={goToPreviousMonth}
className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
>
<LuChevronLeft className="w-5 h-5" />
</button>
<button
onClick={goToNextMonth}
className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
>
<LuChevronRight className="w-5 h-5" />
</button>
</div>
</div>

{/* Calendar Grid */}
<div className="border border-gray-200 rounded-xl overflow-hidden">
{/* Day names header */}
<div className="grid grid-cols-7 bg-gray-50">
{dayNames.map((day, index) => (
<div 
key={index}
className="p-3 text-center text-sm font-semibold text-gray-600 border-r border-gray-200 last:border-r-0"
>
{day}
</div>
))}
</div>

{/* Calendar days */}
<div className="grid grid-cols-7">
{calendarDays.map((day, index) => {
const eventsForDay = day ? jadwalsByDate[day] || [] : [];
const isTodayDate = day && isToday(day);
const hasEvents = eventsForDay.length > 0;

return (
<div
key={index}
onClick={() => day && handleDateClick(day)}
className={`min-h-[120px] border-r border-b border-gray-200 p-2 ${
!day ? 'bg-gray-50' : hasEvents ? 'bg-white hover:bg-indigo-50 cursor-pointer' : 'bg-white'
} transition-colors`}
>
{day && (
<>
{/* Date number */}
<div className="text-sm font-semibold mb-2">
<span className={`inline-flex items-center justify-center ${
isTodayDate 
? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white w-8 h-8 rounded-full' 
: hasEvents ? 'text-indigo-600 font-bold' : 'text-gray-700'
}`}>
{day}
</span>
</div>

{/* Events preview (max 2) */}
<div className="space-y-1">
{eventsForDay.slice(0, 2).map((jadwal, idx) => (
<div
key={idx}
className={`text-xs p-1 rounded border-l-2 ${getStatusColor(jadwal.status)} bg-gray-50 truncate`}
>
<p className="font-medium text-gray-800 truncate">{jadwal.judul}</p>
</div>
))}
{eventsForDay.length > 2 && (
<div className="text-xs text-indigo-600 font-medium text-center py-1">
+{eventsForDay.length - 2} lainnya
</div>
)}
</div>
</>
)}
</div>
);
})}
</div>
</div>

{/* Legend */}
<div className="mt-6 p-4 bg-gray-50 rounded-xl">
<h4 className="text-sm font-semibold text-gray-700 mb-3">Keterangan</h4>
<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded border-l-4 border-l-green-500 bg-white"></div>
<span className="text-xs text-gray-600">Approved</span>
</div>
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded border-l-4 border-l-yellow-500 bg-white"></div>
<span className="text-xs text-gray-600">Pending</span>
</div>
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded border-l-4 border-l-gray-400 bg-white"></div>
<span className="text-xs text-gray-600">Draft</span>
</div>
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded border-l-4 border-l-purple-500 bg-white"></div>
<span className="text-xs text-gray-600">Completed</span>
</div>
</div>
<p className="text-xs text-gray-500 mt-3 italic"> Klik pada tanggal untuk melihat semua kegiatan</p>
</div>

{/* Date Events Modal */}
{showDateModal && selectedDate && (
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
<div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
{/* Modal Header */}
<div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
<div className="flex items-center justify-between">
<div>
<h3 className="text-xl font-bold text-white flex items-center gap-2">
<LuCalendar className="w-6 h-6" />
Kegiatan - {selectedDate} {monthNames[currentMonth]} {currentYear}
</h3>
<p className="text-indigo-100 text-sm mt-1">
{jadwalsByDate[selectedDate]?.length || 0} kegiatan terjadwal
</p>
</div>
<button
onClick={() => setShowDateModal(false)}
className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
>
<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
</svg>
</button>
</div>
</div>

{/* Modal Body */}
<div className="flex-1 overflow-y-auto p-6">
<div className="space-y-4">
{jadwalsByDate[selectedDate]?.map((jadwal, idx) => (
<div
key={idx}
className={`border-l-4 ${getStatusColor(jadwal.status)} bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer`}
onClick={() => {
setShowDateModal(false);
onEventClick && onEventClick(jadwal);
}}
>
<div className="flex items-start justify-between gap-4">
<div className="flex-1">
<h4 className="font-bold text-gray-800 text-lg mb-2">{jadwal.judul}</h4>
<div className="space-y-2 text-sm text-gray-600">
{jadwal.lokasi && (
<div className="flex items-center gap-2">
<LuMapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
<span>{jadwal.lokasi}</span>
</div>
)}
{jadwal.asal_kegiatan && (
<div className="flex items-center gap-2">
<LuCalendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
<span>Dari: {jadwal.asal_kegiatan}</span>
</div>
)}
<div className="flex items-center gap-2">
<LuClock className="w-4 h-4 text-gray-400 flex-shrink-0" />
<span>
{new Date(jadwal.tanggal_mulai).toLocaleDateString('id-ID')}
{jadwal.tanggal_mulai !== jadwal.tanggal_selesai && 
` - ${new Date(jadwal.tanggal_selesai).toLocaleDateString('id-ID')}`
}
</span>
</div>
</div>
{jadwal.bidang_nama && (
<div className="mt-2 inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
{jadwal.bidang_nama}
</div>
)}
</div>
<div className="flex flex-col items-end gap-2">
<span className={`px-3 py-1 rounded-full text-xs font-bold ${getPriorityColor(jadwal.prioritas)}`}>
{jadwal.prioritas.toUpperCase()}
</span>
<span className="text-xs text-gray-500 capitalize">{jadwal.kategori}</span>
</div>
</div>
</div>
))}
</div>
</div>

{/* Modal Footer */}
<div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
<button
onClick={() => setShowDateModal(false)}
className="w-full px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all font-medium"
>
Tutup
</button>
</div>
</div>
</div>
)}
</div>
);
};

export default JadwalKalenderView;
