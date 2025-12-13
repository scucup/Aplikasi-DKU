import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

type NotificationStatus = 'UNREAD' | 'READ' | 'ARCHIVED';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  notification_type: string;
  reference_id: string | null;
  reference_type: string | null;
  status: NotificationStatus;
  created_at: string;
  read_at: string | null;
}

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationStatus | 'ALL'>('UNREAD');

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (filter !== 'ALL') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          status: 'READ',
          read_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      alert('Error updating notification: ' + error.message);
    }
  };

  const archiveNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'ARCHIVED' })
        .eq('id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      alert('Error archiving notification: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNREAD':
        return 'bg-yellow-100 text-yellow-800';
      case 'READ':
        return 'bg-blue-100 text-blue-800';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE_ORDER_CREATED':
        return '🛒';
      case 'EXPENSE_APPROVAL_NEEDED':
        return '💰';
      case 'MAINTENANCE_DUE':
        return '🔧';
      case 'SPAREPART_REPLACEMENT':
        return '🔩';
      default:
        return '📢';
    }
  };

  const handleViewReference = (notification: Notification) => {
    // Mark as read first
    if (notification.status === 'UNREAD') {
      markAsRead(notification.id);
    }

    // Navigate to relevant page
    if (notification.reference_type === 'PURCHASE_ORDER') {
      navigate('/spareparts');
    } else if (notification.reference_type === 'EXPENSE') {
      navigate('/expenses');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-white/70 text-sm mt-1">
              {notifications.filter(n => n.status === 'UNREAD').length} unread notifications
            </p>
          </div>
          <div className="flex gap-2">
            {(['ALL', 'UNREAD', 'READ', 'ARCHIVED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  filter === status
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-purple-900/20 text-white/70 hover:bg-purple-900/30'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-12 border border-purple-500/20 text-center">
            <p className="text-white/50 text-lg">No notifications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const isUnread = notification.status === 'UNREAD';
              return (
                <div
                  key={notification.id}
                  className={`bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border transition-all ${
                    isUnread 
                      ? 'border-purple-500/50 shadow-lg shadow-purple-500/20' 
                      : 'border-purple-500/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="text-4xl">
                      {getNotificationIcon(notification.notification_type)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                        <span className="text-xs text-white/50">
                          {new Date(notification.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      
                      <h3 className={`text-lg font-bold mb-2 ${isUnread ? 'text-white' : 'text-white/70'}`}>
                        {notification.title}
                      </h3>
                      
                      <p className={`text-sm mb-3 ${isUnread ? 'text-white/90' : 'text-white/60'}`}>
                        {notification.message}
                      </p>
                      
                      {notification.reference_type && (
                        <div className="text-xs text-white/50">
                          Reference: {notification.reference_type}
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {notification.reference_type && (
                        <button
                          onClick={() => handleViewReference(notification)}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm whitespace-nowrap"
                        >
                          View
                        </button>
                      )}
                      {isUnread && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                        >
                          Mark as Read
                        </button>
                      )}
                      {notification.status === 'READ' && (
                        <button
                          onClick={() => archiveNotification(notification.id)}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm whitespace-nowrap"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
