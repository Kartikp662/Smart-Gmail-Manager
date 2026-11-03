const { google } = require("googleapis");
const db = require("../db/db");

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.modify",
];

function createOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_CALLBACK_URL || process.env.GOOGLE_REDIRECT_URI;

  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is missing");
  }

  if (!clientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET is missing");
  }

  if (!redirectUri) {
    throw new Error("GOOGLE_CALLBACK_URL is missing");
  }

  console.log("OAuth Client ID loaded:", !!clientId);
  console.log("OAuth Redirect URI:", redirectUri);

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function getAuthUrl(state) {
  const authUrl = createOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });

  const url = new URL(authUrl);

  console.log("OAuth client_id:", url.searchParams.has("client_id"));
  console.log("OAuth redirect_uri:", url.searchParams.get("redirect_uri"));

  return authUrl;
}

function saveUserAndTokens(profile, tokens) {
  const save = db.prepare(`
    INSERT INTO users (google_id, email, name, picture)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(google_id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      picture = excluded.picture
  `);

  save.run(
    profile.sub,
    profile.email,
    profile.name || "",
    profile.picture || "",
  );

  const user = db
    .prepare("SELECT * FROM users WHERE google_id = ?")
    .get(profile.sub);

  db.prepare(
    `
    INSERT INTO tokens (
      user_id, access_token, refresh_token,
      scope, token_type, expiry_date
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token = excluded.access_token,
      refresh_token = COALESCE(
        excluded.refresh_token,
        tokens.refresh_token
      ),
      scope = excluded.scope,
      token_type = excluded.token_type,
      expiry_date = excluded.expiry_date
  `,
  ).run(
    user.id,
    tokens.access_token || null,
    tokens.refresh_token || null,
    tokens.scope || null,
    tokens.token_type || null,
    tokens.expiry_date || null,
  );

  return user;
}

function loadTokens(userId) {
  return db.prepare("SELECT * FROM tokens WHERE user_id = ?").get(userId);
}

function getAuthorizedClient(userId) {
  const stored = loadTokens(userId);

  if (!stored || !stored.refresh_token) {
    throw new Error("Please sign in with Google first.");
  }

  const client = createOAuthClient();

  client.setCredentials({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    scope: stored.scope,
    token_type: stored.token_type,
    expiry_date: stored.expiry_date,
  });

  client.on("tokens", (tokens) => {
    db.prepare(
      `
      UPDATE tokens
      SET access_token = ?,
          refresh_token = ?,
          expiry_date = ?
      WHERE user_id = ?
    `,
    ).run(
      tokens.access_token || stored.access_token,
      tokens.refresh_token || stored.refresh_token,
      tokens.expiry_date || stored.expiry_date,
      userId,
    );
  });

  return client;
}

module.exports = {
  createOAuthClient,
  getAuthUrl,
  saveUserAndTokens,
  loadTokens,
  getAuthorizedClient,
  SCOPES,
};
