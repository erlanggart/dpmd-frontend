import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RuangPribadi from '../../components/tugas/RuangPribadi';

const RuangPribadiPage = () => {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <button type="button" onClick={() => navigate('/dpmd/dashboard')} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900">
        <ArrowLeft className="h-4 w-4" /> Dashboard
      </button>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Ruang Pribadi</h1>
      <p className="mt-1 text-sm text-slate-500">Daftar tugas dan catatan pribadi Anda. Hanya Anda yang dapat melihatnya.</p>
      <div className="mt-6"><RuangPribadi halaman /></div>
    </div>
  );
};

export default RuangPribadiPage;
