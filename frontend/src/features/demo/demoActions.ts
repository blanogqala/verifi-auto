import { phoneError, normalizePhone } from '../account/phoneNumber';
import { demoCustomerId } from '../admin/customerRecords';
import { grantHistoryAccess, revokeHistoryAccess, settleHistoryAccess } from '../garage/historyAccess';
import { transitionJob } from '../jobs/jobWorkflow';
import { deleteCustomerReview, saveCustomerReview } from '../reviews/customerReviews';
import { activeVehicles, textValue, uniqueVehicleId, vehicleSnapshot } from './links';

function customerIdOf(data: any) {
  return textValue(data?.settings?.id) || demoCustomerId;
}

export function createBooking(
  data: any,
  input: {
    professional: any;
    vehicle: any;
    date: string;
    time: string;
    description: string;
    customerId?: string;
    clientRequestId: string;
    now?: string;
  },
) {
  const requestId = textValue(input.clientRequestId);
  if (!requestId) throw Error('This request could not be identified.');
  const existing = (data.jobs || []).find((job: any) => job.clientRequestId === requestId);
  if (existing) return { data, job: existing, duplicate: true };
  const professionalId = textValue(input.professional?.id);
  const vehicle = activeVehicles(data.vehicles || []).find((item) => item.id === input.vehicle?.id);
  if (!professionalId || !input.professional?.name) throw Error('Choose a professional.');
  if (!vehicle) throw Error('Choose one of your active vehicles.');
  const description = textValue(input.description);
  if (description.length < 3) throw Error('Describe the symptoms or service you need.');
  if (!input.date || !input.time) throw Error('Choose a preferred date and time.');
  const now = input.now || new Date().toISOString();
  const customerId = input.customerId || customerIdOf(data);
  const label = vehicleSnapshot(vehicle);
  const job = {
    id: 'VA-' + Date.now().toString().slice(-7),
    clientRequestId: requestId,
    provider: input.professional.name,
    professionalId,
    vehicle: label,
    vehicleLabel: label,
    vehicleId: vehicle.id,
    registration: vehicle.registration,
    date: input.date,
    time: input.time,
    fee: input.professional.fee,
    description,
    status: 'Requested',
    accepted: false,
    items: [],
    notes: '',
    quoteApproved: false,
    paid: false,
    customerId,
    createdAt: now,
    events: [{ at: now, type: 'request', label: 'Assessment requested' }],
  };
  return {
    data: {
      ...data,
      jobs: [job, ...(data.jobs || [])],
      notifications: [
        { id: crypto.randomUUID(), text: 'Your sample assessment request was created.', read: false },
        ...(data.notifications || []),
      ],
    },
    job,
    duplicate: false,
  };
}

export function updateRequestedBooking(
  data: any,
  input: {
    bookingId: string;
    customerId: string;
    vehicleId: string;
    date: string;
    time: string;
    description: string;
  },
) {
  const job = (data.jobs || []).find((item: any) => item.id === input.bookingId);
  if (!job) throw Error('Booking not found.');
  const owner = textValue(job.customerId) || demoCustomerId;
  if (owner !== input.customerId) throw Error('Only the customer who made this request can edit it.');
  if (job.status !== 'Requested' || job.items?.length || job.quoteApproved || job.paid)
    throw Error('This request can only be edited before it is accepted.');
  const vehicle = activeVehicles(data.vehicles || []).find((item) => item.id === input.vehicleId);
  if (!vehicle) throw Error('Choose one of your active vehicles.');
  const description = textValue(input.description);
  if (description.length < 3) throw Error('Describe the symptoms or service you need.');
  if (!input.date || !input.time) throw Error('Choose a preferred date and time.');
  const label = vehicleSnapshot(vehicle);
  const next = {
    ...job,
    vehicle: label,
    vehicleLabel: label,
    vehicleId: vehicle.id,
    registration: vehicle.registration,
    date: input.date,
    time: input.time,
    description,
  };
  return {
    ...data,
    jobs: data.jobs.map((item: any) => (item.id === job.id ? next : item)),
  };
}

