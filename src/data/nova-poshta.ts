import type { NovaPoshtaPickupKind } from '../types/delivery';

export type NovaPoshtaPickupPoint = {
  id: string;
  label: string;
  address: string;
  pickupKind: NovaPoshtaPickupKind;
};

export type NovaPoshtaCityDirectory = {
  city: string;
  region: string;
  pickupPoints: NovaPoshtaPickupPoint[];
};

export const novaPoshtaDirectory: NovaPoshtaCityDirectory[] = [
  {
    city: 'Київ',
    region: 'Київська область',
    pickupPoints: [
      {
        id: 'kyiv-branch-12',
        label: 'Відділення №12',
        address: 'вул. Антоновича, 54',
        pickupKind: 'branch',
      },
      {
        id: 'kyiv-branch-48',
        label: 'Відділення №48',
        address: 'просп. Берестейський, 67',
        pickupKind: 'branch',
      },
      {
        id: 'kyiv-postomat-301',
        label: 'Поштомат №301',
        address: 'ТРЦ Respublika Park, Кільцева дорога, 1',
        pickupKind: 'postomat',
      },
    ],
  },
  {
    city: 'Львів',
    region: 'Львівська область',
    pickupPoints: [
      {
        id: 'lviv-branch-7',
        label: 'Відділення №7',
        address: 'вул. Городоцька, 174',
        pickupKind: 'branch',
      },
      {
        id: 'lviv-branch-25',
        label: 'Відділення №25',
        address: 'вул. Зелена, 147',
        pickupKind: 'branch',
      },
      {
        id: 'lviv-postomat-88',
        label: 'Поштомат №88',
        address: 'ТРЦ Forum Lviv, вул. Під Дубом, 7Б',
        pickupKind: 'postomat',
      },
    ],
  },
  {
    city: 'Одеса',
    region: 'Одеська область',
    pickupPoints: [
      {
        id: 'odesa-branch-9',
        label: 'Відділення №9',
        address: 'вул. Балківська, 42',
        pickupKind: 'branch',
      },
      {
        id: 'odesa-branch-31',
        label: 'Відділення №31',
        address: 'вул. Академіка Корольова, 98',
        pickupKind: 'branch',
      },
      {
        id: 'odesa-postomat-44',
        label: 'Поштомат №44',
        address: 'ТЦ Riviera Shopping City, Південна дорога, 101А',
        pickupKind: 'postomat',
      },
    ],
  },
  {
    city: 'Дніпро',
    region: 'Дніпропетровська область',
    pickupPoints: [
      {
        id: 'dnipro-branch-4',
        label: 'Відділення №4',
        address: 'просп. Дмитра Яворницького, 111',
        pickupKind: 'branch',
      },
      {
        id: 'dnipro-branch-17',
        label: 'Відділення №17',
        address: 'вул. Набережна Перемоги, 86А',
        pickupKind: 'branch',
      },
      {
        id: 'dnipro-postomat-63',
        label: 'Поштомат №63',
        address: 'ТРЦ Мост-Сіті, вул. Королеви Єлизавети II, 2',
        pickupKind: 'postomat',
      },
    ],
  },
  {
    city: 'Харків',
    region: 'Харківська область',
    pickupPoints: [
      {
        id: 'kharkiv-branch-11',
        label: 'Відділення №11',
        address: 'просп. Науки, 27Б',
        pickupKind: 'branch',
      },
      {
        id: 'kharkiv-branch-26',
        label: 'Відділення №26',
        address: 'вул. Героїв Праці, 9',
        pickupKind: 'branch',
      },
      {
        id: 'kharkiv-postomat-52',
        label: 'Поштомат №52',
        address: 'ТРЦ Дафі, вул. Героїв Праці, 9',
        pickupKind: 'postomat',
      },
    ],
  },
];

export function getNovaPoshtaCity(city: string) {
  return (
    novaPoshtaDirectory.find(
      (item) => item.city.trim().toLowerCase() === city.trim().toLowerCase()
    ) ?? null
  );
}

export function getNovaPoshtaPickupPoints(city: string, pickupKind: NovaPoshtaPickupKind) {
  return getNovaPoshtaCity(city)?.pickupPoints.filter((item) => item.pickupKind === pickupKind) ?? [];
}

export function getNovaPoshtaPickupPoint(
  city: string,
  pickupKind: NovaPoshtaPickupKind,
  pickupPointId: string
) {
  return (
    getNovaPoshtaPickupPoints(city, pickupKind).find((item) => item.id === pickupPointId) ?? null
  );
}
