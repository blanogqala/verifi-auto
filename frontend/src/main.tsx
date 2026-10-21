import { createRoot } from 'react-dom/client';
import App from './App';
import { lazy, Suspense } from 'react';
import { RoadLoader } from './components/ui/RoadLoader';
const LiveApp = lazy(() => import('./live/LiveApp'));
import './styles/base.css';
import './styles/workspace.css';
import './styles/cards.css';
import './styles/customer.css';
createRoot(document.getElementById('root')!).render(
  <Suspense fallback={<RoadLoader label="Loading Verifi Auto…" />}>
    {import.meta.env.VITE_API_URL ? <LiveApp /> : <App />}
  </Suspense>,
);
