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

test('가상 나무 저장과 원기둥 음영 계산을 지원한다', async () => {
  const core = await import(`./solar-core.mjs?tree-core=${Date.now()}`);
  const tree = { id: 'tree-1', center: { lat: 37.654, lon: 127.056 }, heightM: 12, crownDiameterM: 8 };
  const state = { mode: 'virtual', roof: [], exclusions: [], heightM: 0, formValues: {}, dirty: false, trees: [tree] };
  assert.deepEqual(core.deserializeProject(core.serializeProject(state)).trees, [tree]);
  assert.equal(core.rayIntersectsTree(
    { east: 0, north: 0, up: 5 },
    { east: 1, north: 0, up: 0.5 },
    { east: 5, north: 0, baseUp: 0, heightM: 12, crownDiameterM: 8 },
  ), true);
});

test('가상 나무 CSV는 발전량 전후 차이를 포함한다', async () => {
  const { buildCsv } = await import(`./solar-core.mjs?tree-csv=${Date.now()}`);
  const csv = buildCsv(
    { detailed: { annualKwh: 850 }, baselineDetailed: { annualKwh: 1000 } },
    { trees: [{ id: 'tree-1', center: { lat: 37.654, lon: 127.056 }, heightM: 12, crownDiameterM: 8 }] },
    {},
  );
  assert.match(csv, /가상 나무 수,1/);
  assert.match(csv, /나무로 인한 감소량\(kWh\),150/);
});
