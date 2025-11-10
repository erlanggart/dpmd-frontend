import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Chart Options
const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        padding: 20,
        usePointStyle: true,
        pointStyle: 'circle',
        font: {
          size: 12,
          family: "'Inter', sans-serif",
          weight: '500'
        },
        boxWidth: 12,
        boxHeight: 12
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      padding: 16,
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        size: 13
      },
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      displayColors: true,
      boxWidth: 12,
      boxHeight: 12,
      usePointStyle: true,
      callbacks: {
        label: function(context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += new Intl.NumberFormat('id-ID').format(context.parsed.y);
          }
          return label;
        }
      }
    }
  },
  animation: {
    duration: 1000,
    easing: 'easeInOutQuart'
  }
};

// Enhanced Color schemes with gradients
const colors = {
  primary: 'rgba(59, 130, 246, 0.8)', // blue-500
  primaryGradient: ['rgba(59, 130, 246, 0.9)', 'rgba(37, 99, 235, 0.7)'],
  success: 'rgba(34, 197, 94, 0.8)', // green-500
  successGradient: ['rgba(34, 197, 94, 0.9)', 'rgba(22, 163, 74, 0.7)'],
  danger: 'rgba(239, 68, 68, 0.8)', // red-500
  dangerGradient: ['rgba(239, 68, 68, 0.9)', 'rgba(220, 38, 38, 0.7)'],
  warning: 'rgba(245, 158, 11, 0.8)', // amber-500
  warningGradient: ['rgba(245, 158, 11, 0.9)', 'rgba(217, 119, 6, 0.7)'],
  info: 'rgba(99, 102, 241, 0.8)', // indigo-500
  purple: 'rgba(168, 85, 247, 0.8)', // purple-500
  pink: 'rgba(236, 72, 153, 0.8)', // pink-500
  slate: 'rgba(100, 116, 139, 0.8)', // slate-500
  teal: 'rgba(20, 184, 166, 0.8)', // teal-500
  cyan: 'rgba(6, 182, 212, 0.8)', // cyan-500
  orange: 'rgba(249, 115, 22, 0.8)', // orange-500
};

const chartColors = [
  'rgba(59, 130, 246, 0.85)',   // blue
  'rgba(34, 197, 94, 0.85)',    // green
  'rgba(245, 158, 11, 0.85)',   // amber
  'rgba(239, 68, 68, 0.85)',    // red
  'rgba(99, 102, 241, 0.85)',   // indigo
  'rgba(168, 85, 247, 0.85)',   // purple
  'rgba(236, 72, 153, 0.85)',   // pink
  'rgba(20, 184, 166, 0.85)',   // teal
  'rgba(249, 115, 22, 0.85)',   // orange
  'rgba(6, 182, 212, 0.85)',    // cyan
  'rgba(132, 204, 22, 0.85)',   // lime
  'rgba(234, 179, 8, 0.85)',    // yellow
];

// 1. BUMDes by Kecamatan Chart (Bar Chart) - Enhanced with percentages
export const BumdesByKecamatanChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  
  const chartData = {
    labels: data.map(item => {
      const kec = item.kecamatan.length > 12 ? item.kecamatan.substring(0, 12) + '...' : item.kecamatan;
      const percentage = ((item.total / total) * 100).toFixed(1);
      return `${kec} (${percentage}%)`;
    }),
    datasets: [
      {
        label: 'Total BUMDes',
        data: data.map(item => item.total),
        backgroundColor: data.map((_, index) => chartColors[index % chartColors.length]),
        borderColor: data.map((_, index) => chartColors[index % chartColors.length].replace('0.85', '1')),
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 'flex',
        maxBarThickness: 60,
      }
    ]
  };

  const options = {
    ...defaultOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          stepSize: 1,
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11,
            weight: '500'
          },
          color: '#334155'
        }
      }
    },
    plugins: {
      ...defaultOptions.plugins,
      title: {
        display: true,
        text: 'Distribusi BUMDes per Kecamatan',
        font: {
          size: 16,
          weight: 'bold',
          family: "'Inter', sans-serif"
        },
        color: '#1e293b',
        padding: {
          top: 15,
          bottom: 25
        }
      },
      legend: {
        display: false
      },
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const value = context.parsed.x;
            const percentage = ((value / total) * 100).toFixed(1);
            return `Total: ${value} BUMDes (${percentage}%)`;
          },
          afterLabel: function(context) {
            const item = data[context.dataIndex];
            return [
              `Aktif: ${item.aktif}`,
              `Tidak Aktif: ${item.tidak_aktif}`
            ];
          }
        }
      }
    }
  };

  return (
    <div className="h-[600px] p-6">
      <Bar data={chartData} options={options} />
    </div>
  );
};

