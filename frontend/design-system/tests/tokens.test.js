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

  describe('Leaflet Map CSS Tokens & Isolation', () => {
    const mapCssPath = path.resolve(__dirname, '../map.css');

    test('map.css file exists', () => {
      assert.ok(fs.existsSync(mapCssPath), 'map.css must exist');
    });

    test('map.css defines quikooo-map-container with mobile and desktop heights', () => {
      const content = fs.readFileSync(mapCssPath, 'utf8');
      assert.ok(content.includes('.quikooo-map-container'), 'Must define .quikooo-map-container');
      assert.ok(content.includes('220px'), 'Must define mobile 220px height');
      assert.ok(content.includes('380px'), 'Must define desktop 380px height');
    });

    test('map.css enforces z-index safe isolation and brand #059669 popups', () => {
      const content = fs.readFileSync(mapCssPath, 'utf8');
      assert.ok(content.includes('isolation: isolate'), 'Must enforce isolated stacking context');
      assert.ok(content.includes('#059669'), 'Must style popups with brand #059669 color');
    });
  });
});
