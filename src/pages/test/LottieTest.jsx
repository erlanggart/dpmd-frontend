import React from 'react';
import Lottie from 'lottie-react';
import documentAnim from '../../assets/lottie/document.json';

const LottieTest = () => {
  console.log('Document Animation Data:', documentAnim);
  
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">Lottie Animation Test</h1>
        
        <div className="grid grid-cols-2 gap-8">
          {/* Test 1: Basic Lottie */}
          <div className="border-2 border-blue-300 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Basic Lottie (200x200)</h2>
            <div className="w-[200px] h-[200px] bg-gray-50 rounded-lg">
              <Lottie 
                animationData={documentAnim}
                loop={true}
                autoplay={true}
              />
            </div>
          </div>

          {/* Test 2: Small Size */}
          <div className="border-2 border-green-300 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Small Size (64x64)</h2>
            <div className="w-16 h-16 bg-gray-50 rounded-lg">
              <Lottie 
                animationData={documentAnim}
                loop={true}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>

          {/* Test 3: With Background */}
          <div className="border-2 border-purple-300 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">With Gradient BG</h2>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
              <div className="w-12 h-12">
                <Lottie 
                  animationData={documentAnim}
                  loop={true}
                  autoplay={true}
                />
              </div>
            </div>
          </div>

          {/* Test 4: White Background */}
          <div className="border-2 border-orange-300 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">White BG (Card Style)</h2>
            <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-2xl shadow-md flex items-center justify-center">
              <div className="w-12 h-12">
                <Lottie 
                  animationData={documentAnim}
                  loop={true}
                  autoplay={true}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* JSON Data Preview */}
        <div className="mt-8 border-2 border-gray-300 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Animation Data Info</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded font-mono text-sm overflow-auto">
            <pre>{JSON.stringify(documentAnim, null, 2).substring(0, 500)}...</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LottieTest;
