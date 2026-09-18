/**
 * Validator for AppSpec AST
 * Ensures entity definitions, field types, and relational integrity are sound.
 */

const SUPPORTED_TYPES = new Set([
  'string',
  'text',
  'number',
  'boolean',
  'date',
  'enum'
]);

const RESERVED_FIELD_NAMES = new Set([
  '_id',
  '__v',
  'createdat',
  'updatedat'
]);

class ValidationError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class SpecValidator {
  constructor(spec) {
    this.spec = JSON.parse(JSON.stringify(spec));
    this.errors = [];
    this.warnings = [];
  }

  validate() {
    if (!this.spec || typeof this.spec !== 'object') {
      throw new ValidationError('Invalid specification: root must be an object');
    }

    // Default app settings
    this.spec.app = this.spec.app || {};
    this.spec.app.name = this.spec.app.name || 'GeneratedApp';
    this.spec.app.database = (this.spec.app.database || 'mongodb').toLowerCase();
    this.spec.app.auth = Boolean(this.spec.app.auth);
    this.spec.app.port = this.spec.app.port || 5000;
    this.spec.app.clientPort = this.spec.app.clientPort || 5173;

    this.spec.entities = this.spec.entities || [];
    this.spec.relations = this.spec.relations || [];

    if (this.spec.entities.length === 0) {
      this.errors.push('The application must have at least one entity.');
    }

    const entityNames = new Set();
    const entityMap = new Map();

    // 1. First pass: Validate entity names & structure
    for (const entity of this.spec.entities) {
      if (!entity.name || typeof entity.name !== 'string') {
        this.errors.push('Entity is missing a name.');
        continue;
      }

      const normalizedName = entity.name.trim();
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(normalizedName)) {
        this.errors.push(`Invalid entity name '${normalizedName}'. Names must start with a letter and contain only alphanumeric characters.`);
      }

      if (entityNames.has(normalizedName.toLowerCase())) {
        this.errors.push(`Duplicate entity name '${normalizedName}' detected.`);
      }
      entityNames.add(normalizedName.toLowerCase());
      entityMap.set(normalizedName, entity);

      entity.fields = entity.fields || [];
      entity.relations = entity.relations || [];

      // Validate fields
      const fieldNames = new Set();
      for (const field of entity.fields) {
        if (!field.name || typeof field.name !== 'string') {
          this.errors.push(`Entity '${entity.name}' has a field with no name.`);
          continue;
        }

        const fName = field.name.trim();
        if (RESERVED_FIELD_NAMES.has(fName.toLowerCase())) {
          this.errors.push(`Field name '${fName}' in entity '${entity.name}' is reserved by the database.`);
        }

        if (fieldNames.has(fName.toLowerCase())) {
          this.errors.push(`Duplicate field '${fName}' in entity '${entity.name}'.`);
        }
        fieldNames.add(fName.toLowerCase());

        // Validate type
        const fType = (field.type || 'string').toLowerCase();
        if (!SUPPORTED_TYPES.has(fType)) {
          this.errors.push(`Unsupported type '${fType}' for field '${fName}' in entity '${entity.name}'. Supported: ${Array.from(SUPPORTED_TYPES).join(', ')}`);
        }

        if (fType === 'enum') {
          if (!field.enumValues || !Array.isArray(field.enumValues) || field.enumValues.length === 0) {
            this.errors.push(`Enum field '${fName}' in entity '${entity.name}' must have at least one enum value.`);
          }
        }
      }
    }

    // 2. Merge root relations into entities
    for (const rel of this.spec.relations) {
      const sourceEntity = entityMap.get(rel.source);
      if (!sourceEntity) {
        this.errors.push(`Relation specifies non-existent source entity '${rel.source}'.`);
        continue;
      }
      if (!entityMap.has(rel.target)) {
        this.errors.push(`Relation from '${rel.source}' specifies non-existent target entity '${rel.target}'.`);
        continue;
      }

      // Add to source entity relations if not already there
      const exists = sourceEntity.relations.some(r => r.name === rel.alias || (r.target === rel.target && r.type === rel.type));
      if (!exists) {
        sourceEntity.relations.push({
          isRelation: true,
          name: rel.alias,
          type: rel.type,
          target: rel.target,
          required: false
        });
      }
    }

    // 3. Second pass: Validate in-entity relations
    for (const entity of this.spec.entities) {
      for (const rel of entity.relations) {
        if (!entityMap.has(rel.target)) {
          this.errors.push(`Entity '${entity.name}' has relation '${rel.name}' referencing unknown entity '${rel.target}'.`);
        }
      }
    }

    // 4. Validate auth requirements
    if (this.spec.app.auth) {
      const userEntity = Array.from(entityMap.values()).find(e => e.name.toLowerCase() === 'user');
      if (!userEntity) {
        this.warnings.push("Auth is enabled, but no 'User' entity was defined. A default 'User' entity with email & password will be created.");
        const defaultUser = {
          name: 'User',
          fields: [
            { name: 'name', type: 'string', required: true, unique: false, defaultValue: null, min: null, max: null },
            { name: 'email', type: 'string', required: true, unique: true, defaultValue: null, min: null, max: null },
            { name: 'password', type: 'string', required: true, unique: false, defaultValue: null, min: null, max: null },
            { name: 'role', type: 'enum', enumValues: ['admin', 'user'], defaultValue: 'user', required: false, unique: false, min: null, max: null }
          ],
          relations: []
        };
        this.spec.entities.unshift(defaultUser);
        entityMap.set('User', defaultUser);
      } else {
        // Ensure email & password fields exist
        const hasEmail = userEntity.fields.some(f => f.name.toLowerCase() === 'email');
        const hasPassword = userEntity.fields.some(f => f.name.toLowerCase() === 'password');

        if (!hasEmail) {
          userEntity.fields.push({ name: 'email', type: 'string', required: true, unique: true, defaultValue: null, min: null, max: null });
          this.warnings.push("Added required 'email' field to User entity for authentication.");
        }
        if (!hasPassword) {
          userEntity.fields.push({ name: 'password', type: 'string', required: true, unique: false, defaultValue: null, min: null, max: null });
          this.warnings.push("Added required 'password' field to User entity for authentication.");
        }
      }
    }

    if (this.errors.length > 0) {
      throw new ValidationError(`Specification validation failed with ${this.errors.length} error(s)`, this.errors);
    }

    return {
      spec: this.spec,
      warnings: this.warnings
    };
  }
}

module.exports = {
  SpecValidator,
  ValidationError,
  SUPPORTED_TYPES
};
