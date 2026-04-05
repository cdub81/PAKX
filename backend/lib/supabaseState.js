const { URL } = require("node:url");

const DEFAULT_TABLE = "app_state";
const DEFAULT_ROW_ID = "primary";

function trimSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function getConfig(env = process.env) {
  return {
    url: trimSlash(env.SUPABASE_URL || ""),
    serviceRoleKey: String(env.SUPABASE_SERVICE_ROLE_KEY || "").trim(),
    table: String(env.SUPABASE_STATE_TABLE || DEFAULT_TABLE).trim() || DEFAULT_TABLE,
    rowId: String(env.SUPABASE_STATE_ROW_ID || DEFAULT_ROW_ID).trim() || DEFAULT_ROW_ID
  };
}

function isConfigured(env = process.env) {
  const config = getConfig(env);
  return Boolean(config.url && config.serviceRoleKey);
}

async function request(config, path, options = {}) {
  const url = new URL(`${config.url}${path}`);
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.message || body?.error_description || body?.error || `Supabase request failed (${response.status}).`;
    throw new Error(message);
  }
  return body;
}

async function loadState(env = process.env) {
  const config = getConfig(env);
  const encodedId = encodeURIComponent(config.rowId);
  const rows = await request(config, `/rest/v1/${encodeURIComponent(config.table)}?id=eq.${encodedId}&select=state`);
  if (Array.isArray(rows) && rows.length && rows[0].state) {
    return rows[0].state;
  }
  return null;
}

async function loadAllStates(env = process.env) {
  const config = getConfig(env);
  const rows = await request(config, `/rest/v1/${encodeURIComponent(config.table)}?select=id,state`);
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => ({ id: row.id, state: row.state }));
}

async function persistState(state, env = process.env) {
  const config = getConfig(env);
  await request(config, `/rest/v1/${encodeURIComponent(config.table)}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify([
      {
        id: config.rowId,
        state,
        updated_at: new Date().toISOString()
      }
    ])
  });
}

async function persistAllianceState(allianceId, allianceState, env = process.env) {
  const config = getConfig(env);
  await request(config, `/rest/v1/${encodeURIComponent(config.table)}`, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates"
    },
    body: JSON.stringify([
      {
        id: String(allianceId),
        state: allianceState,
        updated_at: new Date().toISOString()
      }
    ])
  });
}

function getSchemaSql(env = process.env) {
  const config = getConfig(env);
  return `create table if not exists public.${config.table} (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.${config.table} enable row level security;`;
}

module.exports = {
  getConfig,
  getSchemaSql,
  isConfigured,
  loadState,
  loadAllStates,
  persistState,
  persistAllianceState
};
