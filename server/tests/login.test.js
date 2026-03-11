const request = require('supertest');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const app = require('../index.js'); // Assuming index.js exports the app

describe('Login Security Tests', () => {
  let server;

  beforeAll(() => {
    server = app.listen(4000);
  });

  afterAll((done) => {
    server.close(done);
  });

  test('Reject login with missing username or password', async () => {
    const res = await request(server)
      .post('/login')
      .send({ username: '', password: '' });
    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('Reject login with invalid credentials', async () => {
    const res = await request(server)
      .post('/login')
      .send({ username: 'nonexistent', password: 'wrongpass' });
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Invalid username or password');
  });

  test('Rate limiting on login endpoint', async () => {
    for (let i = 0; i < 5; i++) {
      await request(server)
        .post('/login')
        .send({ username: 'nonexistent', password: 'wrongpass' });
    }
    const res = await request(server)
      .post('/login')
      .send({ username: 'nonexistent', password: 'wrongpass' });
    expect(res.statusCode).toBe(429);
    expect(res.text).toMatch(/Too many login attempts/);
  });

  test('CSRF token required', async () => {
    const res = await request(server)
      .post('/login')
      .set('CSRF-Token', 'invalidtoken')
      .send({ username: 'user', password: 'pass' });
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('Invalid CSRF token');
  });
});
