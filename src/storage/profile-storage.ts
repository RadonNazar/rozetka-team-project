import AsyncStorage from '@react-native-async-storage/async-storage';

import type { UserProfile } from '../types/auth';
import type { NovaPoshtaDeliveryDetails } from '../types/delivery';

const PROFILES_STORAGE_KEY = 'rozetka-team-project:profiles';

function isValidNovaPoshtaDeliveryDetails(
  value: Partial<NovaPoshtaDeliveryDetails>
): value is NovaPoshtaDeliveryDetails {
  return (
    value.provider === 'nova_poshta' &&
    typeof value.city === 'string' &&
    (value.pickupKind === 'branch' || value.pickupKind === 'postomat') &&
    typeof value.pickupPointId === 'string' &&
    typeof value.pickupPointLabel === 'string' &&
    typeof value.pickupPointAddress === 'string'
  );
}

function isValidStoredProfile(value: Partial<UserProfile>): value is UserProfile {
  return (
    typeof value.email === 'string' &&
    typeof value.fullName === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.city === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.novaPoshta === undefined ||
      (value.novaPoshta !== null &&
        typeof value.novaPoshta === 'object' &&
        isValidNovaPoshtaDeliveryDetails(value.novaPoshta)))
  );
}

async function loadProfiles() {
  try {
    const rawValue = await AsyncStorage.getItem(PROFILES_STORAGE_KEY);

    if (!rawValue) {
      return [] as UserProfile[];
    }

    const parsedValue = JSON.parse(rawValue) as unknown;

    if (!Array.isArray(parsedValue)) {
      await AsyncStorage.removeItem(PROFILES_STORAGE_KEY);
      return [] as UserProfile[];
    }

    const profiles = parsedValue.filter((item): item is UserProfile => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      return isValidStoredProfile(item as Partial<UserProfile>);
    });

    if (profiles.length !== parsedValue.length) {
      await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    }

    return profiles;
  } catch {
    await AsyncStorage.removeItem(PROFILES_STORAGE_KEY);
    return [] as UserProfile[];
  }
}

export async function loadUserProfile(email: string) {
  const profiles = await loadProfiles();
  const normalizedEmail = email.trim().toLowerCase();

  return (
    profiles.find((profile) => profile.email.trim().toLowerCase() === normalizedEmail) ?? null
  );
}

export async function saveUserProfile(profile: UserProfile) {
  const profiles = await loadProfiles();
  const normalizedEmail = profile.email.trim().toLowerCase();
  const nextProfile = {
    ...profile,
    email: normalizedEmail,
  };
  const profileIndex = profiles.findIndex(
    (item) => item.email.trim().toLowerCase() === normalizedEmail
  );

  if (profileIndex === -1) {
    await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify([...profiles, nextProfile]));
    return;
  }

  const updatedProfiles = [...profiles];
  updatedProfiles[profileIndex] = nextProfile;
  await AsyncStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(updatedProfiles));
}
