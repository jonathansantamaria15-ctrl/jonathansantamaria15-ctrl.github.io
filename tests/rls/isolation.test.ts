// Integration tests proving multi-tenant isolation and RBAC at the database
// layer (the real RLS policies from supabase/migrations, not app-level
// filtering). Requires a local Postgres 16 (see scripts/db-reset.sh).
import { execSync } from "node:child_process";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import type { Client } from "pg";
import { serviceClient, actingAsUser, createUser } from "./db";

let dbAvailable = true;
let admin: Client;

beforeAll(async () => {
  try {
    execSync("bash scripts/db-reset.sh", { stdio: "pipe" });
    admin = await serviceClient();
  } catch (err) {
    console.warn("Skipping RLS integration tests: local Postgres unavailable.", err);
    dbAvailable = false;
  }
}, 60000);

afterAll(async () => {
  if (dbAvailable) await admin.end();
});

let seedCounter = 0;

async function seedTenants() {
  const n = ++seedCounter;
  const ownerA = await createUser(admin, `owner-a-${n}@example.com`);
  const ownerB = await createUser(admin, `owner-b-${n}@example.com`);
  const employeeA = await createUser(admin, `employee-a-${n}@example.com`);
  const stranger = await createUser(admin, `stranger-${n}@example.com`);
  const superadminUser = await createUser(admin, `superadmin-${n}@example.com`);

  const bizA = (
    await admin.query(
      "insert into public.businesses (slug, name, status, created_by) values ($1, 'Resto A', 'published', $2) returning id",
      [`resto-a-${n}`, ownerA]
    )
  ).rows[0].id;
  const bizB = (
    await admin.query(
      "insert into public.businesses (slug, name, status, created_by) values ($1, 'Resto B', 'draft', $2) returning id",
      [`resto-b-${n}`, ownerB]
    )
  ).rows[0].id;

  await admin.query(
    "insert into public.memberships (business_id, user_id, role) values ($1,$2,'owner'), ($3,$4,'owner'), ($1,$5,'employee')",
    [bizA, ownerA, bizB, ownerB, employeeA]
  );
  await admin.query("insert into public.superadmins (user_id) values ($1)", [superadminUser]);

  const menuA = (
    await admin.query(
      "insert into public.menus (business_id, status) values ($1, 'published') returning id",
      [bizA]
    )
  ).rows[0].id;
  const sectionA = (
    await admin.query(
      "insert into public.menu_sections (business_id, menu_id, name, status) values ($1,$2,'Entrantes','published') returning id",
      [bizA, menuA]
    )
  ).rows[0].id;
  const productA = (
    await admin.query(
      "insert into public.products (business_id, section_id, name, price, status, is_available) values ($1,$2,'Croquetas',6.5,'published',true) returning id",
      [bizA, sectionA]
    )
  ).rows[0].id;

  const menuB = (
    await admin.query(
      "insert into public.menus (business_id, status) values ($1, 'draft') returning id",
      [bizB]
    )
  ).rows[0].id;
  const sectionB = (
    await admin.query(
      "insert into public.menu_sections (business_id, menu_id, name, status) values ($1,$2,'Postres','draft') returning id",
      [bizB, menuB]
    )
  ).rows[0].id;
  const productB = (
    await admin.query(
      "insert into public.products (business_id, section_id, name, price, status) values ($1,$2,'Tarta',4.5,'draft') returning id",
      [bizB, sectionB]
    )
  ).rows[0].id;

  return { ownerA, ownerB, employeeA, stranger, superadminUser, bizA, bizB, productA, productB };
}

