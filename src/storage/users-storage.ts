import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RegisteredUser } from '../types/auth';

const USERS_STORAGE_KEY = 'rozetka-team-project:users';

function isValidStoredUser(value: Partial<RegisteredUser>): value is RegisteredUser {
  return (
    typeof value.email === 'string' &&
    typeof value.password === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.updatedAt === 'string'
  );
}

export async function loadRegisteredUsers() {
  try {
    const rawValue = await AsyncStorage.getItem(USERS_STORAGE_KEY);

    if (!rawValue) {
      return [] as RegisteredUser[];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      await AsyncStorage.removeItem(USERS_STORAGE_KEY);
      return [] as RegisteredUser[];
    }

    const users = parsedValue.filter((item): item is RegisteredUser => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      return isValidStoredUser(item as Partial<RegisteredUser>);
    });

    if (users.length !== parsedValue.length) {
      await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    return users;
  } catch {
    await AsyncStorage.removeItem(USERS_STORAGE_KEY);
    return [] as RegisteredUser[];
  }
}

export async function saveRegisteredUsers(users: RegisteredUser[]) {
  await AsyncStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}
