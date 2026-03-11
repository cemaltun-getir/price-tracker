const request = require('supertest');
const app = require('../../server/index');

describe('Server API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
    });
  });
});
