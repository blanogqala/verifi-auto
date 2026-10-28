import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
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

const documentLabels: Record<string, string> = {
  IDENTITY: 'Identity evidence',
  QUALIFICATION: 'Qualifications / experience',
  BUSINESS: 'Business registration',
};

export type ProfileRequestState = 'idle' | 'loading' | 'found' | 'missing' | 'error';

function presentDocument(doc: any) {
  return {
    ...doc,
    kind: documentLabels[doc?.kind] || doc?.kind,
    date: doc?.createdAt ? String(doc.createdAt).slice(0, 10) : doc?.date || '',
  };
}

/** A failed request stays an error. An empty payload is a successful empty result. */
async function readOrEmpty<T>(path: string, fallback: T, problems: string[]): Promise<T> {
  try {
    return await api<T>(path);
  } catch (reason: any) {
    problems.push(reason?.message || 'Could not load this information.');
    return fallback;
  }
}

function assignError(
  setErrors: Dispatch<SetStateAction<Record<string, string>>>,
  key: string,
  message: string,
) {
  setErrors((current) => (current[key] === message ? current : { ...current, [key]: message }));
}

function clearError(setErrors: Dispatch<SetStateAction<Record<string, string>>>, key: string) {
  setErrors((current) => {
    if (!current[key]) return current;
    const next = { ...current };
    delete next[key];
    return next;
  });
}

export function useLiveSource(enabled: boolean, page: string) {
  const [user, setUser] = useState<LiveUser | null>(null);
  const [ready, setReady] = useState(!enabled);
  const [data, setData] = useState<any>(emptyWorkspace);
  const [error, setError] = useState('');
  const [resourceErrors, setResourceErrors] = useState<Record<string, string>>({});
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [directoryStatus, setDirectoryStatus] = useState<'loading' | 'ready'>(enabled ? 'loading' : 'ready');
  const [profile, setProfile] = useState<any>(null);
  const [profileState, setProfileState] = useState<ProfileRequestState>('idle');
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
    const problems: string[] = [];
    const notes = verified || session.user
      ? await readOrEmpty<any[]>('/notifications?take=100', [], problems)
      : [];
    next.notifications = notes.map((note) => mapNotification(note, role || 'customer'));
    let rawBookings: any[] = [];
    let mechanicReviews: any = null;
    if (verified && role === 'customer') {
      const [vehicles, bookings] = await Promise.all([
        readOrEmpty<any[]>('/vehicles', [], problems),
        readOrEmpty<any[]>('/bookings?take=100', [], problems),
      ]);
      rawBookings = bookings;
      const details = await Promise.all(
        vehicles.map((vehicle) => readOrEmpty<any>('/vehicles/' + vehicle.id, vehicle, problems)),
      );
      next.vehicles = details.map(mapVehicle);
      next.records = details.flatMap((vehicle) => mapRecords(vehicle.id, vehicle.history || []));
      next.jobs = bookings.map(mapBooking);
    }
    if (verified && role === 'mechanic') {
      const [bookings, me, docs, reviewFeed] = await Promise.all([
        readOrEmpty<any[]>('/bookings?take=100', [], problems),
        readOrEmpty<any>('/professional/me', null, problems),
        readOrEmpty<any[]>('/documents', [], problems),
        readOrEmpty<any>('/professional/me/reviews', null, problems),
      ]);
      mechanicReviews = reviewFeed;
      if (reviewFeed) next.mechanicReviewSummary = { average: reviewFeed.average, count: reviewFeed.count };
      rawBookings = bookings;
      next.jobs = bookings.map(mapBooking);
      if (me) {
        next.profile = {
          ...next.profile,
          ...me,
          bio: me.about || '',
          // The uploaded professional picture belongs to the user account
          // (User.photo), not the Professional business record.
          photo: account.photo || '',
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
      next.documents = (docs || []).map(presentDocument);
    }
    if (verified && role === 'admin') {
      const [bookings, applications, history, managed, customers, activity] = await Promise.all([
        readOrEmpty<any[]>('/bookings?take=100', [], problems),
        readOrEmpty<any[]>('/admin/applications?take=100', [], problems),
        readOrEmpty<any[]>('/admin/application-history?take=100', [], problems),
        readOrEmpty<any[]>('/admin/professionals?take=100', [], problems),
        readOrEmpty<any[]>('/admin/users?role=CUSTOMER&take=100', [], problems),
        readOrEmpty<any[]>('/admin/activity', [], problems),
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
        photo: customer.photo || '',
        createdAt: customer.createdAt || null,
        disabledAt: customer.disabledAt || null,
        city: '',
        sample: false,
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
              status: row.grant.revokedAt ? 'revoked'
                : row.grant.recordIds?.length > 0 && new Date(row.grant.expiresAt).getTime() > Date.now() &&
                  !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(row.status)
                  ? 'active'
                  : row.grant.requestedAt && !row.grant.grantedAt
                    ? 'requested'
                    : 'expired',
              requestedAt: row.grant.requestedAt || null,
              grantedAt: row.grant.grantedAt || null,
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
              createdAt: row.review.createdAt,
              updatedAt: row.review.updatedAt,
              photos: [],
            },
          ]
        : [],
    );
    if (role === 'mechanic' && mechanicReviews) {
      next.customerReviews = (mechanicReviews.reviews || []).map((review: any) => ({
        ...review,
        text: review.body,
        customerName: review.customerName,
        photos: [],
      }));
    }
    setData(next);
    setError('');
    if (problems.length) assignError(setResourceErrors, 'workspace', problems[0]);
    else clearError(setResourceErrors, 'workspace');
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
    setDirectoryStatus('loading');
    api('/professionals?take=100')
      .then((rows) => {
        if (!active) return;
        setProfessionals(Array.isArray(rows) ? rows : []);
        clearError(setResourceErrors, 'directory');
        setDirectoryStatus('ready');
      })
      .catch((reason) => {
        if (!active) return;
        setProfessionals([]);
        assignError(
          setResourceErrors,
          'directory',
          reason?.message || 'The directory could not be loaded.',
        );
        setDirectoryStatus('ready');
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
      setProfileState('idle');
      clearError(setResourceErrors, 'profile');
      return;
    }
    let active = true;
    setProfileState('loading');
    api('/professionals/' + id)
      .then((row) => {
        if (!active) return;
        setProfile(row);
        setProfileState('found');
        clearError(setResourceErrors, 'profile');
      })
      .catch((reason) => {
        if (!active) return;
        setProfile(null);
        const missing = reason?.status === 404 || reason?.status === 400;
        setProfileState(missing ? 'missing' : 'error');
        if (missing) clearError(setResourceErrors, 'profile');
        else
          assignError(
            setResourceErrors,
            'profile',
            reason?.message || 'This professional could not be loaded.',
          );
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

  const loadError = Object.values(resourceErrors).filter(Boolean).join(' ');

  return {
    enabled,
    ready,
    user,
    role: roleOf(user),
    verified: Boolean(user?.verifiedAt),
    data,
    error,
    loadError,
    directoryStatus,
    professionals,
    profile,
    profileState,
    update,
    refresh,
    setUser,
  };
}
