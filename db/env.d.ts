declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    CONFERENCE_TRACKER_ADMIN_EMAILS?: string;
    GOOGLE_CLIENT_ID?: string;
  }
}
