// Test-only helpers for exercising the real RLS policies (supabase/migrations)
// against a local Postgres instance provisioned by scripts/db-reset.sh.
// Not used by the application at runtime.
import { Client } from "pg";

const DB_NAME = process.env.LOCAL_TEST_DB ?? "hosteleria_test";
const HOST = "127.0.0.1";

export async function serviceClient(): Promise<Client> {
  const client = new Client({
    host: HOST,
    port: 5432,
    user: "service_role",
    password: "service_role",
    database: DB_NAME,
  });
  await client.connect();
  return client;
}

/**
 * A Postgres client acting as the `authenticated` role with a given user id
 * injected as the JWT `sub` claim, exactly mirroring how Supabase/PostgREST
 * sets `request.jwt.claim.sub` per request before RLS evaluates auth.uid().
 */
export async function actingAsUser(userId: string | null): Promise<Client> {
  const client = new Client({
    host: HOST,
    port: 5432,
    user: "app_test_user",
    password: "app_test_user",
    database: DB_NAME,
  });
  await client.connect();
  await client.query(`set role ${userId ? "authenticated" : "anon"}`);
  if (userId) {
    await client.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
  } else {
    await client.query("select set_config('request.jwt.claim.sub', '', false)");
  }
  return client;
}

export async function createUser(admin: Client, email: string): Promise<string> {
  const res = await admin.query<{ id: string }>(
    "insert into auth.users (email) values ($1) returning id",
    [email]
  );
  return res.rows[0].id;
}