export function applyJobTransition(data: any, job: any, action: string, extra: any = {}) {
  const current = (data.jobs || []).find((item: any) => item.id === job?.id) || job;
  const changed = transitionJob(current, action, extra);
  const last = Array.isArray(changed.events) ? changed.events[changed.events.length - 1] : null;
  const at = last?.at || new Date().toISOString();
  let records = Array.isArray(data.records) ? data.records : [];
  if (action === 'pay' && !records.some((record: any) => record.id === changed.id)) {
    records = [
      {
        id: changed.id,
        title: 'Completed repair',
        date: at.slice(0, 10),
        vehicle: changed.vehicleLabel || changed.vehicle,
        vehicleLabel: changed.vehicleLabel || changed.vehicle,
        vehicleId: changed.vehicleId || '',
        professionalId: changed.professionalId || '',
        customerId: changed.customerId || '',
        mileage: extra.mileage || changed.completedMileage || 'Not recorded',
        notes: changed.completionNotes,
        provider: changed.provider,
        source: 'mechanic',
      },
      ...records,
    ];
  }
  return {
    data: {
      ...data,
      jobs: (data.jobs || []).map((item: any) => (item.id === changed.id ? changed : item)),
      records,
      historyAccess: settleHistoryAccess(data, changed, action, at),
    },
    job: changed,
  };
}

export function saveCustomerProfile(
  data: any,
  input: { name: string; email: string; phone: string; emailUpdates: boolean; photo?: string },
) {
  const phoneMessage = phoneError(input.phone);
  if (phoneMessage) throw Error(phoneMessage);
  const name = textValue(input.name);
  const email = textValue(input.email);
  if (!name) throw Error('Enter your full name.');
  if (!email.includes('@')) throw Error('Enter an email address.');
  const phone = normalizePhone(input.phone);
  const id = customerIdOf(data);
  const settings = {
    ...data.settings,
    id,
    name,
    email,
    phone,
    emailUpdates: input.emailUpdates === true,
    photo: typeof input.photo === 'string' ? input.photo : data.settings?.photo || '',
  };
  const customers = (Array.isArray(data.customers) ? data.customers : []).map((customer: any) =>
    customer?.id === id ? { ...customer, name, email, phone, city: settings.city || customer.city } : customer,
  );
  const hasLinked = customers.some((customer: any) => customer?.id === id);
  return {
    ...data,
    settings,
    customers: hasLinked
      ? customers
      : [{ id, name, email, phone, city: settings.city || '', sample: true }, ...customers],
  };
}

export function saveVehicle(data: any, vehicle: any) {
  const next = {
    id: textValue(vehicle.id) || crypto.randomUUID(),
    make: textValue(vehicle.make),
    model: textValue(vehicle.model),
    year: String(vehicle.year || '').trim(),
    registration: textValue(vehicle.registration),
    mileage: String(vehicle.mileage ?? '').trim(),
    licenceDiscExpiry: textValue(vehicle.licenceDiscExpiry),
    licenceDiscSource: vehicle.licenceDiscSource === 'mechanic' ? 'mechanic' : 'owner',
    nextServiceDate: textValue(vehicle.nextServiceDate),
    nextServiceMileage: textValue(vehicle.nextServiceMileage),
    nextServiceSource: vehicle.nextServiceSource === 'mechanic' ? 'mechanic' : 'owner',
    archived: vehicle.archived === true,
  };
  if (!next.make || !next.model || !next.year || !next.registration) throw Error('Complete the vehicle details.');
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const exists = vehicles.some((item: any) => item.id === next.id);
  return {
    ...data,
    vehicles: exists ? vehicles.map((item: any) => (item.id === next.id ? { ...item, ...next } : item)) : [...vehicles, next],
  };
}

function vehicleHasHistory(data: any, vehicleId: string) {
  const vehicle = (data.vehicles || []).find((item: any) => item.id === vehicleId);
  const label = vehicleSnapshot(vehicle);
  const nameIsThisVehicle = uniqueVehicleId(label, data.vehicles || []) === vehicleId;
  const jobs = (data.jobs || []).some(
    (job: any) => job.vehicleId === vehicleId || (!job.vehicleId && nameIsThisVehicle && job.vehicle === label),
  );
  const records = (data.records || []).some(
    (record: any) =>
      record.vehicleId === vehicleId || (!record.vehicleId && nameIsThisVehicle && record.vehicle === label),
  );
  return jobs || records;
}

export function removeOrArchiveVehicle(data: any, vehicleId: string) {
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const vehicle = vehicles.find((item: any) => item.id === vehicleId);
  if (!vehicle) throw Error('Vehicle not found.');
  if (vehicleHasHistory(data, vehicleId)) {
    return {
      ...data,
      vehicles: vehicles.map((item: any) =>
        item.id === vehicleId ? { ...item, archived: true, archivedAt: new Date().toISOString() } : item,
      ),
    };
  }
  return { ...data, vehicles: vehicles.filter((item: any) => item.id !== vehicleId) };
}

export { grantHistoryAccess, revokeHistoryAccess, saveCustomerReview, deleteCustomerReview };
