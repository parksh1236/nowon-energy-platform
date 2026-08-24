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

test('가상 나무 입력·모델·선택 수정 계약을 제공한다', async () => {
  globalThis.window = {};
  try {
    const app = await import(`./solar-lab.mjs?tree-ui=${Date.now()}`);
    assert.deepEqual(app.validateTreeInput(12, 8), []);
    assert.match(app.validateTreeInput(0, 8)[0], /1m.*50m/);
    const Cesium = {
      Cartesian3: { fromDegrees: (...values) => values },
      HeightReference: { NONE: 'none' },
      ShadowMode: { ENABLED: 'enabled' },
    };
    const entity = app.treeEntityDefinition({ center: { lat: 37.654, lon: 127.056 }, heightM: 12, crownDiameterM: 8 }, 20, Cesium);
    assert.equal(entity.model.uri, './assets/tree.glb');
    assert.equal(entity.model.shadows, 'enabled');
    const trees = [{ id: 'tree-1', center: { lat: 37.654, lon: 127.056 }, heightM: 12, crownDiameterM: 8 }];
    assert.equal(app.updateTreeDimensions(trees, 'tree-1', 18, 11), true);
    assert.deepEqual(trees[0].center, { lat: 37.654, lon: 127.056 });
    assert.deepEqual(app.treeImpact({ baselineDetailed: { annualKwh: 1000 }, detailed: { annualKwh: 850 } }), {
      baselineAnnualKwh: 1000, annualKwh: 850, lossKwh: 150, lossRatio: 0.15,
    });
  } finally {
    delete globalThis.window;
  }
});

test('정밀 음영은 가상 나무에만 막힌 지붕 표본을 구분한다', async () => {
  class Cartesian3 {
    constructor(x = 0, y = 0, z = 0) { Object.assign(this, { x, y, z }); }
    static fromDegrees(lon, lat, height) { return new Cartesian3(lon, lat, height); }
    static normalize(value, out) { return Object.assign(out, value); }
    static distance() { return 100_000; }
  }
  class Ray { constructor(origin, direction) { Object.assign(this, { origin, direction }); } }
  globalThis.window = {
    Cesium: {
      Cartesian3,
      Ray,
      Cartographic: { fromDegrees: (lon, lat) => ({ lon, lat }) },
      Transforms: { eastNorthUpToFixedFrame: () => 'enu-frame' },
      Matrix4: { multiplyByPointAsVector: (_frame, vector, out) => Object.assign(out, vector) },
    },
    ws3d: { viewer: { scene: { pickFromRay: () => undefined, globe: { getHeight: () => 0 } } } },
  };
  globalThis.requestAnimationFrame = (callback) => callback();
  try {
    const { buildShadeSamples } = await import(`./solar-lab.mjs?tree-shade=${Date.now()}`);
    const roof = [
      { lat: 37.654, lon: 127.056 }, { lat: 37.654, lon: 127.056112 },
      { lat: 37.654099, lon: 127.056112 }, { lat: 37.654099, lon: 127.056 },
    ];
    const samples = await buildShadeSamples({
      roof,
      exclusions: [],
      heightM: 5,
      input: { edgeSetbackM: 0 },
      trees: [{ id: 'tree-1', center: roof[0], heightM: 50, crownDiameterM: 30 }],
    }, 'fast');
    assert.ok(samples.some((sample) => sample.shaded === true && sample.baselineShaded === false));
  } finally {
    delete globalThis.window;
    delete globalThis.requestAnimationFrame;
  }
});
