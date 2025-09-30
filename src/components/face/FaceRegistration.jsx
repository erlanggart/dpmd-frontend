import React, { useState, useRef, useEffect } from 'react';
import { 
  CameraIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XMarkIcon,
  EyeIcon,
  ShieldCheckIcon,
  VideoCameraIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { faceAPIService } from '../../utils/face/faceAPI';
import { cameraService } from '../../utils/face/cameraService';
import api from '../../api';

const FaceRegistration = ({ isOpen, onClose, onSuccess }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [step, setStep] = useState('permission'); // permission, setup, capture, validation, confirm, processing
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentFaceData, setCurrentFaceData] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [cameraInfo, setCameraInfo] = useState(null);
  const [lighting, setLighting] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [trackingInterval, setTrackingInterval] = useState(null);
  const [livenessStatus, setLivenessStatus] = useState('waiting'); // waiting, detecting, passed, failed

  const requiredCaptures = 3;
  const qualityThreshold = 0.8;

  useEffect(() => {
    if (isOpen) {
      initializeFaceRegistration();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  const initializeFaceRegistration = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      // Check camera permissions
      const permissions = await cameraService.constructor.checkPermissions();
      if (permissions.denied) {
        setError('Camera access denied. Please allow camera permission and try again.');
        return;
      }

      // Initialize face API
      await faceAPIService.initialize();
      
      setStep('setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError('');

      const result = await cameraService.initialize(videoRef.current);
      setCameraInfo(result);

      // Start face tracking
      const interval = cameraService.startFaceTracking(handleFaceTracking, 200);
      setTrackingInterval(interval);

      // Start lighting monitoring
      monitorLighting();

      setStep('capture');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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

    // Draw bounding box
    const box = face.detection.box;
    ctx.strokeStyle = face.detection.score > qualityThreshold ? '#10B981' : '#F59E0B';
    ctx.lineWidth = 3;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Draw confidence score
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(box.x, box.y - 25, 120, 25);
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.fillText(`${Math.round(face.detection.score * 100)}%`, box.x + 5, box.y - 8);

    // Draw landmarks
    ctx.fillStyle = '#EF4444';
    face.landmarks.positions.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const monitorLighting = () => {
    const checkLighting = async () => {
      try {
        const lightingInfo = await cameraService.checkLighting();
        setLighting(lightingInfo);
      } catch (err) {
        console.error('Lighting check error:', err);
      }
    };

    checkLighting();
    const interval = setInterval(checkLighting, 1000);
    
    setTimeout(() => clearInterval(interval), 30000); // Stop after 30 seconds
  };

  const captureFace = async () => {
    if (!currentFaceData || !currentFaceData.quality.isValid) {
      toast.error('Please ensure your face is properly positioned and well-lit');
      return;
    }

    try {
      setIsLoading(true);

      // Perform liveness detection
      setLivenessStatus('detecting');
      const isLive = await faceAPIService.detectLiveness(videoRef.current, 3000);
      
      if (!isLive) {
        setLivenessStatus('failed');
        toast.error('Liveness detection failed. Please move naturally and try again.');
        return;
      }

      setLivenessStatus('passed');

      // Extract face descriptor
      const faceData = await faceAPIService.extractFaceDescriptor(currentFaceData.imageElement);
      
      // Capture high quality image
      const capturedImage = await cameraService.captureImage(0.95);

      const newCapture = {
        id: Date.now(),
        faceData,
        image: capturedImage.src,
        timestamp: new Date(),
        quality: currentFaceData.quality,
        confidence: faceData.confidence
      };

      setCapturedImages(prev => [...prev, newCapture]);
      toast.success(`Face captured (${capturedImages.length + 1}/${requiredCaptures})`);

      if (capturedImages.length + 1 >= requiredCaptures) {
        setStep('validation');
        cameraService.stopFaceTracking(trackingInterval);
      }
    } catch (err) {
      setLivenessStatus('failed');
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const validateCaptures = () => {
    const avgConfidence = capturedImages.reduce((sum, img) => sum + img.confidence, 0) / capturedImages.length;
    const allValid = capturedImages.every(img => img.quality.isValid);

    if (avgConfidence < qualityThreshold || !allValid) {
      toast.error('Captured images do not meet quality requirements. Please try again.');
      setStep('capture');
      setCapturedImages([]);
      return;
    }

    setStep('confirm');
  };

  const registerFace = async () => {
    if (!password) {
      toast.error('Please enter your password to confirm registration');
      return;
    }

    try {
      setIsLoading(true);
      setStep('processing');

      // Use the best quality capture
      const bestCapture = capturedImages.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      const response = await api.post('/face/register', {
        encrypted_descriptor: bestCapture.faceData.descriptor,
        face_metadata: {
          landmarks: bestCapture.faceData.landmarks,
          expressions: bestCapture.faceData.expressions,
          boundingBox: bestCapture.faceData.boundingBox,
          captureCount: capturedImages.length,
          avgConfidence: capturedImages.reduce((sum, img) => sum + img.confidence, 0) / capturedImages.length,
          registrationTimestamp: new Date().toISOString(),
          cameraInfo: cameraInfo,
          lighting: lighting
        },
        confidence_score: bestCapture.confidence,
        password: password
      });

      if (response.data.success) {
        toast.success('Face registration successful! Pending admin verification.');
        onSuccess && onSuccess(response.data);
        handleClose();
      } else {
        throw new Error(response.data.message);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
      setStep('confirm');
    } finally {
      setIsLoading(false);
    }
  };

  const retakeCaptures = () => {
    setCapturedImages([]);
    setStep('capture');
    const interval = cameraService.startFaceTracking(handleFaceTracking, 200);
    setTrackingInterval(interval);
  };

  const cleanup = () => {
    if (trackingInterval) {
      cameraService.stopFaceTracking(trackingInterval);
      setTrackingInterval(null);
    }
    cameraService.stop();
    setFaceDetected(false);
    setCurrentFaceData(null);
    setCapturedImages([]);
    setStep('permission');
    setError('');
    setPassword('');
    setLivenessStatus('waiting');
  };

  const handleClose = () => {
    cleanup();
    onClose && onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose}></div>
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CameraIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Face Registration</h3>
                <p className="text-sm text-gray-600">Secure biometric authentication setup</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Progress Steps */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                {['Permission', 'Setup', 'Capture', 'Validation', 'Confirm'].map((stepName, index) => {
                  const stepKeys = ['permission', 'setup', 'capture', 'validation', 'confirm'];
                  const currentIndex = stepKeys.indexOf(step);
                  const isActive = index === currentIndex;
                  const isCompleted = index < currentIndex;
                  
                  return (
                    <div key={stepName} className="flex items-center">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                        isCompleted ? 'bg-green-500 border-green-500 text-white' :
                        isActive ? 'bg-blue-500 border-blue-500 text-white' :
                        'border-gray-300 text-gray-300'
                      }`}>
                        {isCompleted ? (
                          <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      {index < 4 && (
                        <div className={`w-16 h-1 mx-2 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Step Content */}
            {step === 'permission' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <h4 className="text-xl font-semibold mb-2">Camera Permission Required</h4>
                  <p className="text-gray-600 mb-6">
                    We need access to your camera to capture your face for secure authentication.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Initializing...' : 'Grant Camera Access'}
                </button>
              </div>
            )}

            {step === 'setup' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <VideoCameraIcon className="w-8 h-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-semibold mb-2">Camera Ready</h4>
                  <p className="text-gray-600 mb-6">
                    Face API models loaded successfully. Ready to start face registration.
                  </p>
                </div>
                <button
                  onClick={startCamera}
                  disabled={isLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isLoading ? 'Starting Camera...' : 'Start Camera'}
                </button>
              </div>
            )}

            {step === 'capture' && (
              <div className="space-y-6">
                {/* Camera View */}
                <div className="relative bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    className="w-full h-96 object-cover"
                    autoPlay
                    muted
                    playsInline
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                  
                  {/* Status Overlays */}
                  <div className="absolute top-4 left-4 right-4 flex justify-between">
                    {/* Face Detection Status */}
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      faceDetected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {faceDetected ? 'Face Detected' : 'No Face Detected'}
                    </div>
                    
                    {/* Capture Count */}
                    <div className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm font-medium">
                      {capturedImages.length}/{requiredCaptures}
                    </div>
                  </div>

                  {/* Lighting Status */}
                  {lighting && (
                    <div className="absolute bottom-4 left-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        lighting.isOptimal ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
                      }`}>
                        Lighting: {lighting.condition}
                      </div>
                    </div>
                  )}

                  {/* Liveness Status */}
                  {livenessStatus !== 'waiting' && (
                    <div className="absolute bottom-4 right-4">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        livenessStatus === 'passed' ? 'bg-green-500 text-white' :
                        livenessStatus === 'failed' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                      }`}>
                        Liveness: {livenessStatus}
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="text-center">
                  <h4 className="text-lg font-semibold mb-2">Face Capture Instructions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div>• Position your face in the center</div>
                    <div>• Ensure good lighting</div>
                    <div>• Look directly at the camera</div>
                    <div>• Keep your face still during capture</div>
                    <div>• Remove glasses if possible</div>
                    <div>• Maintain neutral expression</div>
                  </div>
                </div>

                {/* Quality Feedback */}
                {currentFaceData && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium mb-2">Quality Check:</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span>Confidence:</span>
                        <span className={`font-medium ${
                          currentFaceData.face.detection.score > qualityThreshold ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {Math.round(currentFaceData.face.detection.score * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quality:</span>
                        <span className={`font-medium ${
                          currentFaceData.quality.isValid ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {currentFaceData.quality.isValid ? 'Good' : 'Poor'}
                        </span>
                      </div>
                    </div>
                    {!currentFaceData.quality.isValid && (
                      <div className="mt-2 text-xs text-red-600">
                        Issues: {currentFaceData.quality.issues.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Capture Button */}
                <div className="flex justify-center">
                  <button
                    onClick={captureFace}
                    disabled={!faceDetected || !currentFaceData?.quality.isValid || isLoading}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <CameraIcon className="w-5 h-5" />
                    {isLoading ? 'Capturing...' : 'Capture Face'}
                  </button>
                </div>
              </div>
            )}

            {step === 'validation' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-xl font-semibold mb-2">Validating Captures</h4>
                  <p className="text-gray-600">
                    Analyzing captured images for quality and consistency...
                  </p>
                </div>

                {/* Captured Images Preview */}
                <div className="grid grid-cols-3 gap-4">
                  {capturedImages.map((capture, index) => (
                    <div key={capture.id} className="space-y-2">
                      <img
                        src={capture.image}
                        alt={`Capture ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border"
                      />
                      <div className="text-center text-sm">
                        <div className="font-medium">Capture {index + 1}</div>
                        <div className="text-gray-600">{Math.round(capture.confidence * 100)}%</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={retakeCaptures}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Retake Captures
                  </button>
                  <button
                    onClick={validateCaptures}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Validate & Continue
                  </button>
                </div>
              </div>
            )}

            {step === 'confirm' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-xl font-semibold mb-2">Confirm Registration</h4>
                  <p className="text-gray-600">
                    Enter your password to confirm face registration
                  </p>
                </div>

                {/* Password Input */}
                <div className="max-w-md mx-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Confirmation
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      <EyeIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setStep('validation')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={registerFace}
                    disabled={!password || isLoading}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Registering...' : 'Register Face'}
                  </button>
                </div>
              </div>
            )}

            {step === 'processing' && (
              <div className="text-center py-8">
                <div className="mb-6">
                  <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                  <h4 className="text-xl font-semibold mb-2">Processing Registration</h4>
                  <p className="text-gray-600">
                    Please wait while we securely store your face data...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaceRegistration;
