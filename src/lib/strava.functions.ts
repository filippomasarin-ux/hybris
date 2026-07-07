// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ─── Sport type mapping ───────────────────────────────────────
const STRAVA_SPORT_MAP: Record<string, string> = {
  Run: "corsa",
  TrailRun: "corsa",
  VirtualRun: "corsa",
  Ride: "ciclismo",
  VirtualRide: "ciclismo",
  EBikeRide: "ciclismo",
  GravelRide: "ciclismo",
  MountainBikeRide: "ciclismo",
  Swim: "nuoto",
  WeightTraining: "palestra",
  Workout: "palestra",
  CrossFit: "hiit",
  HIIT: "hiit",
  Yoga: "yoga",
  Pilates: "yoga",
  Walk: "altro",
  Hike: "altro",
};

function mapSportType(stravaType: string): string {
  return STRAVA_SPORT_MAP[stravaType] ?? "altro";
}

// Convert m/s to pace string "M:SS /km" for running, or null for others
function toPaceString(speedMs: number, sportType: string): string | null {
  if (sportType !== "corsa" || speedMs <= 0) return null;
  const secsPerKm = 1000 / speedMs;
  const mins = Math.floor(secsPerKm / 60);
  const secs = Math.round(secsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── Server functions ────────────────────────────────────────

/** Returns the Strava OAuth authorize URL */
export const getStravaAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const clientId = process.env.STRAVA_CLIENT_ID;
    if (!clientId) throw new Error("STRAVA_CLIENT_ID not configured");

    const redirectUri = process.env.STRAVA_REDIRECT_URI ?? "";
    if (!redirectUri) throw new Error("STRAVA_REDIRECT_URI not configured");

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      approval_prompt: "auto",
      scope: "activity:read_all",
    });

    return { url: `https://www.strava.com/oauth/authorize?${params}` };
  });

/** Exchanges an OAuth code for tokens and saves them to the profile */
export const stravaExchangeCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => d as { code: string })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const clientId = process.env.STRAVA_CLIENT_ID;
    const clientSecret = process.env.STRAVA_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error("Strava credentials not configured");

    const res = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: data.code,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Strava token exchange failed: ${body}`);
    }

    const json = await res.json() as {
      access_token: string;
      refresh_token: string;
      expires_at: number;
      athlete: { id: number };
    };

    const { error } = await supabase.from("profiles").update({
      strava_access_token: json.access_token,
      strava_refresh_token: json.refresh_token,
      strava_token_expires_at: json.expires_at,
      strava_athlete_id: json.athlete.id,
    } as Record<string, unknown>).eq("id", userId);

    if (error) throw new Error(`Failed to save tokens: ${error.message}`);

    return { ok: true, athleteId: json.athlete.id };
  });

/** Disconnects Strava by clearing tokens */
export const stravaDisconnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("profiles").update({
      strava_access_token: null,
      strava_refresh_token: null,
      strava_token_expires_at: null,
      strava_athlete_id: null,
    } as Record<string, unknown>).eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Fetches a fresh access token using the stored refresh token */
async function refreshStravaToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error("Strava token refresh failed");
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_at: number }>;
}

/** Syncs the last 90 days of Strava activities into attivita */
export const stravaSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("strava_access_token, strava_refresh_token, strava_token_expires_at")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.strava_access_token || !profile.strava_refresh_token) {
      throw new Error("Strava non connesso");
    }

    let accessToken = profile.strava_access_token;
    const expiresAt = profile.strava_token_expires_at ?? 0;
    const nowSecs = Math.floor(Date.now() / 1000);

    if (expiresAt < nowSecs + 60) {
      const refreshed = await refreshStravaToken(profile.strava_refresh_token);
      accessToken = refreshed.access_token;
      await supabase.from("profiles").update({
        strava_access_token: refreshed.access_token,
        strava_refresh_token: refreshed.refresh_token,
        strava_token_expires_at: refreshed.expires_at,
      } as Record<string, unknown>).eq("id", userId);
    }

    const after = Math.floor(Date.now() / 1000) - 90 * 24 * 60 * 60;
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) throw new Error("Errore recupero attività da Strava");

    const activities = await res.json() as Array<{
      id: number;
      type: string;
      start_date_local: string;
      elapsed_time: number;
      distance: number;
      average_heartrate?: number;
      average_speed: number;
      calories?: number;
    }>;

    if (activities.length === 0) return { imported: 0 };

    const rows = activities.map((a) => {
      const sportType = mapSportType(a.type);
      return {
        user_id: userId,
        strava_activity_id: String(a.id),
        fonte: "strava",
        sport_type: sportType,
        data: a.start_date_local.slice(0, 10),
        durata_min: Math.round(a.elapsed_time / 60),
        distanza_km: a.distance > 0 ? Math.round(a.distance / 10) / 100 : null,
        fc_media: a.average_heartrate ? Math.round(a.average_heartrate) : null,
        pace_media: toPaceString(a.average_speed, sportType),
        calorie: a.calories ? Math.round(a.calories) : null,
      };
    });

    const { error } = await supabase.from("attivita").upsert(rows, {
      onConflict: "strava_activity_id",
      ignoreDuplicates: false,
    });

    if (error) throw new Error(`Errore salvataggio: ${error.message}`);

    return { imported: rows.length };
  });

/** Returns Strava connection status for the current user */
export const getStravaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("strava_athlete_id")
      .eq("id", userId)
      .maybeSingle();

    return { connected: !!data?.strava_athlete_id, athleteId: data?.strava_athlete_id ?? null };
  });
