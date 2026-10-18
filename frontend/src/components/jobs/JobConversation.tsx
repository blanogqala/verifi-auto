import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { commitUpdate } from '../../features/demo/commitUpdate';
import { formatWhen } from '../../features/jobs/bookingProgress';
import {
  conversationLocked,
  markConversationRead,
  messagesForBooking,
  messageLimit,
  sendMessage,
  unreadMessages,
} from '../../features/messages/conversation';

function dayLabel(value: string) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return 'Date not recorded';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(date);
}

export function JobConversation({
  active,
  bookingId,
  data,
  job,
  notify,
  update,
  viewerId,
  viewerName,
  viewerRole,
}: any) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [away, setAway] = useState(false);
  const sending = useRef(false);
  const pendingId = useRef('');
  const stick = useRef(true);
  const logRef = useRef<HTMLDivElement>(null);
  const messages = messagesForBooking(data, bookingId);
  const locked = conversationLocked(job?.status);
  const latest = messages[messages.length - 1]?.id || '';

  useEffect(() => {
    if (!active) return;
    if (!unreadMessages(data, bookingId, viewerRole).length) return;
    commitUpdate(
      update,
      (current: any) => markConversationRead(current, { bookingId, role: viewerRole, id: viewerId }),
      () => {},
      '',
    );
  }, [active, bookingId, data, latest, update, viewerId, viewerRole]);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    if (stick.current) log.scrollTop = log.scrollHeight;
    else setAway(true);
  }, [latest, active]);

  function onScroll() {
    const log = logRef.current;
    if (!log) return;
    const near = log.scrollHeight - log.scrollTop - log.clientHeight < 48;
    stick.current = near;
    if (near) setAway(false);
  }

  function send() {
    if (sending.current || locked) return;
    const body = draft;
    if (!body.trim()) {
      setError('Write a message before sending.');
      return;
    }
    if (body.trim().length > messageLimit) {
      setError(`Keep the message under ${messageLimit} characters.`);
      return;
    }
    if (!pendingId.current) pendingId.current = crypto.randomUUID();
    sending.current = true;
    setError('');
    const saved = commitUpdate(
      update,
      (current: any) =>
        sendMessage(current, {
          bookingId,
          role: viewerRole,
          id: viewerId,
          name: viewerName,
          body,
          clientMessageId: pendingId.current,
        }).data,
      notify,
      '',
    );
    sending.current = false;
    if (!saved) {
      setError('Could not send this message. Your text is still here.');
      return;
    }
    pendingId.current = '';
    setDraft('');
    stick.current = true;
  }

  return (
    <div className="conversation">
      <div className="conversation-log" ref={logRef} onScroll={onScroll}>
        {messages.length ? (
          messages.map((message: any, index: number) => {
            const label = dayLabel(message.createdAt);
            const previous = index > 0 ? dayLabel(messages[index - 1].createdAt) : '';
            const mine = message.senderRole === viewerRole;
            return (
              <div key={message.id}>
                {label !== previous ? <p className="conversation-day">{label}</p> : null}
                <article className={mine ? 'bubble mine' : 'bubble theirs'}>
                  <p className="bubble-name">{mine ? 'You' : message.senderName || 'Participant'}</p>
                  <p className="bubble-body">{message.body}</p>
                  <time dateTime={message.createdAt}>{formatWhen(message.createdAt) || 'Time not recorded'}</time>
                </article>
              </div>
            );
          })
        ) : (
          <p className="muted">No messages yet.</p>
        )}
      </div>
      {away ? (
        <button
          type="button"
          className="text-link conversation-jump"
          onClick={() => {
            stick.current = false;
            const log = logRef.current;
            if (log) log.scrollTop = log.scrollHeight;
            setAway(false);
            stick.current = true;
          }}
        >
          New messages
        </button>
      ) : null}
      {locked ? (
        <p className="muted">{locked}</p>
      ) : (
        <form
          className="conversation-compose"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <label className="visually-hidden" htmlFor={`message-${bookingId}`}>
            Message
          </label>
          <textarea
            id={`message-${bookingId}`}
            rows={2}
            maxLength={messageLimit}
            value={draft}
            placeholder="Write a message"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
          />
          <button className="primary" type="submit">
            Send <Send size={16} />
          </button>
        </form>
      )}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
