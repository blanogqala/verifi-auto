import { BookingProgress } from '../components/jobs/BookingProgress';
import { bookingCardData } from './LiveWorkspaceViews';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LiveDialog } from './LiveDialog';
import { useState } from 'react';
import { DetailBack, DetailCard, DetailFields, DetailHeader } from '../components/ui/DetailChrome';
import { DetailTabs, DetailPanel } from '../components/ui/DetailTabs';
import { RoadLoader } from '../components/ui/RoadLoader';
import { api, displayStatus, money } from './api';
import { useResource } from './useResource';

function QuoteForm({ bookingId, quote, run, done }: any) {
  const [lines, setLines] = useState(
    quote?.lines?.map((line: any) => ({
      description: line.description,
      category: line.category,
      quantity: line.quantity,
      price: String(line.unitPriceCents / 100),
    })) || [{ description: '', category: 'labour', quantity: 1, price: '' }],
  );
  const [busy, setBusy] = useState(false);
  const [clientRequestId] = useState(() => crypto.randomUUID());
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        const form = new FormData(event.currentTarget),
          send = (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value') === 'send';
        await run(
          async () => {
            const body = {
              notes: String(form.get('notes')),
              lines: lines.map((l: any) => ({
                description: l.description,
                category: l.category,
                quantity: Number(l.quantity),
                unitPriceCents: Math.round(Number(l.price) * 100),
              })),
              send,
              clientRequestId: quote?.clientRequestId || clientRequestId,
              ...(quote ? { version: quote.version } : {}),
            };
            await api(
              `/bookings/${bookingId}/quotes${quote ? '/' + quote.id : ''}`,
              quote ? 'PUT' : 'POST',
              body,
            );
            done();
          },
          send ? 'Quotation sent for approval.' : 'Draft saved.',
        );
        setBusy(false);
      }}
    >
      {lines.map((line: any, index: number) => (
        <div className="quote-editor-row" key={index}>
          <label>
            Description
            <input
              required
              maxLength={300}
              value={line.description}
              onChange={(e) =>
                setLines(
                  lines.map((l: any, i: number) =>
                    i === index ? { ...l, description: e.target.value } : l,
                  ),
                )
              }
            />
          </label>
          <label>
            Type
            <select
              value={line.category}
              onChange={(e) =>
                setLines(
                  lines.map((l: any, i: number) =>
                    i === index ? { ...l, category: e.target.value } : l,
                  ),
                )
              }
            >
              {['assessment', 'labour', 'parts', 'other'].map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          <label>
            Quantity
            <input
              type="number"
              min={1}
              max={1000}
              required
              value={line.quantity}
              onChange={(e) =>
                setLines(
                  lines.map((l: any, i: number) =>
                    i === index ? { ...l, quantity: e.target.value } : l,
                  ),
                )
              }
            />
          </label>
          <label>
            Unit price (R)
            <input
              inputMode="decimal"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={line.price}
              onChange={(e) =>
                setLines(
                  lines.map((l: any, i: number) =>
                    i === index ? { ...l, price: e.target.value } : l,
                  ),
                )
              }
            />
          </label>
          <button
            type="button"
            aria-label={'Remove line ' + (index + 1)}
            disabled={lines.length === 1}
            onClick={() => setLines(lines.filter((_: any, i: number) => i !== index))}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        className="secondary"
        onClick={() =>
          setLines([...lines, { description: '', category: 'labour', quantity: 1, price: '' }])
        }
      >
        Add line
      </button>
      <label>
        Proposed work
        <textarea
          name="notes"
          defaultValue={quote?.notes || ''}
          minLength={3}
          maxLength={4000}
          required
        />
      </label>
      <div className="button-row">
        <button className="secondary" disabled={busy} value="draft">
          Save draft
        </button>
        <button className="primary" disabled={busy} value="send">
          Send quotation
        </button>
      </div>
    </form>
  );
}
function RepairChoices({ quote, bookingId, run, done }: any) {
  const [selected, setSelected] = useState<string[]>(
    quote.lines.filter((l: any) => l.selected).map((l: any) => l.id),
  );
  const [request, setRequest] = useState(quote.customerRequest || '');
  const [busy, setBusy] = useState(false);
  async function submit(action: string) {
    setBusy(true);
    await run(
      async () => {
        await api(`/bookings/${bookingId}/quotes/${quote.id}/actions`, 'POST', {
          action,
          version: quote.version,
          ...(action === 'approve' ? { selectedLineIds: selected } : {}),
          request,
        });
        done();
      },
      action === 'approve' ? 'Selected repairs approved.' : 'Changes requested.',
    );
    setBusy(false);
  }
  return (
    <div>
      <fieldset className="share-records">
        <legend>Choose your repairs</legend>
        {quote.lines.map((line: any) => (
          <label className="check-label" key={line.id}>
            <input
              type="checkbox"
              checked={selected.includes(line.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, line.id]
                    : selected.filter((id) => id !== line.id),
                )
              }
            />
            <span>
              {line.description} <b>{money(line.quantity * line.unitPriceCents)}</b>
            </span>
          </label>
        ))}
      </fieldset>
      <p>
        Selected total{' '}
        <strong>
          {money(
            quote.lines
              .filter((l: any) => selected.includes(l.id))
              .reduce((sum: number, l: any) => sum + l.quantity * l.unitPriceCents, 0),
          )}
        </strong>
      </p>
      <label>
        Requests or comments
        <textarea value={request} onChange={(e) => setRequest(e.target.value)} maxLength={2000} />
      </label>
      <p className="muted">
        Additional requests need a price and fresh approval before work starts.
      </p>
      <div className="button-row">
        <button
          type="button"
          className="primary"
          disabled={busy || !selected.length}
          onClick={() => submit('approve')}
        >
          Approve selected repairs
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy || request.trim().length < 3}
          onClick={() => submit('changes')}
        >
          Request revised quote
        </button>
      </div>
    </div>
  );
}
function Conversation({ bookingId, revision, run, refresh, user }: any) {
  const { data, error } = useResource(`/bookings/${bookingId}/messages`, revision);
  const [body, setBody] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <DetailCard title="Messages">
      {error ? <p role="alert">{error}</p> : null}
      <div className="conversation-log" aria-live="polite">
        {data
          ?.slice()
          .reverse()
          .map((message: any) => (
            <article
              className={message.authorId === user.id ? 'bubble mine' : 'bubble theirs'}
              key={message.id}
            >
              <strong>{message.author.name}</strong>
              <p>{message.body}</p>
              <small>{new Date(message.createdAt).toLocaleString()}</small>
            </article>
          ))}
      </div>
      {user.role !== 'ADMIN' ? (
        <form
          className="conversation-compose"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            await run(async () => {
              await api(`/bookings/${bookingId}/messages`, 'POST', {
                body,
                clientRequestId: crypto.randomUUID(),
              });
              setBody('');
              refresh();
            }, 'Message sent.');
            setBusy(false);
          }}
        >
          <label>
            Message
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={4000}
            />
          </label>
          <button className="primary" disabled={busy || !body.trim()}>
            Send message
          </button>
        </form>
      ) : (
        <p className="muted">Read-only conversation for administration.</p>
      )}
    </DetailCard>
  );
}
export function LiveBooking({ bookingId, user, revision, run, refresh, go }: any) {
  const { data: job, error } = useResource(`/bookings/${bookingId}`, revision);
  const [tab, setTab] = useState('overview'),
    [adding, setAdding] = useState(false),
    [editingQuote, setEditingQuote] = useState<any>(null),
    [confirm, setConfirm] = useState<'' | 'cancel' | 'reject' | 'complete'>(''),
    [reviewing, setReviewing] = useState(''),
    [invoice, setInvoice] = useState<any>(null),
    [checkout, setCheckout] = useState<any>(null);
  const { data: activity, error: activityError } = useResource(
    user.role === 'ADMIN' ? '/admin/activity?resourceId=' + bookingId : null,
    revision,
  );
  const mechanic = user.role === 'MECHANIC',
    customer = user.role === 'CUSTOMER';
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const { data: vehicleHistory } = useResource(
    job && customer
      ? `/vehicles/${job.vehicleId}`
      : job && mechanic
        ? `/bookings/${bookingId}/history`
        : null,
    revision,
  );
  if (error) return <p role="alert">{error}</p>;
  if (!job) return <RoadLoader label="Loading booking…" />;
  const action = (action: string, extra: any = {}) =>
    run(async () => {
      await api(`/bookings/${job.id}/actions`, 'POST', { action, version: job.version, ...extra });
      refresh();
    }, 'Booking updated.');
  return (
    <div className="detail-page booking-detail">
      <DetailBack
        label={
          user.role === 'ADMIN'
            ? 'Back to Jobs & activity'
            : mechanic
              ? job.status === 'REQUESTED'
                ? 'Back to appointments'
                : 'Back to Jobs'
              : 'Back to My bookings'
        }
        onClick={() =>
          go(
            user.role === 'ADMIN'
              ? 'dashboard/jobs'
              : mechanic
                ? job.status === 'REQUESTED'
                  ? 'dashboard/appointments/pending'
                  : 'dashboard/jobs'
                : 'dashboard/bookings',
          )
        }
      />
      <DetailHeader
        title={bookingCardData(job).vehicle}
        kicker={'Booking ' + job.id.slice(0, 8).toUpperCase()}
        summary={`${job.professional.name} · ${new Date(job.appointmentAt).toLocaleString()}`}
        aside={<StatusBadge value={bookingCardData(job).status} />}
      />
      <DetailCard title="Progress">
        <BookingProgress job={{ ...bookingCardData(job), live: true }} />
      </DetailCard>
      <DetailTabs
        id="live-booking"
        label="Booking details"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'quotes', label: 'Quotes & payments' },
          { id: 'messages', label: 'Messages' },
          ...(user.role === 'ADMIN' ? [{ id: 'activity', label: 'Activity' }] : []),
        ]}
      />
      <DetailPanel scope="live-booking" tabId="overview" value={tab}>
        <DetailCard title="Appointment">
          <p>{job.description}</p>
          <DetailFields
            items={[
              { label: 'Customer', value: job.customer.name },
              { label: 'Professional', value: job.professional.name },
              {
                label: 'Preferred appointment',
                value: new Date(job.appointmentAt).toLocaleString(),
              },
              { label: 'Registration', value: job.vehicle.registration },
            ]}
          />
          <div className="button-row">
            {customer ? (
              <>
                <button
                  className="secondary"
                  onClick={() => go('dashboard/find/' + job.professionalId)}
                >
                  View professional
                </button>
                <button
                  className="secondary"
                  onClick={() => go('dashboard/garage/' + job.vehicleId)}
                >
                  View vehicle
                </button>
              </>
            ) : null}
            {mechanic && job.status === 'REQUESTED' ? (
              <button className="primary" onClick={() => action('accept')}>
                Accept request
              </button>
            ) : null}
            {customer && ['REQUESTED', 'CONFIRMED'].includes(job.status) ? (
              <button className="secondary" onClick={() => setConfirm('cancel')}>
                Cancel request
              </button>
            ) : null}
            {mechanic && job.status === 'APPROVED' ? (
              <button className="primary" onClick={() => action('start')}>
                Start approved work
              </button>
            ) : null}
          </div>
          {mechanic && job.status === 'REQUESTED' ? (
            <button className="secondary" type="button" onClick={() => setConfirm('reject')}>
              Reject request
            </button>
          ) : null}
          {mechanic && job.status === 'IN_PROGRESS' ? (
            <button className="secondary" type="button" onClick={() => setConfirm('complete')}>
              Mark work complete
            </button>
          ) : null}
          {job.completionNotes ? <p>{job.completionNotes}</p> : null}
        </DetailCard>
        {customer &&
        ['CONFIRMED', 'APPROVED', 'IN_PROGRESS', 'AWAITING_PAYMENT'].includes(job.status) ? (
          <details className="fold">
            <summary>History sharing</summary>
            <DetailCard title="Vehicle history access">
              <p>Only records you select are shared, for this booking only.</p>
              {vehicleHistory?.history?.map((record: any) => (
                <label className="check-label" key={record.id}>
                  <input
                    type="checkbox"
                    checked={historyIds.includes(record.id)}
                    onChange={(e) =>
                      setHistoryIds(
                        e.target.checked
                          ? [...historyIds, record.id]
                          : historyIds.filter((id) => id !== record.id),
                      )
                    }
                  />
                  <span>{record.notes}</span>
                </label>
              ))}
              <div className="button-row">
                {[true, false].map((grant) => (
                  <button
                    type="button"
                    key={String(grant)}
                    className="secondary"
                    onClick={() =>
                      run(
                        () =>
                          api(`/bookings/${job.id}/history-access`, 'PUT', {
                            grant,
                            recordIds: historyIds,
                          }),
                        grant ? 'Selected history shared.' : 'History access revoked.',
                      )
                    }
                  >
                    {grant ? 'Share selected history' : 'Revoke access'}
                  </button>
                ))}
              </div>
            </DetailCard>
          </details>
        ) : null}
        {mechanic && Array.isArray(vehicleHistory) ? (
          <DetailCard title="Shared service history">
            {vehicleHistory.length ? (
              vehicleHistory.map((record: any) => <p key={record.id}>{record.notes}</p>)
            ) : (
              <p>The customer has not shared any service records.</p>
            )}
          </DetailCard>
        ) : null}
        {customer && job.status === 'COMPLETED' ? (
          <DetailCard title="Your review">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const values = new FormData(event.currentTarget);
                void run(
                  () =>
                    api(`/bookings/${job.id}/review`, 'PUT', {
                      rating: Number(values.get('rating')),
                      body: String(values.get('body')),
                    }),
                  'Review saved.',
                );
              }}
            >
              <label>
                Rating
                <select name="rating">
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} stars
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Review
                <textarea name="body" minLength={3} maxLength={2000} required />
              </label>
              <button className="primary">Save review</button>
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  run(() => api(`/bookings/${job.id}/review`, 'DELETE'), 'Review deleted.')
                }
              >
                Delete my review
              </button>
            </form>
          </DetailCard>
        ) : null}
      </DetailPanel>
      <DetailPanel scope="live-booking" tabId="quotes" value={tab}>
        <div className="booking-quotations">
          {mechanic && ['CONFIRMED', 'APPROVED', 'IN_PROGRESS'].includes(job.status) ? (
            <button className="primary" type="button" onClick={() => setAdding(true)}>
              Add quotation
            </button>
          ) : null}
          {adding ? (
            <LiveDialog title="Prepare a clear quote." onClose={() => setAdding(false)}>
              <p>Itemise parts and labour. The customer must approve before work begins.</p>
              <QuoteForm
                bookingId={job.id}
                run={run}
                done={() => {
                  setAdding(false);
                  refresh();
                }}
              />
            </LiveDialog>
          ) : null}
          {!job.quotes.length ? (
            <DetailCard title="Quotations">
              <p>No quotation has been sent yet.</p>
            </DetailCard>
          ) : null}
          {job.quotes.map((quote: any) => (
            <DetailCard key={quote.id} title={`Quotation ${quote.number}`}>
              <p>
                <span className="quotation-state">{displayStatus(quote.status)}</span> · Version{' '}
                {quote.version}
              </p>
              <div className="quote-table">
                {quote.lines.map((line: any) => (
                  <div className="quote-line" key={line.id}>
                    <span>
                      {line.description}
                      <small>
                        {line.quantity} × {money(line.unitPriceCents)}
                        {!line.selected ? ' · Deferred' : ''}
                      </small>
                    </span>
                    <b>{money(line.quantity * line.unitPriceCents)}</b>
                  </div>
                ))}
                <div className="quote-line quote-total">
                  <span>Selected total</span>
                  <b>
                    {money(
                      quote.lines
                        .filter((l: any) => l.selected)
                        .reduce((sum: number, l: any) => sum + l.quantity * l.unitPriceCents, 0),
                    )}
                  </b>
                </div>
              </div>
              <p>{quote.notes}</p>
              {quote.customerRequest ? <p>Customer request: {quote.customerRequest}</p> : null}
              {customer &&
              !quote.payment &&
              !quote.workStartedAt &&
              ['SENT', 'APPROVED'].includes(quote.status) &&
              job.status !== 'AWAITING_PAYMENT' ? (
                <>
                  <button
                    className="secondary"
                    onClick={() => setReviewing(reviewing === quote.id ? '' : quote.id)}
                  >
                    {quote.approvedAt ? 'Edit repair selection' : 'Review and approve'}
                  </button>
                  {reviewing === quote.id ? (
                    <LiveDialog title="Choose your repairs" onClose={() => setReviewing('')}>
                      <RepairChoices
                        key={quote.version}
                        bookingId={job.id}
                        quote={quote}
                        run={run}
                        done={() => {
                          setReviewing('');
                          refresh();
                        }}
                      />
                    </LiveDialog>
                  ) : null}
                </>
              ) : null}
              {customer && quote.approvedAt && !quote.payment ? (
                <button className="primary" onClick={() => setCheckout(quote)}>
                  Review and pay
                </button>
              ) : null}
              {quote.payment ? (
                <button
                  className="secondary"
                  onClick={() =>
                    run(
                      async () =>
                        setInvoice(await api(`/bookings/${job.id}/quotes/${quote.id}/invoice`)),
                      '',
                    )
                  }
                >
                  View invoice
                </button>
              ) : null}
              {mechanic &&
              !quote.payment &&
              ['DRAFT', 'SENT', 'CHANGES_REQUESTED'].includes(quote.status) ? (
                <div className="button-row">
                  <button className="secondary" type="button" onClick={() => setEditingQuote(quote)}>
                    Edit quotation
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      run(async () => {
                        await api(`/bookings/${job.id}/quotes/${quote.id}/actions`, 'POST', {
                          action: 'withdraw',
                          version: quote.version,
                        });
                        refresh();
                      }, 'Quotation withdrawn.')
                    }
                  >
                    Withdraw quotation
                  </button>
                </div>
              ) : null}
              {mechanic &&
              job.status === 'IN_PROGRESS' &&
              quote.status === 'APPROVED' &&
              !quote.workStartedAt ? (
                <button
                  className="secondary"
                  onClick={() =>
                    run(async () => {
                      await api(`/bookings/${job.id}/quotes/${quote.id}/actions`, 'POST', {
                        action: 'start',
                        version: quote.version,
                      });
                      refresh();
                    }, 'Additional repairs started.')
                  }
                >
                  Start these repairs
                </button>
              ) : null}
            </DetailCard>
          ))}
          {invoice ? (
            <LiveDialog title="Repair invoice." heading={false} onClose={() => setInvoice(null)}>
              <span className="chip">PAYMENT PREVIEW</span>
              <h2>Repair invoice.</h2>
              <p>
                {invoice.issuer}
                <br />
                {invoice.vehicle}
              </p>
              {invoice.lines.map((line: any) => (
                <div className="invoice-line" key={line.id}>
                  <span>{line.description}</span>
                  <b>{money(line.quantity * line.unitPriceCents)}</b>
                </div>
              ))}
              <div className="invoice-line total">
                <span>Total</span>
                <b>{money(invoice.payment.amountCents)}</b>
                <span>Quotation {invoice.quoteNumber}</span>
              </div>
              <div className="notice">
                {invoice.demo
                  ? 'No real payment processor is connected. No card details are requested and no money is transferred.'
                  : 'Payment confirmed. No further charge is taken from this screen.'}
              </div>
              <button className="secondary" onClick={() => setInvoice(null)}>
                Close invoice
              </button>
            </LiveDialog>
          ) : null}
        </div>
      </DetailPanel>
      {checkout ? (
        <LiveDialog title="Review payment." heading={false} onClose={() => setCheckout(null)}>
          <span className="chip">PAYMENT PREVIEW</span>
          <h2>Review payment.</h2>
          <p>Quotation {checkout.number}</p>
          {checkout.lines
            .filter((line: any) => line.selected)
            .map((line: any) => (
              <div className="invoice-line" key={line.id}>
                <span>{line.description}</span>
                <b>{money(line.quantity * line.unitPriceCents)}</b>
              </div>
            ))}
          <div className="invoice-line total">
            <span>Total</span>
            <b>
              {money(
                checkout.lines
                  .filter((line: any) => line.selected)
                  .reduce((sum: number, line: any) => sum + line.quantity * line.unitPriceCents, 0),
              )}
            </b>
          </div>
          <div className="notice">
            Online payments are not available yet. No card details are requested and no money is
            transferred.
          </div>
          <button className="primary full" type="button" onClick={() => setCheckout(null)}>
            Close
          </button>
        </LiveDialog>
      ) : null}
      {editingQuote ? (
        <LiveDialog title="Prepare a clear quote." onClose={() => setEditingQuote(null)}>
          <p>Itemise parts and labour. The customer must approve before work begins.</p>
          <QuoteForm
            bookingId={job.id}
            quote={editingQuote}
            run={run}
            done={() => {
              setEditingQuote(null);
              refresh();
            }}
          />
        </LiveDialog>
      ) : null}
      {confirm === 'cancel' ? (
        <LiveDialog title="Cancel this request?" heading={false} onClose={() => setConfirm('')}>
          <h2>Cancel this request?</h2>
          <p>
            {job.professional.name}
            <br />
            {new Date(job.appointmentAt).toLocaleString()}
          </p>
          <button
            className="primary full"
            onClick={() => {
              setConfirm('');
              void action('cancel');
            }}
          >
            Confirm cancellation
          </button>
          <button className="text-link back" onClick={() => setConfirm('')}>
            Keep appointment
          </button>
        </LiveDialog>
      ) : null}
      {confirm === 'reject' ? (
        <LiveDialog title="Reject this request?" heading={false} onClose={() => setConfirm('')}>
          <h2>Reject this request?</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const reason = String(new FormData(event.currentTarget).get('reason'));
              setConfirm('');
              void action('reject', { reason });
            }}
          >
            <label>
              Reason
              <textarea name="reason" required minLength={3} maxLength={240} />
            </label>
            <button className="primary full">Reject request</button>
          </form>
          <button className="text-link back" type="button" onClick={() => setConfirm('')}>
            Keep request
          </button>
        </LiveDialog>
      ) : null}
      {confirm === 'complete' ? (
        <LiveDialog title="Mark work complete" heading={false} onClose={() => setConfirm('')}>
          <h2>Mark this work complete.</h2>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const completionNotes = String(new FormData(event.currentTarget).get('completionNotes'));
              setConfirm('');
              void action('complete', { completionNotes });
            }}
          >
            <label>
              Completed repairs
              <textarea name="completionNotes" minLength={3} maxLength={4000} required />
            </label>
            <button className="primary full">Mark work finished</button>
          </form>
        </LiveDialog>
      ) : null}
      {user.role === 'ADMIN' ? (
        <DetailPanel scope="live-booking" tabId="activity" value={tab}>
          <DetailCard title="Job activity">
            {activityError ? (
              <p role="alert">{activityError}</p>
            ) : !activity ? (
              <RoadLoader label="Loading job activity…" />
            ) : activity.length ? (
              <ol className="activity-list">
                {activity.map((e: any) => (
                  <li key={e.id}>
                    <b>{displayStatus(e.action)}</b>
                    <time>{new Date(e.createdAt).toLocaleString()}</time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No activity recorded for this booking yet.</p>
            )}
          </DetailCard>
        </DetailPanel>
      ) : null}
      <DetailPanel scope="live-booking" tabId="messages" value={tab}>
        {tab === 'messages' ? (
          <Conversation
            user={user}
            bookingId={job.id}
            revision={revision}
            run={run}
            refresh={refresh}
          />
        ) : null}
      </DetailPanel>
    </div>
  );
}
