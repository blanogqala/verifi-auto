import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import request from "supertest";
import { Client } from "pg";

// Actual PostgreSQL engine compiled to WASM; exercise migrations, Prisma and HTTP together.
// Production concurrency/load must also be tested on ordinary PostgreSQL before launch.
test(
  "authenticated API: isolation, booking/quote flow, documents, reset and events",
  { timeout: 120000 },
  async () => {
    const migrationsUrl = new URL("../prisma/migrations/", import.meta.url);
    const migrationNames = (
      await readdir(migrationsUrl, { withFileTypes: true })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const migration = (
      await Promise.all(
        migrationNames.map((name) =>
          readFile(new URL(`${name}/migration.sql`, migrationsUrl), "utf8"),
        ),
      )
    ).join("\n");
    let closeDatabase: () => Promise<void>;
    if (process.env.TEST_DATABASE_URL) {
      const url = new URL(process.env.TEST_DATABASE_URL);
      assert.ok(
        url.pathname.endsWith("_test"),
        "TEST_DATABASE_URL must use a dedicated database ending in _test",
      );
      const client = new Client({ connectionString: url.toString() });
      await client.connect();
      assert.equal(
        (
          await client.query(
            "SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
          )
        ).rows[0].count,
        0,
        "Use an empty disposable test database",
      );
      await client.query(migration);
      await client.end();
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      closeDatabase = async () => {};
    } else {
      const pg = await PGlite.create();
      await pg.exec(migration);
      const server = new PGLiteSocketServer({
        db: pg,
        port: 15439,
        host: "127.0.0.1",
        maxConnections: 12,
      });
      await server.start();
      process.env.DATABASE_URL =
        "postgresql://postgres:postgres@127.0.0.1:15439/postgres";
      closeDatabase = async () => {
        await server.stop();
        await pg.close();
      };
    }
    process.env.NODE_ENV = "test";
    process.env.WEB_ORIGIN = "http://localhost:5173";
    process.env.ENABLE_TEST_PAYMENTS = "true";
    const { app } = await import("../src/app.js");
    const { db } = await import("../src/lib/db.js");
    const { hashPassword } = await import("../src/lib/security.js");
    const origin = process.env.WEB_ORIGIN;
    const http = request(app);
    type Session = { cookie: string; csrf: string; user: { id: string } };
    const send = (
      method: string,
      path: string,
      body?: unknown,
      session?: Session,
    ) => {
      const r = (http as any)[method](path).set("Origin", origin);
      if (session)
        r.set("Cookie", session.cookie).set("X-CSRF-Token", session.csrf);
      return body === undefined ? r : r.send(body);
    };
    const login = async (
      email: string,
      password = "StrongExample9!",
    ): Promise<Session> => {
      const r = await send("post", "/api/auth/login", { email, password });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      return {
        cookie: r.headers["set-cookie"][0].split(";")[0],
        csrf: r.body.csrf,
        user: r.body.user,
      };
    };
    try {
      assert.equal(
        (
          await send("post", "/api/auth/register", {
            name: "Test",
            email: "bad",
            password: "weak",
            role: "ADMIN",
          })
        ).status,
        422,
      );
      assert.equal(
        (
          await http
            .post("/api/auth/register")
            .set("Origin", "https://evil.example")
            .send({})
        ).status,
        403,
      );
      for (const [name, email, role] of [
        ["Alice", "alice@example.test", "CUSTOMER"],
        ["Bob", "bob@example.test", "CUSTOMER"],
        ["Mechanic", "mechanic@example.test", "MECHANIC"],
      ]) {
        const r = await send("post", "/api/auth/register", {
          name,
          email,
          role,
          password: "StrongExample9!",
        });
        assert.equal(r.status, 202, JSON.stringify(r.body));
        const mail = await db.mailOutbox.findFirstOrThrow({
          where: { to: email },
        });
        assert.ok(mail.html?.includes("Verify email"));
        assert.ok(
          mail.html?.includes('href="http://localhost:5173/#verify?token='),
        );
        assert.ok(mail.body.includes("If you did not request this"));
        const token = mail.body.match(/token=([\w-]+)/)![1];
        assert.equal(
          (await send("post", "/api/auth/verify", { token })).status,
          200,
        );
        assert.equal(
          (await send("post", "/api/auth/verify", { token })).status,
          400,
        );
      }
      // Reset limiter only in this disposable test database; rate-limit behavior checked below.
      await db.rateLimit.deleteMany();
      const alice = await login("alice@example.test"),
        bob = await login("bob@example.test"),
        mechanic = await login("mechanic@example.test");
      const profilePhoto = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD5/ooooA//2Q==";
      const savedProfile = await send("patch", "/api/auth/profile", {
        name: "Alice Customer", phone: "082 123 4567", photo: profilePhoto, emailUpdates: true,
      }, alice);
      assert.equal(savedProfile.status, 200);
      assert.equal(savedProfile.body.photo, profilePhoto);
      assert.equal(savedProfile.body.emailUpdates, true);
      const persistedProfile = (await send("get", "/api/auth/session", undefined, alice)).body.user;
      assert.equal(persistedProfile.photo, profilePhoto);
      assert.equal(persistedProfile.emailUpdates, true);
      const otherProfile = (await send("get", "/api/auth/session", undefined, bob)).body.user;
      assert.equal(otherProfile.photo, null);
      assert.equal(otherProfile.emailUpdates, false);
      for (const invalid of [
        { photo: "data:image/svg+xml;base64,PHN2Zz4=" },
        { photo: "https://example.test/photo.jpg" },
        { photo: "data:image/jpeg;base64,bm90YW5pbWFnZQ==" },
        { photo: "x".repeat(120001) },
        { email: "other@example.test" },
        { id: bob.user.id },
        { emailUpdates: "true" },
      ]) {
        assert.equal((await send("patch", "/api/auth/profile", {
          name: "Alice Customer", phone: "0821234567", ...invalid,
        }, alice)).status, 422);
      }
      assert.equal((await send("patch", "/api/auth/profile", {
        name: "Alice Customer", phone: "0821234567", photo: "", emailUpdates: false,
      }, alice)).status, 200);
      assert.equal((await send("get", "/api/auth/session", undefined, alice)).body.user.photo, "");
      const adminUser = await db.user.create({
        data: {
          name: "Admin",
          email: "admin@example.test",
          role: "ADMIN",
          passwordHash: await hashPassword("StrongExample9!"),
          verifiedAt: new Date(),
        },
      });
      const admin = await login("admin@example.test");
      // A mechanic is registered before submitting their evidence.
      const drafts = await send("get", "/api/admin/applications?take=100", undefined, admin);
      assert.equal(drafts.status, 200);
      const draft = drafts.body.find((row: any) => row.userId === mechanic.user.id);
      assert.equal(draft?.status, "DRAFT");
      assert.equal(draft?.user?.email, "mechanic@example.test");
      assert.ok(draft?.user?.verifiedAt);
      assert.deepEqual(draft?.user?.documents, []);
      assert.ok(!JSON.stringify(drafts.body).includes("passwordHash"));
      assert.ok(!JSON.stringify(drafts.body).includes("bytes"));
      assert.equal((await send("get", "/api/admin/applications", undefined, alice)).status, 403);
      assert.deepEqual((await send("get", "/api/admin/professionals", undefined, admin)).body, []);
      const sessionResponse = await send(
        "get",
        "/api/auth/session",
        undefined,
        alice,
      );
      assert.equal(
        sessionResponse.body.csrf,
        alice.csrf,
        "opening a second tab must not invalidate CSRF",
      );
      assert.ok(!JSON.stringify(sessionResponse.body).includes("passwordHash"));
      assert.equal(
        (
          await http
            .post("/api/vehicles")
            .set("Cookie", alice.cookie)
            .set("Origin", origin)
            .send({})
        ).status,
        403,
      );
      const emptyOverview = await send(
        "get",
        "/api/customer/overview",
        undefined,
        alice,
      );
      assert.equal(emptyOverview.status, 200);
      assert.deepEqual(emptyOverview.body, {
        activeBookings: 0,
        quotesToReview: 0,
        vehicles: 0,
        serviceRecords: 0,
        recentBookings: [],
      });
      assert.equal(
        (await send("get", "/api/customer/overview", undefined, mechanic))
          .status,
        403,
      );
      const carInput = {
        make: "Volkswagen",
        model: "Polo",
        year: 2020,
        registration: "CA123456",
        paintColorName: "Silver",
      };
      const car = await send("post", "/api/vehicles", carInput, alice);
      assert.equal(car.status, 201, JSON.stringify(car.body));
      assert.equal(
        (await send("get", "/api/vehicles/" + car.body.id, undefined, bob))
          .status,
        404,
      );
      assert.equal(
        (await send("get", "/api/vehicles/" + car.body.id, undefined, mechanic))
          .status,
        403,
      );
      assert.equal(
        (await send("get", "/api/vehicles/" + car.body.id, undefined, alice))
          .body.modelMatch,
        "unavailable",
      );
      assert.equal(car.body.bodyStyle, "");
      assert.equal(car.body.licenceDiscSource, "owner");
      assert.equal(car.body.nextServiceSource, "owner");
      assert.equal(car.body.licenceDiscExpiry, null);
      const keptInput = {
        ...carInput,
        registration: "CA777001",
        bodyStyle: "hatchback",
        mileage: 42000,
        licenceDiscExpiry: "2026-12-31",
        nextServiceDate: "2027-01-01",
        nextServiceMileage: 50000,
      };
      const kept = await send("post", "/api/vehicles", keptInput, alice);
      assert.equal(kept.status, 201, JSON.stringify(kept.body));
      assert.equal(kept.body.bodyStyle, "hatchback");
      assert.equal(kept.body.nextServiceMileage, 50000);
      assert.equal(kept.body.licenceDiscExpiry, "2026-12-31");
      assert.equal(kept.body.nextServiceDate, "2027-01-01");
      assert.equal(kept.body.licenceDiscSource, "owner");
      assert.equal(kept.body.nextServiceSource, "owner");
      assert.equal(
        (
          await send("get", "/api/vehicles/" + kept.body.id, undefined, alice)
        ).body.licenceDiscExpiry,
        "2026-12-31",
      );
      await db.vehicle.update({
        where: { id: kept.body.id },
        data: { licenceDiscSource: "mechanic", nextServiceSource: "mechanic" },
      });
      const paintOnly = await send(
        "patch",
        "/api/vehicles/" + kept.body.id,
        { ...keptInput, paintColorName: "White", version: kept.body.version },
        alice,
      );
      assert.equal(paintOnly.status, 200, JSON.stringify(paintOnly.body));
      assert.equal(paintOnly.body.licenceDiscSource, "mechanic");
      assert.equal(paintOnly.body.nextServiceSource, "mechanic");
      assert.equal(paintOnly.body.licenceDiscExpiry, "2026-12-31");
      assert.equal(paintOnly.body.paintColorName, "White");
      const dated = await send(
        "patch",
        "/api/vehicles/" + kept.body.id,
        {
          ...keptInput,
          paintColorName: "White",
          licenceDiscExpiry: "2026-06-15",
          nextServiceMileage: 51000,
          licenceDiscSource: "mechanic",
          nextServiceSource: "mechanic",
          version: paintOnly.body.version,
        },
        alice,
      );
      assert.equal(dated.status, 422);
      const ownerAgain = await send(
        "patch",
        "/api/vehicles/" + kept.body.id,
        {
          ...keptInput,
          paintColorName: "White",
          licenceDiscExpiry: "2026-06-15",
          nextServiceMileage: 51000,
          version: paintOnly.body.version,
        },
        alice,
      );
      assert.equal(ownerAgain.status, 200, JSON.stringify(ownerAgain.body));
      assert.equal(ownerAgain.body.licenceDiscSource, "owner");
      assert.equal(ownerAgain.body.nextServiceSource, "owner");
      assert.equal(ownerAgain.body.licenceDiscExpiry, "2026-06-15");
      assert.equal(ownerAgain.body.nextServiceDate, "2027-01-01");
      assert.equal(ownerAgain.body.nextServiceMileage, 51000);
      const cleared = await send(
        "patch",
        "/api/vehicles/" + kept.body.id,
        {
          ...keptInput,
          paintColorName: "White",
          licenceDiscExpiry: null,
          nextServiceDate: null,
          nextServiceMileage: null,
          version: ownerAgain.body.version,
        },
        alice,
      );
      assert.equal(cleared.status, 200, JSON.stringify(cleared.body));
      assert.equal(cleared.body.licenceDiscExpiry, null);
      assert.equal(cleared.body.nextServiceDate, null);
      assert.equal(cleared.body.nextServiceMileage, null);
      assert.equal(
        (
          await send("patch", "/api/vehicles/" + kept.body.id, {
            ...keptInput,
            version: 0,
          }, alice)
        ).status,
        409,
      );
      assert.equal(
        (
          await send("post", "/api/vehicles", keptInput, alice)
        ).status,
        409,
      );
      assert.equal(
        (
          await send(
            "post",
            "/api/vehicles",
            { ...keptInput, licenceDiscExpiry: "31-12-2026" },
            alice,
          )
        ).status,
        422,
      );
      assert.equal(
        (await send("delete", "/api/vehicles/" + kept.body.id, {}, alice))
          .status,
        204,
      );
      assert.equal(
        (await send("get", "/api/vehicles/" + kept.body.id, undefined, alice))
          .body.archivedAt == null,
        false,
      );
      const otherCar = await send(
        "post",
        "/api/vehicles",
        { ...carInput, registration: "CA654321" },
        bob,
      );
      let pro = await db.professional.findUniqueOrThrow({
        where: { userId: mechanic.user.id },
      });
      const profile = {
        name: "Workshop Test",
        type: "Workshop",
        city: "Cape Town",
        address: "Test address",
        about: "A properly equipped test workshop.",
        services: ["Brakes"],
        phone: "0712345678",
        website: "https://workshop.example.test",
        latitude: -33.9,
        longitude: 18.4,
        version: 0,
      };
      assert.equal(
        (await send("patch", "/api/professional/me", profile, mechanic)).status,
        200,
      );
      assert.equal(
        (await send("post", "/api/professional/me/submit", {}, mechanic))
          .status,
        422,
      );
      for (const kind of ["IDENTITY", "QUALIFICATION"]) {
        const r = await http
          .post("/api/documents")
          .set("Origin", origin)
          .set("Cookie", mechanic.cookie)
          .set("X-CSRF-Token", mechanic.csrf)
          .field("kind", kind)
          .attach("file", Buffer.from("%PDF-1.4\nTest evidence"), {
            filename: "evidence.pdf",
            contentType: "application/pdf",
          });
        assert.equal(r.status, 201, JSON.stringify(r.body));
        assert.equal(
          (await send("get", "/api/documents/" + r.body.id, undefined, alice))
            .status,
          404,
        );
        assert.equal(
          (await send("get", "/api/documents/" + r.body.id, undefined, admin))
            .status,
          200,
        );
      }
      assert.equal(
        (await send("post", "/api/professional/me/submit", {}, mechanic))
          .status,
        200,
      );
      pro = await db.professional.findUniqueOrThrow({ where: { id: pro.id } });
      const submitted = await send("get", "/api/admin/applications", undefined, admin);
      const submittedRow = submitted.body.find((row: any) => row.id === pro.id);
      assert.equal(submittedRow?.status, "SUBMITTED");
      assert.deepEqual(
        submittedRow.user.documents.map((document: any) => document.kind).sort(),
        ["IDENTITY", "QUALIFICATION"],
      );
      assert.ok(!JSON.stringify(submittedRow).includes("bytes"));
      const rejectedWithoutEvidence = await send("post", `/api/admin/professionals/${pro.id}/review`, {
        status: "APPROVED", note: "", version: pro.version,
      }, admin);
      assert.equal(rejectedWithoutEvidence.status, 422);
      for (const doc of submittedRow.user.documents) {
        const response = await send("post", `/api/admin/documents/${doc.id}/review`, {
          decision: "APPROVED", previousStatus: "PENDING", note: "",
        }, admin);
        assert.equal(response.status, 200, JSON.stringify(response.body));
        assert.equal(response.body.reviewStatus, "APPROVED");
        assert.equal((await send("get", `/api/documents/${doc.id}/preview`, undefined, admin)).status, 200);
        assert.equal((await send("get", `/api/documents/${doc.id}/preview`, undefined, alice)).status, 404);
      }
      assert.equal(
        (
          await send(
            "post",
            `/api/admin/professionals/${pro.id}/review`,
            {
              status: "APPROVED",
              note: "Evidence reviewed.",
              version: pro.version,
            },
            alice,
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await send(
            "post",
            `/api/admin/professionals/${pro.id}/review`,
            {
              status: "APPROVED",
              note: "Evidence reviewed.",
              version: pro.version,
            },
            admin,
          )
        ).status,
        200,
      );
      const afterApproval = await send("get", "/api/admin/applications", undefined, admin);
      assert.ok(!afterApproval.body.some((row: any) => row.id === pro.id));
      const listing = await send("get", "/api/professionals");
      assert.equal(listing.body.length, 1);
      assert.ok(!JSON.stringify(listing.body).includes("passwordHash"));
      assert.equal(listing.body[0].user, undefined, 'Public directory must not expose the account relation');
      assert.equal(listing.body[0].email, undefined, 'Directory cards must not disclose registered email');
      const publicProfile = await send("get", `/api/professionals/${pro.id}`);
      assert.equal(publicProfile.status, 200);
      assert.equal(publicProfile.body.email, "mechanic@example.test");
      assert.equal(publicProfile.body.address, "Test address");
      assert.equal(publicProfile.body.phone, "0712345678");
      assert.equal(publicProfile.body.website, "https://workshop.example.test");
      assert.equal(publicProfile.body.reviewCount, 0);
      assert.equal(publicProfile.body.rating, null);
      assert.equal(publicProfile.body.user, undefined);
      for (const path of [`/api/admin/professionals/${pro.id}`, "/api/admin/professionals", "/api/admin/application-history", `/api/admin/users/${alice.user.id}`]) {
        assert.equal((await send("get", path, undefined, alice)).status, 403);
        const result = await send("get", path, undefined, admin);
        assert.equal(result.status, 200);
        assert.ok(!JSON.stringify(result.body).includes("passwordHash"));
      }
      const managed = await send("get", "/api/admin/professionals", undefined, admin);
      assert.equal(managed.body[0].id, pro.id);
      const bookingInput = {
        vehicleId: car.body.id,
        professionalId: pro.id,
        description: "Inspect brakes",
        appointmentAt: new Date(Date.now() + 86400000).toISOString(),
        clientRequestId: randomUUID(),
      };
      assert.equal(
        (
          await send(
            "post",
            "/api/bookings",
            { ...bookingInput, vehicleId: otherCar.body.id },
            alice,
          )
        ).status,
        404,
      );
      const booked = await send("post", "/api/bookings", bookingInput, alice);
      assert.equal(booked.status, 201, JSON.stringify(booked.body));
      const bookingId = booked.body.id;
      assert.equal(booked.body.customer.name, "Alice Customer");
      assert.equal(booked.body.customer.email, "alice@example.test");
      const mechanicBooking = await send("get", `/api/bookings/${bookingId}`, undefined, mechanic);
      assert.equal(mechanicBooking.status, 200);
      assert.equal(mechanicBooking.body.customer.email, "alice@example.test");
      assert.equal(mechanicBooking.body.customer.phone, "0821234567");
      assert.equal(mechanicBooking.body.vehicle.make, "Volkswagen");
      assert.ok(!JSON.stringify(mechanicBooking.body).includes("passwordHash"));
      const overview = (
        await send("get", "/api/customer/overview", undefined, alice)
      ).body;
      assert.equal(overview.activeBookings, 1);
      assert.equal(overview.vehicles, 1);
      assert.equal(overview.recentBookings[0].id, bookingId);
      assert.equal(
        (await send("get", "/api/customer/overview", undefined, bob)).body
          .activeBookings,
        0,
      );

      assert.equal(
        (await send("post", "/api/bookings", bookingInput, alice)).body.id,
        bookingId,
      );
      assert.equal(
        (await send("get", `/api/bookings/${bookingId}`, undefined, bob))
          .status,
        404,
      );
      assert.equal(
        (await send("get", "/api/bookings", undefined, bob)).body.length,
        0,
      );
      const act = (action: string, version: number, who: Session, extra = {}) =>
        send(
          "post",
          `/api/bookings/${bookingId}/actions`,
          { action, version, ...extra },
          who,
        );
      assert.equal((await act("accept", 0, alice)).status, 403);
      assert.equal((await act("accept", 0, mechanic)).status, 200);
      assert.equal((await act("accept", 0, mechanic)).status, 409);
      const quoteInput = {
        notes: "Brake pads and labour",
        lines: [
          {
            description: "Pads",
            category: "parts",
            quantity: 1,
            unitPriceCents: 70000,
          },
          {
            description: "Labour",
            category: "labour",
            quantity: 1,
            unitPriceCents: 25000,
          },
        ],
        send: true,
        clientRequestId: randomUUID(),
      };
      const quoted = await send(
        "post",
        `/api/bookings/${bookingId}/quotes`,
        quoteInput,
        mechanic,
      );
      assert.equal(quoted.status, 201, JSON.stringify(quoted.body));
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes`,
            quoteInput,
            mechanic,
          )
        ).body.id,
        quoted.body.id,
      );
      const qid = quoted.body.id;
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes/${qid}/test-payment`,
            { version: 1 },
            alice,
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes/${qid}/actions`,
            {
              action: "approve",
              version: 0,
              selectedLineIds: [quoted.body.lines[0].id],
            },
            alice,
          )
        ).status,
        409,
      );
      const approved = await send(
        "post",
        `/api/bookings/${bookingId}/quotes/${qid}/actions`,
        {
          action: "approve",
          version: 1,
          selectedLineIds: [quoted.body.lines[0].id],
        },
        alice,
      );
      assert.equal(approved.status, 200, JSON.stringify(approved.body));
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes/${qid}/checkout`,
            {},
            alice,
          )
        ).status,
        503,
      );
      const payment = await send(
        "post",
        `/api/bookings/${bookingId}/quotes/${qid}/test-payment`,
        { version: approved.body.version },
        alice,
      );
      assert.equal(payment.status, 200, JSON.stringify(payment.body));
      assert.equal(payment.body.amountCents, 70000);
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes/${qid}/test-payment`,
            { version: approved.body.version },
            alice,
          )
        ).body.id,
        payment.body.id,
      );
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes/${qid}/actions`,
            {
              action: "approve",
              version: approved.body.version,
              selectedLineIds: quoted.body.lines.map((l: any) => l.id),
            },
            alice,
          )
        ).status,
        409,
      );
      let job = (
        await send("get", `/api/bookings/${bookingId}`, undefined, mechanic)
      ).body;
      assert.equal((await act("start", job.version, mechanic)).status, 200);
      const second = await send(
        "post",
        `/api/bookings/${bookingId}/quotes`,
        {
          ...quoteInput,
          notes: "Additional gearbox repair",
          lines: [
            {
              description: "Gearbox",
              category: "parts",
              quantity: 1,
              unitPriceCents: 300000,
            },
          ],
          clientRequestId: randomUUID(),
        },
        mechanic,
      );
      assert.equal(second.status, 201);
      assert.equal(second.body.number, 2);
      job = (
        await send("get", `/api/bookings/${bookingId}`, undefined, mechanic)
      ).body;
      assert.equal(
        (
          await act("complete", job.version, mechanic, {
            completionNotes: "Done",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes/${second.body.id}/actions`,
            {
              action: "approve",
              version: 1,
              selectedLineIds: [second.body.lines[0].id],
            },
            alice,
          )
        ).status,
        200,
      );
      job = (
        await send("get", `/api/bookings/${bookingId}`, undefined, mechanic)
      ).body;
      const finished = await act("complete", job.version, mechanic, {
        completionNotes: "Approved repairs finished.",
      });
      assert.equal(
        finished.body.status,
        "AWAITING_PAYMENT",
        JSON.stringify(finished.body),
      );
      assert.equal(await db.serviceRecord.count({ where: { bookingId } }), 0);
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/quotes/${second.body.id}/test-payment`,
            { version: 2 },
            alice,
          )
        ).status,
        200,
      );
      job = (await send("get", `/api/bookings/${bookingId}`, undefined, alice))
        .body;
      assert.equal(job.status, "COMPLETED");
      assert.equal(await db.serviceRecord.count({ where: { bookingId } }), 1);
      const completedOverview = (
        await send("get", "/api/customer/overview", undefined, alice)
      ).body;
      assert.equal(completedOverview.serviceRecords, 1);
      assert.equal(completedOverview.activeBookings, 0);

      assert.equal(
        (await send("get", "/api/payments", undefined, alice)).body.length,
        2,
      );
      assert.equal(
        (await send("get", "/api/payments", undefined, bob)).body.length,
        0,
      );
      assert.equal(
        (
          await send(
            "get",
            `/api/bookings/${bookingId}/quotes/${qid}/invoice`,
            undefined,
            bob,
          )
        ).status,
        404,
      );
      const message = { body: "Thank you!", clientRequestId: randomUUID() };
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/messages`,
            message,
            bob,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${bookingId}/messages`,
            message,
            alice,
          )
        ).status,
        201,
      );
      assert.equal(
        (
          await send(
            "get",
            `/api/bookings/${bookingId}/messages`,
            undefined,
            mechanic,
          )
        ).body[0].body,
        "Thank you!",
      );
      const mine = await send("get", "/api/notifications", undefined, alice),
        theirs = await send("get", "/api/notifications", undefined, bob);
      assert.ok(mine.body.length);
      assert.ok(!theirs.body.some((n: any) => n.resourceId === bookingId));
      assert.equal(
        (await send("get", "/api/admin/activity", undefined, alice)).status,
        403,
      );
      const raw = await db.user.findUniqueOrThrow({
        where: { id: alice.user.id },
      });
      assert.notEqual(raw.passwordHash, "StrongExample9!");
      const nextRequest = await send(
        "post",
        "/api/bookings",
        { ...bookingInput, clientRequestId: randomUUID() },
        alice,
      );
      const nextId = nextRequest.body.id;
      assert.equal(
        (
          await send(
            "post",
            `/api/bookings/${nextId}/actions`,
            { action: "accept", version: 0 },
            mechanic,
          )
        ).status,
        200,
      );
      const history = await db.serviceRecord.findUniqueOrThrow({
        where: { bookingId },
      });
      assert.deepEqual(
        (
          await send(
            "get",
            `/api/bookings/${nextId}/history`,
            undefined,
            mechanic,
          )
        ).body,
        [],
      );
      assert.equal(
        (
          await send(
            "put",
            `/api/bookings/${nextId}/history-access`,
            { grant: true, recordIds: [history.id] },
            bob,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await send(
            "put",
            `/api/bookings/${nextId}/history-access`,
            { grant: true, recordIds: [history.id] },
            alice,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await send(
            "get",
            `/api/bookings/${nextId}/history`,
            undefined,
            mechanic,
          )
        ).body.length,
        1,
      );
      assert.equal(
        (
          await send(
            "put",
            `/api/bookings/${nextId}/history-access`,
            { grant: false, recordIds: [] },
            alice,
          )
        ).status,
        200,
      );
      assert.deepEqual(
        (
          await send(
            "get",
            `/api/bookings/${nextId}/history`,
            undefined,
            mechanic,
          )
        ).body,
        [],
      );
      // Real HTTP SSE stream receives a committed event without a page refresh.
      const httpServer = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) =>
        httpServer.once("listening", resolve),
      );
      const address = httpServer.address();
      assert.ok(address && typeof address !== "string");
      const after = (await db.notification.findFirst({
        orderBy: { id: "desc" },
      }))!.id.toString();
      const abort = new AbortController();
      try {
        const response = await fetch(
          `http://127.0.0.1:${address.port}/api/notifications/stream?after=${after}`,
          {
            headers: { Cookie: mechanic.cookie, Origin: origin },
            signal: abort.signal,
          },
        );
        assert.equal(response.status, 200);
        await send(
          "post",
          `/api/bookings/${nextId}/messages`,
          { body: "Live update test", clientRequestId: randomUUID() },
          alice,
        );
        const reader = response.body!.getReader(),
          decoder = new TextDecoder();
        let content = "";
        const timeout = setTimeout(() => abort.abort(), 8000);
        try {
          while (!content.includes("event: update")) {
            const chunk = await reader.read();
            if (chunk.done) break;
            content += decoder.decode(chunk.value);
          }
        } finally {
          clearTimeout(timeout);
          await reader.cancel();
        }
        assert.ok(content.includes("event: update"));
        assert.ok(content.includes(nextId));
      } finally {
        abort.abort();
        httpServer.closeAllConnections();
        await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      }
      // Admin-only licensed asset registration; never substitute a concept model.
      assert.equal(
        (await send("post", "/api/admin/vehicle-assets", {}, alice)).status,
        403,
      );
      const asset = {
        make: "Volkswagen",
        model: "Polo",
        variant: "",
        yearFrom: 2020,
        yearTo: 2020,
        modelUrl: "https://assets.example.test/polo.glb",
        sourceUrl: "https://assets.example.test/licence",
        licence: "Test fixture licence",
        attribution: "Test fixture only",
        accuracyConfirmed: true,
        licenceConfirmed: true,
      };
      assert.equal(
        (await send("post", "/api/admin/vehicle-assets", asset, admin)).status,
        201,
      );
      assert.equal(
        (await send("get", "/api/vehicles/" + car.body.id, undefined, alice))
          .body.modelMatch,
        "verified",
      );
      await db.rateLimit.deleteMany();
      const reset = await send("post", "/api/auth/forgot", {
        email: "alice@example.test",
      });
      assert.equal(reset.status, 202);
      const resetMail = await db.mailOutbox.findFirstOrThrow({
        where: { to: "alice@example.test", subject: { contains: "Reset" } },
      });
      const token = resetMail.body.match(/token=([\w-]+)/)![1];
      assert.equal(
        (
          await send("post", "/api/auth/reset", {
            token,
            password: "NewLongPassword8!",
          })
        ).status,
        200,
      );
      assert.equal(
        (await send("get", "/api/auth/session", undefined, alice)).status,
        401,
      );
      assert.equal(
        (
          await send("post", "/api/auth/reset", {
            token,
            password: "NewLongPassword8!",
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await send("post", "/api/auth/login", {
            email: "alice@example.test",
            password: "StrongExample9!",
          })
        ).status,
        401,
      );
      await login("alice@example.test", "NewLongPassword8!");
      // SQL constraints are enforced independently of HTTP.
      await assert.rejects(
        db.review.create({
          data: {
            bookingId,
            customerId: alice.user.id,
            professionalId: pro.id,
            rating: 9,
            body: "Invalid rating",
          },
        }),
      );
      assert.ok(await db.auditLog.count({ where: { actorId: adminUser.id } }));
      await db.rateLimit.deleteMany();
      for (let i = 0; i < 15; i++)
        assert.equal(
          (
            await send("post", "/api/auth/forgot", {
              email: "nobody@example.test",
            })
          ).status,
          202,
        );
      assert.equal(
        (
          await send("post", "/api/auth/forgot", {
            email: "nobody@example.test",
          })
        ).status,
        429,
      );
    } finally {
      await db.$disconnect();
      await closeDatabase();
    }
  },
);
