import { Card } from '../../components/ui/Card';

import { ArrowUpRight, ArrowRight, Car, FileText, Plus } from 'lucide-react';

/** Presentational view. State and actions are supplied by the owning layout. */
export function GaragePage({ data, filter, go, setDialog }: any) {
  return (
    <>
      <div className="panel-title">
        <h2>Your vehicles</h2>
        <button className="primary" onClick={() => setDialog({ kind: 'vehicle' })}>
          Add vehicle <Plus size={17} />
        </button>
      </div>
      <div className="vehicle-grid">
        {data.vehicles.map((v: any) => (
          <Card as="article" className="vehicle-card" key={v.id}>
            <div className="panel-title">
              <span className="chip">DEMO VEHICLE</span>
              <button
                aria-label={'Edit ' + v.make + ' ' + v.model}
                className="text-link"
                onClick={() => setDialog({ kind: 'vehicle', vehicle: v })}
              >
                Edit
              </button>
            </div>
            <Car size={85} strokeWidth={1} />
            <h2>
              {v.make} {v.model}
            </h2>
            <p>
              {v.year} · {v.registration}
            </p>
            <div className="vehicle-stats">
              <span>
                MILEAGE<strong>{Number(v.mileage).toLocaleString()} km</strong>
              </span>
              <span>
                SERVICE RECORDS
                <strong>
                  {
                    data.records.filter((r: any) => r.vehicle === `${v.year} ${v.make} ${v.model}`)
                      .length
                  }
                </strong>
              </span>
            </div>
            <button className="text-link" onClick={() => go('dashboard/find')}>
              Find care for this vehicle <ArrowUpRight size={16} />
            </button>
          </Card>
        ))}
      </div>
      <div className="panel-title history-heading">
        <h2>Service history</h2>
        <span className="muted">Sample and completed demo records</span>
      </div>
      {data.records.map((r: any) => (
        <div className="service-history-row" key={r.id}>
          <span className="history-dot">
            <FileText size={20} />
          </span>
          <div>
            <small>
              {r.date} · {r.vehicle}
            </small>
            <h3>{r.title}</h3>
            <p>
              {r.provider} · {r.mileage} km
            </p>
          </div>
          <button className="text-link" onClick={() => setDialog({ kind: 'record', record: r })}>
            View record <ArrowRight size={16} />
          </button>
        </div>
      ))}
    </>
  );
}
