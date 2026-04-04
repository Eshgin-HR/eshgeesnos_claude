import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'
import {
  listEvents,
  createEvent as apiCreateEvent,
  updateEvent as apiUpdateEvent,
  deleteEvent as apiDeleteEvent,
  GoogleCalendarEvent,
  NewEventPayload,
} from '../lib/googleCalendar'

const TOKEN_KEY = 'gcal_access_token'
const EXPIRY_KEY = 'gcal_token_expiry'

// Google Identity Services types
interface TokenResponse {
  access_token: string
  expires_in: number
  error?: string
}
interface TokenClient {
  requestAccessToken: () => void
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
          }) => TokenClient
        }
      }
    }
  }
}

interface GoogleCalendarContextValue {
  connected: boolean
  connecting: boolean
  tokenExpired: boolean
  events: GoogleCalendarEvent[]
  loadingEvents: boolean
  login: () => void
  logout: () => void
  fetchEventsForRange: (from: Date, to: Date) => Promise<void>
  createEvent: (payload: NewEventPayload) => Promise<GoogleCalendarEvent>
  updateEvent: (eventId: string, payload: Partial<NewEventPayload>) => Promise<GoogleCalendarEvent>
  deleteEvent: (eventId: string) => Promise<void>
}

const GoogleCalendarContext = createContext<GoogleCalendarContextValue | null>(null)

export function useGoogleCalendar() {
  const ctx = useContext(GoogleCalendarContext)
  if (!ctx) throw new Error('useGoogleCalendar must be used inside GoogleCalendarProvider')
  return ctx
}

export function GoogleCalendarProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tokenExpired, setTokenExpired] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const tokenClientRef = useRef<TokenClient | null>(null)

  // Load token from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    const expiry = localStorage.getItem(EXPIRY_KEY)
    if (token && expiry) {
      const expired = Date.now() > parseInt(expiry, 10)
      if (expired) {
        setTokenExpired(true)
        setAccessToken(token)
      } else {
        setAccessToken(token)
        setTokenExpired(false)
      }
    }
  }, [])

  // Initialize GIS token client once the script is loaded
  const initTokenClient = useCallback(() => {
    const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
    if (!clientId || !window.google) return

    tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: (response: TokenResponse) => {
        setConnecting(false)
        if (response.error || !response.access_token) return
        const expiry = Date.now() + (response.expires_in ?? 3600) * 1000
        localStorage.setItem(TOKEN_KEY, response.access_token)
        localStorage.setItem(EXPIRY_KEY, String(expiry))
        setAccessToken(response.access_token)
        setTokenExpired(false)
      },
    })
  }, [])

  // Poll for GIS script to load (it's loaded async)
  useEffect(() => {
    if (window.google) {
      initTokenClient()
      return
    }
    const interval = setInterval(() => {
      if (window.google) {
        initTokenClient()
        clearInterval(interval)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [initTokenClient])

  const connected = !!accessToken

  const login = useCallback(() => {
    if (!tokenClientRef.current) {
      // GIS not loaded yet — try to init again
      initTokenClient()
      if (!tokenClientRef.current) return
    }
    setConnecting(true)
    tokenClientRef.current.requestAccessToken()
  }, [initTokenClient])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    setAccessToken(null)
    setTokenExpired(false)
    setEvents([])
  }, [])

  const fetchEventsForRange = useCallback(async (from: Date, to: Date) => {
    if (!accessToken || tokenExpired) return
    setLoadingEvents(true)
    try {
      const fetched = await listEvents(accessToken, from.toISOString(), to.toISOString())
      setEvents(fetched)
    } catch (err) {
      const message = (err as Error).message ?? ''
      if (message.includes('401') || message.includes('403')) {
        setTokenExpired(true)
      }
    } finally {
      setLoadingEvents(false)
    }
  }, [accessToken, tokenExpired])

  const createEvent = useCallback(async (payload: NewEventPayload) => {
    if (!accessToken) throw new Error('Not connected to Google Calendar')
    const event = await apiCreateEvent(accessToken, payload)
    setEvents(prev => [...prev, event])
    return event
  }, [accessToken])

  const updateEvent = useCallback(async (eventId: string, payload: Partial<NewEventPayload>) => {
    if (!accessToken) throw new Error('Not connected to Google Calendar')
    const updated = await apiUpdateEvent(accessToken, eventId, payload)
    setEvents(prev => prev.map(e => e.id === eventId ? updated : e))
    return updated
  }, [accessToken])

  const deleteEvent = useCallback(async (eventId: string) => {
    if (!accessToken) throw new Error('Not connected to Google Calendar')
    await apiDeleteEvent(accessToken, eventId)
    setEvents(prev => prev.filter(e => e.id !== eventId))
  }, [accessToken])

  return (
    <GoogleCalendarContext.Provider value={{
      connected,
      connecting,
      tokenExpired,
      events,
      loadingEvents,
      login,
      logout,
      fetchEventsForRange,
      createEvent,
      updateEvent,
      deleteEvent,
    }}>
      {children}
    </GoogleCalendarContext.Provider>
  )
}
