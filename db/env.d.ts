declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    CONFERENCE_TRACKER_ADMIN_EMAILS?: string;
    GOOGLE_CLIENT_ID?: string;
    CATALOG_SYNC_TOKEN?: string;
    SCHEDULE_SYNC_TOKEN?: string;
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
  }
}
