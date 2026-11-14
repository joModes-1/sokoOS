import React, { useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme';

export default function SplashScreen({ navigation }: any) {
  const opacity = new Animated.Value(0);
  const scale = new Animated.Value(0.85);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('sokoos_access_token');
        const businessId = await AsyncStorage.getItem('sokoos_business_id');
        if (token && businessId) {
          navigation.reset({ index: 0, routes: [{ name: 'App' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
        }
      } catch {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    }, 1800);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ alignItems: 'center', opacity, transform: [{ scale }] }}>
        {/* Logo mark */}
        <View style={styles.logoBox}>
          <Text style={styles.logoLetter}>S</Text>
        </View>
        <Text style={styles.logoText}>SokoOS</Text>
        <Text style={styles.tagline}>Business OS for Uganda</Text>
      </Animated.View>

      <View style={styles.bottom}>
        <Text style={styles.poweredBy}>Powered by SokoOS · Made for Uganda</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.sidebarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: Colors.sunset,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.sunset,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoLetter: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -2,
  },
  logoText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tagline: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    marginTop: 8,
    letterSpacing: 0.3,
  },
  bottom: {
    position: 'absolute',
    bottom: 48,
  },
  poweredBy: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
});
