const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { createStudioApp } = require('../src/studio/server');

describe('Web Studio API Endpoints', () => {
  let server;
  let port = 4123;
  let baseUrl = `http://localhost:${port}`;

  before(async () => {
    const app = createStudioApp();
    await new Promise((resolve) => {
      server = app.listen(port, resolve);
    });
  });

  after((done) => {
    server.close(done);
  });

  it('GET /api/presets should return presets', async () => {
    const res = await fetch(`${baseUrl}/api/presets`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.presets.taskflow);
    assert.ok(data.presets.blog);
    assert.ok(data.presets.ecommerce);
  });

  it('POST /api/parse should validate DSL and return spec', async () => {
    const dsl = `
      app "TestStore" {
        database: "mongodb"
        auth: false
      }
      entity Item {
        title: string required
        price: number default(10)
      }
    `;

    const res = await fetch(`${baseUrl}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dsl })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.spec.app.name, 'TestStore');
    assert.strictEqual(data.spec.entities.length, 1);
  });

  it('POST /api/suggest should convert natural text to DSL', async () => {
    const prompt = 'Users have name and email. Products have title and price.';
    const res = await fetch(`${baseUrl}/api/suggest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.dsl.includes('entity User'));
    assert.ok(data.dsl.includes('entity Product'));
  });

  it('POST /api/generate/preview should return file count and sample files', async () => {
    const dsl = `
      app "QuickApp" {
        database: "mongodb"
        auth: false
      }
      entity Note {
        text: string required
      }
    `;

    const res = await fetch(`${baseUrl}/api/generate/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dsl })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.fileCount > 10);
    assert.ok(data.sampleFiles['backend/server.js']);
    assert.ok(data.sampleFiles['frontend/src/App.jsx']);
  });

  it('POST /api/generate/zip should stream a valid zip file', async () => {
    const dsl = `
      app "ZipApp" {
        database: "mongodb"
        auth: false
      }
      entity Todo {
        title: string required
      }
    `;

    const res = await fetch(`${baseUrl}/api/generate/zip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dsl })
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'application/zip');
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000);
  });
});
