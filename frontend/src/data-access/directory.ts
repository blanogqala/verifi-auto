import type { DirectoryHit, DiscoverySession } from '../features/professionals/discovery';
import { distanceFor } from '../features/professionals/discovery';
import {
  approximateDistanceLabel,
  mapsDirectionsUrl,
  type LocationPrecision,
  type ProfessionalLocation,
} from '../features/professionals/geo';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function mapDirectoryProfessional(pro: any) {
  const services = Array.isArray(pro?.services) ? pro.services : [];
  const precision: LocationPrecision =
    pro?.type === 'Mobile mechanic' ? 'service-area' : 'public-premises';
  const location: ProfessionalLocation | null =
    pro?.latitude == null || pro?.longitude == null
      ? null
      : {
          publicAddress: text(pro.address) || text(pro.city),
          suburb: text(pro.city),
          city: text(pro.city),
          province: '',
          districtId: '',
          latitude: pro.latitude,
          longitude: pro.longitude,
          source: 'published',
          precision,
          placeId: '',
          serviceRadiusKm: pro.type === 'Mobile mechanic' ? 25 : null,
        };
  const count = pro?.reviewCount || pro?.reviews?.length || 0;
  const average = pro?.rating ?? null;
  return {
    ...pro,
    id: pro.id,
    name: pro.name || '',
    type: pro.type || 'Workshop',
    area: pro.city || '',
    serviceAreas: Array.isArray(pro.serviceAreas) ? pro.serviceAreas : [],
    // Published street address is appropriate for workshops, but not a
    // mobile mechanic's potentially private base location.
    place: pro.type === 'Workshop' && typeof pro.address === 'string' && pro.address.trim()
      ? pro.address.trim() : pro.city || '',
    address: pro.type === 'Workshop' ? pro.address || '' : '',
    email: pro.email || '',
    website: pro.website || '',
    special: services.join(' · '),
    services,
    photo: pro.photo || '',
    sample: false,
    fictional: false,
    own: false,
    fee: null,
    about: pro.about || '',
    bio: pro.about || '',
    verification: 'Credentials reviewed by Verifi Auto',
    location,
    rating: {
      average,
      count,
      label: `${average == null ? '0' : Number(average).toFixed(1)}/5 · ${count} reviews`,
      accessible: `${average || 0} out of 5 from ${count} reviews`,
    },
    directionsUrl: mapsDirectionsUrl(location),
    reviews: (pro.reviews || []).map((review: any) => ({
      id: review.id,
      rating: review.rating,
      text: review.body,
      customerName: review.customerName || 'Customer',
      createdAt: review.createdAt,
    })),
  };
}

export function liveDirectoryHits(professionals: any[], discovery: DiscoverySession): DirectoryHit[] {
  const service = discovery.service;
  const type = discovery.type;
  return professionals
    .filter((professional) => {
      const special = text(professional.special);
      const serviceOk =
        !service || service === 'All services' || service === 'Not sure yet' || special.includes(service);
      const typeOk = !type || type === 'Either' || professional.type === type;
      return serviceOk && typeOk;
    })
    .map((professional) => {
      const distance = distanceFor(professional, discovery.origin);
      const precision = professional.location?.precision;
      const distanceLabel =
        distance == null || !precision
          ? ''
          : precision === 'service-area'
            ? 'Serves your area'
            : approximateDistanceLabel(distance, precision);
      return {
        id: professional.id,
        name: professional.name,
        type: professional.type,
        area: professional.area,
        special: professional.special,
        place: professional.place,
        photo: professional.photo,
        sample: false,
        own: false,
        verification: 'Credentials reviewed by Verifi Auto',
        rating: professional.rating,
        distanceLabel,
        sortKm: distance ?? Number.POSITIVE_INFINITY,
        directionsUrl: professional.directionsUrl,
        location: professional.location,
      };
    })
    .sort((left, right) => left.sortKm - right.sortKm);
}
