import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Camera,
  Save,
  CheckCircle2,
  AlertCircle,
  Crown,
  Zap,
  Clock,
  Shield,
  Sparkles,
} from 'lucide-react';
import { User } from '../types';
import { updateProfile } from '../lib/api';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (user: User) => void;
  onOpenPlanModal: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUserUpdate,
  onOpenPlanModal,
}) => {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [profilePicture, setProfilePicture] = useState(user.profilePicture || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync state when user prop changes
  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setPhone(user.phone || '');
      setProfilePicture(user.profilePicture || '');
      setError('');
      setSuccess('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setProfilePicture(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await updateProfile(user.id, {
        name: name.trim(),
        phone: phone.trim(),
        profilePicture,
      });
      onUserUpdate(updated);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  // Plan info helpers
  const getPlanInfo = () => {
    if (user.plan === 'premium' && user.planStatus === 'active') {
      return { label: 'Premium', color: 'from-amber-400 to-orange-500', textColor: 'text-amber-400', icon: Crown, bgColor: 'bg-amber-950/40 border-amber-700/50' };
    }
    if (user.plan === 'standard' && user.planStatus === 'active') {
      return { label: 'Standard', color: 'from-sky-500 to-blue-600', textColor: 'text-sky-400', icon: Zap, bgColor: 'bg-sky-950/40 border-sky-700/50' };
    }
    if (user.plan === 'trial') {
      return { label: 'Free Trial', color: 'from-emerald-500 to-teal-600', textColor: 'text-emerald-400', icon: Sparkles, bgColor: 'bg-emerald-950/40 border-emerald-700/50' };
    }
    return { label: 'Expired', color: 'from-slate-500 to-slate-600', textColor: 'text-slate-400', icon: Clock, bgColor: 'bg-slate-800/40 border-slate-700/50' };
  };

  const planInfo = getPlanInfo();
  const PlanIcon = planInfo.icon;

  const trialDaysLeft = user.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / 86400000))
    : 0;

  const planDaysLeft = user.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(user.planExpiresAt).getTime() - Date.now()) / 86400000))
    : 0;

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Gradient top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-extrabold text-slate-900">My Profile</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Notifications */}
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden shrink-0 aspect-square border-4 border-emerald-100 shadow-lg bg-slate-100 flex items-center justify-center">
                {profilePicture ? (
                  <img
                    src={profilePicture}
                    alt="Profile"
                    className="w-full h-full object-cover shrink-0 aspect-square rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                    <span className="text-2xl font-black text-white">{initials}</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg border-2 border-white transition transform group-hover:scale-110 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">Click the camera icon to change photo</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                />
              </div>
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address
                <span className="ml-2 text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-semibold normal-case">
                  ✓ Verified
                </span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="e.g. +880 1XXXXXXXXX"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Current Plan Card */}
          {user.role === 'user' && (
            <div className={`mt-6 p-4 rounded-2xl border ${planInfo.bgColor}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${planInfo.color} shadow-lg`}>
                    <PlanIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900">{planInfo.label} Plan</div>
                    <div className="text-xs text-slate-500">
                      {user.plan === 'trial' && trialDaysLeft > 0 && `${trialDaysLeft} days remaining`}
                      {user.plan === 'trial' && trialDaysLeft === 0 && 'Trial expired'}
                      {(user.plan === 'standard' || user.plan === 'premium') && user.planStatus === 'active' && planDaysLeft > 0 && `${planDaysLeft} days remaining`}
                      {(user.plan === 'standard' || user.plan === 'premium') && user.planStatus === 'active' && planDaysLeft === 0 && 'Plan expired'}
                      {user.plan === 'expired' && 'Plan expired'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenPlanModal();
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {user.plan === 'premium' && user.planStatus === 'active' ? 'Renew' : 'Upgrade'}
                </button>
              </div>
            </div>
          )}

          {/* Account Details */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-0.5">Member Since</div>
                <div className="text-slate-900 font-bold">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-0.5">Total Logins</div>
                <div className="text-slate-900 font-bold">{user.totalLogins || 1}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-0.5">Currency</div>
                <div className="text-slate-900 font-bold">{user.currency || 'USD'}</div>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-slate-400 font-semibold mb-0.5">Role</div>
                <div className="text-slate-900 font-bold capitalize">{user.role.replace('_', ' ')}</div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full mt-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving…' : 'Save Changes'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
