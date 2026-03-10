import request from "supertest";
import { createApp } from "../app";

describe("API", () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  describe("GET /health", () => {
    it("returns 200 and status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("status", "ok");
      expect(res.body).toHaveProperty("env");
      expect(res.body).toHaveProperty("timestamp");
    });
  });

  describe("POST /auth/login", () => {
    it("returns 400 when body is empty", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({})
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("message");
      expect(res.body).toHaveProperty("errors");
    });

    it("returns 400 when username is missing", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ password: "something" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    it("returns 400 when password is missing", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ username: "user" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(400);
    });

    it("returns 401 for invalid credentials", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ username: "nonexistent", password: "wrong" })
        .set("Content-Type", "application/json");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });
  });

  describe("Protected routes without token", () => {
    it("GET /inventory returns 401", async () => {
      const res = await request(app).get("/inventory");
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("message");
    });

    it("GET /products returns 401", async () => {
      const res = await request(app).get("/products");
      expect(res.status).toBe(401);
    });

    it("GET /branches returns 401", async () => {
      const res = await request(app).get("/branches");
      expect(res.status).toBe(401);
    });

    it("GET /protected/me returns 401", async () => {
      const res = await request(app).get("/protected/me");
      expect(res.status).toBe(401);
    });
  });

  describe("Protected routes with invalid token", () => {
    it("GET /inventory with invalid Bearer returns 401", async () => {
      const res = await request(app)
        .get("/inventory")
        .set("Authorization", "Bearer invalid-token");
      expect(res.status).toBe(401);
    });
  });
});
