import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Switch } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { Button, Input, Card, Loader } from '../../components/UI';
import { api } from '../../lib/api';

export default function BusinessSettingsScreen() {
  const [biz, setBiz] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/businesses/settings').then(setBiz).catch(() => {
      setBiz({ name: 'Nakato Traders Ltd', type: 'RETAIL', phone: '+256 752 000001', email: 'info@nakatotraders.ug', address: '23 Kampala Road, Kampala', settings: { allowNegativeStock: false, requireApprovalForTransfers: true, taxRegistrationNumber: '1000234567' } });
    }).finally(() => setLoading(false));
  }, []);

  async function onSave() {
    setSaving(true);
    try {
      await api.patch('/businesses/settings', biz);
      Alert.alert('Saved', 'Business settings updated');
    } catch (e: any) {
      Alert.alert('Failed', e.message ?? 'Save failed');
    }
    setSaving(false);
  }

  if (loading) return <Loader />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.sand }} contentContainerStyle={{ padding: Spacing.base, gap: Spacing.base, paddingBottom: 32 }}>
      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.base }}>Business profile</Text>
        <View style={{ gap: Spacing.md }}>
          <Input label="Business name" value={biz?.name ?? ''} onChangeText={v => setBiz({ ...biz, name: v })} />
          <Input label="Phone" value={biz?.phone ?? ''} onChangeText={v => setBiz({ ...biz, phone: v })} keyboardType="phone-pad" />
          <Input label="Email" value={biz?.email ?? ''} onChangeText={v => setBiz({ ...biz, email: v })} keyboardType="email-address" autoCapitalize="none" />
          <Input label="Address" value={biz?.address ?? ''} onChangeText={v => setBiz({ ...biz, address: v })} />
          <Input label="Tax registration number (TIN)" value={biz?.settings?.taxRegistrationNumber ?? ''} onChangeText={v => setBiz({ ...biz, settings: { ...biz.settings, taxRegistrationNumber: v } })} keyboardType="number-pad" />
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink, marginBottom: Spacing.base }}>Operational settings</Text>
        <View style={{ gap: Spacing.base }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: Spacing.base }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>Allow negative stock</Text>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>Sell items even when stock is zero</Text>
            </View>
            <Switch
              value={biz?.settings?.allowNegativeStock ?? false}
              onValueChange={v => setBiz({ ...biz, settings: { ...biz.settings, allowNegativeStock: v } })}
              trackColor={{ false: Colors.border, true: Colors.sunset }}
              thumbColor="#fff"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: Spacing.base }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.ink }}>Require transfer approval</Text>
              <Text style={{ fontSize: 12, color: Colors.muted, marginTop: 2 }}>Managers must approve stock transfers</Text>
            </View>
            <Switch
              value={biz?.settings?.requireApprovalForTransfers ?? true}
              onValueChange={v => setBiz({ ...biz, settings: { ...biz.settings, requireApprovalForTransfers: v } })}
              trackColor={{ false: Colors.border, true: Colors.sunset }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </Card>

      <Button label="Save changes" onPress={onSave} loading={saving} fullWidth />
    </ScrollView>
  );
}
