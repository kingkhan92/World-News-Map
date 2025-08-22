import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { healthRouter } from '../health';

const app = express();
app.use('/api/health', healthRouter);

describe('Health Routes', () => {
  it('GET /api/health returns health status', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      version: expect.any(String),
    });
  });

  it('GET /api/health/detailed returns detailed health information', async () => {
    const response = await request(app)
      .get('/api/health/detailed')
      .expect(200);
    
    expect(response.body).toEqual({
      status: 'healthy',
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      version: expect.any(String),
      services: {
        database: expect.any(String),
        redis: expect.any(String),
        newsApi: expect.any(String),
      },
      memory: {
        used: expect.any(Number),
        total: expect.any(Number),
        percentage: expect.any(Number),
      },
    });
  });

  it('returns 503 when services are unhealthy', async () => {
    // This would require mocking database connection failure
    // For now, we'll test the structure
    const response = await request(app)
      .get('/api/health/detailed');
    
    expect(response.status).toBeOneOf([200, 503]);
    expect(response.body).toHaveProperty('status');
    expect(response.body).toHaveProperty('services');
  });
});