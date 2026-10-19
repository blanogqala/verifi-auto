import { choices, cityName } from '../../features/admin/filters';
export function CityFilter({ rows, value, onChange, label = 'City' }: any) {
  const options = choices(
    rows.map((r: any) => ({ city: cityName(r.city) })),
    'city',
  );
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="All">All cities</option>
      {options.map((city) => (
        <option key={city}>{city}</option>
      ))}
    </select>
  );
}
export function ProfessionalTypeFilter({ value, onChange }: any) {
  return (
    <select aria-label="Professional type" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="All">All professional types</option>
      <option>Workshop</option>
      <option>Mobile mechanic</option>
      <option>Not recorded</option>
    </select>
  );
}
