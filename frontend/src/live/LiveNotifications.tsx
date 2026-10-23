import { NotificationsPage } from '../pages/shared/NotificationsPage';
import { WorkspaceHeading } from './LiveWorkspaceViews';
import { RoadLoader } from '../components/ui/RoadLoader';
import { api } from './api';
const typeFor: Record<string, string> = {
  booking: 'requested',
  quotation: 'quote',
  message: 'message',
  payment: 'payment',
  application: 'account',
};
export function LiveNotifications({ notes, error, role, run, go }: any) {
  const destination = (note: any) =>
    ['booking', 'quotation', 'message', 'payment', 'history-access'].includes(note.topic)
      ? `dashboard/${role === 'customer' ? 'bookings' : 'jobs'}/${note.resourceId}`
      : note.topic === 'application'
        ? role === 'admin'
          ? 'dashboard/applications/' + note.resourceId
          : 'dashboard/profile/verification'
        : 'dashboard/profile';
  return (
    <>
      <WorkspaceHeading title="Notifications" />
      {error ? (
        <p role="alert">{error}</p>
      ) : !notes ? (
        <RoadLoader label="Loading updates…" />
      ) : null}
      <NotificationsPage
        role={role}
        go={go}
        data={{ jobs: [], settings: {}, profile: {} }}
        connected={{
          notes: (notes || []).map((note: any) => ({
            ...note,
            read: !!note.readAt,
            type: typeFor[note.topic] || 'update',
            bookingId: ['booking', 'quotation', 'message', 'payment'].includes(note.topic)
              ? note.resourceId
              : undefined,
          })),
          destination,
          mark: (ids: string[]) =>
            ids.length ? run(() => api('/notifications/read', 'POST', { ids }), '') : undefined,
        }}
      />
    </>
  );
}
