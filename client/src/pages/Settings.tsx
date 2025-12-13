import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

export default function Settings() {
  const { profile } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  useEffect(() => {
    fetchLogoUrl();
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
        )}
      </div>
    </Layout>
  );
}
