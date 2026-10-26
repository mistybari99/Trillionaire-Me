// Trillionaire Me brand film, Modernist treatment: Archivo, flush-left, 2px rules, zero radius, red accent.
if (typeof document !== 'undefined' && !document.getElementById('tm-archivo')) {
  const l = document.createElement('link');
  l.id = 'tm-archivo'; l.rel = 'stylesheet';
  l.href = 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&display=swap';
  document.head.appendChild(l);
}

const C = { bg: '#F3F2F2', surface: '#EAE9E9', ink: '#201E1D', accent: '#EC3013', accent7: '#AE1800', rule: '#201E1D', mute: '#605D5D', neutral: '#BAB6B6' };
const MOTION = { enter: Easing.easeOutCubic, draw: Easing.easeInOutCubic, pop: Easing.easeOutBack };
const P = (T, a, b, e) => { const x = clamp((T - a) / (b - a), 0, 1); return e ? e(x) : x; };
const L = (a, b, t) => a + (b - a) * t;
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return 'rgb(' + A.map((v, i) => Math.round(L(v, B[i], t))).join(',') + ')'; };
const FONT = '"Archivo", system-ui, sans-serif';
const PITCH = 48, RH = 28, STEM = 96, BAR = 360;
const lw = (i) => (i === 7 ? BAR : STEM);
const ly = (i) => (3.5 - i) * PITCH;

function SymbolSVG({ size, fg, accent, pad = 0.12 }) {
  const v = 400;
  return (
    <svg width={size} height={size} viewBox={'0 0 ' + v + ' ' + v} style={{ display: 'block' }}>
      <g transform={'translate(' + v / 2 + ' ' + v / 2 + ') scale(' + (1 - pad * 1.2) + ')'}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect key={i} x={-lw(i) / 2} y={ly(i) - RH / 2} width={lw(i)} height={RH} fill={i === 0 ? accent : fg} />
        ))}
      </g>
    </svg>
  );
}

