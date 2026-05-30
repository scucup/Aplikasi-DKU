import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Users, UserCheck, UserX, Clock, Shield, Search, RefreshCw, Trash2 } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: 'ENGINEER' | 'ADMIN' | 'MANAGER';
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  updated_at: string;
}

export default function UserManagement() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, name, role, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: `Gagal memuat data user: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      setMessage({ type: 'success', text: `User "${userName}" berhasil disetujui dan sekarang dapat mengakses aplikasi.` });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Gagal menyetujui user: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (userId: string, userName: string) => {
    if (userId === profile?.id) {
      setMessage({ type: 'error', text: 'Anda tidak dapat menonaktifkan akun sendiri.' });
      return;
    }
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'SUSPENDED', updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      setMessage({ type: 'success', text: `User "${userName}" telah dinonaktifkan.` });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Gagal menonaktifkan user: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async (userId: string, userName: string) => {
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: 'ACTIVE', updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      setMessage({ type: 'success', text: `User "${userName}" telah diaktifkan kembali.` });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Gagal mengaktifkan user: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (userId === profile?.id) {
      setMessage({ type: 'error', text: 'Anda tidak dapat mengubah role sendiri.' });
      return;
    }
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      setMessage({ type: 'success', text: `Role user berhasil diubah ke ${newRole}.` });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Gagal mengubah role: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (userId === profile?.id) {
      setMessage({ type: 'error', text: 'Anda tidak dapat menghapus akun sendiri.' });
      return;
    }
    if (!window.confirm(`Apakah Anda yakin ingin menghapus user "${userName}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      setMessage({ type: 'success', text: `User "${userName}" berhasil dihapus.` });
      fetchUsers();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Gagal menghapus user: ${error.message}` });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || user.status === filterStatus;
    const matchRole = filterRole === 'all' || user.role === filterRole;
    return matchSearch && matchStatus && matchRole;
  });

  const pendingCount = users.filter(u => u.status === 'PENDING').length;
  const activeCount = users.filter(u => u.status === 'ACTIVE').length;
  const suspendedCount = users.filter(u => u.status === 'SUSPENDED').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-400 border border-green-600/30"><UserCheck className="w-3 h-3" />Aktif</span>;
      case 'PENDING':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-400 border border-yellow-600/30"><Clock className="w-3 h-3" />Menunggu</span>;
      case 'SUSPENDED':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-400 border border-red-600/30"><UserX className="w-3 h-3" />Nonaktif</span>;
      default:
        return null;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'MANAGER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-600/30"><Shield className="w-3 h-3" />Manager</span>;
      case 'ADMIN':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-600/30">Admin</span>;
      case 'ENGINEER':
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-600/20 text-slate-300 border border-slate-600/30">Engineer</span>;
      default:
        return null;
    }
  };

  // Access check
  if (profile?.role !== 'MANAGER') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
            <p className="text-slate-400">Halaman ini hanya dapat diakses oleh Manager.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-400" />
              User Management
            </h1>
            <p className="text-slate-400 text-sm mt-1">Kelola akses pengguna dan approval pendaftaran baru</p>
          </div>
          <button
            onClick={fetchUsers}
            className="flex items-center gap-2 px-4 py-2 bg-navy-700 hover:bg-navy-600 text-white rounded-lg text-sm font-medium transition-colors border border-navy-600/50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
            {message.text}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-navy-900 rounded-xl border border-navy-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-xs text-slate-400">Menunggu Approval</p>
              </div>
            </div>
          </div>
          <div className="bg-navy-900 rounded-xl border border-navy-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{activeCount}</p>
                <p className="text-xs text-slate-400">User Aktif</p>
              </div>
            </div>
          </div>
          <div className="bg-navy-900 rounded-xl border border-navy-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{suspendedCount}</p>
                <p className="text-xs text-slate-400">Dinonaktifkan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Approval Section */}
        {pendingCount > 0 && (
          <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Menunggu Persetujuan ({pendingCount})
            </h3>
            <div className="space-y-2">
              {users.filter(u => u.status === 'PENDING').map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-navy-900/80 rounded-lg p-3 border border-navy-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-yellow-600/30 flex items-center justify-center text-yellow-400 text-sm font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                    <div className="ml-2">{getRoleBadge(user.role)}</div>
                    <span className="text-xs text-slate-500">
                      Daftar: {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApprove(user.id, user.name)}
                      disabled={actionLoading === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Setujui
                    </button>
                    <button
                      onClick={() => handleSuspend(user.id, user.name)}
                      disabled={actionLoading === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Users Table */}
        <div className="bg-navy-900 rounded-xl border border-navy-700/50 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-navy-700/50">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama atau email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="PENDING">Menunggu</option>
                <option value="SUSPENDED">Nonaktif</option>
              </select>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">Semua Role</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
                <option value="ENGINEER">Engineer</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada user ditemukan</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-800/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">Terdaftar</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/50">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-navy-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                            user.status === 'ACTIVE' ? 'bg-blue-600 text-white' :
                            user.status === 'PENDING' ? 'bg-yellow-600/30 text-yellow-400' :
                            'bg-red-600/30 text-red-400'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.id === profile?.id ? (
                          getRoleBadge(user.role)
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleChangeRole(user.id, e.target.value)}
                            disabled={actionLoading === user.id}
                            className="px-2 py-1 bg-navy-800 border border-navy-600/50 rounded text-xs text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                          >
                            <option value="ENGINEER">Engineer</option>
                            <option value="ADMIN">Admin</option>
                            <option value="MANAGER">Manager</option>
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          {user.id !== profile?.id && (
                            <>
                              {user.status === 'PENDING' && (
                                <button
                                  onClick={() => handleApprove(user.id, user.name)}
                                  disabled={actionLoading === user.id}
                                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                                  title="Setujui"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {user.status === 'ACTIVE' && (
                                <button
                                  onClick={() => handleSuspend(user.id, user.name)}
                                  disabled={actionLoading === user.id}
                                  className="p-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded transition-colors disabled:opacity-50"
                                  title="Nonaktifkan"
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {user.status === 'SUSPENDED' && (
                                <button
                                  onClick={() => handleReactivate(user.id, user.name)}
                                  disabled={actionLoading === user.id}
                                  className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                                  title="Aktifkan Kembali"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(user.id, user.name)}
                                disabled={actionLoading === user.id}
                                className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
                                title="Hapus User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {user.id === profile?.id && (
                            <span className="text-xs text-slate-500 italic">Anda</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
