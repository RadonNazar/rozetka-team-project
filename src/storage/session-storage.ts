import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthSession } from '../types/auth';

const SESSION_STORAGE_KEY = 'rozetka-team-project:session';

export async function loadSession() {
  try {
    const rawValue = await AsyncStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as Partial<AuthSession>;

    if (
      typeof parsedValue.email !== 'string' ||
      typeof parsedValue.loggedInAt !== 'string'
    ) {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }

    return {
      email: parsedValue.email,
      loggedInAt: parsedValue.loggedInAt,
    } satisfies AuthSession;
  } catch {
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

export async function saveSession(session: AuthSession) {
  await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearSession() {
  await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
}

