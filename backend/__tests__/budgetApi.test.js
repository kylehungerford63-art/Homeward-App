const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../app');
const { setBudgetMode } = require('../api/budget/budget/budgetState');
const { writeDB } = require('../utils/jsonDB');

const dbFile = path.join(__dirname, '..', 'data', 'budget.json');
const originalDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
const seedDb = {
  categories: [{ name: 'Seed Category', limit: 100, spent: 0 }],
  envelopes: [{ name: 'Seed Envelope', balance: 200 }]
};

beforeAll(() => {
  writeDB(originalDb);
  setBudgetMode('simple');
});

beforeEach(() => {
  writeDB(seedDb);
  setBudgetMode('simple');
});

afterAll(() => {
  writeDB(originalDb);
  setBudgetMode('simple');
});

describe('Budget API', () => {
  test('GET /api/budget/mode returns the current budget mode', async () => {
    const response = await request(app).get('/api/budget/mode');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ mode: 'simple' });
  });

  test('POST /api/budget/mode updates the budget mode', async () => {
    const postResponse = await request(app)
      .post('/api/budget/mode')
      .send({ mode: 'envelope' });

    expect(postResponse.status).toBe(200);
    expect(postResponse.body).toEqual({ success: true, mode: 'envelope' });

    const getResponse = await request(app).get('/api/budget/mode');
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toEqual({ mode: 'envelope' });
  });

  test('GET /api/budget/summary returns simple budget data when mode is simple', async () => {
    const response = await request(app).get('/api/budget/summary');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      mode: 'simple',
      month: expect.any(String)
    });
    expect(response.body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining(seedDb.categories[0])
      ])
    );
  });

  test('POST /api/budget/category adds a category and returns the new category', async () => {
    const response = await request(app)
      .post('/api/budget/category')
      .send({ name: 'New Category', limit: 500 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('category');
    expect(response.body.category).toMatchObject({
      name: 'New Category',
      limit: 500,
      spent: 0
    });
  });

  test('POST /api/budget/envelope adds an envelope and returns the new envelope', async () => {
    const response = await request(app)
      .post('/api/budget/envelope')
      .send({ name: 'New Envelope', balance: 750 });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('envelope');
    expect(response.body.envelope).toMatchObject({
      name: 'New Envelope',
      balance: 750
    });
  });

  test('GET /api/budget/summary returns envelope data when mode is envelope', async () => {
    await request(app).post('/api/budget/mode').send({ mode: 'envelope' });

    const response = await request(app).get('/api/budget/summary');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      mode: 'envelope',
      month: expect.any(String)
    });
    expect(response.body.envelopes).toEqual(
      expect.arrayContaining([
        expect.objectContaining(seedDb.envelopes[0])
      ])
    );
  });
});
