/**
 * Future backend contract. The demo does not open this transport.
 *
 * When authentication exists, the client should subscribe with SSE or WebSockets
 * to booking, quotation, status, and payment events for the signed-in user.
 * Reconnect with the last event id, ignore duplicate ids, and refetch any gap.
 * The server must enforce who owns a booking and which vehicle-history records
 * a professional may read. Payment events are confirmed by the server, not by
 * the browser. localStorage in this preview only shares one browser profile
 * across tabs. It does not synchronise users or devices.
 */
export type RealtimeTopic = 'booking' | 'quotation' | 'status' | 'payment' | 'history-access';

export type RealtimeEvent = {
  id: string;
  topic: RealtimeTopic;
  at: string;
  resourceId: string;
};

export type RealtimeSubscription = {
  transport: 'sse' | 'websocket';
  lastEventId?: string;
  topics: RealtimeTopic[];
};
