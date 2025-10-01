import React, { useState, useEffect } from 'react';
import { 
  UserCircleIcon,
  CameraIcon,
  ShieldCheckIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import FaceRegistration from '../face/FaceRegistration';
import api from '../../api';

const ProfileWithFaceID = ({ user }) => {
  const [faceStatus, setFaceStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFaceRegistration, setShowFaceRegistration] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadFaceStatus();
  }, []);

  const loadFaceStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/face/status');
      
      if (response.data.success) {
        setFaceStatus(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load face status:', error);
      toast.error('Failed to load face recognition status');
    } finally {
      setLoading(false);
    }
  };

  const handleFaceRegistrationSuccess = (data) => {
    toast.success('Face registration successful!');
    setShowFaceRegistration(false);
    loadFaceStatus(); // Reload status
  };

  const handleDeleteFaceData = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }

    try {
      setIsDeleting(true);
      
      const response = await api.delete('/face/data', {
        data: { password: deletePassword }
      });

      if (response.data.success) {
        toast.success('Face data deleted successfully');
        setFaceStatus(null);
        setShowDeleteConfirmation(false);
        setDeletePassword('');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to delete face data';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    if (!status || !status.has_face_data) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Not Registered
        </span>
      );
    }

    if (!status.is_verified) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <ClockIcon className="w-3 h-3 mr-1" />
          Pending Verification
        </span>
      );
    }

    if (!status.is_active) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Inactive
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircleIcon className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  };

  const canUseFaceLogin = faceStatus && faceStatus.has_face_data && faceStatus.is_verified && faceStatus.is_active;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <UserCircleIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Profile & Face ID</h3>
            <p className="text-sm text-gray-600">Manage your account and biometric authentication</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* User Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Account Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <div className="font-medium text-gray-900">{user.name}</div>
            </div>
            <div>
              <span className="text-gray-600">Email:</span>
              <div className="font-medium text-gray-900">{user.email}</div>
            </div>
            <div>
              <span className="text-gray-600">Role:</span>
              <div className="font-medium text-gray-900 capitalize">
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Status:</span>
              <div className="font-medium text-green-600">Active</div>
            </div>
          </div>
        </div>

        {/* Face ID Section */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Face ID Authentication</h4>
            </div>
            {getStatusBadge(faceStatus)}
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading face status...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Face Status Information */}
              {faceStatus && faceStatus.has_face_data ? (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Face Recognition Details</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Registered:</span>
                      <div className="font-medium text-blue-900">
                        {formatDate(faceStatus.registered_at)}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Last Used:</span>
                      <div className="font-medium text-blue-900">
                        {formatDate(faceStatus.last_used_at)}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Usage Count:</span>
                      <div className="font-medium text-blue-900">
                        {faceStatus.usage_count} times
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700">Confidence:</span>
                      <div className="font-medium text-blue-900">
                        {Math.round(faceStatus.confidence_score * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Status Messages */}
                  <div className="mt-3 space-y-2">
                    {!faceStatus.is_verified && (
                      <div className="flex items-center gap-2 text-yellow-800">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span className="text-sm">Waiting for admin verification</span>
                      </div>
                    )}
                    {faceStatus.is_verified && faceStatus.is_active && (
                      <div className="flex items-center gap-2 text-green-800">
                        <CheckCircleIcon className="w-4 h-4" />
                        <span className="text-sm">Face ID is active and ready to use</span>
                      </div>
                    )}
                    {faceStatus.is_verified && !faceStatus.is_active && (
                      <div className="flex items-center gap-2 text-red-800">
                        <ExclamationTriangleIcon className="w-4 h-4" />
                        <span className="text-sm">Face ID is deactivated. Contact admin to reactivate.</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <CameraIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-2">No face data registered</p>
                  <p className="text-sm text-gray-500">
                    Register your face for secure biometric authentication
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                {!faceStatus || !faceStatus.has_face_data ? (
                  <button
                    onClick={() => setShowFaceRegistration(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <CameraIcon className="w-4 h-4" />
                    Register Face ID
                  </button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setShowDeleteConfirmation(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete Face Data
                    </button>
                    <button
                      onClick={() => setShowFaceRegistration(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <CameraIcon className="w-4 h-4" />
                      Re-register Face
                    </button>
                  </div>
                )}
              </div>

              {/* Security Notice */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800">Security Notice</p>
                    <p className="text-yellow-700 mt-1">
                      Face ID data is encrypted and stored securely. Only you and system administrators 
                      can manage this data. Face recognition requires admin verification before activation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Face Login Status */}
        {canUseFaceLogin && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <h4 className="font-medium text-green-900">Face ID Ready</h4>
            </div>
            <p className="text-sm text-green-800 mt-1">
              You can now use Face ID to login to your account. Look for the "Login with Face ID" 
              button on the login page.
            </p>
          </div>
        )}
      </div>

      {/* Face Registration Modal */}
      <FaceRegistration
        isOpen={showFaceRegistration}
        onClose={() => setShowFaceRegistration(false)}
        onSuccess={handleFaceRegistrationSuccess}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowDeleteConfirmation(false)}></div>
          
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrashIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Face Data</h3>
                    <p className="text-sm text-gray-600">This action cannot be undone</p>
                  </div>
                </div>

                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    Are you sure you want to delete your face recognition data? 
                    You will need to re-register to use Face ID again.
                  </p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter your password to confirm:
                  </label>
                  <div className="relative">
                    <input
                      type={showDeletePassword ? 'text' : 'password'}
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 pr-10"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDeletePassword(!showDeletePassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    >
                      {showDeletePassword ? (
                        <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirmation(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteFaceData}
                    disabled={!deletePassword || isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileWithFaceID;
