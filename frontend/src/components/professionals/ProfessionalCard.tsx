import { Card } from '../ui/Card';
import { Wrench, MapPin, ShieldCheck, ArrowUpRight } from 'lucide-react';
export function ProfessionalCard({ professional: p, onView, onBook }: any) {
  return (
    <Card as="article" className="provider-card" key={p.name}>
      <div className="provider-art">
        <Wrench size={50} />
        <span className="chip">SAMPLE PROFILE</span>
      </div>
      <div className="provider-info">
        <span className="provider-type">{p.type}</span>
        <h2>{p.name}</h2>
        <p>
          <MapPin size={15} />
          {p.area}
        </p>
        <p>{p.special}</p>
        <div className="verification">
          <ShieldCheck size={18} /> Verification details preview
        </div>
        <p className="muted">New profile · No reviews yet</p>
        <div className="provider-bottom">
          <span>
            Assessment from<strong>R{p.fee}</strong>
          </span>
          <div className="provider-actions">
            <button className="text-link" onClick={onView}>
              View profile <ArrowUpRight size={14} />
            </button>
            <button className="primary" onClick={onBook}>
              Book assessment <ArrowUpRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
