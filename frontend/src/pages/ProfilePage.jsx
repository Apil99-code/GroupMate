import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useExpenseStore } from '../store/useExpenseStore';
import { useThemeStore } from '../store/useThemeStore';
import { 
  User, 
  Mail, 
  MapPin, 
  Globe, 
  Lock, 
  Bell, 
  Camera,
  CheckCircle,
  XCircle,
  Edit2,
  Save,
  Receipt,
  Palette,
  Moon,
  Sun,
  Layout,
  Columns,
  Grid,
  List
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const THEMES = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'forest', label: 'Forest', color: '#1eb854' },
  { id: 'cupcake', label: 'Cupcake', color: '#65c3c8' },
  { id: 'bumblebee', label: 'Bumblebee', color: '#e0a82e' },
  { id: 'emerald', label: 'Emerald', color: '#66cc8a' },
  { id: 'corporate', label: 'Corporate', color: '#4b6bfb' },
  { id: 'synthwave', label: 'Synthwave', color: '#e779c1' },
  { id: 'retro', label: 'Retro', color: '#ef9995' },
  { id: 'cyberpunk', label: 'Cyberpunk', color: '#ff7598' },
  { id: 'valentine', label: 'Valentine', color: '#e96d7b' },
  { id: 'aqua', label: 'Aqua', color: '#09ecf3' }
];

const LAYOUTS = [
  { id: 'default', label: 'Default', icon: Layout, description: 'Standard layout with sidebar' },
  { id: 'compact', label: 'Compact', icon: List, description: 'Condensed view with smaller elements' },
  { id: 'grid', label: 'Grid', icon: Grid, description: 'Grid-based layout for better overview' },
  { id: 'wide', label: 'Wide', icon: Columns, description: 'Full-width layout with expanded content' }
];