// 2. BUMDes by Jenis Usaha Chart (Doughnut Chart) - Enhanced with percentages and values
export const BumdesByJenisUsahaChart = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.total, 0);
  
  const chartData = {
    labels: data.map(item => item.jenis_usaha),
    datasets: [
      {
        label: 'Jumlah BUMDes',
        data: data.map(item => item.total),
        backgroundColor: chartColors,
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      }
    ]
  };

  const options = {
    ...defaultOptions,
    cutout: '65%',
    plugins: {
      ...defaultOptions.plugins,
      title: {
        display: true,
        text: 'Distribusi Jenis Usaha BUMDes',
        font: {
          size: 16,
          weight: 'bold',
          family: "'Inter', sans-serif"
        },
        color: '#1e293b',
        padding: {
          top: 15,
          bottom: 25
        }
      },
      legend: {
        position: 'right',
        labels: {
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 11,
            weight: '500'
          },
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label, i) => {
              const value = datasets[0].data[i];
              const percentage = ((value / total) * 100).toFixed(1);
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: datasets[0].backgroundColor[i],
                hidden: false,
                index: i,
                strokeStyle: datasets[0].borderColor,
                lineWidth: 2
              };
            });
          }
        }
      },
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} BUMDes (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="h-96 p-6 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
};

// 3. BUMDes Trend by Year (Line Chart)
export const BumdesTrendChart = ({ data }) => {
  const chartData = {
    labels: data.map(item => item.tahun),
    datasets: [
      {
        label: 'Jumlah BUMDes Didirikan',
        data: data.map(item => item.total),
        fill: true,
        backgroundColor: colors.primaryLight,
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: 'rgba(59, 130, 246, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }
    ]
  };

  const options = {
    ...defaultOptions,
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          stepSize: 1
        }
      }
    },
    plugins: {
      ...defaultOptions.plugins,
      title: {
        display: true,
        text: 'Tren Pendirian BUMDes per Tahun',
        font: {
          size: 16,
          weight: 'bold',
          family: "'Inter', sans-serif"
        },
        color: '#1e293b',
        padding: {
          top: 15,
          bottom: 25
        }
      }
    }
  };

  return (
    <div className="h-80 p-4">
      <Line data={chartData} options={options} />
    </div>
  );
};

