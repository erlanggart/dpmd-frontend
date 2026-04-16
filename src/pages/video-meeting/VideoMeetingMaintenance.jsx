import { FiVideo, FiTool } from "react-icons/fi";

const VideoMeetingMaintenance = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8 max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <FiVideo className="w-20 h-20 text-gray-300" />
            <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1">
              <FiTool className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-700 mb-3">
          Video Meeting dalam Pemeliharaan
        </h1>
        <p className="text-gray-500 mb-6">
          Fitur video meeting sedang dalam proses pemeliharaan dan peningkatan.
          Silakan gunakan fitur komunikasi lainnya untuk sementara waktu.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
          Kami akan menginformasikan kembali ketika fitur ini sudah tersedia.
        </div>
        <button
          onClick={() => window.history.back()}
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Kembali
        </button>
      </div>
    </div>
  );
};

export default VideoMeetingMaintenance;
