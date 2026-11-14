/**
 * SokoOS React Native UI primitives — Sunset Savanna design system
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle, TextInputProps, Pressable,
  StyleProp,
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';
import { getInitials } from '../lib/format';

// ── Button ────────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg';

export function Button({
  label, onPress, variant = 'primary', size = 'md', loading = false, disabled = false,
  icon, fullWidth = false, style,
}: {
  label: string; onPress: () => void; variant?: BtnVariant; size?: BtnSize;
  loading?: boolean; disabled?: boolean; icon?: React.ReactNode; fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg: Record<BtnVariant, string> = {
    primary: Colors.sunset, secondary: Colors.surface, ghost: 'transparent', danger: Colors.danger,
  };
  const fg: Record<BtnVariant, string> = {
    primary: '#fff', secondary: Colors.ink, ghost: Colors.ink, danger: '#fff',
  };
  const border: Record<BtnVariant, string | undefined> = {
    primary: undefined, secondary: Colors.border, ghost: undefined, danger: undefined,
  };
  const h: Record<BtnSize, number> = { sm: 34, md: 44, lg: 52 };
  const fs: Record<BtnSize, number> = { sm: 13, md: 14, lg: 16 };
  const px: Record<BtnSize, number> = { sm: 12, md: 16, lg: 20 };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          height: h[size], backgroundColor: bg[variant],
          borderRadius: Radius.md, flexDirection: 'row',
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: px[size], gap: 8,
          ...(border[variant] ? { borderWidth: 1, borderColor: border[variant] } : {}),
          ...(fullWidth ? { width: '100%' } : {}),
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          ...Shadow.sm,
        },
        style as ViewStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg[variant]} />
      ) : (
        <>
          {icon}
          <Text style={{ color: fg[variant], fontSize: fs[size], fontWeight: '600', letterSpacing: -0.2 }}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({
  label, error, hint, leftIcon, rightIcon, style, ...props
}: TextInputProps & {
  label?: string; error?: string; hint?: string;
  leftIcon?: React.ReactNode; rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ gap: 5 }, style as ViewStyle]}>
      {label && (
        <Text style={styles.inputLabel}>{label}</Text>
      )}
      <View style={[styles.inputWrap, error ? { borderColor: Colors.danger } : {}]}>
        {leftIcon && <View style={styles.inputAddon}>{leftIcon}</View>}
        <TextInput
          style={[styles.inputField, leftIcon ? { paddingLeft: 40 } : {}, rightIcon ? { paddingRight: 40 } : {}]}
          placeholderTextColor={Colors.muted}
          {...props}
        />
        {rightIcon && <View style={[styles.inputAddon, { left: undefined, right: 12 }]}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
      {hint && !error && <Text style={styles.inputHint}>{hint}</Text>}
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style, padding = true }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: boolean;
}) {
  return (
    <View style={[styles.card, padding ? { padding: Spacing.base } : {}, style as ViewStyle]}>
      {children}
    </View>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';
const badgeColors: Record<BadgeTone, { bg: string; text: string }> = {
  success: { bg: Colors.successBg, text: Colors.success },
  warning: { bg: Colors.warningBg, text: Colors.warning },
  danger:  { bg: Colors.dangerBg,  text: Colors.danger },
  info:    { bg: Colors.infoBg,    text: Colors.info },
  neutral: { bg: Colors.neutralBg, text: Colors.muted },
};

export function Badge({ label, tone = 'neutral', style }: {
  label: string; tone?: BadgeTone; style?: StyleProp<ViewStyle>;
}) {
  const { bg, text } = badgeColors[tone];
  return (
    <View style={[{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full }, style as ViewStyle]}>
      <Text style={{ color: text, fontSize: 11, fontWeight: '600', letterSpacing: 0.1 }}>
        {label}
      </Text>
    </View>
  );
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${Colors.sunset}18`, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: Colors.sunset, fontSize: size * 0.36, fontWeight: '700' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, trend, accentColor = Colors.sunset }: {
  label: string; value: string; sub?: string;
  trend?: { value: string; positive: boolean };
  accentColor?: string;
}) {
  return (
    <Card style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.ink, marginTop: 4, letterSpacing: -0.5 }}>
        {value}
      </Text>
      {sub && <Text style={{ fontSize: 11, color: Colors.muted, marginTop: 2 }}>{sub}</Text>}
      {trend && (
        <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 4, color: trend.positive ? Colors.success : Colors.danger }}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </Text>
      )}
      <View style={{ position: 'absolute', right: Spacing.base, top: Spacing.base, width: 32, height: 32, borderRadius: 8, backgroundColor: `${accentColor}18`, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: accentColor }} />
      </View>
    </Card>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
      <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.ink, letterSpacing: -0.3 }}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ fontSize: 13, color: Colors.sunset, fontWeight: '600' }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, description, action }: {
  icon?: string; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing['2xl'] }}>
      <Text style={{ fontSize: 48, marginBottom: Spacing.md }}>{icon}</Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.ink, textAlign: 'center' }}>{title}</Text>
      {description && (
        <Text style={{ fontSize: 13, color: Colors.muted, textAlign: 'center', marginTop: 6, lineHeight: 20 }}>{description}</Text>
      )}
      {action && <View style={{ marginTop: Spacing.base }}>{action}</View>}
    </View>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────
export function Row({ label, value, valueColor, border = true }: {
  label: string; value: string | React.ReactNode; valueColor?: string; border?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, ...(border ? { borderBottomWidth: 1, borderBottomColor: Colors.border } : {}) }}>
      <Text style={{ fontSize: 13, color: Colors.muted }}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={{ fontSize: 13, fontWeight: '600', color: valueColor ?? Colors.ink }}>{value}</Text>
      ) : value}
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider({ margin = Spacing.md }: { margin?: number }) {
  return <View style={{ height: 1, backgroundColor: Colors.border, marginVertical: margin }} />;
}

// ── Spinner overlay ───────────────────────────────────────────────────────────
export function Loader({ overlay = false }: { overlay?: boolean }) {
  if (overlay) {
    return (
      <View style={StyleSheet.absoluteFillObject}>
        <View style={{ flex: 1, backgroundColor: 'rgba(251,245,238,0.85)', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={Colors.sunset} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] }}>
      <ActivityIndicator size="large" color={Colors.sunset} />
    </View>
  );
}

// ── Screen wrapper ────────────────────────────────────────────────────────────
export function Screen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flex: 1, backgroundColor: Colors.sand }, style as ViewStyle]}>
      {children}
    </View>
  );
}

// ── Page header ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, right }: {
  title: string; subtitle?: string; right?: React.ReactNode;
}) {
  return (
    <View style={{ paddingHorizontal: Spacing.base, paddingTop: Spacing.base, paddingBottom: Spacing.sm, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 24, fontWeight: '800', color: Colors.ink, letterSpacing: -0.5 }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 13, color: Colors.muted, marginTop: 2 }}>{subtitle}</Text>}
      </View>
      {right && <View style={{ marginLeft: Spacing.sm }}>{right}</View>}
    </View>
  );
}

// ── Tab Bar ───────────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange }: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: Colors.peach, borderRadius: Radius.md, padding: 3, margin: Spacing.base, marginTop: 0 }}>
      {tabs.map(tab => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onChange(tab.key)}
          style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderRadius: Radius.sm - 2, backgroundColor: active === tab.key ? Colors.surface : 'transparent', alignItems: 'center', ...(active === tab.key ? Shadow.sm : {}) }}
        >
          <Text style={{ fontSize: 12, fontWeight: '600', color: active === tab.key ? Colors.ink : Colors.muted }}>
            {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.sm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 2,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputField: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 14,
    color: Colors.ink,
    minHeight: 44,
  },
  inputAddon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  inputError: {
    fontSize: 12,
    color: Colors.danger,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.muted,
  },
});
