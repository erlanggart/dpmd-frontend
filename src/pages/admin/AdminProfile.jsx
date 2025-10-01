import React from 'react';
import ProfileWithFaceID from '../../components/profile/ProfileWithFaceID';
import { useAuth } from '../../context/AuthContext';

const AdminProfile = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your account settings and Face ID authentication
          </p>
        </div>

        {/* Profile Component */}
        <ProfileWithFaceID user={user} />
      </div>
    </div>
  );
};

export default AdminProfile;
