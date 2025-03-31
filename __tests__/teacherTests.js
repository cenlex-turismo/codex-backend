const request = require("supertest");
const app = require("../app");

describe("Teacher Routes", () => {
    let authCookie; // Store the cookie manually

    beforeAll(async () => {
        // Step 1: Authenticate and extract the cookie
        const authResponse = await request(app)
            .post("/user/authenticateUser")
            .send({ email: "hroberto672@gmail.com", password: "1234" });

        authCookie = authResponse.headers["set-cookie"]; // Extract cookie
    });

    it("should return all teachers", async () => {
        // Step 2: Send the extracted cookie in the request
        const response = await request(app)
            .get("/teacher/getAllTeachers")
            .set("Cookie", authCookie) // Attach cookie manually
            .expect(200);

        expect(response.body).toHaveProperty("teachers");
    });
});
