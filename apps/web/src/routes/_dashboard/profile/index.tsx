import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  useCurrentUser,
  useUpdateProfile,
  useUpdatePreferences,
  COMMON_LANGUAGES,
} from '@menucraft/api-client';
import { useUser } from '@/hooks/use-auth';
import { useState, useEffect } from 'react';
import { Loader2, User as UserIcon, Globe, Bell, Save } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export const Route = createFileRoute('/_dashboard/profile/')({
  component: ProfilePage,
});

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Sao_Paulo', label: 'Brasilia Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Europe/Moscow', label: 'Moscow' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Kolkata', label: 'India' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'China' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

function ProfilePage() {
  const { user: authUser, firstName: authFirstName, lastName: authLastName, fullName, imageUrl, primaryEmailAddress } = useUser();
  const { data: user, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();

  // Basic info state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Preferences state
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [emailOnMenuPublish, setEmailOnMenuPublish] = useState(true);
  const [emailWeeklyDigest, setEmailWeeklyDigest] = useState(true);
  const [emailProductUpdates, setEmailProductUpdates] = useState(true);

  // Load data when user is fetched
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setLanguage(user.preferences?.language || 'en');
      setTimezone(user.preferences?.timezone || 'UTC');
      setEmailOnMenuPublish(user.preferences?.notifications?.emailOnMenuPublish ?? true);
      setEmailWeeklyDigest(user.preferences?.notifications?.emailWeeklyDigest ?? true);
      setEmailProductUpdates(user.preferences?.notifications?.emailProductUpdates ?? true);
    }
  }, [user]);

  const handleSaveProfile = () => {
    updateProfile.mutate(
      {
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Profile updated',
            description: 'Your profile information has been saved.',
            variant: 'success',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to update profile',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSavePreferences = () => {
    updatePreferences.mutate(
      {
        language,
        timezone,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Preferences saved',
            description: 'Your preferences have been updated.',
            variant: 'success',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to save preferences',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleSaveNotifications = () => {
    updatePreferences.mutate(
      {
        notifications: {
          emailOnMenuPublish,
          emailWeeklyDigest,
          emailProductUpdates,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: 'Notification settings saved',
            description: 'Your notification preferences have been updated.',
            variant: 'success',
          });
        },
        onError: (error) => {
          toast({
            title: 'Failed to save notification settings',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = authUser
    ? `${authFirstName?.[0] || ''}${authLastName?.[0] || ''}`.toUpperCase() ||
      primaryEmailAddress?.emailAddress?.[0]?.toUpperCase()
    : 'U';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">Manage your personal information and preferences</p>
      </div>

      <div className="grid gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={imageUrl || undefined} alt={fullName || ''} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">Profile Photo</p>
                <p className="text-xs text-muted-foreground">
                  Avatar synced with your Google account
                </p>
              </div>
            </div>

            {/* Name fields */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first-name">First Name</Label>
                <Input
                  id="first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
                />
              </div>
            </div>

            {/* Email (readonly) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={primaryEmailAddress?.emailAddress || user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email address cannot be changed
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} disabled={updateProfile.isPending}>
                {updateProfile.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Profile
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger id="language">
                    <SelectValue placeholder="Select a language" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name} ({lang.nativeName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue placeholder="Select a timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSavePreferences} disabled={updatePreferences.isPending}>
                {updatePreferences.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage your email notification settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-menu-publish">Menu publish notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive an email when a menu is published
                  </p>
                </div>
                <Switch
                  id="email-menu-publish"
                  checked={emailOnMenuPublish}
                  onCheckedChange={setEmailOnMenuPublish}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-weekly-digest">Weekly digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Get a weekly summary of your menu analytics
                  </p>
                </div>
                <Switch
                  id="email-weekly-digest"
                  checked={emailWeeklyDigest}
                  onCheckedChange={setEmailWeeklyDigest}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-product-updates">Product updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive news about new features and improvements
                  </p>
                </div>
                <Switch
                  id="email-product-updates"
                  checked={emailProductUpdates}
                  onCheckedChange={setEmailProductUpdates}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveNotifications} disabled={updatePreferences.isPending}>
                {updatePreferences.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Notification Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
