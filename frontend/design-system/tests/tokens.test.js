const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

describe('Design System Theme Tokens', () => {
  const tokensPath = path.resolve(__dirname, '../tokens.css');

  test('tokens.css file exists', () => {
    assert.ok(fs.existsSync(tokensPath), 'tokens.css must exist');
  });

  test('tokens.css contains official primary emerald token #059669', () => {
    const content = fs.readFileSync(tokensPath, 'utf8');
    assert.ok(
      content.includes('#059669'),
      'tokens.css must contain primary brand color #059669'
    );
    assert.match(
      content,
      /--color-brand-primary:\s*#059669/i,
      'tokens.css must define --color-brand-primary with #059669'
    );
  });

  test('tokens.css contains official canvas background token #FBFBF9', () => {
    const content = fs.readFileSync(tokensPath, 'utf8');
    assert.ok(
      content.includes('#FBFBF9'),
      'tokens.css must contain warm neutral canvas background #FBFBF9'
    );
    assert.match(
      content,
      /--color-canvas-bg:\s*#FBFBF9/i,
      'tokens.css must define --color-canvas-bg with #FBFBF9'
    );
  });

  test('tokens.css defines display and body font variables', () => {
    const content = fs.readFileSync(tokensPath, 'utf8');
    assert.ok(content.includes('Outfit'), 'tokens.css must specify Outfit font');
    assert.ok(content.includes('Plus Jakarta Sans'), 'tokens.css must specify Plus Jakarta Sans font');
  });
});