const ProfilePage = () => {
  const { authUser, updateProfile, sendOTP, verifyOTP } = useAuthStore();
  const { expenses } = useExpenseStore();
  const { theme, setTheme } = useThemeStore();
  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    bio: '',
    preferredDestinations: '',
    travelStyle: '',
    language: '',
    currency: '',
    theme: theme,
    layout: 'default',
    notifications: {
      tripUpdates: true,
      messages: true,
      expenses: true,
      location: true
    }
  });
  const [profilePic, setProfilePic] = useState(authUser?.profilePic || null);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const fileInputRef = useRef();
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    if (authUser) {
      setProfileData({
        username: authUser.username || '',
        email: authUser.email || '',
        bio: authUser.bio || '',
        preferredDestinations: authUser.preferredDestinations || '',
        travelStyle: authUser.travelStyle || '',
        language: authUser.language || 'English',
        currency: authUser.currency || 'USD',
        theme: theme,
        layout: authUser.layout || 'default',
        notifications: authUser.notifications || {
          tripUpdates: true,
          messages: true,
          expenses: true,
          location: true
        }
      });
    }
  }, [authUser, theme]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateProfile(profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleThemeChange = (themeId) => {
    setTheme(themeId);
    setProfileData(prev => ({ ...prev, theme: themeId }));
  };

  const handleLayoutChange = (layoutId) => {
    setProfileData(prev => ({ ...prev, layout: layoutId }));
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleProfilePicChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress the image before setting it
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with 0.8 quality
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setProfilePic(compressedDataUrl);
          setProfileData(prev => ({ ...prev, profilePic: compressedDataUrl }));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendOtp = async () => {
    try {
      await sendOTP(profileData.email);
      toast.success('OTP sent to your email');
      setOtpSent(true);
    } catch (error) {
      toast.error(error.message || 'Failed to send OTP');
    }
  };

  const handlePasswordChange = async () => {
    if (!otp) {
      toast.error('Please enter the OTP sent to your email');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      // First verify the OTP
      const token = await verifyOTP(profileData.email, otp);

      // Then update the password
      await updateProfile({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        token
      });

      toast.success('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setOtp('');
      setOtpSent(false);
    } catch (error) {
      toast.error(error.message || 'Failed to change password');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="card bg-base-100 shadow-xl mb-8">
          <div className="card-body">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-24 h-24 object-cover rounded-full" />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
                <button
                  type="button"
                  className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full"
                  onClick={() => fileInputRef.current.click()}
                  title="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleProfilePicChange}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{profileData.username}</h1>
                  {authUser?.isEmailVerified ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <XCircle className="w-5 h-5 text-error" />
                  )}
                </div>
                <p className="text-gray-600">{profileData.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Username</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    className="input input-bordered w-full"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Email</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={profileData.email}
                      className="input input-bordered w-full"
                      disabled
                    />
                  </div>
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Bio</span>
                  </label>
                  <textarea
                    value={profileData.bio}
                    onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                    className="textarea textarea-bordered w-full"
                    placeholder="Tell us about yourself..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Appearance Settings */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-6">
                <Palette className="w-5 h-5" />
                <h2 className="text-xl font-bold">Appearance Settings</h2>
              </div>

              {/* Theme Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold">Theme</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleThemeChange(theme.id)}
                      className={`btn btn-outline gap-2 ${
                        profileData.theme === theme.id ? 'btn-primary' : ''
                      }`}
                    >
                      {theme.icon ? (
                        <theme.icon className="w-4 h-4" />
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: theme.color }}
                        />
                      )}
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Layout Selection */}
              <div className="space-y-4 mt-8">
                <h3 className="font-semibold">Layout</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LAYOUTS.map((layout) => (
                    <button
                      key={layout.id}
                      type="button"
                      onClick={() => handleLayoutChange(layout.id)}
                      className={`btn btn-outline gap-4 justify-start normal-case ${
                        profileData.layout === layout.id ? 'btn-primary' : ''
                      }`}
                    >
                      <layout.icon className="w-4 h-4" />
                      <div className="flex flex-col items-start">
                        <span>{layout.label}</span>
                        <span className="text-xs opacity-70">{layout.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-sm text-base-content/70 mt-4">
                Choose your preferred color theme and layout. Changes will be saved when you click "Save Changes".
              </p>
            </div>
          </div>

          {/* Travel Preferences */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-4">Travel Preferences</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Preferred Destinations</span>
                  </label>
                  <input
                    type="text"
                    value={profileData.preferredDestinations}
                    onChange={(e) => setProfileData({ ...profileData, preferredDestinations: e.target.value })}
                    className="input input-bordered w-full"
                    placeholder="e.g., Europe, Asia, Americas"
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Travel Style</span>
                  </label>
                  <select
                    value={profileData.travelStyle}
                    onChange={(e) => setProfileData({ ...profileData, travelStyle: e.target.value })}
                    className="select select-bordered w-full"
                  >
                    <option value="">Select travel style</option>
                    <option value="budget">Budget</option>
                    <option value="comfort">Comfort</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">
                      <span className="label-text">Language</span>
                    </label>
                    <select
                      value={profileData.language}
                      onChange={(e) => setProfileData({ ...profileData, language: e.target.value })}
                      className="select select-bordered w-full"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">
                      <span className="label-text">Currency</span>
                    </label>
                    <select
                      value={profileData.currency}
                      onChange={(e) => setProfileData({ ...profileData, currency: e.target.value })}
                      className="select select-bordered w-full"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Travel Stats */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="text-xl font-bold mb-4">Travel Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Total Trips</div>
                  <div className="stat-value">12</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Countries</div>
                  <div className="stat-value">8</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Total Expenses</div>
                  <div className="stat-value">${totalExpenses.toFixed(2)}</div>
                </div>
                <div className="stat bg-base-200 rounded-lg">
                  <div className="stat-title">Travel Days</div>
                  <div className="stat-value">45</div>
                </div>
              </div>
            </div>
          </div>
          {/* Save Changes Button */}
          <div className="flex justify-end gap-4">
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
        
        {/* Change Password Section */}
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex items-center gap-2 mb-6">
                <Lock className="w-5 h-5" />
                <h2 className="text-xl font-bold">Change Password</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text">Current Password</span>
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">New Password</span>
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <div>
                  <label className="label">
                    <span className="label-text">Confirm New Password</span>
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="input input-bordered w-full"
                    required
                  />
                </div>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="label">
                      <span className="label-text">OTP</span>
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="input input-bordered w-full"
                      required
                      placeholder="Enter OTP"
                    />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={handleSendOtp} disabled={otpSent}>
                    {otpSent ? 'OTP Sent' : 'Send OTP'}
                  </button>
                </div>
                <button type="button" onClick={handlePasswordChange} className="btn btn-primary">Change Password</button>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
};

export default ProfilePage;