// 4. Status BUMDes Chart (Pie Chart) - Enhanced with center text
export const BumdesStatusChart = ({ data }) => {
  const total = data.aktif + data.tidak_aktif;
  const aktifPercentage = ((data.aktif / total) * 100).toFixed(1);
  const tidakAktifPercentage = ((data.tidak_aktif / total) * 100).toFixed(1);

  const chartData = {
    labels: ['Aktif', 'Tidak Aktif'],
    datasets: [
      {
        label: 'Status BUMDes',
        data: [data.aktif, data.tidak_aktif],
        backgroundColor: ['rgba(34, 197, 94, 0.9)', 'rgba(239, 68, 68, 0.9)'],
        borderColor: '#fff',
        borderWidth: 3,
        hoverBorderWidth: 4,
        hoverOffset: 15,
      }
    ]
  };

  const options = {
    ...defaultOptions,
    plugins: {
      ...defaultOptions.plugins,
      title: {
        display: true,
        text: 'Status Operasional BUMDes',
        font: {
          size: 16,
          weight: 'bold',
          family: "'Inter', sans-serif"
        },
        color: '#1e293b',
        padding: {
          top: 15,
          bottom: 25
        }
      },
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
          font: {
            size: 13,
            weight: '500'
          },
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return chart.data.labels.map((label, i) => {
              const value = datasets[0].data[i];
              const percentage = i === 0 ? aktifPercentage : tidakAktifPercentage;
              return {
                text: `${label}: ${value} (${percentage}%)`,
                fillStyle: datasets[0].backgroundColor[i],
                hidden: false,
                index: i,
                strokeStyle: datasets[0].borderColor,
                lineWidth: 2
              };
            });
          }
        }
      },
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const value = context.parsed;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} BUMDes (${percentage}%)`;
          }
        }
      }
    }
  };

  return (
    <div className="h-96 p-6 relative">
      <Pie data={chartData} options={options} />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <div className="text-3xl font-bold text-slate-800">{total}</div>
        <div className="text-sm text-slate-600">Total BUMDes</div>
      </div>
    </div>
  );
};

// 5. Workforce Distribution Chart (Bar Chart)
export const WorkforceChart = ({ data }) => {
  // Check if gender breakdown data is available
  const hasGenderData = data.laki_laki > 0 || data.perempuan > 0;
  
  const chartData = hasGenderData ? {
    labels: ['Tenaga Kerja'],
    datasets: [
      {
        label: 'Laki-laki',
        data: [data.laki_laki],
        backgroundColor: colors.primary,
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: 'Perempuan',
        data: [data.perempuan],
        backgroundColor: colors.pink,
        borderColor: 'rgba(236, 72, 153, 1)',
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  } : {
    labels: ['Total Tenaga Kerja'],
    datasets: [
      {
        label: 'Jumlah Pekerja',
        data: [data.total_tenaga_kerja || 0],
        backgroundColor: colors.primary,
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  };

  const options = {
    ...defaultOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      y: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      ...defaultOptions.plugins,
      title: {
        display: true,
        text: hasGenderData ? 'Distribusi Tenaga Kerja BUMDes' : 'Total Tenaga Kerja BUMDes',
        font: {
          size: 14,
          weight: 'bold'
        },
        padding: {
          top: 10,
          bottom: 20
        }
      }
    }
  };

  return (
    <div className="h-64 p-4">
      <Bar data={chartData} options={options} />
    </div>
  );
};

// 6. Top Kecamatan Chart (Horizontal Bar) - Enhanced with icons
export const TopKecamatanChart = ({ data }) => {
  // Sort and take top 10
  const topData = [...data].sort((a, b) => b.total - a.total).slice(0, 10);
  const maxValue = Math.max(...topData.map(item => item.total));

  const chartData = {
    labels: topData.map((item, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      return `${medal} ${item.kecamatan}`;
    }),
    datasets: [
      {
        label: 'Jumlah BUMDes',
        data: topData.map(item => item.total),
        backgroundColor: topData.map((item, index) => {
          if (index === 0) return 'rgba(251, 191, 36, 0.9)'; // gold
          if (index === 1) return 'rgba(156, 163, 175, 0.9)'; // silver
          if (index === 2) return 'rgba(205, 127, 50, 0.9)'; // bronze
          return chartColors[index % chartColors.length];
        }),
        borderColor: topData.map((item, index) => {
          if (index === 0) return 'rgba(251, 191, 36, 1)';
          if (index === 1) return 'rgba(156, 163, 175, 1)';
          if (index === 2) return 'rgba(205, 127, 50, 1)';
          return chartColors[index % chartColors.length].replace('0.85', '1');
        }),
        borderWidth: 2,
        borderRadius: 8,
        barThickness: 'flex',
        maxBarThickness: 50,
      }
    ]
  };

  const options = {
    ...defaultOptions,
    indexAxis: 'y',
    scales: {
      x: {
        beginAtZero: true,
        max: maxValue + 2,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          stepSize: 1,
          font: {
            size: 11,
            weight: '500'
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 12,
            weight: '600'
          },
          color: '#1e293b'
        }
      }
    },
    plugins: {
      ...defaultOptions.plugins,
      title: {
        display: true,
        text: '🏆 Top 10 Kecamatan dengan BUMDes Terbanyak',
        font: {
          size: 16,
          weight: 'bold',
          family: "'Inter', sans-serif"
        },
        color: '#1e293b',
        padding: {
          top: 15,
          bottom: 25
        }
      },
      legend: {
        display: false
      },
      tooltip: {
        ...defaultOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const item = topData[context.dataIndex];
            return [
              `Total: ${item.total} BUMDes`,
              `Aktif: ${item.aktif}`,
              `Tidak Aktif: ${item.tidak_aktif}`
            ];
          }
        }
      }
    }
  };

  return (
    <div className="h-[500px] p-6">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default {
  BumdesByKecamatanChart,
  BumdesByJenisUsahaChart,
  BumdesTrendChart,
  BumdesStatusChart,
  WorkforceChart,
  TopKecamatanChart
};
