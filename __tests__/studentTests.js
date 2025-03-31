const request = require("supertest");
const app = require("../app");

describe("Student Routes", () => {
    let authCookie; // Store the cookie manually

    beforeAll(async () => {
        // Step 1: Authenticate and extract the cookie
        const authResponse = await request(app)
            .post("/user/authenticateUser")
            .send({ email: "hroberto672@gmail.com", password: "1234" });

        authCookie = authResponse.headers["set-cookie"]; // Extract cookie
    });

    it("should return a student", async () => {
        // Step 2: Send the extracted cookie in the request
        const response = await request(app)
            .get("/student/getStudent/3042641300")
            .set("Cookie", authCookie) // Attach cookie manually
            .expect(200);

        expect(response.body).toHaveProperty("student");
    });

    it("should return some students", async () => {
        // Step 2: Send the extracted cookie in the request
        const response = await request(app)
            .get("/student/filterStudents")
            .set("Cookie", authCookie) // Attach cookie manually
            .query({ idNumber: "", firstName: "", lastName: "", course: "", score: "", scoreCondition: "", courseStart: "", courseStartCondition: "", courseEnd: "", courseEndCondition: "", teacher: "" })
            .expect(200);

        expect(response.body).toHaveProperty("students");
    });
});
