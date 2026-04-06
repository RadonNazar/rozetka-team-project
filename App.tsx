import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartScreen } from './src/screens/cart-screen';
import { ChangePasswordScreen } from './src/screens/change-password-screen';
import { HomeScreen } from './src/screens/home-screen';
import { LoginScreen } from './src/screens/login-screen';
import { ProfileScreen } from './src/screens/profile-screen';
import { RecoveryScreen } from './src/screens/recovery-screen';
import { RegisterScreen } from './src/screens/register-screen';
import { clearSession, loadSession, saveSession } from './src/storage/session-storage';
import { loadRegisteredUsers, saveRegisteredUsers } from './src/storage/users-storage';
import { colors } from './src/theme/colors';
import type { AuthActionResult, AuthSession, RegisteredUser } from './src/types/auth';

type AuthScreen = 'login' | 'register' | 'recovery';
type CabinetScreen = 'home' | 'profile' | 'change-password' | 'cart';

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [lastEmail, setLastEmail] = useState('');
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');
  const [loginNotice, setLoginNotice] = useState('');
  const [cabinetScreen, setCabinetScreen] = useState<CabinetScreen>('home');
  const [cabinetNotice, setCabinetNotice] = useState('');
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const hydrateSession = async () => {
      const storedSession = await loadSession();

      if (!isMounted) {
        return;
      }

      setSession(storedSession);
      setLastEmail(storedSession?.email ?? '');
      setIsHydrating(false);
    };

    void hydrateSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogin = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthActionResult> => {
    const users = await loadRegisteredUsers();
    const registeredUser = users.find(
      (user) => user.email.trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (!registeredUser) {
      return {
        ok: false,
        message: 'Користувача з таким email не знайдено. Спочатку створіть акаунт.',
      };
    }

    if (registeredUser.password !== password) {
      return {
        ok: false,
        message: 'Невірний пароль. Спробуйте ще раз.',
      };
    }

    const nextSession: AuthSession = {
      email: registeredUser.email,
      loggedInAt: new Date().toISOString(),
    };

    setLoginNotice('');
    setCabinetNotice('');
    setCabinetScreen('home');
    setLastEmail(nextSession.email);
    setSession(nextSession);
    await saveSession(nextSession);

    return { ok: true };
  };

  const handleRegister = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthActionResult> => {
    const users = await loadRegisteredUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const userExists = users.some(
      (user) => user.email.trim().toLowerCase() === normalizedEmail
    );

    if (userExists) {
      return {
        ok: false,
        message: 'Користувач з таким email уже існує. Увійдіть у свій акаунт.',
      };
    }

    const timestamp = new Date().toISOString();
    const nextUser: RegisteredUser = {
      email: normalizedEmail,
      password,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await saveRegisteredUsers([...users, nextUser]);

    const nextSession: AuthSession = {
      email: nextUser.email,
      loggedInAt: timestamp,
    };

    setLoginNotice('');
    setCabinetNotice('');
    setCabinetScreen('home');
    setLastEmail(nextUser.email);
    setSession(nextSession);
    await saveSession(nextSession);

    return { ok: true };
  };

  const handleRecoverPassword = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }): Promise<AuthActionResult> => {
    const users = await loadRegisteredUsers();
    const normalizedEmail = email.trim().toLowerCase();
    const userIndex = users.findIndex(
      (user) => user.email.trim().toLowerCase() === normalizedEmail
    );

    if (userIndex === -1) {
      return {
        ok: false,
        message: 'Користувача з таким email не знайдено. Спочатку створіть акаунт.',
      };
    }

    if (users[userIndex].password === password) {
      return {
        ok: false,
        message: 'Новий пароль має відрізнятися від поточного.',
      };
    }

    const updatedUsers = [...users];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      password,
      updatedAt: new Date().toISOString(),
    };

    await saveRegisteredUsers(updatedUsers);
    setLastEmail(normalizedEmail);
    setLoginNotice('Пароль оновлено. Тепер увійдіть з новим паролем.');
    setAuthScreen('login');

    return { ok: true };
  };

  const handleChangePassword = async ({
    currentPassword,
    nextPassword,
  }: {
    currentPassword: string;
    nextPassword: string;
  }): Promise<AuthActionResult> => {
    if (!session) {
      return {
        ok: false,
        message: 'Спочатку увійдіть у свій акаунт.',
      };
    }

    const users = await loadRegisteredUsers();
    const normalizedEmail = session.email.trim().toLowerCase();
    const userIndex = users.findIndex(
      (user) => user.email.trim().toLowerCase() === normalizedEmail
    );

    if (userIndex === -1) {
      return {
        ok: false,
        message: 'Користувача не знайдено. Спробуйте увійти ще раз.',
      };
    }

    if (users[userIndex].password !== currentPassword) {
      return {
        ok: false,
        message: 'Поточний пароль введено невірно.',
      };
    }

    if (currentPassword === nextPassword) {
      return {
        ok: false,
        message: 'Новий пароль має відрізнятися від поточного.',
      };
    }

    const updatedUsers = [...users];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      password: nextPassword,
      updatedAt: new Date().toISOString(),
    };

    await saveRegisteredUsers(updatedUsers);
    setCabinetNotice('Пароль успішно змінено. Нові дані вже активні.');
    setCabinetScreen('home');

    return { ok: true };
  };

  const handleProfileSaved = (message: string) => {
    setCabinetNotice(message);
    setCabinetScreen('home');
  };

  const handleLogout = async () => {
    setLastEmail(session?.email ?? lastEmail);
    setSession(null);
    setLoginNotice('');
    setCabinetNotice('');
    setCabinetScreen('home');
    setAuthScreen('login');
    await clearSession();
  };

  const openLogin = () => {
    setLoginNotice('');
    setAuthScreen('login');
  };

  const openRegister = () => {
    setLoginNotice('');
    setAuthScreen('register');
  };

  const openRecovery = () => {
    setLoginNotice('');
    setAuthScreen('recovery');
  };

  const openChangePassword = () => {
    setCabinetNotice('');
    setCabinetScreen('change-password');
  };

  const openProfile = () => {
    setCabinetNotice('');
    setCabinetScreen('profile');
  };

  const openCart = () => {
    setCabinetNotice('');
    setCabinetScreen('cart');
  };

  const openCabinetHome = () => {
    setCabinetNotice('');
    setCabinetScreen('home');
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {isHydrating ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : session ? (
        cabinetScreen === 'cart' ? (
          <CartScreen email={session.email} onBack={openCabinetHome} />
        ) : cabinetScreen === 'profile' ? (
          <ProfileScreen
            email={session.email}
            onBack={openCabinetHome}
            onSaved={handleProfileSaved}
          />
        ) : cabinetScreen === 'change-password' ? (
          <ChangePasswordScreen
            email={session.email}
            onChangePassword={handleChangePassword}
            onBack={openCabinetHome}
          />
        ) : (
          <HomeScreen
            session={session}
            notice={cabinetNotice}
            onOpenCart={openCart}
            onOpenProfile={openProfile}
            onOpenChangePassword={openChangePassword}
            onLogout={handleLogout}
          />
        )
      ) : authScreen === 'recovery' ? (
        <RecoveryScreen
          initialEmail={lastEmail}
          onRecoverPassword={handleRecoverPassword}
          onOpenLogin={openLogin}
          onOpenRegister={openRegister}
        />
      ) : authScreen === 'register' ? (
        <RegisterScreen
          initialEmail={lastEmail}
          onRegister={handleRegister}
          onOpenLogin={openLogin}
        />
      ) : (
        <LoginScreen
          initialEmail={lastEmail}
          notice={loginNotice}
          onLogin={handleLogin}
          onOpenRegister={openRegister}
          onOpenRecovery={openRecovery}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
});
