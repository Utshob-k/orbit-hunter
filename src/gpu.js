// one thread per (v1,v2) cell, leapfrog in float32 with a variable step.
// keeps the closest return to the start state. only a filter, the f64 code checks the hits.

const WGSL = /* wgsl */ `
struct Params {
  n: u32,
  tMax: f32,
  eta: f32,
  tMin: f32,
  v1Lo: f32, v1Hi: f32,
  v2Lo: f32, v2Hi: f32,
  maxSteps: u32,
  ell: f32,
};
@group(0) @binding(0) var<uniform> P: Params;
@group(0) @binding(1) var<storage, read_write> outD: array<f32>;
@group(0) @binding(2) var<storage, read_write> outT: array<f32>;
@group(0) @binding(3) var<storage, read_write> outP: array<f32>;

fn acc(p: array<vec2<f32>, 3>) -> array<vec2<f32>, 3> {
  var a: array<vec2<f32>, 3>;
  for (var i = 0u; i < 3u; i++) { a[i] = vec2<f32>(0.0); }
  for (var i = 0u; i < 3u; i++) {
    for (var j = i + 1u; j < 3u; j++) {
      let d = p[j] - p[i];
      let r2 = dot(d, d);
      let f = d / (r2 * sqrt(r2));
      a[i] += f;
      a[j] -= f;
    }
  }
  return a;
}

fn pdist(p: array<vec2<f32>, 3>, v: array<vec2<f32>, 3>,
         p0: array<vec2<f32>, 3>, v0: array<vec2<f32>, 3>, sh: u32) -> f32 {
  var s = 0.0;
  for (var i = 0u; i < 3u; i++) {
    let k = (i + sh) % 3u;
    let dp = p[i] - p0[k];
    let dv = v[i] - v0[k];
    s += dot(dp, dp) + dot(dv, dv);
  }
  return s;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (gid.x >= P.n || gid.y >= P.n) { return; }
  let fx = (f32(gid.x) + 0.5) / f32(P.n);
  let fy = (f32(gid.y) + 0.5) / f32(P.n);
  let v1 = mix(P.v1Lo, P.v1Hi, fx);
  let v2 = mix(P.v2Lo, P.v2Hi, fy);
  let u = vec2<f32>(v1, v2);

  var p: array<vec2<f32>, 3>;
  var v: array<vec2<f32>, 3>;
  p[0] = vec2<f32>(-1.0, 0.0); p[1] = vec2<f32>(1.0, 0.0); p[2] = vec2<f32>(0.0, 0.0);
  v[0] = u; v[1] = u + vec2<f32>(0.0, P.ell); v[2] = -(v[0] + v[1]);
  let p0 = p; let v0 = v;

  var t = 0.0;
  var best = 1e30;
  var bestT = 0.0;
  var bestS = 0.0;
  var steps = 0u;
  loop {
    if (t >= P.tMax || steps >= P.maxSteps) { break; }
    // smaller step when two bodies are close
    var rmin = 1e30;
    for (var i = 0u; i < 3u; i++) { for (var j = i + 1u; j < 3u; j++) {
      rmin = min(rmin, length(p[j] - p[i])); } }
    let dt = clamp(P.eta * rmin * sqrt(rmin), 1e-5, 0.02);
    var a = acc(p);
    for (var i = 0u; i < 3u; i++) { v[i] += 0.5 * dt * a[i]; p[i] += dt * v[i]; }
    a = acc(p);
    for (var i = 0u; i < 3u; i++) { v[i] += 0.5 * dt * a[i]; }
    t += dt;
    steps++;
    if (t > P.tMin) {
      for (var sh = 0u; sh < 3u; sh++) {
        let d = pdist(p, v, p0, v0, sh);
        if (d < best) { best = d; bestT = t; bestS = f32(sh); }
      }
    }
    // flew off, won't come back
    if (length(p[0]) > 40.0) { break; }
  }
  let idx = gid.y * P.n + gid.x;
  outD[idx] = sqrt(best);
  outT[idx] = bestT;
  outP[idx] = bestS;
}
`;

export async function createScreener() {
  if (!navigator.gpu) throw new Error('WebGPU not available in this browser');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  const device = await adapter.requestDevice();
  const module = device.createShaderModule({ code: WGSL });
  const info = await module.getCompilationInfo();
  const errs = info.messages.filter((m) => m.type === 'error');
  if (errs.length) throw new Error('WGSL: ' + errs.map((m) => `${m.lineNum}: ${m.message}`).join('; '));
  const pipeline = device.createComputePipeline({ layout: 'auto', compute: { module, entryPoint: 'main' } });

  async function run({ n, v1Lo, v1Hi, v2Lo, v2Hi, tMax = 12, tMin = 1, eta = 0.02, maxSteps = 60000, ell = 0 }) {
    const bytes = n * n * 4;
    const ub = new ArrayBuffer(48);
    const dv = new DataView(ub);
    dv.setUint32(0, n, true);
    dv.setFloat32(4, tMax, true);
    dv.setFloat32(8, eta, true);
    dv.setFloat32(12, tMin, true);
    dv.setFloat32(16, v1Lo, true);
    dv.setFloat32(20, v1Hi, true);
    dv.setFloat32(24, v2Lo, true);
    dv.setFloat32(28, v2Hi, true);
    dv.setUint32(32, maxSteps, true);
    dv.setFloat32(36, ell, true);
    const uniform = device.createBuffer({ size: 48, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    device.queue.writeBuffer(uniform, 0, ub);
    const mk = () => device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    const bD = mk();
    const bT = mk();
    const bP = mk();
    const rd = () => device.createBuffer({ size: bytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const rD = rd();
    const rT = rd();
    const rP = rd();
    const bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform } },
        { binding: 1, resource: { buffer: bD } },
        { binding: 2, resource: { buffer: bT } },
        { binding: 3, resource: { buffer: bP } },
      ],
    });
    const enc = device.createCommandEncoder();
    const pass = enc.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bind);
    pass.dispatchWorkgroups(Math.ceil(n / 8), Math.ceil(n / 8));
    pass.end();
    enc.copyBufferToBuffer(bD, 0, rD, 0, bytes);
    enc.copyBufferToBuffer(bT, 0, rT, 0, bytes);
    enc.copyBufferToBuffer(bP, 0, rP, 0, bytes);
    device.queue.submit([enc.finish()]);
    await Promise.all([rD.mapAsync(GPUMapMode.READ), rT.mapAsync(GPUMapMode.READ), rP.mapAsync(GPUMapMode.READ)]);
    const d = new Float32Array(rD.getMappedRange().slice(0));
    const t = new Float32Array(rT.getMappedRange().slice(0));
    const p = new Float32Array(rP.getMappedRange().slice(0));
    [uniform, bD, bT, bP, rD, rT, rP].forEach((b) => b.destroy());
    return { d, t, p };
  }
  return { run, adapterInfo: adapter.info || {} };
}
