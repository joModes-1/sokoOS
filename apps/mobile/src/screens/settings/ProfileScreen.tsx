import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing } from '../../theme';
import { Button, Input, Card, Avatar } from '../../components/UI';
import { api } from '../../lib/api';

export default function ProfileScreen({ navigation }: any) {
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '' });
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.multiGet(['sokoos_user_name']).then(pairs => {
      setProfile(p => ({ ...p, fullName: pairs[0][1] ?? '' }));
    });
    api.get<any>('/auth/me').then(u => setProfile({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' })).catch(() => {});
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      await api.patch('/users/me', { fullName: profile.fullName, phone: profile.phone });
      Alert.alert('Saved', 'Profile updated');
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    }
    setSaving(false);
  }

  async function onChangePassword() {
    if (!currentPass || !newPass || newPass.length < 8) {
      Alert.alert('Required', 'Enter current password and new password (min 8 chars)');
      return;
    }
    try {
      await api.post('/auth/change-password', { currentPassword: currentPass, newPassword: newPass });
      Alert.alert('Done', 'Password changed');
      setCurrentPass('');
      setNewPass('');
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Password change failed');
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
      {/* Avatar */}
      <View style={{ alignItems: 'center', paddingVertical: Spacing.base }}>
        <Avatar name={profile.fullName || 'U'} size={72} />
        <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.ink, marginTop: Spacing.md, letterSpacing: -0.4 }}>{profile.fullName}</Text>
        <Text style={{ fontSize: 13, color: Colors.muted, marginTop: 4 }}>{profile.email}</Text>
      </View>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.base }}>Personal details</Text>
        <View style={{ gap: Spacing.md }}>
          <Input label="Full name" value={profile.fullName} onChangeText={v => setProfile({ ...profile, fullName: v })} />
          <Input label="Phone" value={profile.phone} onChangeText={v => setProfile({ ...profile, phone: v })} keyboardType="phone-pad" />
          <Input label="Email" value={profile.email} editable={false} style={{ opacity: 0.6 } as any} />
        </View>
        <Button label="Save changes" onPress={onSave} loading={saving} fullWidth style={{ marginTop: Spacing.base }} />
      </Card>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.base }}>Change password</Text>
        <View style={{ gap: Spacing.md }}>
          <Input label="Current password" value={currentPass} onChangeText={setCurrentPass} secureTextEntry />
          <Input label="New password" value={newPass} onChangeText={setNewPass} secureTextEntry hint="Min 8 characters" />
        </View>
        <Button label="Change password" onPress={onChangePassword} variant="secondary" fullWidth style={{ marginTop: Spacing.base }} />
      </Card>
    </ScrollView>
  );
}
