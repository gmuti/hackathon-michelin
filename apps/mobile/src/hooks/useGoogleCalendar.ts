import { useState, useEffect, useCallback } from 'react';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
// Desktop app : client_secret requis pour l'échange de token (considéré "public" pour ce type)
const CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET ?? '';
const GOOGLE_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

export type CalendarEvent = {
  id: string;
  summary: string;
  location: string;
  start: { dateTime?: string; date?: string };
};

export type EventCoords = { lat: number; lng: number };

export function useGoogleCalendar() {
  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      redirectUri,
      // PKCE activé par défaut — code_verifier généré automatiquement
    },
    GOOGLE_DISCOVERY,
  );

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date().toISOString();
      const end = new Date(Date.now() + 7 * 86_400_000).toISOString();
      const url =
        'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
        `?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(end)}` +
        '&singleEvents=true&orderBy=startTime&maxResults=20';

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const withLocation = ((data.items ?? []) as any[])
        .filter((e) => e.location)
        .map((e) => ({
          id: e.id,
          summary: e.summary ?? 'Événement sans titre',
          location: e.location as string,
          start: e.start as { dateTime?: string; date?: string },
        }));

      setEvents(withLocation);
    } catch {
      setError('Impossible de récupérer les événements');
    } finally {
      setLoading(false);
    }
  }, []);

  // Échange du code contre un access_token (PKCE, sans client_secret)
  useEffect(() => {
    if (response?.type !== 'success' || !request) return;

    AuthSession.exchangeCodeAsync(
      {
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        redirectUri,
        code: response.params.code,
        extraParams: { code_verifier: request.codeVerifier! },
      },
      GOOGLE_DISCOVERY,
    )
      .then((tokenRes) => {
        setAccessToken(tokenRes.accessToken);
        fetchEvents(tokenRes.accessToken);
      })
      .catch(() => setError('Échec de la connexion à Google'));
  }, [response]);

  const geocodeEvent = useCallback(
    async (event: CalendarEvent): Promise<EventCoords | null> => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(event.location)}&format=json&limit=1`,
          { headers: { 'User-Agent': 'MichelinMatch/1.0' } },
        );
        const data = await res.json();
        if (data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      } catch {}
      return null;
    },
    [],
  );

  const connect = useCallback(() => promptAsync(), [promptAsync]);

  const disconnect = useCallback(() => {
    setAccessToken(null);
    setEvents([]);
    setError(null);
  }, []);

  return {
    isConnected: !!accessToken,
    events,
    loading,
    error,
    connect,
    disconnect,
    geocodeEvent,
    requestReady: !!request,
  };
}
