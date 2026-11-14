'use strict';

const RESEARCH_GROUPS = [
  ['量子理论与物理', [
    ['量子基础', /quantum (?:foundations?|mechanics|contextuality|nonlocality|thermodynamics|speed limit|theory)|bell (?:test|inequalit)|noncontextuality/i],
    ['量子信息理论', /quantum (?:information theory|channels?|entropy|resources?|capacity|information processing)|diamond (?:norm|distance)|von Neumann entropy|quantum state discrimination/i],
    ['量子纠缠', /entanglement|entangled states?|concurrence/i],
    ['开放量子系统', /open quantum|lindblad|decoherence|quantum dissipation|non.markovian/i],
    ['量子多体物理', /quantum (?:many.body|phase|materials?|spin liquids?)|many.body (?:quantum|dynamics|localization|entanglement)|topological order|spin liquids?|tensor network|quantum magnet/i],
    ['量子热力学', /quantum thermodynamic|quantum (?:batter|heat engines?|refrigerat)|ergotropy/i],
  ]],
  ['量子算法与软件', [
    ['量子算法', /quantum algorithms?|quantum fourier|amplitude amplification|(?:grover|shor)'?s? algorithm|variational quantum eigensolver|boson sampling|hamiltonian simulation algorithms?/i],
    ['量子复杂性', /quantum complexity|query complexity|computational complexity|\b(?:bqp|qma)\b|quantum speedup|quantum advantage/i],
    ['量子编译', /quantum compil|circuit (?:compil|synthesis|transpil|optimization)|gate (?:synthesis|decomposition)|transpil/i],
    ['量子模拟', /quantum simulat|(?:analog|digital) simulation of quantum|hamiltonian simulation/i],
    ['量子机器学习', /quantum machine learning|quantum neural networks?|quantum kernel|quantum classifiers?|quantum generative/i],
  ]],
  ['量子纠错与容错', [
    ['量子纠错', /error.correct|stabilizer codes?|surface codes?|quantum codes?|error.detecting codes?|quantum ldpc|syndrome extraction|bosonic codes?/i],
    ['量子容错', /fault.toleran|magic.state distill|logical (?:gates?|qubits?|circuits?)|flag gadgets?/i],
  ]],
  ['量子硬件与控制', [
    ['超导量子计算', /superconducting (?:qubits?|quantum|circuits?)|transmons?|fluxonium|josephson qubits?/i],
    ['离子阱', /trapped.ions?|ion.traps?|ion.shuttling/i],
    ['中性原子', /neutral.atoms?|rydberg|optical tweezer|optical lattice quantum/i],
    ['光量子技术', /quantum optic|quantum photoni|single.photon (?:sources?|emitters?)|photon.pair generation|linear optical quantum|integrated photonics/i],
    ['量子控制', /quantum control|optimal (?:quantum )?control|pulse shaping|dynamical decoupling|qubit control/i],
    ['量子硬件', /quantum (?:processors?|devices?|chips?|hardware|computing platforms?)|spin qubits?|semiconductor qubits?|quantum processing units?/i],
  ]],
  ['量子通信与网络', [
    ['量子通信', /quantum communicat|quantum teleportation|teleportation of quantum|entanglement distribution/i],
    ['量子网络', /quantum networ|quantum memor|quantum repeaters?|quantum internet|entanglement swapping/i],
    ['量子密码', /quantum (?:key distribution|cryptograph)|device.independent crypt|\bqkd\b/i],
  ]],
  ['量子测量与传感', [
    ['量子测量', /quantum (?:measurements?|state tomography|process tomography)|quantum.*tomography|weak measurements?|homodyne detection|quantum readout/i],
    ['量子传感与计量', /quantum (?:sens|metrolog)|quantum.enhanced (?:measurements?|sensing|imaging|spectroscopy)|quantum fisher information|squeezed.light interferometr/i],
  ]],
  ['量子应用', [
    ['生物制药', /drug (?:discovery|design|development)|molecular docking|protein.fold|biomolecular simulation/i],
    ['化学新材料', /quantum chemistr|molecular electronic structure|(?:battery|catalyst|materials?) design|chemical reaction simulat|materials? discovery/i],
    ['交通物流', /vehicle rout|traffic (?:flow|optim|signal)|supply.chain optim|logistics optim|fleet schedul/i],
    ['能源与环境', /power.grid optim|renewable.energy forecast|carbon.capture|climate model|energy.system optim/i],
    ['金融科技', /portfolio optim|option pric|financial risk|derivative pric|credit risk/i],
    ['其他应用', /quantum.enhanced (?:medical imaging|navigation|robotics)|quantum algorithms? for (?:medical imaging|navigation|robotics)/i],
  ]],
];

const LEGACY_GROUPS = {
  '量子信息与基础': '量子理论与物理',
  '量子模拟与多体': '量子理论与物理',
  '量子算法': '量子算法与软件',
  '量子纠错': '量子纠错与容错',
  '量子硬件': '量子硬件与控制',
  '量子通信': '量子通信与网络',
  '量子测量': '量子测量与传感',
};

function classifyPaper(paper) {
  const subject = [paper.title, paper.abstract].filter(Boolean).join(' ').replace(/[‐‑‒–—−]/g, '-');
  const savedTags = new Set(paper.tags || []);
  const groups = new Map();
  for (const [group, rules] of RESEARCH_GROUPS) {
    const children = rules.filter(([label, pattern]) =>
      (savedTags.has(label) && !Object.hasOwn(LEGACY_GROUPS, label)) || pattern.test(subject),
    ).map(([label]) => label);
    if (children.length || savedTags.has(group)) groups.set(group, children);
  }
  for (const legacyTag of savedTags) {
    const group = LEGACY_GROUPS[legacyTag];
    if (group && !groups.has(group)) groups.set(group, []);
  }
  return groups;
}
