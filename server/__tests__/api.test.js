const request = require('supertest');
const app = require('../index'); // Assuming your Express app is exported from index.js

describe('API Endpoints', () => {
  test('GET /api/status returns 200 and status message', async () => {
    const res = await request(app).get('/api/status');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  // Add more endpoint tests here as needed
});
