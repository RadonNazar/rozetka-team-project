export type NovaPoshtaPickupKind = 'branch' | 'postomat';

export type NovaPoshtaDeliveryDetails = {
  provider: 'nova_poshta';
  city: string;
  pickupKind: NovaPoshtaPickupKind;
  pickupPointId: string;
  pickupPointLabel: string;
  pickupPointAddress: string;
};
