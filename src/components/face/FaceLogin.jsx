import React, { useState, useRef, useEffect } from 'react';
import { 
  FaceSmileIcon,
  EyeIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { faceAPIService } from '../../utils/face/faceAPI';
import { cameraService } from '../../utils/face/cameraService';
import api from '../../api';

const FaceLogin = ({ onSuccess, onError, className = '', demoMode = false }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, initializing, ready, scanning, verifying, success, error
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentFaceData, setCurrentFaceData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [livenessStatus, setLivenessStatus] = useState('waiting'); // waiting, detecting, passed, failed
  const [scanProgress, setScanProgress] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  useEffect(() => {
    if (isActive) {
      initializeFaceLogin();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isActive]);

  const initializeFaceLogin = async () => {
    try {
      setStatus('initializing');
      setError('');
      setIsLoading(true);

      // Check camera permissions
      const permissions = await cameraService.constructor.checkPermissions();
      if (permissions.denied) {
        throw new Error('Camera access denied. Please allow camera permission and try again.');
      }

      // Initialize face API
      await faceAPIService.initialize();
      
      // Start camera
      await cameraService.initialize(videoRef.current);
      
      setStatus('ready');
      startCountdown();
    } catch (err) {
      setError(err.message);
      setStatus('error');
      onError && onError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          startScanning();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startScanning = () => {
    setStatus('scanning');
    setScanProgress(0);
    
    // Start face tracking
    const interval = cameraService.startFaceTracking(handleFaceTracking, 100);
    setTrackingInterval(interval);

    // Progress simulation
    const progressTimer = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressTimer);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Auto-attempt authentication after scanning period
    setTimeout(() => {
      if (faceDetected && currentFaceData) {
        attemptAuthentication();
      } else {
        handleScanTimeout();
      }
    }, 5000);
  };

  const handleFaceTracking = async (imageElement) => {
    try {
      const faces = await faceAPIService.detectFaces(imageElement);
      
      if (faces.length === 1) {
        const face = faces[0];
        const quality = faceAPIService.validateImageQuality(imageElement, {
          boundingBox: face.detection.box,
          confidence: face.detection.score
        });

        setFaceDetected(true);
        setCurrentFaceData({
          face,
          quality,
          imageElement
        });

        // Draw face detection overlay
        drawFaceOverlay(face);

        // Auto authenticate if quality is good enough
        if (quality.isValid && face.detection.score > 0.8 && status === 'scanning') {
          setTimeout(() => {
            if (faceDetected) {
              attemptAuthentication();
            }
          }, 1000);
        }
      } else {
        setFaceDetected(false);
        setCurrentFaceData(null);
        clearCanvas();
      }
    } catch (err) {
      console.error('Face tracking error:', err);
    }
  };

  const drawFaceOverlay = (face) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw scanning animation
    if (status === 'scanning') {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(canvas.width, canvas.height) * 0.3;
      
      // Animated scanning circle
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -Date.now() / 50;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw bounding box
    const box = face.detection.box;
    const confidence = face.detection.score;
    
    if (confidence > 0.8) {
      ctx.strokeStyle = '#10B981'; // Green for high confidence
    } else if (confidence > 0.6) {
      ctx.strokeStyle = '#F59E0B'; // Yellow for medium confidence
    } else {
      ctx.strokeStyle = '#EF4444'; // Red for low confidence
    }
    
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw confidence score
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(box.x, box.y - 30, 100, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.fillText(`${Math.round(confidence * 100)}%`, box.x + 5, box.y - 8);

    // Draw corner indicators
    const cornerSize = 20;
    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 3;
    
    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + cornerSize);
    ctx.lineTo(box.x, box.y);
    ctx.lineTo(box.x + cornerSize, box.y);
    ctx.stroke();
    
    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(box.x + box.width - cornerSize, box.y);
    ctx.lineTo(box.x + box.width, box.y);
    ctx.lineTo(box.x + box.width, box.y + cornerSize);
    ctx.stroke();
    
    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(box.x, box.y + box.height - cornerSize);
    ctx.lineTo(box.x, box.y + box.height);
    ctx.lineTo(box.x + cornerSize, box.y + box.height);
    ctx.stroke();
    
    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height);
    ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
    ctx.stroke();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const attemptAuthentication = async () => {
    if (!currentFaceData || !faceDetected) {
      toast.error('No face detected for authentication');
      return;
    }

    try {
      setStatus('verifying');
      setIsLoading(true);
      
      // Stop face tracking during verification
      if (trackingInterval) {
        cameraService.stopFaceTracking(trackingInterval);
        setTrackingInterval(null);
      }

      // Perform liveness detection
      setLivenessStatus('detecting');
      const isLive = await faceAPIService.detectLiveness(videoRef.current, 2000);
      
      if (!isLive) {
        setLivenessStatus('failed');
        throw new Error('Liveness detection failed. Please try again.');
      }

      setLivenessStatus('passed');

      // Extract face descriptor
      const faceData = await faceAPIService.extractFaceDescriptor(currentFaceData.imageElement);

      if (demoMode) {
        // Demo mode - simulate successful authentication
        setStatus('success');
        toast.success('Face authentication successful! (Demo Mode)');
        
        const demoData = {
          user: {
            id: 'demo-123',
            name: 'Demo User',
            email: 'demo@example.com',
            role: 'demo'
          },
          token: 'demo-token-' + Date.now(),
          confidence: Math.round(faceData.confidence * 100) / 100
        };
        
        onSuccess && onSuccess(demoData);
        
        setTimeout(() => {
          cleanup();
        }, 2000);
        return;
      }

      // Send authentication request
      const response = await api.post('/face/login', {
        face_descriptor: faceData.descriptor,
        confidence_score: faceData.confidence,
        liveness_check: true,
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          landmarks: faceData.landmarks,
          expressions: faceData.expressions
        }
      });

      if (response.data.success) {
        setStatus('success');
        toast.success('Face authentication successful!');
        
        // Store authentication data
        localStorage.setItem('auth_token', response.data.data.token);
        localStorage.setItem('user_data', JSON.stringify(response.data.data.user));
        
        onSuccess && onSuccess(response.data.data);
        
        setTimeout(() => {
          cleanup();
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Authentication failed');
      }
    } catch (err) {
      console.error('Face authentication error:', err);
      setLivenessStatus('failed');
      
      const errorMessage = err.response?.data?.message || err.message;
      setError(errorMessage);
      setStatus('error');
      
      setAttempts(prev => prev + 1);
      
      if (attempts + 1 >= maxAttempts) {
        toast.error('Maximum authentication attempts reached. Please try traditional login.');
        onError && onError('Maximum attempts reached');
        cleanup();
      } else {
        toast.error(`Authentication failed (${attempts + 1}/${maxAttempts}): ${errorMessage}`);
        setTimeout(() => {
          retryAuthentication();
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanTimeout = () => {
    setError('Face scanning timeout. Please ensure your face is visible and try again.');
    setStatus('error');
    setTimeout(() => {
      retryAuthentication();
    }, 2000);
  };

  const retryAuthentication = () => {
    if (attempts < maxAttempts) {
      setStatus('ready');
      setError('');
      setFaceDetected(false);
      setCurrentFaceData(null);
      setLivenessStatus('waiting');
      setScanProgress(0);
      startCountdown();
    }
  };

  const cleanup = () => {
    if (trackingInterval) {
      cameraService.stopFaceTracking(trackingInterval);
      setTrackingInterval(null);
    }
    cameraService.stop();
    setFaceDetected(false);
    setCurrentFaceData(null);
    setStatus('idle');
    setError('');
    setCountdown(0);
    setLivenessStatus('waiting');
    setScanProgress(0);
    setIsActive(false);
    setAttempts(0);
  };

  const handleToggle = () => {
    setIsActive(!isActive);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Face Login Toggle Button */}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
      >
        <FaceSmileIcon className="w-6 h-6" />
        <span className="font-medium">
          {isActive ? 'Cancel Face Login' : 'Login with Face ID'}
        </span>
      </button>

      {/* Face Login Interface */}
      {isActive && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Face Authentication</h3>
                  <p className="text-sm text-gray-600">
                    {status === 'idle' && 'Initialize face recognition'}
                    {status === 'initializing' && 'Setting up camera...'}
                    {status === 'ready' && `Starting in ${countdown}...`}
                    {status === 'scanning' && 'Look at the camera'}
                    {status === 'verifying' && 'Verifying identity...'}
                    {status === 'success' && 'Authentication successful!'}
                    {status === 'error' && 'Authentication failed'}
                  </p>
                </div>
              </div>
              <button
                onClick={cleanup}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Camera View */}
          <div className="relative bg-gray-900">
            <video
              ref={videoRef}
              className="w-full h-64 object-cover"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
            />
            
            {/* Status Overlays */}
            <div className="absolute inset-0 flex items-center justify-center">
              {status === 'ready' && countdown > 0 && (
                <div className="bg-black bg-opacity-50 rounded-full w-16 h-16 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">{countdown}</span>
                </div>
              )}
              
              {status === 'scanning' && (
                <div className="text-center">
                  <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2 mb-2">
                    <div className="text-white text-sm font-medium">Scanning...</div>
                    <div className="w-32 h-2 bg-gray-600 rounded-full mt-1">
                      <div 
                        className="h-2 bg-blue-500 rounded-full transition-all duration-100"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {status === 'verifying' && (
                <div className="bg-black bg-opacity-50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2 text-white">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-sm font-medium">Verifying...</span>
                  </div>
                </div>
              )}
              
              {status === 'success' && (
                <div className="bg-green-500 bg-opacity-90 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2 text-white">
                    <CheckCircleIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Success!</span>
                  </div>
                </div>
              )}
            </div>

            {/* Corner Overlays */}
            <div className="absolute top-4 left-4 right-4 flex justify-between">
              {/* Face Detection Status */}
              {status === 'scanning' && (
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  faceDetected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                }`}>
                  {faceDetected ? 'Face Detected' : 'No Face'}
                </div>
              )}
              
              {/* Attempts Counter */}
              {attempts > 0 && (
                <div className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-medium">
                  Attempt {attempts}/{maxAttempts}
                </div>
              )}
            </div>

            {/* Liveness Status */}
            {livenessStatus !== 'waiting' && (
              <div className="absolute bottom-4 right-4">
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  livenessStatus === 'passed' ? 'bg-green-500 text-white' :
                  livenessStatus === 'failed' ? 'bg-red-500 text-white' :
                  'bg-blue-500 text-white'
                }`}>
                  Liveness: {livenessStatus}
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-6 py-4 bg-red-50 border-t border-red-200">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          {status === 'scanning' && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Instructions:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>• Position your face in center</div>
                <div>• Look directly at camera</div>
                <div>• Ensure good lighting</div>
                <div>• Keep face still</div>
              </div>
            </div>
          )}

          {/* Quality Feedback */}
          {currentFaceData && status === 'scanning' && (
            <div className="px-6 py-3 bg-blue-50 border-t border-blue-200">
              <div className="flex justify-between items-center text-sm">
                <span className="text-blue-800">Confidence:</span>
                <span className={`font-medium ${
                  currentFaceData.face.detection.score > 0.8 ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {Math.round(currentFaceData.face.detection.score * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FaceLogin;
