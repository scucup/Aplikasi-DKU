import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type NotificationStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED';

interface Notification {
  id: string;
  asset_id: string;
  sparepart_installation_id: string | null;
  notification_type: string;
  scheduled_date: string;
  title: string;
  message: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  completed_at: string | null;
  created_at: string;
  asset?: { name: string; serial_number: string | null };
  sparepart_installation?: {
    sparepart: { name: string; type: string; replacement_period: string };
  };
}

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationStatus | 'ALL'>('PENDING');

  const canManage = profile?.role === 'ENGINEER' || profile?.role === 'MANAGER';

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async () => {
    try {
      let query = supabase
        .from('maintenance_notifications')
        .select(`
          *,
          asset:assets(name, serial_number),
          sparepart_installation:sparepart_installations(
            sparepart:sparepart_master(name, type, replacement_period)
          )
        `)
        .order('scheduled_date', { ascending: true });

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

  const updateStatus = async (id: string, status: NotificationStatus) => {
    try {
      const { error } = await supabase
        .from('maintenance_notifications')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      fetchNotifications();
    } catch (error: any) {
      alert('Error updating notification: ' + error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'ACKNOWLEDGED':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (scheduledDate: string) => {
    return new Date(scheduledDate) < new Date();
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Maintenance Notifications</h1>
          <div className="flex gap-2">
            {(['ALL', 'PENDING', 'ACKNOWLEDGED', 'COMPLETED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-xl transition-all ${
                  filter === status
                    ? 'bg-orange-600 text-white shadow-neumorphic'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {!canManage && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You don't have permission to manage notifications. Only ENGINEER and MANAGER can update.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No notifications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => {
              const overdue = isOverdue(notification.scheduled_date);
              return (
                <div
                  key={notification.id}
                  className={`bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all ${
                    overdue && notification.status === 'PENDING' ? 'border-2 border-red-400' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                        {overdue && notification.status === 'PENDING' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            OVERDUE
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 mb-2">
                        {notification.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">{notification.message}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Asset:</span>{' '}
                          {(notification as any).asset?.name || '-'}
                          {(notification as any).asset?.serial_number && (
                            <span className="ml-2 font-mono text-xs">
                              ({(notification as any).asset.serial_number})
                            </span>
                          )}
                        </div>
                        {notification.sparepart_installation && (
                          <div>
                            <span className="font-medium">Sparepart:</span>{' '}
                            {(notification as any).sparepart_installation?.sparepart?.name || '-'}
                            <span className="text-xs text-gray-500 ml-1">
                              ({(notification as any).sparepart_installation?.sparepart?.type})
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Scheduled Date:</span>{' '}
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>
                            {new Date(notification.scheduled_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Priority:</span>{' '}
                          <span className={`font-medium ${
                            notification.priority === 'HIGH' ? 'text-red-600' :
                            notification.priority === 'MEDIUM' ? 'text-yellow-600' :
                            'text-green-600'
                          }`}>
                            {notification.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canManage && notification.status !== 'COMPLETED' && (
                      <div className="flex flex-col gap-2 ml-4">
                        {notification.status === 'PENDING' && (
                          <button
                            onClick={() => updateStatus(notification.id, 'ACKNOWLEDGED')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                          >
                            Acknowledge
                          </button>
                        )}
                        {notification.status === 'ACKNOWLEDGED' && (
                          <button
                            onClick={() => updateStatus(notification.id, 'COMPLETED')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    )}
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
