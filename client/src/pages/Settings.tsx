import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

export default function Settings() {
  const { profile } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankSettings, setBankSettings] = useState({
    bank_name: '',
    bank_account_name: '',
    bank_account_number: '',
    bank_swift_code: '',
    npwp: '',
    company_address: '',
    signatory_name: '',
    signatory_title: '',
  });

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  useEffect(() => {
    fetchLogoUrl();
    fetchSettings();
  }, []);

  const fetchLogoUrl = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'company_logo_url')
        .single();

      if (error) throw error;
      
      if (data?.setting_value) {
        setLogoUrl(data.setting_value);
      }
    } catch (error) {
      console.error('Error fetching logo:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .in('setting_key', [
          'bank_name',
          'bank_account_name',
          'bank_account_number',
          'bank_swift_code',
          'npwp',
          'company_address',
          'signatory_name',
          'signatory_title'
        ]);

      if (error) throw error;
      
      if (data) {
        const settingsMap: any = {};
        data.forEach(setting => {
          settingsMap[setting.setting_key] = setting.setting_value;
        });
        setBankSettings({
          bank_name: settingsMap.bank_name || '',
          bank_account_name: settingsMap.bank_account_name || '',
          bank_account_number: settingsMap.bank_account_number || '',
          bank_swift_code: settingsMap.bank_swift_code || '',
          npwp: settingsMap.npwp || '',
          company_address: settingsMap.company_address || '',
          signatory_name: settingsMap.signatory_name || '',
          signatory_title: settingsMap.signatory_title || '',
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    if (!isAdmin) {
      alert('You do not have permission to update settings');
      return;
    }

    try {
      setSaving(true);

      const updates = Object.entries(bankSettings).map(([key, value]) => ({
        setting_key: key,
        setting_value: value,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('company_settings')
          .update({ 
            setting_value: update.setting_value,
            updated_at: update.updated_at 
          })
          .eq('setting_key', update.setting_key);

        if (error) throw error;
      }

      alert('Settings saved successfully!');
      fetchSettings();
    } catch (error: any) {
      alert('Error saving settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `company-logo.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('company-assets')
            .remove([oldPath]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update company_settings
      const { error: updateError } = await supabase
        .from('company_settings')
        .update({ setting_value: publicUrl })
        .eq('setting_key', 'company_logo_url');

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      alert('Logo uploaded successfully!');
    } catch (error: any) {
      alert('Error uploading logo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteLogo = async () => {
    if (!confirm('Are you sure you want to delete the company logo?')) {
      return;
    }

    try {
      setUploading(true);

      if (logoUrl) {
        const path = logoUrl.split('/').pop();
        if (path) {
          await supabase.storage
            .from('company-assets')
            .remove([path]);
        }
      }

      // Clear from settings
      await supabase
        .from('company_settings')
        .update({ setting_value: '' })
        .eq('setting_key', 'company_logo_url');

      setLogoUrl('');
      alert('Logo deleted successfully!');
    } catch (error: any) {
      alert('Error deleting logo: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold text-white mb-8">Company Settings</h1>

        {!isAdmin && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to modify settings. Only ADMIN and MANAGER can update.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <>
            <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">Company Logo</h2>
            
            <div className="mb-6">
              <p className="text-sm text-white/70 mb-4">
                Upload your company logo to be used in invoices and official documents.
                Recommended size: 200x80 pixels. Max file size: 5MB.
              </p>

              {logoUrl && (
                <div className="mb-4 p-4 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">Current Logo:</p>
                  <img 
                    src={logoUrl} 
                    alt="Company Logo" 
                    className="max-h-20 object-contain"
                  />
                </div>
              )}

              {isAdmin && (
                <div className="flex gap-3">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <div className={`px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all text-center cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {uploading ? 'Uploading...' : logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </div>
                  </label>

                  {logoUrl && (
                    <button
                      onClick={handleDeleteLogo}
                      disabled={uploading}
                      className={`px-6 py-3 bg-gradient-to-br from-red-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Delete Logo
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>Note:</strong> The logo will be automatically used in all generated invoices and official documents.
              </p>
            </div>
          </div>

          {/* Bank Account Settings */}
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 mt-6">
            <h2 className="text-xl font-bold text-white mb-4">Bank Account & Company Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bankSettings.bank_name}
                  onChange={(e) => setBankSettings({ ...bankSettings, bank_name: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="e.g., MANDIRI"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bankSettings.bank_account_name}
                  onChange={(e) => setBankSettings({ ...bankSettings, bank_account_name: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="e.g., CV. DANISH KARYA UTAMA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  value={bankSettings.bank_account_number}
                  onChange={(e) => setBankSettings({ ...bankSettings, bank_account_number: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="e.g., 1090017703364"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Swift Code
                </label>
                <input
                  type="text"
                  value={bankSettings.bank_swift_code}
                  onChange={(e) => setBankSettings({ ...bankSettings, bank_swift_code: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="e.g., BMRIIDJA"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  NPWP
                </label>
                <input
                  type="text"
                  value={bankSettings.npwp}
                  onChange={(e) => setBankSettings({ ...bankSettings, npwp: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="e.g., 91.719.463.1-213.000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Company Address
                </label>
                <textarea
                  value={bankSettings.company_address}
                  onChange={(e) => setBankSettings({ ...bankSettings, company_address: e.target.value })}
                  disabled={!isAdmin}
                  rows={3}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="Company address for invoices"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Signatory Name
                </label>
                <input
                  type="text"
                  value={bankSettings.signatory_name}
                  onChange={(e) => setBankSettings({ ...bankSettings, signatory_name: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="Name of person signing invoices"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Signatory Title
                </label>
                <input
                  type="text"
                  value={bankSettings.signatory_title}
                  onChange={(e) => setBankSettings({ ...bankSettings, signatory_title: e.target.value })}
                  disabled={!isAdmin}
                  className="w-full px-4 py-2 bg-purple-900/30 border border-purple-500/30 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-neon-purple disabled:opacity-50"
                  placeholder="Title/Company of signatory"
                />
              </div>

              {isAdmin && (
                <button
                  onClick={handleSaveSettings}
                  disabled={saving}
                  className={`w-full px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <p className="text-sm text-blue-200">
                <strong>Note:</strong> These settings will be used in all generated invoices. Only ADMIN and MANAGER can modify these settings.
              </p>
            </div>
          </div>
          </>
        )}
      </div>
    </Layout>
  );
}
