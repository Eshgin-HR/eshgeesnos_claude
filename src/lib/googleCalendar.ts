const BASE = 'https://www.googleapis.com/calendar/v3'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end:   { dateTime?: string; date?: string; timeZone?: string }
  colorId?: string
  htmlLink?: string
}

export interface NewEventPayload {
  summary: string
  description?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end:   { dateTime?: string; date?: string; timeZone?: string }
}

async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function listEvents(
  token: string,
  timeMin: string,
  timeMax: string,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const data = await apiFetch<{ items?: GoogleCalendarEvent[] }>(
    `/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    token
  )
  return data.items ?? []
}

export async function createEvent(
  token: string,
  payload: NewEventPayload,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> {
  return apiFetch<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    token,
    { method: 'POST', body: JSON.stringify(payload) }
  )
}

export async function updateEvent(
  token: string,
  eventId: string,
  payload: Partial<NewEventPayload>,
  calendarId = 'primary'
): Promise<GoogleCalendarEvent> {
  return apiFetch<GoogleCalendarEvent>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    token,
    { method: 'PATCH', body: JSON.stringify(payload) }
  )
}

export async function deleteEvent(
  token: string,
  eventId: string,
  calendarId = 'primary'
): Promise<void> {
  await apiFetch<void>(
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    token,
    { method: 'DELETE' }
  )
}

/** Format a Google Calendar event's time for display */
export function formatEventTime(event: GoogleCalendarEvent): string {
  if (event.start.date) return 'All day'
  const start = event.start.dateTime
  const end = event.end.dateTime
  if (!start) return ''
  const fmt = (iso: string) => {
    const d = new Date(iso)
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  }
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start)
}

/** Get the date string (YYYY-MM-DD) for a Google Calendar event */
export function eventDateStr(event: GoogleCalendarEvent): string {
  if (event.start.date) return event.start.date
  if (event.start.dateTime) return event.start.dateTime.slice(0, 10)
  return ''
}
