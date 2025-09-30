import * as faceapi from 'face-api.js';
import CryptoJS from 'crypto-js';

export class FaceAPIService {
  constructor() {
    this.isInitialized = false;
    this.secretKey = 'DPMD_FACE_SECRET_2025'; // In production, use env variable
    this.minDetectionScore = 0.6;
    this.minFaceSize = 160;
    this.maxFaceSize = 800;
    this.requiredFaceCount = 3; // Multiple face captures for better accuracy
  }

  /**
   * Initialize face-api.js models
   */
  async initialize() {
    if (this.isInitialized) return true;

    try {
      console.log('Loading face recognition models...');
      
      // Load required face recognition models only (not all)
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('/models')
      ]);

      console.log('Face recognition models loaded successfully');
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to load face recognition models:', error);
      
      // Try alternative model loading with error details
      try {
        console.log('Attempting alternative model loading...');
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        console.log('Tiny face detector loaded');
        
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        console.log('Face landmark model loaded');
        
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        console.log('Face recognition model loaded');
        
        this.isInitialized = true;
        return true;
      } catch (retryError) {
        console.error('Alternative loading also failed:', retryError);
        throw new Error(`Face recognition initialization failed: ${retryError.message}`);
      }
    }
  }

  /**
   * Detect faces in image with quality validation
   */
  async detectFaces(imageElement, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const detections = await faceapi
        .detectAllFaces(
          imageElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: this.minDetectionScore
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptors()
        .withFaceExpressions();

      // Quality validation
      const validFaces = detections.filter(detection => {
        const box = detection.detection.box;
        const faceSize = Math.max(box.width, box.height);
        
        // Check face size
        if (faceSize < this.minFaceSize || faceSize > this.maxFaceSize) {
          return false;
        }

        // Check face alignment (basic frontal face check)
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();
        
        // Calculate face angle (basic check)
        const eyeDistance = Math.abs(leftEye[0].x - rightEye[0].x);
        const nosePosition = nose[3]; // nose tip
        const faceCenterX = (leftEye[0].x + rightEye[0].x) / 2;
        const noseOffset = Math.abs(nosePosition.x - faceCenterX);
        
        // Check if face is reasonably frontal
        const frontalRatio = noseOffset / eyeDistance;
        if (frontalRatio > 0.3) {
          return false; // Too much rotation
        }

        // Check expression confidence (anti-spoofing basic check)
        const expressions = detection.expressions;
        const totalExpression = Object.values(expressions).reduce((sum, val) => sum + val, 0);
        if (totalExpression < 0.1) {
          return false; // Suspicious low expression confidence
        }

        return true;
      });

      return validFaces;
    } catch (error) {
      console.error('Face detection failed:', error);
      throw new Error('Face detection failed');
    }
  }

  /**
   * Extract and encrypt face descriptors
   */
  async extractFaceDescriptor(imageElement) {
    const faces = await this.detectFaces(imageElement);
    
    if (faces.length === 0) {
      throw new Error('No valid face detected');
    }

    if (faces.length > 1) {
      throw new Error('Multiple faces detected. Please ensure only one face is visible');
    }

    const face = faces[0];
    const descriptor = face.descriptor;

    // Encrypt face descriptor for security
    const descriptorString = JSON.stringify(Array.from(descriptor));
    const encryptedDescriptor = CryptoJS.AES.encrypt(descriptorString, this.secretKey).toString();

    return {
      descriptor: encryptedDescriptor,
      confidence: face.detection.score,
      landmarks: face.landmarks.positions,
      expressions: face.expressions,
      boundingBox: face.detection.box
    };
  }

  /**
   * Decrypt face descriptor
   */
  decryptFaceDescriptor(encryptedDescriptor) {
    try {
      const bytes = CryptoJS.AES.decrypt(encryptedDescriptor, this.secretKey);
      const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
      return new Float32Array(JSON.parse(decryptedString));
    } catch (error) {
      throw new Error('Failed to decrypt face descriptor');
    }
  }

  /**
   * Compare two face descriptors
   */
  async compareFaces(storedEncryptedDescriptor, currentImageElement, threshold = 0.6) {
    try {
      // Decrypt stored descriptor
      const storedDescriptor = this.decryptFaceDescriptor(storedEncryptedDescriptor);
      
      // Extract current face descriptor
      const currentFaces = await this.detectFaces(currentImageElement);
      
      if (currentFaces.length === 0) {
        return { match: false, error: 'No face detected' };
      }

      if (currentFaces.length > 1) {
        return { match: false, error: 'Multiple faces detected' };
      }

      const currentDescriptor = currentFaces[0].descriptor;
      
      // Calculate euclidean distance
      const distance = faceapi.euclideanDistance(storedDescriptor, currentDescriptor);
      const similarity = 1 - distance;
      const match = distance < threshold;

      return {
        match,
        similarity: Math.round(similarity * 100),
        distance,
        confidence: currentFaces[0].detection.score
      };
    } catch (error) {
      console.error('Face comparison failed:', error);
      return { match: false, error: error.message };
    }
  }

  /**
   * Liveness detection (basic implementation)
   */
  async detectLiveness(videoElement, duration = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const movements = [];
      const interval = 200; // Check every 200ms

      const checkMovement = async () => {
        try {
          const faces = await this.detectFaces(videoElement);
          
          if (faces.length === 1) {
            const face = faces[0];
            const expressions = face.expressions;
            const landmarks = face.landmarks.positions;
            
            movements.push({
              timestamp: Date.now(),
              expressions,
              landmarks,
              boundingBox: face.detection.box
            });
          }

          if (Date.now() - startTime < duration) {
            setTimeout(checkMovement, interval);
          } else {
            // Analyze movements
            const isLive = this.analyzeLivenessMovements(movements);
            resolve(isLive);
          }
        } catch (error) {
          resolve(false);
        }
      };

      checkMovement();
    });
  }

  /**
   * Analyze liveness movements
   */
  analyzeLivenessMovements(movements) {
    if (movements.length < 5) return false;

    // Check for natural micro-movements and expression changes
    let expressionChanges = 0;
    let positionChanges = 0;

    for (let i = 1; i < movements.length; i++) {
      const current = movements[i];
      const previous = movements[i - 1];

      // Check expression changes
      const expressionDiff = Object.keys(current.expressions).reduce((sum, key) => {
        return sum + Math.abs(current.expressions[key] - previous.expressions[key]);
      }, 0);

      if (expressionDiff > 0.1) expressionChanges++;

      // Check position changes
      const positionDiff = Math.abs(current.boundingBox.x - previous.boundingBox.x) +
                          Math.abs(current.boundingBox.y - previous.boundingBox.y);

      if (positionDiff > 2) positionChanges++;
    }

    // Live face should have some natural movement
    return expressionChanges >= 2 && positionChanges >= 1;
  }

  /**
   * Validate image quality for face registration
   */
  validateImageQuality(imageElement, faceData) {
    const issues = [];

    // Check image dimensions
    if (imageElement.width < 640 || imageElement.height < 480) {
      issues.push('Image resolution too low (minimum 640x480)');
    }

    // Check face size
    const faceSize = Math.max(faceData.boundingBox.width, faceData.boundingBox.height);
    if (faceSize < this.minFaceSize) {
      issues.push('Face too small in image');
    }

    // Check face position (should be centered)
    const imageCenterX = imageElement.width / 2;
    const imageCenterY = imageElement.height / 2;
    const faceCenterX = faceData.boundingBox.x + faceData.boundingBox.width / 2;
    const faceCenterY = faceData.boundingBox.y + faceData.boundingBox.height / 2;

    const offsetX = Math.abs(faceCenterX - imageCenterX);
    const offsetY = Math.abs(faceCenterY - imageCenterY);

    if (offsetX > imageElement.width * 0.2 || offsetY > imageElement.height * 0.2) {
      issues.push('Face should be centered in image');
    }

    // Check confidence
    if (faceData.confidence < 0.8) {
      issues.push('Face detection confidence too low');
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Generate secure face ID
   */
  generateFaceId(userRole, userId) {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const faceId = `${userRole}_${userId}_${timestamp}_${randomString}`;
    return CryptoJS.SHA256(faceId).toString();
  }
}

// Export singleton instance
export const faceAPIService = new FaceAPIService();
