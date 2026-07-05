import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function SignInScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await signIn(email, password);
        if (err) { setError(err); return; }
        router.back();
      } else {
        const { error: err, needsConfirmation } = await signUp(email, password);
        if (err) { setError(err); return; }
        if (needsConfirmation) {
          setNotice('Check your email to confirm your account, then sign in.');
          setMode('signin');
        } else {
          router.back();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setGoogleLoading(true);
    try {
      const { error: err } = await signInWithGoogle();
      if (err) { setError(err); return; }
      router.back();
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.surface }]}>
      <SafeAreaView edges={['top']} style={styles.safeTop}>
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.closeBtn, { backgroundColor: colors.surfaceContainerLow }]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.onSurface }]}>
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            Sign in to sync your stack and health profile across devices.
          </Text>

          <TouchableOpacity
            style={[styles.googleBtn, { borderColor: colors.border, backgroundColor: colors.surfaceContainerLowest }]}
            onPress={handleGoogle}
            activeOpacity={0.85}
            disabled={googleLoading || loading}
          >
            {googleLoading
              ? <ActivityIndicator color={colors.onSurface} />
              : (
                <>
                  <MaterialIcons name="g-mobiledata" size={26} color={colors.onSurface} />
                  <Text style={[styles.googleBtnText, { color: colors.onSurface }]}>Continue with Google</Text>
                </>
              )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.outline }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.onSurface, backgroundColor: colors.surfaceContainerLowest }]}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.outline}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <Text style={[styles.label, { color: colors.onSurfaceVariant }]}>Password</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.onSurface, backgroundColor: colors.surfaceContainerLowest }]}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.outline}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
          />

          {error && <Text style={styles.errorText}>{error}</Text>}
          {notice && <Text style={[styles.noticeText, { color: colors.primary }]}>{notice}</Text>}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            activeOpacity={0.85}
            disabled={loading || googleLoading}
          >
            {loading
              ? <ActivityIndicator color="#ffffff" />
              : <Text style={styles.submitBtnText}>{mode === 'signin' ? 'Sign In' : 'Sign Up'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setNotice(null); }}
            activeOpacity={0.7}
            style={styles.switchModeBtn}
          >
            <Text style={[styles.switchModeText, { color: colors.onSurfaceVariant }]}>
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontWeight: '600' }}>
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeTop: {},
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 24, paddingBottom: 48 },
  title: {
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 13,
    marginBottom: 20,
  },
  googleBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 12,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    marginBottom: 16,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    color: '#dc2626',
    marginBottom: 12,
  },
  noticeText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    marginBottom: 12,
  },
  submitBtn: {
    borderRadius: 28,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  submitBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
    fontSize: 16,
    color: '#ffffff',
  },
  switchModeBtn: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchModeText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
  },
});
