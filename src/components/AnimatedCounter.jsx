// src/components/AnimatedCounter.jsx
import React, { useState, useEffect } from 'react';
import { useSpring, animated } from '@react-spring/web'; // Import dari react-spring

const AnimatedCounter = ({ endValue, duration = 1500 }) => {
    const [value, setValue] = useState(0);

    const { number } = useSpring({
        from: { number: 0 },
        number: parseFloat(endValue.replace(/[^0-9.-]+/g,"")), // Bersihkan string untuk angka
        delay: 200,
        config: { mass: 1, tension: 20, friction: 10 },
        onRest: () => setValue(parseFloat(endValue.replace(/[^0-9.-]+/g,""))), // Pastikan nilai akhir tercapai
    });

    // Mengembalikan angka ke format string aslinya setelah animasi
    const formatValue = (num) => {
        const originalValue = endValue.replace(/[^0-9.-]+/g,""); // Angka asli tanpa simbol
        const isDecimal = originalValue.includes('.');

        let formattedNum;
        if (isDecimal) {
            formattedNum = num.toFixed(1); // Sesuaikan presisi desimal jika diperlukan
        } else {
            formattedNum = Math.round(num);
        }

        // Tambahkan kembali simbol mata uang atau format lain jika ada
        if (endValue.startsWith('Rp ')) {
            return `Rp ${formattedNum.toLocaleString('id-ID')}${isDecimal ? (num % 1 !== 0 ? '' : '.0') : ''}`;
        }
        if (endValue.endsWith('%')) {
            return `${formattedNum}%`;
        }
        return formattedNum.toLocaleString('id-ID');
    };

    return <animated.span>{number.to((n) => formatValue(n))}</animated.span>;
};

export default AnimatedCounter;