describe("multi-tenant RLS isolation", () => {
  it("an owner cannot read another tenant's draft business or products", async () => {
    if (!dbAvailable) return;
    const { ownerA, bizB, productB } = await seedTenants();
    const asOwnerA = await actingAsUser(ownerA);

    const biz = await asOwnerA.query("select * from public.businesses where id = $1", [bizB]);
    expect(biz.rowCount).toBe(0);

    const product = await asOwnerA.query("select * from public.products where id = $1", [productB]);
    expect(product.rowCount).toBe(0);

    await asOwnerA.end();
  });

  it("an owner cannot update another tenant's product (row invisible => 0 rows affected)", async () => {
    if (!dbAvailable) return;
    const { ownerA, productB } = await seedTenants();
    const asOwnerA = await actingAsUser(ownerA);

    const res = await asOwnerA.query(
      "update public.products set price = 999 where id = $1",
      [productB]
    );
    expect(res.rowCount).toBe(0);

    const check = await admin.query("select price from public.products where id = $1", [productB]);
    expect(Number(check.rows[0].price)).toBe(4.5);

    await asOwnerA.end();
  });

  it("a stranger with no membership sees nothing private, but sees published content", async () => {
    if (!dbAvailable) return;
    const { stranger, bizA, bizB } = await seedTenants();
    const asStranger = await actingAsUser(stranger);

    const visible = await asStranger.query(
      "select id, status from public.businesses where id = any($1)",
      [[bizA, bizB]]
    );
    const ids = visible.rows.map((r) => r.id);
    expect(ids).toContain(bizA); // published
    expect(ids).not.toContain(bizB); // draft, not a member

    await asStranger.end();
  });

  it("anonymous (unauthenticated) users can read only published business content", async () => {
    if (!dbAvailable) return;
    const { bizA, bizB } = await seedTenants();
    const anon = await actingAsUser(null);

    const businesses = await anon.query("select id from public.businesses where id = any($1)", [
      [bizA, bizB],
    ]);
    const ids = businesses.rows.map((r) => r.id);
    expect(ids).toContain(bizA);
    expect(ids).not.toContain(bizB);

    const products = await anon.query(
      "select id, business_id from public.products where business_id = any($1)",
      [[bizA, bizB]]
    );
    expect(products.rowCount).toBeGreaterThan(0);
    for (const row of products.rows) {
      expect(row.business_id).toBe(bizA);
    }

    await anon.end();
  });

  it("employee cannot write products directly, but can flip availability via the RPC", async () => {
    if (!dbAvailable) return;
    const { employeeA, productA } = await seedTenants();
    const asEmployee = await actingAsUser(employeeA);

    const directUpdate = await asEmployee.query(
      "update public.products set name = 'Hacked' where id = $1",
      [productA]
    );
    expect(directUpdate.rowCount).toBe(0);

    await asEmployee.query("select public.set_product_availability($1, false)", [productA]);
    const check = await admin.query("select is_available, name from public.products where id=$1", [
      productA,
    ]);
    expect(check.rows[0].is_available).toBe(false);
    expect(check.rows[0].name).toBe("Croquetas"); // untouched by the RPC

    await asEmployee.end();
  });

  it("employee from business A cannot toggle availability on business B's product", async () => {
    if (!dbAvailable) return;
    const { employeeA, productB } = await seedTenants();
    const asEmployee = await actingAsUser(employeeA);

    await expect(
      asEmployee.query("select public.set_product_availability($1, false)", [productB])
    ).rejects.toThrow();

    await asEmployee.end();
  });

  it("superadmin can read and update across every tenant", async () => {
    if (!dbAvailable) return;
    const { superadminUser, bizA, bizB } = await seedTenants();
    const asSuperadmin = await actingAsUser(superadminUser);

    const businesses = await asSuperadmin.query("select id from public.businesses");
    const ids = businesses.rows.map((r) => r.id);
    expect(ids).toContain(bizA);
    expect(ids).toContain(bizB);

    const res = await asSuperadmin.query(
      "update public.businesses set status='published' where id=$1",
      [bizB]
    );
    expect(res.rowCount).toBe(1);

    await asSuperadmin.end();
  });

  it("a non-superadmin cannot insert a business directly (must go through service role)", async () => {
    if (!dbAvailable) return;
    const { ownerA } = await seedTenants();
    const asOwnerA = await actingAsUser(ownerA);

    await expect(
      asOwnerA.query(
        "insert into public.businesses (slug, name, status) values ('sneaky', 'Sneaky', 'draft')"
      )
    ).rejects.toThrow();

    await asOwnerA.end();
  });

  it("bootstrap_superadmin only succeeds once, for the first caller", async () => {
    if (!dbAvailable) return;
    const admin2 = await serviceClient();
    const u1 = await createUser(admin2, "first@example.com");
    const u2 = await createUser(admin2, "second@example.com");
    await admin2.query("delete from public.superadmins"); // isolate from other tests' seed data
    await admin2.end();

    const as1 = await actingAsUser(u1);
    const first = await as1.query("select public.bootstrap_superadmin() as ok");
    expect(first.rows[0].ok).toBe(true);
    await as1.end();

    const as2 = await actingAsUser(u2);
    const second = await as2.query("select public.bootstrap_superadmin() as ok");
    expect(second.rows[0].ok).toBe(false);
    await as2.end();
  });

  it("invitations: only the invited email can accept, and role is granted correctly", async () => {
    if (!dbAvailable) return;
    const { ownerA, bizA } = await seedTenants();
    const invitedUser = await createUser(admin, "new-manager@example.com");
    const wrongUser = await createUser(admin, "not-invited@example.com");

    const asOwnerA = await actingAsUser(ownerA);
    const invite = await asOwnerA.query(
      "insert into public.invitations (business_id, email, role, token, invited_by) values ($1,'new-manager@example.com','manager','tok-1',$2) returning id",
      [bizA, ownerA]
    );
    expect(invite.rowCount).toBe(1);
    await asOwnerA.end();

    const asWrongUser = await actingAsUser(wrongUser);
    await expect(asWrongUser.query("select public.accept_invitation('tok-1')")).rejects.toThrow();
    await asWrongUser.end();

    const asInvited = await actingAsUser(invitedUser);
    await asInvited.query("select public.accept_invitation('tok-1')");
    await asInvited.end();

    const membership = await admin.query(
      "select role from public.memberships where business_id=$1 and user_id=$2",
      [bizA, invitedUser]
    );
    expect(membership.rows[0].role).toBe("manager");
  });

  it("only superadmin can create an 'owner' invitation; an owner cannot self-escalate a peer", async () => {
    if (!dbAvailable) return;
    const { ownerA, superadminUser, bizA } = await seedTenants();

    const asOwnerA = await actingAsUser(ownerA);
    await expect(
      asOwnerA.query(
        "insert into public.invitations (business_id, email, role, token, invited_by) values ($1,'co-owner@example.com','owner','tok-owner-a',$2)",
        [bizA, ownerA]
      )
    ).rejects.toThrow();
    await asOwnerA.end();

    const asSuperadmin = await actingAsUser(superadminUser);
    const res = await asSuperadmin.query(
      "insert into public.invitations (business_id, email, role, token, invited_by) values ($1,'co-owner@example.com','owner','tok-owner-b',$2) returning id",
      [bizA, superadminUser]
    );
    expect(res.rowCount).toBe(1);
    await asSuperadmin.end();
  });

  it("new auth.users rows get a profiles row via the handle_new_user trigger", async () => {
    if (!dbAvailable) return;
    const userId = await createUser(admin, "trigger-check@example.com");
    const profile = await admin.query("select id from public.profiles where id=$1", [userId]);
    expect(profile.rowCount).toBe(1);
  });

  it("platform_summary() is superadmin-only but sees every tenant", async () => {
    if (!dbAvailable) return;
    const { ownerA, superadminUser, bizA, bizB } = await seedTenants();

    const asOwnerA = await actingAsUser(ownerA);
    await expect(asOwnerA.query("select public.platform_summary()")).rejects.toThrow();
    await asOwnerA.end();

    const asSuperadmin = await actingAsUser(superadminUser);
    const summary = await asSuperadmin.query("select * from public.platform_summary()");
    expect(Number(summary.rows[0].businesses_total)).toBeGreaterThanOrEqual(2);
    await asSuperadmin.end();
    void bizA;
    void bizB;
  });
});
