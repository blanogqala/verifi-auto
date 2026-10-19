import type { ProfessionalLocation } from '../features/professionals/geo';

/**
 * Fictional professionals for this browser preview.
 * Coordinates are curated demo points. They are not claims that a real workshop occupies that address.
 * Existing ids stay stable so saved bookings can still resolve.
 */
export type SampleProfessional = {
  id: string;
  name: string;
  type: 'Workshop' | 'Mobile mechanic';
  area: string;
  special: string;
  fee: number | null;
  sample: true;
  fictional: true;
  photo: string;
  location: ProfessionalLocation;
};

const workshopPhoto = '/images/workshop-tools.jpg';

function place(suburb: string, city: string) {
  return suburb.toLowerCase() === city.toLowerCase() ? city : `${suburb}, ${city}`;
}

function premises(
  suburb: string,
  city: string,
  province: string,
  districtId: string,
  latitude: number,
  longitude: number,
  publicAddress: string,
): ProfessionalLocation {
  return {
    publicAddress,
    suburb,
    city,
    province,
    districtId,
    latitude,
    longitude,
    source: 'demo-curated',
    precision: 'public-premises',
    placeId: '',
    serviceRadiusKm: null,
  };
}

function coverage(
  suburb: string,
  city: string,
  province: string,
  districtId: string,
  latitude: number,
  longitude: number,
  serviceRadiusKm: number,
): ProfessionalLocation {
  return {
    publicAddress: '',
    suburb,
    city,
    province,
    districtId,
    latitude,
    longitude,
    source: 'demo-curated',
    precision: 'service-area',
    placeId: '',
    serviceRadiusKm,
  };
}

export const providers: SampleProfessional[] = [
  {
    id: 'pro-precision-motorworks',
    name: 'Precision Motorworks',
    type: 'Workshop',
    area: place('Gardens', 'Cape Town'),
    special: 'Servicing · Diagnostics · Brakes',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Gardens',
      'Cape Town',
      'Western Cape',
      'CPT',
      -33.9335,
      18.411,
      'Fictional Yard, Sample Lane, Gardens. Not a real business address.',
    ),
  },
  {
    id: 'pro-on-the-move-auto',
    name: 'On the Move Auto',
    type: 'Mobile mechanic',
    area: place('Bellville', 'Cape Town'),
    special: 'Diagnostics · Batteries · Auto electrical',
    fee: null,
    sample: true,
    fictional: true,
    photo: '',
    location: coverage('Bellville', 'Cape Town', 'Western Cape', 'CPT', -33.9003, 18.629, 30),
  },
  {
    id: 'pro-urban-auto-care',
    name: 'Urban Auto Care',
    type: 'Workshop',
    area: place('Sandton', 'Johannesburg'),
    special: 'Servicing · Brakes · Diagnostics',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Sandton',
      'Johannesburg',
      'Gauteng',
      'JHB',
      -26.1076,
      28.0567,
      'Fictional Workshop, Sample Street, Sandton. Not a real business address.',
    ),
  },
  {
    id: 'pro-driveway-diagnostics',
    name: 'Driveway Diagnostics',
    type: 'Mobile mechanic',
    area: place('Sandton', 'Johannesburg'),
    special: 'Diagnostics · Batteries · Auto electrical',
    fee: null,
    sample: true,
    fictional: true,
    photo: '',
    location: coverage('Sandton', 'Johannesburg', 'Gauteng', 'JHB', -26.1076, 28.0567, 30),
  },
  {
    id: 'pro-sample-sea-point',
    name: 'Sample Sea Point Autos',
    type: 'Workshop',
    area: place('Sea Point', 'Cape Town'),
    special: 'Servicing · Batteries',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Sea Point',
      'Cape Town',
      'Western Cape',
      'CPT',
      -33.918,
      18.3845,
      'Fictional Workshop, Sample Promenade, Sea Point. Not a real business address.',
    ),
  },
  {
    id: 'pro-sample-claremont',
    name: 'Sample Claremont Brakes',
    type: 'Workshop',
    area: place('Claremont', 'Cape Town'),
    special: 'Brakes · Diagnostics',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Claremont',
      'Cape Town',
      'Western Cape',
      'CPT',
      -33.9806,
      18.4653,
      'Fictional Workshop, Sample Main Road, Claremont. Not a real business address.',
    ),
  },
  {
    id: 'pro-sample-woodstock',
    name: 'Sample Woodstock Electrical',
    type: 'Workshop',
    area: place('Woodstock', 'Cape Town'),
    special: 'Auto electrical · Batteries',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Woodstock',
      'Cape Town',
      'Western Cape',
      'CPT',
      -33.9275,
      18.447,
      'Fictional Workshop, Sample Albert Road, Woodstock. Not a real business address.',
    ),
  },
  {
    id: 'pro-sample-bellville',
    name: 'Sample Bellville Service',
    type: 'Workshop',
    area: place('Bellville', 'Cape Town'),
    special: 'Servicing · Diagnostics',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Bellville',
      'Cape Town',
      'Western Cape',
      'CPT',
      -33.9003,
      18.629,
      'Fictional Workshop, Sample Voortrekker Road, Bellville. Not a real business address.',
    ),
  },
  {
    id: 'pro-sample-stellenbosch',
    name: 'Sample Stellenbosch Works',
    type: 'Workshop',
    area: 'Stellenbosch',
    special: 'Servicing · Brakes',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Stellenbosch',
      'Stellenbosch',
      'Western Cape',
      'CPT',
      -33.9321,
      18.8602,
      'Fictional Workshop, Sample Dorp Street, Stellenbosch. Not a real business address.',
    ),
  },
  {
    id: 'pro-sample-paarl',
    name: 'Sample Paarl Motors',
    type: 'Workshop',
    area: 'Paarl',
    special: 'Diagnostics · Brakes',
    fee: null,
    sample: true,
    fictional: true,
    photo: workshopPhoto,
    location: premises(
      'Paarl',
      'Paarl',
      'Western Cape',
      'CPT',
      -33.7342,
      18.9621,
      'Fictional Workshop, Sample Main Street, Paarl. Not a real business address.',
    ),
  },
  {
    id: 'pro-sample-unmapped',
    name: 'Sample Mowbray Workshop',
    type: 'Workshop',
    area: place('Mowbray', 'Cape Town'),
    special: 'Servicing',
    fee: null,
    sample: true,
    fictional: true,
    photo: '',
    location: {
      publicAddress: '',
      suburb: 'Mowbray',
      city: 'Cape Town',
      province: 'Western Cape',
      districtId: 'CPT',
      latitude: null,
      longitude: null,
      source: 'unrecorded',
      precision: 'unknown',
      placeId: '',
      serviceRadiusKm: null,
    },
  },
];
