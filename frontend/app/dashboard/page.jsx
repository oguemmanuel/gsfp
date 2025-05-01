'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardLayout({ children, title }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    
    if (!storedUser) {
      router.push('/login');
      return;
    }
    
    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      
      // Verify session is still valid with backend
      verifySession();
    } catch (error) {
      console.error('Error parsing user data:', error);
      router.push('/signin');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const verifySession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        method: 'GET',
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        // Session expired or invalid
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Session verification error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/logout', {
        method: 'GET',
        credentials: 'include'
      });
      
      // Clear local storage
      localStorage.removeItem('user');
      
      // Redirect to login
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">{title || 'Dashboard'}</h1>
          
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <span className="text-sm text-gray-600">{user.email}</span>
                <button 
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Welcome message */}
      {user && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
            <div className="p-6 bg-white border-b border-gray-200">
              <h2 className="text-xl font-medium text-gray-900">Hi, {user.fullName}!</h2>
              <p className="mt-2 text-gray-600">
                Welcome to your {user.role} dashboard
              </p>
              
              {/* User information */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Your Information</h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Name:</span>
                    <p className="mt-1 text-sm text-gray-900">{user.fullName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Email:</span>
                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Role:</span>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{user.role}</p>
                  </div>
                  {user.schoolName && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">School:</span>
                      <p className="mt-1 text-sm text-gray-900">{user.schoolName}</p>
                    </div>
                  )}
                  {user.district && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">District:</span>
                      <p className="mt-1 text-sm text-gray-900">{user.district}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}