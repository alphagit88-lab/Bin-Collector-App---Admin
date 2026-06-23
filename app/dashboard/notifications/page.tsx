'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';

interface Notification {
  id: number;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  type?: string;
  data?: any;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await api.get<{ notifications: Notification[] }>('/notifications');
      if (response.success && response.data) {
        setNotifications(response.data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      const response = await api.put(`/notifications/${id}/read`);
      if (response.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all');
      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        showToast('All notifications marked as read', 'success');
      }
    } catch (error) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-3 bg-red-100 text-red-600 text-sm py-1 px-3 rounded-full font-bold">
                  {unreadCount} New
                </span>
              )}
            </h1>
            <p className="text-gray-600 mt-1">Stay updated with your latest alerts</p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="mt-4 sm:mt-0 text-sm font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg transition-colors border border-green-200"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="dashboard-card rounded-lg p-12 bg-white shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">No Notifications Yet</h3>
              <p className="text-gray-500">When you receive an alert, it will show up here.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`dashboard-card rounded-xl p-6 shadow-sm border transition-all hover:shadow-md cursor-pointer ${
                  notification.is_read ? 'bg-white border-gray-100' : 'bg-green-50/30 border-green-200 relative overflow-hidden'
                }`}
                onClick={() => !notification.is_read && markAsRead(notification.id)}
              >
                {!notification.is_read && (
                  <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                )}
                
                <div className="flex items-start">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0 ${
                    notification.is_read ? 'bg-gray-100 text-gray-400' : 'bg-green-100 text-green-600'
                  }`}>
                    {notification.type === 'job_update' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1">
                      <h3 className={`text-lg font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      <span className="text-xs text-gray-400 font-medium whitespace-nowrap mt-1 sm:mt-0">
                        {new Date(notification.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                      {notification.body}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
