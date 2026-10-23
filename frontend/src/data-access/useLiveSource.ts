import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiBase, roleOf, setCsrf, type LiveUser } from './api';
import {
  emptyWorkspace,
  mapApplication,
  mapBooking,
  mapNotification,
  mapRecords,
  mapUserAccount,
  mapVehicle,
} from './map';
import { persistDifference } from './persist';

function professionalIdFrom(page: string) {
  const match = /^(?:professional|dashboard\/find)\/([^/?]+)/.exec(page);
  return match ? decodeURIComponent(match[1]) : '';
}

async function safe<T>(path: string, fallback: T): Promise<T> {
  try {
    return await api<T>(path);
  } catch {
    return fallback;
  }
}

export function useLiveSource(enabled: boolean, page: string) {
  const [user, setUser] = useState<LiveUser | null>(null);
  const [ready, setReady] = useState(!enabled);
  const [data, setData] = useState<any>(emptyWorkspace);
  const [error, setError] = useState('');
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [revision, setRevision] = useState(0);
  const dataRef = useRef(data);
  dataRef.current = data;
  const load = useCallback(async () => {
    if (!enabled) return;
    const session = await api<{ user: LiveUser; csrf: string }>('/auth/session');
    setCsrf(session.csrf);
    setUser(session.user);
    const role = roleOf(session.user);
    const verified = Boolean(session.user.verifiedAt);
    const next = emptyWorkspace();
    const account = mapUserAccount(session.user);
    next.settings = account;
    if (role === 'admin') next.adminAccount = { name: account.name, email: account.email };
    if (role === 'mechanic') {
      next.mechanicAccount = {
        name: account.name,
        email: account.email,
        emailUpdates: account.emailUpdates,
        professionalId: '',
      };
    }
    const notes = verified || session.user
      ? await safe<any[]>('/notifications?take=100', [])
      : [];
    next.notifications = notes.map((note) => mapNotification(note, role || 'customer'));
    let rawBookings: any[] = [];
    if (verified && role === 'customer') {
      const [vehicles, bookings] = await Promise.all([
        safe<any[]>('/vehicles', []),
        safe<any[]>('/bookings?take=100', []),
      ]);
      rawBookings = bookings;
      const details = await Promise.all(
        vehicles.map((vehicle) => safe<any>('/vehicles/' + vehicle.id, vehicle)),
      );
      next.vehicles = details.map(mapVehicle);
      next.records = details.flatMap((vehicle) => mapRecords(vehicle.id, vehicle.history || []));
      next.jobs = bookings.map(mapBooking);
    }
    if (verified && role === 'mechanic') {
      const [bookings, me, docs] = await Promise.all([
        safe<any[]>('/bookings?take=100', []),
        safe<any>('/professional/me', null),
        safe<any[]>('/documents', []),
      ]);
      rawBookings = bookings;
      next.jobs = bookings.map(mapBooking);
      if (me) {
        next.profile = {
          ...next.profile,
          ...me,
          bio: me.about || '',
          version: me.version,
        };
        next.mechanicAccount.professionalId = me.id;
        next.application = {
          status:
            me.status === 'SUBMITTED'
              ? 'Pending review'
              : me.status === 'CHANGES_REQUESTED'
                ? 'Changes requested'
                : me.status === 'APPROVED'
                  ? 'Approved'
                  : me.status === 'SUSPENDED'
                    ? 'Suspended'
                    : 'Draft',
          note: me.reviewNote || '',
          submittedAt: me.updatedAt || '',
          previouslyApproved: Boolean(me.approvedAt),
        };
      }
      next.documents = (docs || []).map((doc: any) => ({
        ...doc,
        date: doc.createdAt ? String(doc.createdAt).slice(0, 10) : '',
      }));
    }
    if (verified && role === 'admin') {
      const [bookings, applications, history, managed, customers, activity] = await Promise.all([
        safe<any[]>('/bookings?take=100', []),
        safe<any[]>('/admin/applications?take=100', []),
        safe<any[]>('/admin/application-history?take=100', []),
        safe<any[]>('/admin/professionals?take=100', []),
        safe<any[]>('/admin/users?role=CUSTOMER&take=100', []),
        safe<any[]>('/admin/activity', []),
      ]);
      rawBookings = bookings;
      next.jobs = bookings.map(mapBooking);
      const seen = new Set<string>();
      next.reviews = [...applications, ...history, ...managed]
        .map(mapApplication)
        .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)));
      next.customers = customers.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || '',
        city: '',
        sample: false,
        disabledAt: customer.disabledAt,
      }));
      next.adminActivity = (Array.isArray(activity) ? activity : []).map((event: any) => ({
        id: event.id,
        action: event.action,
        actor: 'Admin',
        role: 'admin',
        target: event.resourceId,
        at: event.createdAt,
        source: 'server',
      }));
    }
    const selfId =
      role === 'mechanic' ? next.mechanicAccount.professionalId || session.user.id : session.user.id;
    next.notifications = notes.map((note) => ({
      ...mapNotification(note, role || 'customer'),
      recipientId: selfId,
    }));
    next.messages = next.jobs.flatMap((job: any) => job.messages || []);
    next.historyAccess = rawBookings.flatMap((row: any) =>
      row.grant
        ? [
            {
              id: row.grant.id,
              bookingId: row.id,
              customerId: row.customerId,
              professionalId: row.professionalId,
              recordIds: row.grant.recordIds || [],
              status: row.grant.revokedAt ? 'revoked' : 'active',
            },
          ]
        : [],
    );
    next.customerReviews = rawBookings.flatMap((row: any) =>
      row.review
        ? [
            {
              id: row.review.id,
              bookingId: row.id,
              customerId: row.review.customerId,
              professionalId: row.review.professionalId,
              rating: row.review.rating,
              text: row.review.body,
              photos: [],
            },
          ]
        : [],
    );
    setData(next);
    setError('');
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    load()
      .catch((reason) => {
        if (!active) return;
        if (reason?.status === 401) {
          setUser(null);
          setData(emptyWorkspace());
          return;
        }
        setError(reason?.message || 'The server is unavailable. Please try again shortly.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [enabled, load, revision]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    api('/professionals?take=100')
      .then((rows) => {
        if (active) setProfessionals(rows);
      })
      .catch(() => {
        if (active) setProfessionals([]);
      });
    return () => {
      active = false;
    };
  }, [enabled, revision]);

  useEffect(() => {
    if (!enabled) return;
    const id = professionalIdFrom(page);
    if (!id) {
      setProfile(null);
      return;
    }
    let active = true;
    api('/professionals/' + id)
      .then((row) => {
        if (active) setProfile(row);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [enabled, page, revision]);

  useEffect(() => {
    if (!enabled || !user) return;
    const stream = new EventSource(`${apiBase}/api/notifications/stream`, { withCredentials: true });
    stream.addEventListener('update', () => setRevision((value) => value + 1));
    stream.addEventListener('session-ended', () => {
      setUser(null);
      setData(emptyWorkspace());
    });
    return () => stream.close();
  }, [enabled, user?.id]);

  const update = useCallback(
    async (change: (value: any) => any) => {
      const before = dataRef.current;
      const after = change(structuredClone(before));
      await persistDifference(before, after);
      setRevision((value) => value + 1);
      return true;
    },
    [],
  );

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  return {
    enabled,
    ready,
    user,
    role: roleOf(user),
    verified: Boolean(user?.verifiedAt),
    data,
    error,
    professionals,
    profile,
    update,
    refresh,
    setUser,
  };
}
