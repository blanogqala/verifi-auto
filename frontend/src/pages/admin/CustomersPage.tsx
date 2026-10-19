import { MetricCard } from '../../components/ui/MetricCard';
import { Users, MapPin, Calendar } from 'lucide-react';
import { cityName } from '../../features/admin/filters';
import { useState } from 'react';
import { CityFilter, ProfessionalTypeFilter } from './AdminFilters';
import { matchesAdminFilters } from '../../features/admin/filters';
import { ArrowUpRight, Search } from 'lucide-react';
import { bookingsForCustomer } from '../../features/admin/customerRecords';
import { EmptyState as Empty } from '../../components/ui/EmptyState';

function matches(customer: any, query: string) {
  return `${customer.name} ${customer.email} ${customer.phone} ${customer.city}`
    .toLowerCase()
    .includes(query.toLowerCase());
}

/** Read-only view of demo customer accounts. Jobs are not turned into extra customers. */
export function CustomersPage({ customers, jobs, query, setDialog, setQuery }: any) {
  const [city, setCity] = useState('All');
  const visible = customers.filter(
    (customer: any) => matches(customer, query) && matchesAdminFilters(customer, city),
  );
  return (
    <>
      <div className="metrics admin-summary-metrics">
        <MetricCard
          label="Total customers"
          value={customers.length}
          note="All customer accounts"
          Icon={Users}
        />
        <MetricCard
          label="Customers with bookings"
          value={customers.filter((c: any) => bookingsForCustomer(jobs, c.id).length > 0).length}
          note="At least one linked booking"
          Icon={Calendar}
        />
        <MetricCard
          label="Cities represented"
          value={
            new Set(
              customers
                .map((c: any) => cityName(c.city))
                .filter((c: string) => c !== 'Not recorded'),
            ).size
          }
          note="Recorded customer cities"
          Icon={MapPin}
        />
      </div>
      <div className="table-controls admin-filter-row">
        <div className="search-input">
          <Search size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer name or email"
          />
        </div>
        <CityFilter rows={customers} value={city} onChange={setCity} />
      </div>
      <p className="muted">
        Sample customer records from this browser. Booking links use the existing customer account
        and are not created from job titles.
      </p>
      {visible.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Contact</th>
                <th>Bookings</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer: any) => {
                const bookings = bookingsForCustomer(jobs, customer.id);
                return (
                  <tr
                    className="admin-clickable-row"
                    key={customer.id}
                    onClick={() => setDialog({ kind: 'customer', customer, bookings })}
                  >
                    <td>
                      <b>{customer.name || 'Name not recorded'}</b>
                      <small>
                        {customer.sample ? 'Sample record' : 'Customer record'}
                        {customer.city ? ` · ${customer.city}` : ''}
                      </small>
                    </td>
                    <td>{customer.email || 'Not recorded'}</td>
                    <td>{customer.phone || 'Not recorded'}</td>
                    <td>{bookings.length}</td>
                    <td>
                      <button
                        className="text-link"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDialog({ kind: 'customer', customer, bookings });
                        }}
                      >
                        View details <ArrowUpRight size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty
          title={customers.length ? 'No matching customers.' : 'No customer records.'}
          text={
            customers.length
              ? 'Try another name or email.'
              : 'Sample customer accounts appear here when demo customer data is available.'
          }
        />
      )}
    </>
  );
}
