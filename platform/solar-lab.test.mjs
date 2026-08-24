import assert from 'node:assert/strict';
import test from 'node:test';

test('가상 지붕을 그리는 동안 KML 레이어 생성을 건너뛴다', async () => {
  globalThis.window = {};
  try {
    const { renderVWorldAnalysisLayer } = await import(`./solar-lab.mjs?draft=${Date.now()}`);

    assert.equal(renderVWorldAnalysisLayer({}, { kind: 'roof', points: [{ lat: 37.65, lon: 127.05 }] }), false);
  } finally {
    delete globalThis.window;
  }
});
