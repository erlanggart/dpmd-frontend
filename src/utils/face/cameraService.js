export class CameraService {
  constructor() {
    this.stream = null;
    this.videoElement = null;
    this.canvasElement = null;
    this.isInitialized = false;
  }

  /**
   * Initialize camera with high quality settings
   */
  async initialize(videoElement, options = {}) {
    this.videoElement = videoElement;
    
    const defaultConstraints = {
      video: {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30, min: 15 },
        facingMode: 'user', // Front camera
        aspectRatio: { ideal: 16/9 }
      },
      audio: false
    };

    const constraints = { ...defaultConstraints, ...options };

    try {
      // Check if camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No camera device found');
      }

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Attach stream to video element
      this.videoElement.srcObject = this.stream;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;

      // Wait for video to be ready
      await new Promise((resolve, reject) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play()
            .then(resolve)
            .catch(reject);
        };
        this.videoElement.onerror = reject;
      });

      this.isInitialized = true;
      console.log('Camera initialized successfully');
      
      return {
        success: true,
        resolution: {
          width: this.videoElement.videoWidth,
          height: this.videoElement.videoHeight
        }
      };
    } catch (error) {
      console.error('Camera initialization failed:', error);
      
      let errorMessage = 'Failed to access camera';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permission and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera device found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is being used by another application. Please close other apps and try again.';
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Capture high quality image from video
   */
  captureImage(quality = 0.95) {
    if (!this.isInitialized || !this.videoElement) {
      throw new Error('Camera not initialized');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to high quality image
    const imageDataUrl = canvas.toDataURL('image/jpeg', quality);
    
    // Create image element for face detection
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageDataUrl;
    });
  }

  /**
   * Start continuous face tracking
   */
  startFaceTracking(callback, interval = 100) {
    if (!this.isInitialized) {
      throw new Error('Camera not initialized');
    }

    const trackingInterval = setInterval(async () => {
      try {
        const imageElement = await this.captureImage();
        callback(imageElement);
      } catch (error) {
        console.error('Face tracking error:', error);
      }
    }, interval);

    return trackingInterval;
  }

  /**
   * Stop face tracking
   */
  stopFaceTracking(trackingInterval) {
    if (trackingInterval) {
      clearInterval(trackingInterval);
    }
  }

  /**
   * Get camera quality info
   */
  getCameraInfo() {
    if (!this.isInitialized || !this.stream) {
      return null;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();
    const capabilities = videoTrack.getCapabilities();

    return {
      label: videoTrack.label,
      resolution: {
        width: settings.width,
        height: settings.height
      },
      frameRate: settings.frameRate,
      capabilities: {
        maxWidth: capabilities.width?.max,
        maxHeight: capabilities.height?.max,
        maxFrameRate: capabilities.frameRate?.max
      }
    };
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera() {
    if (!this.isInitialized) {
      throw new Error('Camera not initialized');
    }

    const currentFacingMode = this.stream.getVideoTracks()[0].getSettings().facingMode;
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

    await this.stop();
    await this.initialize(this.videoElement, {
      video: {
        facingMode: newFacingMode
      }
    });
  }

  /**
   * Adjust camera settings
   */
  async adjustSettings(settings) {
    if (!this.isInitialized || !this.stream) {
      throw new Error('Camera not initialized');
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    
    try {
      await videoTrack.applyConstraints(settings);
      return true;
    } catch (error) {
      console.error('Failed to adjust camera settings:', error);
      return false;
    }
  }

  /**
   * Check lighting conditions
   */
  async checkLighting() {
    if (!this.isInitialized) {
      throw new Error('Camera not initialized');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;
    
    context.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalBrightness = 0;
    let pixelCount = 0;
    
    // Sample pixels to calculate average brightness
    for (let i = 0; i < data.length; i += 16) { // Sample every 4th pixel
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculate brightness using luminance formula
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
      totalBrightness += brightness;
      pixelCount++;
    }
    
    const averageBrightness = totalBrightness / pixelCount;
    
    // Classify lighting conditions
    let condition;
    if (averageBrightness < 50) {
      condition = 'too_dark';
    } else if (averageBrightness > 200) {
      condition = 'too_bright';
    } else if (averageBrightness < 80) {
      condition = 'dark';
    } else if (averageBrightness > 170) {
      condition = 'bright';
    } else {
      condition = 'optimal';
    }
    
    return {
      brightness: Math.round(averageBrightness),
      condition,
      isOptimal: condition === 'optimal'
    };
  }

  /**
   * Clean up camera resources
   */
  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.isInitialized = false;
    console.log('Camera stopped');
  }

  /**
   * Check camera permissions
   */
  static async checkPermissions() {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' });
      return {
        granted: permissions.state === 'granted',
        denied: permissions.state === 'denied',
        prompt: permissions.state === 'prompt',
        state: permissions.state
      };
    } catch (error) {
      // Fallback for browsers that don't support permissions API
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return { granted: true, state: 'granted' };
      } catch (err) {
        return { granted: false, denied: true, state: 'denied' };
      }
    }
  }

  /**
   * Get available cameras
   */
  static async getAvailableCameras() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Failed to get camera devices:', error);
      return [];
    }
  }
}

// Export singleton instance
export const cameraService = new CameraService();
