import {} from 'jest';
import * as supertest from "supertest";

const request = supertest("http://localhost:8000");

describe("GET /api", () => {
  it("should return 200 OK", () => {
    request
      .get("/api")
      .expect(200);
  });
});


describe("POST /authentication/tokens", () => {
  it("should return 200 OK", () => {
    request
      .post("/authentication/tokens")
      .expect(200);
  });
});


describe("PUT /authentication/tokens", () => {
  it("should return 200 OK", () => {
    request
      .post("/authentication/tokens")
      .expect(200);
  });
});

describe("POST /sso/tokens", () => {
  it("should return 200 OK", () => {
    request
      .post("/sso/tokens")
      .expect(200);
  });
});


describe("PUT /users/:userId/passwords/:token", () => {
  it("should return 200 OK", () => {
    request
      .put("/users/:userId/passwords/:token")
      .expect(200);
  });
});


describe("POST assignUserRole", () => {
  it("should return 200 OK", () => {
    request
      .post("/assignUserRole")
      .expect(200);
  });
});

describe("POST getPermission", () => {
  it("should return 200 OK", () => {
    request
      .post("/getPermission")
      .expect(200);
  });
});

describe("POST emailSent", () => {
  it("should return 200 OK", () => {
    request
      .post("/emailSent")
      .expect(200);
  });
});

describe("POST authenticate", () => {
  it("should return 200 OK", () => {
    request
      .post("/bitgo/authenticate")
      .expect(200);
  });
});

describe("POST generateWalletAddress", () => {
  it("should return 200 OK", () => {
    request
      .post("/bitgo/generateWalletAddress")
      .expect(200);
  });
});

describe("POST createWallet", () => {
  it("should return 200 OK", () => {
    request
      .post("/bitgo/createWallet")
      .expect(200);
  });
});

describe("Get getWalletTransactions", () => {
  it("should return 200 OK", () => {
    request
      .post("/bitgo/getWalletTransactions")
      .expect(200);
  });
});
