const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseDSL, naturalTextToDSL, DSLParseError, ValidationError } = require('../src/parser/index');

describe('DSL Parser & Validator', () => {
  it('should parse a basic DSL app with entities and fields', () => {
    const dsl = `
      app "TaskApp" {
        database: "mongodb"
        auth: false
        port: 5000
      }

      entity Task {
        title: string required
        description: text
        completed: boolean default(false)
        priority: enum(low, medium, high) default(medium)
        dueDate: date
      }
    `;

    const { spec } = parseDSL(dsl);

    assert.strictEqual(spec.app.name, 'TaskApp');
    assert.strictEqual(spec.app.database, 'mongodb');
    assert.strictEqual(spec.app.auth, false);
    assert.strictEqual(spec.entities.length, 1);

    const task = spec.entities[0];
    assert.strictEqual(task.name, 'Task');
    assert.strictEqual(task.fields.length, 5);

    const titleField = task.fields.find(f => f.name === 'title');
    assert.strictEqual(titleField.type, 'string');
    assert.strictEqual(titleField.required, true);

    const priorityField = task.fields.find(f => f.name === 'priority');
    assert.strictEqual(priorityField.type, 'enum');
    assert.deepStrictEqual(priorityField.enumValues, ['low', 'medium', 'high']);
    assert.strictEqual(priorityField.defaultValue, 'medium');
  });

  it('should parse relationships correctly (inline and standalone)', () => {
    const dsl = `
      entity User {
        name: string required
        email: string required unique
      }

      entity Post {
        title: string required
        content: text
        author: belongsTo(User)
      }

      entity Comment {
        body: text required
      }

      relation Comment belongsTo Post
    `;

    const { spec } = parseDSL(dsl);
    assert.strictEqual(spec.entities.length, 3);

    const post = spec.entities.find(e => e.name === 'Post');
    assert.strictEqual(post.relations.length, 1);
    assert.strictEqual(post.relations[0].target, 'User');
    assert.strictEqual(post.relations[0].type, 'belongsTo');

    const comment = spec.entities.find(e => e.name === 'Comment');
    assert.strictEqual(comment.relations.length, 1);
    assert.strictEqual(comment.relations[0].target, 'Post');
    assert.strictEqual(comment.relations[0].type, 'belongsTo');
  });

  it('should handle auth and auto-inject/validate User model', () => {
    const dsl = `
      app "SecureApp" {
        auth: true
      }

      entity Document {
        name: string required
      }
    `;

    const { spec, warnings } = parseDSL(dsl);
    assert.strictEqual(spec.app.auth, true);
    // User entity should be auto-created
    const user = spec.entities.find(e => e.name === 'User');
    assert.ok(user);
    assert.ok(user.fields.some(f => f.name === 'email'));
    assert.ok(user.fields.some(f => f.name === 'password'));
    assert.ok(warnings.length > 0);
  });

  it('should throw validation error on invalid relation target', () => {
    const dsl = `
      entity Post {
        title: string required
        author: belongsTo(NonExistentUser)
      }
    `;

    assert.throws(() => {
      parseDSL(dsl);
    }, ValidationError);
  });

  it('should convert natural text to DSL via NLP heuristics', () => {
    const text = 'Users have name, email and password. Posts have title, description, price and belong to User.';
    const dsl = naturalTextToDSL(text);

    assert.ok(dsl.includes('entity User'));
    assert.ok(dsl.includes('entity Post'));
    assert.ok(dsl.includes('email: string'));
    assert.ok(dsl.includes('price: number'));
    assert.ok(dsl.includes('belongsTo(User)'));

    // Verify generated DSL parses cleanly
    const { spec } = parseDSL(dsl);
    assert.ok(spec.entities.length >= 2);
  });
});
