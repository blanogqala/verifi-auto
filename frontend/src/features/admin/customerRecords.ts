/** Stable id for the existing demo customer. Jobs without an id belong to this account, not a new one. */
export const demoCustomerId = 'cust-01';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function customerRecords(data: any) {
  const settings = data?.settings && typeof data.settings === 'object' ? data.settings : {};
  const linkedId = text(settings.id) || demoCustomerId;
  const source = Array.isArray(data?.customers) ? data.customers : [];
  const records = source
    .filter((item: any) => item && typeof item.id === 'string' && item.id)
    .map((item: any) => {
      const linked = item.id === linkedId;
      const name = linked && text(settings.name) ? text(settings.name) : text(item.name);
      const email = linked && text(settings.email) ? text(settings.email) : text(item.email);
      const city = linked && text(settings.city) ? text(settings.city) : text(item.city);
      const phone = linked && text(settings.phone) ? text(settings.phone) : text(item.phone);
      return {
        id: item.id,
        name,
        email,
        city,
        phone,
        photo: typeof item.photo === 'string' ? item.photo : '',
        disabledAt: item.disabledAt || null,
        createdAt: item.createdAt || null,
        sample: item.sample !== false,
      };
    })
    .filter((item: any) => item.name || item.email);
  if (records.length) return records;
  const name = text(settings.name);
  const email = text(settings.email);
  if (!name && !email) return [];
  return [
    {
      id: linkedId,
      name,
      email,
      city: text(settings.city),
      phone: '',
      sample: true,
    },
  ];
}

export function bookingsForCustomer(jobs: any[], customerId: string) {
  return (Array.isArray(jobs) ? jobs : []).filter((job) => {
    const id = text(job?.customerId) || demoCustomerId;
    return id === customerId;
  });
}

export function customerNameForJob(job: any, customers: any[]) {
  const id = text(job?.customerId) || demoCustomerId;
  const match = (customers || []).find((customer) => customer.id === id);
  return match?.name || 'Not recorded';
}
