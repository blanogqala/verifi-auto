export function canSubmit(data: any) {
  return !!(
    data.profile.name.trim() &&
    data.profile.city &&
    data.profile.phone.trim() &&
    data.profile.bio.trim() &&
    data.profile.services.length &&
    data.documents.some((d: any) => d.kind === 'Identity evidence') &&
    data.documents.some((d: any) => d.kind === 'Qualifications / experience')
  );
}
