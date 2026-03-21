import { useState, useEffect } from "react";
import kelembagaanApi from "../api/kelembagaan";

const useStatistikTahunan = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await kelembagaanApi.getStatistikTahunan();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error("Error fetching statistik tahunan:", err);
        setError("Gagal memuat statistik tahunan");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { data, loading, error };
};

export default useStatistikTahunan;
