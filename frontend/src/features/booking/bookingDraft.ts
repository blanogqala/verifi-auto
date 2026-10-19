const storageKey = 'verifi-booking-draft-v1';

export type BookingDraft = {
  professional: { id?: string; name?: string; area?: string; type?: string; special?: string };
  vehicleId: string;
  date: string;
  time: string;
  description: string;
};

function cleanProfessional(value: any) {
  if (!value || typeof value !== 'object' || typeof value.name !== 'string' || !value.name.trim()) return null;
  return {
    id: typeof value.id === 'string' ? value.id : '',
    name: value.name.trim(),
    area: typeof value.area === 'string' ? value.area : '',
    type: typeof value.type === 'string' ? value.type : '',
    special: typeof value.special === 'string' ? value.special : '',
  };
}

export function readBookingDraft(): BookingDraft | null {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(storageKey) || '');
    const professional = cleanProfessional(parsed?.professional);
    if (!professional) return null;
    return {
      professional,
      vehicleId: typeof parsed.vehicleId === 'string' ? parsed.vehicleId : '',
      date: typeof parsed.date === 'string' ? parsed.date : '',
      time: typeof parsed.time === 'string' ? parsed.time : '09:00',
      description: typeof parsed.description === 'string' ? parsed.description : '',
    };
  } catch {
    return null;
  }
}

export function writeBookingDraft(draft: BookingDraft) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    /* The booking dialog still holds the current choices. */
  }
}

export function clearBookingDraft() {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* Closing the dialog still works. */
  }
}
