const { DSLParser, DSLParseError } = require('./dslParser');
const { SpecValidator, ValidationError, SUPPORTED_TYPES } = require('./validator');
const { naturalTextToDSL, inferFieldType } = require('./nlpHeuristic');

/**
 * High-level parser function: parses DSL string, validates it, and returns the normalized spec.
 */
function parseDSL(dslString) {
  const parser = new DSLParser(dslString);
  const rawSpec = parser.parse();
  const validator = new SpecValidator(rawSpec);
  return validator.validate();
}

/**
 * Validates an existing JSON/Object spec.
 */
function validateSpec(specObject) {
  const validator = new SpecValidator(specObject);
  return validator.validate();
}

module.exports = {
  parseDSL,
  validateSpec,
  DSLParser,
  DSLParseError,
  SpecValidator,
  ValidationError,
  SUPPORTED_TYPES,
  naturalTextToDSL,
  inferFieldType
};
