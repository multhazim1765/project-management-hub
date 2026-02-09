import { useState, useEffect } from 'react';
import { organizationAPI } from '../services/api';
import { BuildingOfficeIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function OrganizationSettings() {
  const [organization, setOrganization] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    industry: '',
    size: '',
  });
  const [settings, setSettings] = useState({
    defaultTimezone: 'UTC',
    dateFormat: 'YYYY-MM-DD',
    timeFormat: '24h',
    weekStartsOn: 1,
    allowClientAccess: true,
  });

  useEffect(() => {
    loadOrganization();
  }, []);

  const loadOrganization = async () => {
    setLoading(true);
    try {
      const response = await organizationAPI.getMy();
      const org = response.data.data.organization;
      setOrganization(org);
      setFormData({
        name: org.name,
        description: org.description || '',
        website: org.website || '',
        industry: org.industry || '',
        size: org.size || '',
      });
      setSettings(org.settings || settings);
    } catch (error) {
      toast.error('Failed to load organization');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGeneral = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await organizationAPI.update(organization._id, formData);
      toast.success('Organization updated successfully');
      loadOrganization();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update organization');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await organizationAPI.updateSettings(organization._id, settings);
      toast.success('Settings updated successfully');
      loadOrganization();
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('logo', file);

    try {
      await organizationAPI.uploadLogo(organization._id, formData);
      toast.success('Logo uploaded successfully');
      loadOrganization();
    } catch (error) {
      toast.error('Failed to upload logo');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>;
  }

  if (!organization) {
    return <div className="text-center py-12 text-gray-500">No organization found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center justify-center w-16 h-16 bg-primary-100 rounded-lg">
                <BuildingOfficeIcon className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
                <p className="text-sm text-gray-500">Manage your organization profile and settings</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'general'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'settings'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Settings
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'general' && (
              <form onSubmit={handleUpdateGeneral} className="space-y-6">
                {/* Logo */}
                <div>
                  <label className="label">Organization Logo</label>
                  <div className="flex items-center space-x-4">
                    {organization.logo && (
                      <img
                        src={organization.logo}
                        alt="Logo"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="label">Organization Name</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="label">Description</label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="label">Website</label>
                  <input
                    type="url"
                    className="input"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                {/* Industry */}
                <div>
                  <label className="label">Industry</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="e.g., Technology, Healthcare"
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="label">Company Size</label>
                  <select
                    className="input"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  >
                    <option value="">Select size</option>
                    <option value="1-10">1-10 employees</option>
                    <option value="11-50">11-50 employees</option>
                    <option value="51-200">51-200 employees</option>
                    <option value="201-500">201-500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'settings' && (
              <form onSubmit={handleUpdateSettings} className="space-y-6">
                {/* Timezone */}
                <div>
                  <label className="label">Default Timezone</label>
                  <select
                    className="input"
                    value={settings.defaultTimezone}
                    onChange={(e) => setSettings({ ...settings, defaultTimezone: e.target.value })}
                  >
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time</option>
                    <option value="America/Chicago">Central Time</option>
                    <option value="America/Denver">Mountain Time</option>
                    <option value="America/Los_Angeles">Pacific Time</option>
                  </select>
                </div>

                {/* Date Format */}
                <div>
                  <label className="label">Date Format</label>
                  <select
                    className="input"
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  </select>
                </div>

                {/* Time Format */}
                <div>
                  <label className="label">Time Format</label>
                  <select
                    className="input"
                    value={settings.timeFormat}
                    onChange={(e) => setSettings({ ...settings, timeFormat: e.target.value })}
                  >
                    <option value="12h">12-hour</option>
                    <option value="24h">24-hour</option>
                  </select>
                </div>

                {/* Week Starts On */}
                <div>
                  <label className="label">Week Starts On</label>
                  <select
                    className="input"
                    value={settings.weekStartsOn}
                    onChange={(e) => setSettings({ ...settings, weekStartsOn: parseInt(e.target.value) })}
                  >
                    <option value="0">Sunday</option>
                    <option value="1">Monday</option>
                  </select>
                </div>

                {/* Client Access */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="label">Allow Client Access</label>
                    <p className="text-sm text-gray-500">Enable client portal for external clients</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.allowClientAccess}
                    onChange={(e) => setSettings({ ...settings, allowClientAccess: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Saving...' : 'Save Settings'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
