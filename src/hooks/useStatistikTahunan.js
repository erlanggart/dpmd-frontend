import { useState, useEffect } from "react";
import kelembagaanApi from "../api/kelembagaan";

// statusPemerintahan: "desa" | "kelurahan"; kosong = gabungan keduanya.
const useStatistikTahunan = (statusPemerintahan) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Respons tab lama yang datang belakangan tidak boleh menimpa tab yang sedang dibuka.
    let batal = false;
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await kelembagaanApi.getStatistikTahunan(statusPemerintahan);
        if (!batal && res.success) setData(res.data);
      } catch (err) {
        console.error("Error fetching statistik tahunan:", err);
        if (!batal) setError("Gagal memuat statistik tahunan");
      } finally {
        if (!batal) setLoading(false);
      }
    };
    fetchData();
    return () => { batal = true; };
  }, [statusPemerintahan]);

  return { data, loading, error };
};

export default useStatistikTahunan;