function Piece() {
  const { T, CUES } = useComposition();
  const W = 1920;
  const dark = P(T, CUES.Mark + 0.6, CUES.Mark + 1.8, MOTION.draw) * (1 - P(T, CUES.System - 0.2, CUES.System + 0.9, MOTION.draw));
  const bg = mix(C.bg, C.ink, dark);
  const fg = mix(C.ink, C.bg, dark);
  const accent = mix(C.accent, C.accent, dark);
  const muted = mix(C.mute, '#9B9797', dark);
  const rule = mix(C.rule, C.bg, dark);

  const toLock = P(T, CUES.Lockup - 0.1, CUES.Lockup + 1.2, MOTION.draw);
  const S = L(1, 0.62, toLock);
  const scx = L(960, 450, toLock), scy = L(500, 540, toLock);
  const symOut = P(T, CUES.System - 0.1, CUES.System + 0.6, MOTION.enter);

  const stair = (i) => ({ x: 400 + i * 165, y: 850 - i * 82, w: 200 });
  const rungs = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const st = stair(i);
    const ap = P(T, CUES.Rungs + 0.5 + i * 0.4, CUES.Rungs + 1.1 + i * 0.4, MOTION.pop);
    const cT = CUES.Climb + 0.4 + i * 0.6;
    const done = P(T, cT, cT + 0.3);
    const m = P(T, CUES.Mark + 0.1 + (7 - i) * 0.08, CUES.Mark + 1.5 + (7 - i) * 0.08, MOTION.draw);
    const fx = scx, fy = scy + ly(i) * S, fw = lw(i) * S;
    const base = done > 0 ? mix(C.neutral, C.ink, done) : mix(C.neutral, C.ink, 0);
    const finalCol = i === 0 ? accent : fg;
    return { i, x: L(st.x, fx, m), y: L(st.y, fy, m), w: L(st.w, fw, m), h: L(24, RH * S, m), ap, color: m <= 0 ? base : lerpRgb(base, finalCol, m) };
  });

  const stepF = clamp((T - (CUES.Climb + 0.4)) / 0.6, 0, 7.999);
  const ci = Math.floor(stepF), cf = stepF - ci;
  const a0 = rungs[ci], a1 = rungs[Math.min(7, ci + 1)];
  const hop = cf < 0.5 ? 0 : P(cf, 0.5, 1, MOTION.draw);
  const markX = L(a0.x, a1.x, hop), markY = L(a0.y, a1.y, hop) - 34 - Math.sin(hop * Math.PI) * 26;
  const markVis = P(T, CUES.Climb + 0.1, CUES.Climb + 0.5) * (1 - P(T, CUES.Climb + 5.0, CUES.Mark + 0.3));
  const stair1 = P(T, CUES.Mark + 0.1, CUES.Mark + 0.8);
  const labelsOp = P(T, CUES.Rungs + 1, CUES.Rungs + 2) * (1 - stair1);
  const stageNow = clamp(Math.floor((T - (CUES.Climb + 0.4)) / 0.6 + 0.5), 0, 7);
  const lblStage = 'ABCDEFGH'[stageNow];

  const hz = P(T, CUES.Rungs + 0.2, CUES.Rungs + 2.2, MOTION.draw) * (1 - stair1);

  const word = 'Trillionaire';
  const wx = 640, wy = 540;
  const wOut = 1 - symOut;
  const wl = (k) => P(T, CUES.Lockup + 0.5 + k * 0.045, CUES.Lockup + 1.1 + k * 0.045, MOTION.enter);
  const meP = P(T, CUES.Lockup + 1.3, CUES.Lockup + 2, MOTION.enter);
  const subP = P(T, CUES.Lockup + 2, CUES.Lockup + 2.8, MOTION.enter);

  const tiles = [
    { label: 'App icon', bg: C.accent, fg: C.bg, ac: C.ink, border: 'none', icon: true },
    { label: 'Light', bg: C.bg, fg: C.ink, ac: C.accent, border: '2px solid ' + C.ink },
    { label: 'Dark', bg: C.ink, fg: C.bg, ac: C.accent, border: 'none' },
    { label: 'Mono', bg: '#FFFFFF', fg: '#000000', ac: '#000000', border: '2px solid ' + C.ink },
  ];

  return (
    <div style={{ position: 'absolute', inset: 0, background: bg, overflow: 'hidden', fontFamily: FONT }}>
      <div style={{ position: 'absolute', left: 96, right: 96, top: 120, height: 2, background: rule, opacity: 1 - symOut }} />
      <div style={{ position: 'absolute', left: 96, top: 54, font: '800 22px/1 ' + FONT, letterSpacing: 3, color: muted, opacity: 1 - symOut }}>TRILLIONAIRE ME</div>
      <div style={{ position: 'absolute', right: 96, top: 54, font: '800 22px/1 ' + FONT, letterSpacing: 3, color: muted, opacity: 1 - symOut }}>
        {T < CUES.Mark ? 'STAGE ' + lblStage + ' · ' + (stageNow + 1) + ' / 8' : 'ONE MARK · 8 STAGES'}
      </div>

      <div style={{ position: 'absolute', left: 96, top: 250, width: (W - 192) * hz, height: 2, background: rule }} />
      <div style={{ position: 'absolute', right: 96, top: 262, font: '800 22px/1 ' + FONT, letterSpacing: 3, color: muted, opacity: hz > 0.9 ? 1 : 0, transform: 'translateY(' + (1 - hz) * 8 + 'px)' }}>HORIZON</div>

      {rungs.map((r) => (
        <div key={r.i} style={{ position: 'absolute', left: r.x - r.w / 2 * r.ap, top: r.y - r.h / 2, width: r.w * r.ap, height: r.h, background: r.color, opacity: Math.min(1, r.ap * 3) * (1 - symOut) }} />
      ))}
      {rungs.map((r) => (
        <div key={'l' + r.i} style={{ position: 'absolute', left: r.x - 100, top: r.y + 22, width: 200, textAlign: 'center', font: '800 26px/1 ' + FONT, color: muted, opacity: labelsOp * r.ap }}>{'ABCDEFGH'[r.i]}</div>
      ))}
      <div style={{ position: 'absolute', left: markX - 12, top: markY - 12, width: 24, height: 24, background: C.accent, opacity: markVis }} />

      <div style={{ position: 'absolute', left: wx, top: wy - 100, height: 200, display: 'flex', alignItems: 'center', gap: 36, whiteSpace: 'nowrap', opacity: wOut }}>
        <div style={{ display: 'flex', overflow: 'hidden', padding: '20px 0', font: '800 128px/1 ' + FONT, letterSpacing: -3, color: fg }}>
          {word.split('').map((ch, k) => (
            <span key={k} style={{ display: 'inline-block', opacity: wl(k), transform: 'translateY(' + (1 - wl(k)) * 70 + 'px)' }}>{ch}</span>
          ))}
        </div>
        <div style={{ font: '800 128px/1 ' + FONT, color: accent, opacity: meP, transform: 'translateY(' + (1 - meP) * 30 + 'px)' }}>Me</div>
      </div>
      <div style={{ position: 'absolute', left: wx + 6, top: wy + 96, font: '800 24px/1 ' + FONT, letterSpacing: 6, color: muted, opacity: subP * wOut, transform: 'translateY(' + (1 - subP) * 10 + 'px)' }}>BUILD YOURSELF · SYSTEMS · WEALTH · PURPOSE</div>

      {tiles.map((t, k) => {
        const p = P(T, CUES.System + 0.5 + k * 0.25, CUES.System + 1.3 + k * 0.25, MOTION.enter);
        return (
          <div key={k} style={{ position: 'absolute', left: 270 + k * 360, top: 300, width: 300, opacity: p, transform: 'translateY(' + (1 - p) * 40 + 'px)' }}>
            <div style={{ width: 300, height: 300, background: t.bg, border: t.border, boxSizing: 'border-box', display: 'grid', placeItems: 'center' }}>
              <SymbolSVG size={t.icon ? 260 : 240} fg={t.fg} accent={t.ac} />
            </div>
            <div style={{ marginTop: 20, borderTop: '2px solid ' + C.ink, paddingTop: 14, font: '800 22px/1 ' + FONT, letterSpacing: 3, color: C.ink }}>{t.label.toUpperCase()}</div>
          </div>
        );
      })}
      <div style={{ position: 'absolute', left: 270, top: 730, display: 'flex', gap: 72, whiteSpace: 'nowrap', opacity: P(T, CUES.System + 2, CUES.System + 2.8), font: '600 24px/1.5 ' + FONT, color: C.mute }}>
        {[[C.ink, 'Ink'], [C.bg, 'Paper'], [C.accent, 'Accent'], [C.accent7, 'Accent 700']].map((c, k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <i style={{ width: 28, height: 28, background: c[0], border: '1px solid ' + C.neutral, display: 'block' }} />{c[1]} {c[0]}
          </div>
        ))}
      </div>

      <Captions items={[
        { at: CUES.Rungs + 1.5, text: 'Start where you are.' },
        { at: CUES.Climb + 0.3, text: 'Build yourself. Build your systems.' },
        { at: CUES.Mark + 1.8, text: 'Build your wealth responsibly.' },
        { at: CUES.Lockup + 1.2, text: 'Live with purpose. Think beyond your current limits.' },
        { at: CUES.System + 3.8, until: CUES.System + 5.2, text: 'Eight rungs. One mark.' },
      ]} />
    </div>
  );
}

function lerpRgb(a, b, t) {
  const pa = a.startsWith('#') ? hx(a) : a.match(/\d+/g).map(Number);
  const pb = b.startsWith('#') ? hx(b) : b.match(/\d+/g).map(Number);
  return 'rgb(' + pa.map((v, i) => Math.round(L(v, pb[i], t))).join(',') + ')';
}

function App() {
  const [t, setTweak] = useTweaks(window.TWEAK_DEFAULTS);
  return (
    <>
      <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#F3F2F2">
        <Piece />
      </CompositionStage>
      <TweaksPanel>
        <TweakSection label="Timeline" />
        <TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </TweaksPanel>
    </>
  );
}
window.App = App;
