const { useState, useEffect, useRef, useMemo } = React;

// ─────────────────────────────────────────────────────────────────────────────
// Session ID — generated once per page load
// ─────────────────────────────────────────────────────────────────────────────
if (!window.__omni_session_id) {
  window.__omni_session_id = crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// AI metadata (display only — actual model comes from settings)
// ─────────────────────────────────────────────────────────────────────────────
const AI_META = {
  claude: { name: "Claude", blurb: "Anthropic" },
  gemini: { name: "Gemini", blurb: "Google" },
  qwen:   { name: "Qwen",   blurb: "Alibaba" }
};

// ─────────────────────────────────────────────────────────────────────────────
// SSE streaming helper — async generator over a POST that returns text/event-stream
// ─────────────────────────────────────────────────────────────────────────────
async function* streamSSE(url, body, signal) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try { yield JSON.parse(line.slice(6)); } catch {}
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS — small inline SVGs
// ─────────────────────────────────────────────────────────────────────────────
const Icon = ({ name, size = 18 }) => {
  const paths = {
    chat:     <><path d="M4 5h16v11H8l-4 4V5z" /></>,
    history:  <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.55V21a2 2 0 0 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06A2 2 0 1 1 4.13 16.93l.06-.06A1.7 1.7 0 0 0 4.53 15a1.7 1.7 0 0 0-1.55-1.03H3a2 2 0 0 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.85a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7.07 4.09l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.07 3v-.09a2 2 0 0 1 4 0V3a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1.03H21a2 2 0 0 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15z" /></>,
    send:     <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    plus:     <><path d="M12 5v14M5 12h14" /></>,
    eye:      <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    eyeOff:   <><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10 10 0 0 1 22 12a13 13 0 0 1-2.4 3.3M6.6 6.6A13 13 0 0 0 2 12s3.5 7 10 7a10 10 0 0 0 4.3-1" /></>,
    chevron:  <><path d="M6 9l6 6 6-6" /></>,
    arrow:    <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    drag:     <><circle cx="9" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="18" r="1" /></>,
    close:    <><path d="M6 6l12 12M18 6L6 18" /></>,
    sparkle:  <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></>,
    check:    <><path d="M4 12l5 5L20 6" /></>,
    sun:      <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>,
    moon:     <><path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" /></>,
    sidebar:  <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
    sidebarOpen: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M14 9l3 3-3 3"/></>,
    attach:   <><path d="M21.4 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></>,
    image:    <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></>,
    persona:  <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
};

const AIGlyph = ({ id, size = 18 }) => {
  const c = `var(--ai-${id})`;
  if (id === "claude") return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" fill="none" stroke={c} strokeWidth="2" />
      <circle cx="12" cy="12" r="3.2" fill={c} />
    </svg>
  );
  if (id === "gemini") return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M12 3 L21 12 L12 21 L3 12 Z" fill="none" stroke={c} strokeWidth="2" />
      <path d="M12 8 L16 12 L12 16 L8 12 Z" fill={c} />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" fill="none" stroke={c} strokeWidth="2" />
      <rect x="8.5" y="8.5" width="7" height="7" rx="1.2" fill={c} />
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = [
  { id: 'all',     name: 'All three',        line: ['claude', 'gemini', 'qwen'], note: 'Default jury' },
  { id: 'review',  name: 'Code review crew', line: ['claude', 'qwen', 'gemini'], note: 'Opus → Max → Pro' },
  { id: 'writing', name: 'Writing duo',      line: ['claude', 'gemini'],         note: 'Sonnet + Flash' },
  { id: 'fast',    name: 'Fast triage',      line: ['gemini', 'qwen'],           note: 'Flash + Turbo' },
];

const PINNED = [
  { title: "Spec: agent orchestration v2", when: "pinned" },
  { title: "Hiring rubric – design",       when: "pinned" },
];

const Sidebar = ({ page, setPage, history, onNew, activePreset, setActivePreset, collapsed, setCollapsed }) => {
  const navItems = [
    { id: "chat",     label: "Chat",     icon: "chat" },
    { id: "history",  label: "History",  icon: "history" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <div className="brand-mark">
          <svg width="22" height="22" viewBox="0 0 24 24">
            <circle cx="8"  cy="12" r="4" fill="var(--ai-claude)" opacity="0.85" />
            <circle cx="12" cy="12" r="4" fill="var(--ai-gemini)" opacity="0.75" style={{ mixBlendMode: 'multiply' }} />
            <circle cx="16" cy="12" r="4" fill="var(--ai-qwen)"   opacity="0.75" style={{ mixBlendMode: 'multiply' }} />
          </svg>
        </div>
        <div className="brand-name">
          <span className="brand-serif">Omni</span><span className="brand-dim">‑Chats</span>
        </div>
        <button className="collapse-btn" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                onClick={() => setCollapsed(!collapsed)}>
          <Icon name={collapsed ? 'sidebarOpen' : 'sidebar'} size={15} />
        </button>
      </div>

      <button className="new-chat" onClick={onNew} title="New conversation">
        <Icon name="plus" size={15} />
        <span>New conversation</span>
        <kbd>⌘N</kbd>
      </button>

      <nav className="nav">
        {navItems.map(n =>
          <button key={n.id} className={`nav-item ${page === n.id ? 'active' : ''}`}
                  title={n.label} onClick={() => setPage(n.id)}>
            <Icon name={n.icon} size={16} />
            <span>{n.label}</span>
          </button>
        )}
      </nav>

      <div className="sb-scroll">
        <div className="sb-section">
          <div className="nav-section-label">
            <span>Presets</span>
            <button className="section-add" title="New preset"><Icon name="plus" size={11} /></button>
          </div>
          <div className="preset-list">
            {PRESETS.map(p =>
              <button key={p.id} className={`preset-item ${activePreset === p.id ? 'active' : ''}`}
                      onClick={() => setActivePreset(p.id)}>
                <div className="preset-dots">
                  {p.line.map(id => <span key={id} className="preset-dot" style={{ background: `var(--ai-${id})` }} />)}
                </div>
                <div className="preset-text">
                  <div className="preset-name">{p.name}</div>
                  <div className="preset-note">{p.note}</div>
                </div>
              </button>
            )}
          </div>
        </div>

        <div className="sb-section">
          <div className="nav-section-label"><span>Pinned</span></div>
          <div className="history-list">
            {PINNED.map((h, i) =>
              <button key={i} className="history-item">
                <span className="pin-icon">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 4l6 6-4 1-4 4-1 4-2-2-5 5-1-1 5-5-2-2 4-1 4-4 1-5z" />
                  </svg>
                </span>
                <span className="history-title">{h.title}</span>
              </button>
            )}
          </div>
        </div>

        <div className="sb-section">
          <div className="nav-section-label"><span>Recent</span></div>
          <div className="history-list">
            {history.map((h, i) =>
              <button key={i} className="history-item">
                <span className="history-title">{h.title}</span>
                <span className="history-meta">{h.when}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="user-card">
        <div className="user-avatar">U</div>
        <div className="user-info">
          <div className="user-name">You</div>
          <div className="user-plan">Add keys in Settings</div>
        </div>
        <button className="icon-btn user-more" title="Account"><Icon name="chevron" size={14} /></button>
      </div>
    </aside>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODE TOGGLE
// ─────────────────────────────────────────────────────────────────────────────
const ModeToggle = ({ mode, setMode }) =>
  <div className="mode-toggle" role="tablist">
    <button role="tab" aria-selected={mode === 'parallel'}
            className={mode === 'parallel' ? 'on' : ''} onClick={() => setMode('parallel')}>
      <span className="mode-dot" style={{ background: 'var(--ai-claude)' }} />
      <span className="mode-dot" style={{ background: 'var(--ai-gemini)' }} />
      <span className="mode-dot" style={{ background: 'var(--ai-qwen)' }} />
      Parallel
    </button>
    <button role="tab" aria-selected={mode === 'chain'}
            className={mode === 'chain' ? 'on' : ''} onClick={() => setMode('chain')}>
      <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
        <circle cx="3"  cy="5" r="2" fill="var(--ai-claude)" />
        <path d="M5 5h4" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="11" cy="5" r="2" fill="var(--ai-gemini)" />
        <path d="M13 5h4" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="19" cy="5" r="2" fill="var(--ai-qwen)" />
      </svg>
      Chain
    </button>
    <div className="mode-tip">
      {mode === 'parallel'
        ? 'All three answer at once, then critique each other.'
        : 'Each AI builds on the previous response.'}
    </div>
  </div>;

// ─────────────────────────────────────────────────────────────────────────────
// AI CARD — controlled by parent (no internal mock streaming)
// ─────────────────────────────────────────────────────────────────────────────
const AICard = ({ id, round, text = '', phase = 'waiting', model = '' }) => {
  const meta = AI_META[id];
  const tokenCount = Math.round(text.length / 4.2);

  return (
    <div className={`ai-card ai-${id} phase-${phase}`}>
      <div className="ai-card-header">
        <div className="ai-card-id">
          <AIGlyph id={id} />
          <div className="ai-card-name">
            <div className="ai-name">{meta.name}</div>
            <div className="ai-model">{model || id}</div>
          </div>
        </div>
        <div className="round-badge">Round {round}</div>
      </div>
      <div className="ai-card-body">
        {phase === 'waiting' && <div className="ai-waiting">Queued…</div>}
        {phase === 'thinking' && (
          <div className="ai-thinking">
            <span className="dot" /><span className="dot" /><span className="dot" />
            <span className="thinking-label">thinking</span>
          </div>
        )}
        {(phase === 'streaming' || phase === 'done') && (
          <div className="ai-text">
            {text}
            {phase === 'streaming' && <span className="caret" />}
          </div>
        )}
      </div>
      {phase === 'done' && (
        <div className="ai-card-foot">
          <span className="foot-meta">{tokenCount} tokens</span>
          <button className="foot-btn" onClick={() => navigator.clipboard?.writeText(text)}>Copy</button>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PARALLEL VIEW — real SSE streaming
// ─────────────────────────────────────────────────────────────────────────────
const ParallelView = ({ prompt, maxRounds, order, settings, systemPrompts }) => {
  // cardData[`${ai}-${round}`] = { text, phase }
  const [cardData, setCardData] = useState({});
  const [activeRound, setActiveRound] = useState(1);
  const [allDone, setAllDone] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!prompt) return;

    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setAllDone(false);
    setActiveRound(1);
    const initial = {};
    order.forEach(id => { initial[`${id}-1`] = { text: '', phase: 'thinking' }; });
    setCardData(initial);

    (async () => {
      try {
        const body = {
          session_id: window.__omni_session_id,
          question: prompt,
          max_rounds: maxRounds,
          order,
          keys: settings.keys,
          models: settings.models,
          system_prompts: {
            claude: systemPrompts.claude || '',
            gemini: systemPrompts.gemini || '',
            qwen:   systemPrompts.qwen   || '',
          },
        };

        for await (const event of streamSSE('/api/parallel/stream', body, abort.signal)) {
          if (event.type === 'chunk') {
            setCardData(prev => {
              const key = `${event.ai}-${event.round}`;
              return {
                ...prev,
                [key]: { text: (prev[key]?.text || '') + event.delta, phase: 'streaming' },
              };
            });
          } else if (event.type === 'done') {
            setCardData(prev => {
              const key = `${event.ai}-${event.round}`;
              return { ...prev, [key]: { ...prev[key], phase: 'done' } };
            });
          } else if (event.type === 'error') {
            setCardData(prev => {
              const key = `${event.ai}-${event.round || 1}`;
              return { ...prev, [key]: { text: `⚠ ${event.message}`, phase: 'done' } };
            });
          } else if (event.type === 'round_complete') {
            const nextRound = event.round + 1;
            if (nextRound <= maxRounds) {
              setActiveRound(nextRound);
              setCardData(prev => {
                const next = { ...prev };
                order.forEach(id => { next[`${id}-${nextRound}`] = { text: '', phase: 'thinking' }; });
                return next;
              });
            }
          } else if (event.type === 'all_done') {
            setAllDone(true);
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Parallel stream error:', e);
      }
    })();

    return () => abort.abort();
  }, [prompt]);

  if (!prompt) return <EmptyState />;

  const roundsToShow = [];
  for (let r = 1; r <= activeRound; r++) roundsToShow.push(r);

  return (
    <div className="parallel-stack">
      <div className="user-bubble">
        <div className="user-bubble-label">You asked</div>
        <div className="user-bubble-text">{prompt}</div>
      </div>
      {roundsToShow.map(r => (
        <div className="parallel-round" key={r}>
          <div className="round-divider">
            <span>Round {r}</span>
            {r > 1 && <span className="round-sub">— comparing responses</span>}
          </div>
          <div className="parallel-grid" style={{ gridTemplateColumns: `repeat(${order.length}, 1fr)` }}>
            {order.map(id => {
              const state = cardData[`${id}-${r}`] || { text: '', phase: 'waiting' };
              return (
                <AICard key={id} id={id} round={r}
                        text={state.text} phase={state.phase}
                        model={settings.models[id]} />
              );
            })}
          </div>
        </div>
      ))}
      {allDone && (
        <div className="round-done">
          <Icon name="check" size={14} /> All rounds complete · ask a follow-up below
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN BUBBLE — controlled
// ─────────────────────────────────────────────────────────────────────────────
const ChainBubble = ({ id, text = '', phase = 'thinking', model = '' }) => {
  const meta = AI_META[id];
  return (
    <div className={`chain-bubble ai-${id}`}>
      <div className="chain-rail" />
      <div className="chain-content">
        <div className="chain-head">
          <AIGlyph id={id} size={16} />
          <span className="chain-name">{meta.name}</span>
          <span className="chain-model">{model || id}</span>
        </div>
        <div className="chain-body">
          {phase === 'thinking' ? (
            <div className="ai-thinking">
              <span className="dot" /><span className="dot" /><span className="dot" />
              <span className="thinking-label">thinking</span>
            </div>
          ) : (
            <div className="ai-text">
              {text}
              {phase === 'streaming' && <span className="caret" />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAIN VIEW — real SSE streaming (sequential)
// ─────────────────────────────────────────────────────────────────────────────
const ChainView = ({ prompt, order, settings, systemPrompts }) => {
  // steps: [{ id, text, phase }]
  const [steps, setSteps] = useState([]);
  const [allDone, setAllDone] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!prompt) return;

    if (abortRef.current) abortRef.current.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setAllDone(false);
    setSteps(order.length > 0 ? [{ id: order[0], text: '', phase: 'thinking' }] : []);

    (async () => {
      try {
        const body = {
          session_id: window.__omni_session_id,
          question: prompt,
          order,
          keys: settings.keys,
          models: settings.models,
          system_prompts: {
            claude: systemPrompts.claude || '',
            gemini: systemPrompts.gemini || '',
            qwen:   systemPrompts.qwen   || '',
          },
        };

        for await (const event of streamSSE('/api/sequential/stream', body, abort.signal)) {
          if (event.type === 'chunk') {
            setSteps(prev => {
              const exists = prev.some(s => s.id === event.ai);
              if (!exists) {
                return [...prev, { id: event.ai, text: event.delta, phase: 'streaming' }];
              }
              return prev.map(s =>
                s.id === event.ai
                  ? { ...s, text: s.text + event.delta, phase: 'streaming' }
                  : s
              );
            });
          } else if (event.type === 'done') {
            const nextIdx = order.indexOf(event.ai) + 1;
            setSteps(prev => {
              const updated = prev.map(s =>
                s.id === event.ai ? { ...s, phase: 'done' } : s
              );
              if (nextIdx < order.length) {
                const nextId = order[nextIdx];
                if (!updated.some(s => s.id === nextId)) {
                  updated.push({ id: nextId, text: '', phase: 'thinking' });
                }
              }
              return updated;
            });
          } else if (event.type === 'error') {
            setSteps(prev =>
              prev.map(s =>
                s.id === event.ai ? { ...s, text: `⚠ ${event.message}`, phase: 'done' } : s
              )
            );
          } else if (event.type === 'all_done') {
            setAllDone(true);
          }
        }
      } catch (e) {
        if (e.name !== 'AbortError') console.error('Chain stream error:', e);
      }
    })();

    return () => abort.abort();
  }, [prompt]);

  if (!prompt) return <EmptyState />;

  return (
    <div className="chain-stack">
      <div className="user-bubble">
        <div className="user-bubble-label">You asked</div>
        <div className="user-bubble-text">{prompt}</div>
      </div>
      {steps.map(step => (
        <ChainBubble key={step.id} id={step.id}
                     text={step.text} phase={step.phase}
                     model={settings.models[step.id]} />
      ))}
      {allDone && (
        <div className="round-done">
          <Icon name="check" size={14} /> Chain complete
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// AI ROSTER
// ─────────────────────────────────────────────────────────────────────────────
const AIRoster = ({ mode, order, setOrder, enabled, setEnabled, systemPrompts, setSystemPrompts, models }) => {
  const [drag, setDrag] = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const promptCount = Object.values(systemPrompts).filter(p => p && p.trim()).length;

  return (
    <div className="ai-roster">
      <div className="ai-roster-row">
        <span className="roster-label">{mode === 'parallel' ? 'Display order' : 'Run order'}</span>
        <div className="order-pills">
          {order.map((id, i) =>
            <React.Fragment key={id}>
              <button
                className={`order-pill ai-${id} ${drag === i ? 'dragging' : ''} ${!enabled[id] ? 'off' : ''}`}
                draggable
                onDragStart={() => setDrag(i)}
                onDragEnd={() => setDrag(null)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (drag === null || drag === i) return;
                  const copy = order.slice();
                  const [moved] = copy.splice(drag, 1);
                  copy.splice(i, 0, moved);
                  setOrder(copy);
                  setDrag(null);
                }}>
                <Icon name="drag" size={11} />
                <AIGlyph id={id} size={14} />
                <span className="pill-name">{AI_META[id].name}</span>
                {systemPrompts[id] && systemPrompts[id].trim() && <span className="pill-dot" title="Has system prompt" />}
                <span className="pill-toggle"
                      title={enabled[id] ? 'Disable' : 'Enable'}
                      onClick={e => { e.stopPropagation(); setEnabled({ ...enabled, [id]: !enabled[id] }); }}>
                  {enabled[id] ? '·' : '+'}
                </span>
              </button>
              {i < order.length - 1 && <span className="order-arrow">{mode === 'parallel' ? '·' : '→'}</span>}
            </React.Fragment>
          )}
        </div>
        <button className={`persona-btn ${showDrawer ? 'open' : ''}`}
                onClick={() => setShowDrawer(s => !s)} title="Configure system prompts">
          <Icon name="persona" size={14} />
          <span>System prompts</span>
          {promptCount > 0 && <span className="persona-count">{promptCount}</span>}
        </button>
      </div>
      {showDrawer && (
        <SystemPromptsDrawer order={order} systemPrompts={systemPrompts}
                             setSystemPrompts={setSystemPrompts} models={models}
                             onClose={() => setShowDrawer(false)} />
      )}
    </div>
  );
};

const SYSTEM_PROMPT_PRESETS = [
  { label: 'Critic',     text: "You are a skeptical reviewer. Push back on assumptions and ask the question the user didn't." },
  { label: 'Engineer',   text: "You are a senior staff engineer. Be concrete, name tradeoffs, prefer working code over hand-waving." },
  { label: 'Editor',     text: "You are a brutal editor. Cut filler, tighten sentences, keep the voice." },
  { label: 'Researcher', text: "You are a careful researcher. Cite reasoning, separate fact from inference." },
];

const SystemPromptsDrawer = ({ order, systemPrompts, setSystemPrompts, models, onClose }) => (
  <div className="prompts-drawer">
    <div className="prompts-head">
      <div>
        <h3>System prompts</h3>
        <p>Per-AI instructions for this conversation. Leave blank to use defaults.</p>
      </div>
      <button className="icon-btn" onClick={onClose} title="Close"><Icon name="close" size={14} /></button>
    </div>
    <div className="prompts-grid">
      {order.map(id => (
        <div key={id} className={`prompt-card ai-${id}`}>
          <div className="prompt-card-head">
            <div className="prompt-card-id">
              <AIGlyph id={id} size={16} />
              <div>
                <div className="prompt-card-name">{AI_META[id].name}</div>
                <div className="prompt-card-model">{models[id]}</div>
              </div>
            </div>
            <div className="prompt-card-presets">
              {SYSTEM_PROMPT_PRESETS.map(p => (
                <button key={p.label} className="preset-chip"
                        onClick={() => setSystemPrompts({ ...systemPrompts, [id]: p.text })}>
                  {p.label}
                </button>
              ))}
              {systemPrompts[id] && (
                <button className="preset-chip clear"
                        onClick={() => setSystemPrompts({ ...systemPrompts, [id]: '' })}>
                  Clear
                </button>
              )}
            </div>
          </div>
          <textarea className="prompt-textarea" rows={3}
                    placeholder={`Optional: tell ${AI_META[id].name} how to behave.`}
                    value={systemPrompts[id] || ''}
                    onChange={e => setSystemPrompts({ ...systemPrompts, [id]: e.target.value })} />
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
const EmptyState = () => {
  const prompts = [
    "Compare React Server Components and SolidJS for a content-heavy site.",
    "Write a tight three-paragraph project update for stakeholders.",
    "Should I use Postgres or DynamoDB for an event-sourced system?",
  ];
  return (
    <div className="empty">
      <div className="empty-glyphs">
        <AIGlyph id="claude" size={42} />
        <AIGlyph id="gemini" size={42} />
        <AIGlyph id="qwen"   size={42} />
      </div>
      <h1 className="empty-title">Ask anything.<br /><em>Three AIs will answer together.</em></h1>
      <p className="empty-sub">Get a parallel jury or a chained conversation — Claude, Gemini, and Qwen, side by side.</p>
      <div className="empty-prompts">
        {prompts.map((p, i) =>
          <button key={i} className="empty-prompt" onClick={() => window.__omni_prefill?.(p)}>
            <Icon name="sparkle" size={14} /> {p}
          </button>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT BAR
// ─────────────────────────────────────────────────────────────────────────────
const InputBar = ({ onSend, activeCount }) => {
  const [val, setVal] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [showAttach, setShowAttach] = useState(false);
  const ref = useRef();
  const fileRef = useRef();
  const attachRef = useRef();

  useEffect(() => { window.__omni_prefill = p => { setVal(p); ref.current?.focus(); }; }, []);
  useEffect(() => {
    if (!showAttach) return;
    const onDoc = e => { if (!attachRef.current?.contains(e.target)) setShowAttach(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [showAttach]);

  const submit = () => {
    if (!val.trim()) return;
    onSend(val.trim());
    setVal("");
    setAttachments([]);
  };
  const onKey = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); submit(); } };
  const onFile = e => {
    const files = Array.from(e.target.files || []);
    const next = files.map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name,
      size: f.size,
      kind: f.type.startsWith('image/') ? 'image' : 'file',
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }));
    setAttachments(a => [...a, ...next]);
    setShowAttach(false);
    e.target.value = '';
  };
  const removeAtt = id => setAttachments(a => a.filter(x => x.id !== id));

  return (
    <div className="input-wrap">
      <div className="input-bar">
        {attachments.length > 0 && (
          <div className="att-strip">
            {attachments.map(a => (
              <div key={a.id} className={`att-chip att-${a.kind}`}>
                {a.kind === 'image' ? <img src={a.url} alt={a.name} /> : <Icon name="attach" size={13} />}
                <span className="att-name">{a.name}</span>
                <button className="att-remove" onClick={() => removeAtt(a.id)}><Icon name="close" size={11} /></button>
              </div>
            ))}
          </div>
        )}
        <textarea ref={ref} value={val} onChange={e => setVal(e.target.value)} onKeyDown={onKey}
                  placeholder={activeCount > 0 ? `Ask all ${activeCount === 1 ? 'one' : activeCount === 2 ? 'two' : 'three'}…` : 'Enable an AI first…'}
                  rows={1} />
        <div className="input-actions">
          <div className="input-left" ref={attachRef}>
            <button className="plus-btn" onClick={() => setShowAttach(s => !s)} title="Attach">
              <Icon name="plus" size={16} />
            </button>
            {showAttach && (
              <div className="attach-menu">
                <button onClick={() => fileRef.current?.click()}><Icon name="image" size={14} /> Image</button>
                <button onClick={() => fileRef.current?.click()}><Icon name="attach" size={14} /> File</button>
              </div>
            )}
            <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,.txt,.md,.csv"
                   style={{ display: 'none' }} onChange={onFile} />
            <span className="input-hint"><kbd>⌘</kbd><kbd>↵</kbd> to send</span>
          </div>
          <button className="send-btn" onClick={submit} disabled={!val.trim() || activeCount === 0}>
            <Icon name="send" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────
const MODELS = {
  claude: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
  gemini: ["gemini-2.0-flash", "gemini-1.5-pro"],
  qwen:   ["qwen-plus", "qwen-turbo", "qwen-max"],
};

const SettingsPage = ({ settings, setSettings }) => {
  const [reveal, setReveal] = useState({});
  const [testing, setTesting] = useState({});

  const testKey = id => {
    setTesting(t => ({ ...t, [id]: 'testing' }));
    setTimeout(() => setTesting(t => ({ ...t, [id]: 'ok' })), 900 + Math.random() * 600);
  };

  return (
    <div className="settings">
      <div className="settings-head">
        <h1>Settings</h1>
        <p>Configure the three assistants, manage keys, and tune how rounds run.</p>
      </div>

      <Section title="API Keys" sub="Stored in your browser. Sent only to this local server, never to third parties.">
        <div className="keys-grid">
          {Object.keys(AI_META).map(id =>
            <div key={id} className="key-row">
              <div className="key-label"><AIGlyph id={id} size={14} /><span>{AI_META[id].name}</span></div>
              <div className="key-input-wrap">
                <input type={reveal[id] ? 'text' : 'password'} className="key-input"
                       value={settings.keys[id]}
                       onChange={e => setSettings(s => ({ ...s, keys: { ...s.keys, [id]: e.target.value } }))}
                       placeholder={`${id === 'claude' ? 'sk-ant-' : id === 'gemini' ? 'AIza' : 'sk-'}…`} />
                <button className="reveal-btn" onClick={() => setReveal(r => ({ ...r, [id]: !r[id] }))}>
                  <Icon name={reveal[id] ? 'eyeOff' : 'eye'} size={15} />
                </button>
              </div>
              <button className={`test-btn ${testing[id] || ''}`} onClick={() => testKey(id)}>
                {testing[id] === 'testing' && <><span className="spinner" /> Testing…</>}
                {testing[id] === 'ok'      && <><Icon name="check" size={13} /> Connected</>}
                {!testing[id]              && 'Test connection'}
              </button>
            </div>
          )}
        </div>
      </Section>

      <Section title="AI Models" sub="Pick the model version each assistant will use.">
        <div className="model-grid">
          {Object.keys(AI_META).map(id =>
            <div key={id} className={`model-row ai-${id}`}>
              <div className="model-row-head">
                <AIGlyph id={id} size={18} />
                <div>
                  <div className="model-name">{AI_META[id].name}</div>
                  <div className="model-blurb">{AI_META[id].blurb}</div>
                </div>
              </div>
              <Select value={settings.models[id]} options={MODELS[id]}
                      onChange={v => setSettings(s => ({ ...s, models: { ...s.models, [id]: v } }))} />
            </div>
          )}
        </div>
      </Section>

      <Section title="Conversation" sub="How parallel rounds behave.">
        <div className="setting-row">
          <div className="setting-label">
            <div className="setting-title">Max rounds (Parallel Mode)</div>
            <div className="setting-sub">After round 1, AIs see each other's responses.</div>
          </div>
          <div className="slider-row">
            <input type="range" min="1" max="3" value={settings.maxRounds}
                   onChange={e => setSettings(s => ({ ...s, maxRounds: +e.target.value }))} />
            <span className="slider-val">{settings.maxRounds}</span>
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-label">
            <div className="setting-title">Auto-continue rounds</div>
            <div className="setting-sub">Start the next round automatically when all three finish.</div>
          </div>
          <Toggle value={settings.autoContinue}
                  onChange={v => setSettings(s => ({ ...s, autoContinue: v }))} />
        </div>
      </Section>

      <Section title="Appearance">
        <div className="setting-row">
          <div className="setting-label"><div className="setting-title">Theme</div></div>
          <div className="seg">
            {['light', 'dark'].map(t =>
              <button key={t} className={settings.theme === t ? 'on' : ''}
                      onClick={() => setSettings(s => ({ ...s, theme: t }))}>
                <Icon name={t === 'light' ? 'sun' : 'moon'} size={13} /> {t === 'light' ? 'Light' : 'Dark'}
              </button>
            )}
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-label"><div className="setting-title">Font size</div></div>
          <div className="seg">
            {['S', 'M', 'L'].map(s =>
              <button key={s} className={settings.fontSize === s ? 'on' : ''}
                      onClick={() => setSettings(st => ({ ...st, fontSize: s }))}>{s}</button>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
};

const Section = ({ title, sub, children }) =>
  <section className="settings-section">
    <div className="settings-section-head">
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
    <div className="settings-section-body">{children}</div>
  </section>;

const Select = ({ value, options, onChange }) =>
  <div className="select-wrap">
    <select value={value} onChange={e => onChange(e.target.value)}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
    <Icon name="chevron" size={14} />
  </div>;

const Toggle = ({ value, onChange }) =>
  <button className={`toggle ${value ? 'on' : ''}`} onClick={() => onChange(!value)}>
    <span className="toggle-knob" />
  </button>;

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY PAGE
// ─────────────────────────────────────────────────────────────────────────────
const HistoryPage = ({ history }) =>
  <div className="history-page">
    <div className="settings-head">
      <h1>History</h1>
      <p>All your past Omni-Chats sessions.</p>
    </div>
    <div className="history-cards">
      {history.map((h, i) =>
        <button className="history-card" key={i}>
          <div className="history-card-head">
            <div className="history-card-title">{h.title}</div>
            <div className="history-card-when">{h.when}</div>
          </div>
          <div className="history-card-body">{h.preview}</div>
          <div className="history-card-tags">
            <span className="tag ai-claude">Claude</span>
            <span className="tag ai-gemini">Gemini</span>
            <span className="tag ai-qwen">Qwen</span>
            <span className="tag-mode">{h.mode}</span>
          </div>
        </button>
      )}
    </div>
  </div>;

// ─────────────────────────────────────────────────────────────────────────────
// APP ROOT
// ─────────────────────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "accent": "#6B5BD2",
  "density": "comfortable",
  "showRoundBadge": true
}/*EDITMODE-END*/;

const HISTORY = [
  { title: "RSC vs Solid for content sites", when: "today",     preview: "All three flagged hydration cost…",          mode: "Parallel" },
  { title: "Postgres or DynamoDB?",          when: "yesterday", preview: "Qwen pushed back on the access-pattern…",    mode: "Chain" },
  { title: "Q3 stakeholder update draft",    when: "Mon",       preview: "Gemini's structure won, Claude's tone won…", mode: "Parallel" },
  { title: "Naming a multi-agent product",   when: "Apr 28",    preview: "Six rounds. Settled on 'Omni'.",             mode: "Parallel" },
];

const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = useState("chat");
  const [mode, setMode] = useState("parallel");
  const [prompt, setPrompt] = useState("");
  const [order, setOrder] = useState(["claude", "gemini", "qwen"]);
  const [enabled, setEnabled] = useState({ claude: true, gemini: true, qwen: true });
  const [systemPrompts, setSystemPrompts] = useState({ claude: '', gemini: '', qwen: '' });
  const [activePreset, setActivePreset] = useState('all');
  const [collapsed, setCollapsed] = useState(false);
  const [settings, setSettings] = useState({
    models: { claude: "claude-opus-4-5", gemini: "gemini-2.0-flash", qwen: "qwen-max" },
    keys:   { claude: "", gemini: "", qwen: "" },
    maxRounds: 2,
    autoContinue: true,
    theme: tweaks.theme,
    fontSize: "M",
  });

  // Sync theme tweaks ↔ settings
  useEffect(() => { setSettings(s => ({ ...s, theme: tweaks.theme })); }, [tweaks.theme]);
  useEffect(() => { if (settings.theme !== tweaks.theme) setTweak('theme', settings.theme); }, [settings.theme]);

  const themeClass = settings.theme === 'dark' ? 'theme-dark' : 'theme-light';
  const sizeClass  = `size-${settings.fontSize.toLowerCase()}`;

  const activeOrder = order.filter(id => enabled[id]);
  const onSend = p => { setPrompt(p); setPage("chat"); };
  const onNew  = () => { setPrompt(""); setPage("chat"); };

  return (
    <div className={`app ${themeClass} ${sizeClass} ${collapsed ? 'sb-collapsed' : ''}`}
         style={{ '--accent': tweaks.accent, '--density': tweaks.density === 'compact' ? '0.85' : '1' }}>
      <Sidebar page={page} setPage={setPage} history={HISTORY} onNew={onNew}
               activePreset={activePreset} setActivePreset={setActivePreset}
               collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className="main">
        {page === "chat" && <>
          <header className="top-bar">
            <ModeToggle mode={mode} setMode={setMode} />
            <div className="top-actions">
              <button className="icon-btn" title="Toggle theme"
                      onClick={() => setSettings(s => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))}>
                <Icon name={settings.theme === 'dark' ? 'sun' : 'moon'} size={16} />
              </button>
            </div>
          </header>
          <AIRoster mode={mode} order={order} setOrder={setOrder}
                    enabled={enabled} setEnabled={setEnabled}
                    systemPrompts={systemPrompts} setSystemPrompts={setSystemPrompts}
                    models={settings.models} />
          <div className="scroll-area">
            {mode === "parallel"
              ? <ParallelView prompt={prompt} maxRounds={settings.maxRounds}
                              order={activeOrder} settings={settings} systemPrompts={systemPrompts} />
              : <ChainView    prompt={prompt} order={activeOrder}
                              settings={settings} systemPrompts={systemPrompts} />}
          </div>
          <InputBar onSend={onSend} activeCount={activeOrder.length} />
        </>}
        {page === "history"  && <div className="scroll-area"><HistoryPage history={HISTORY} /></div>}
        {page === "settings" && <div className="scroll-area"><SettingsPage settings={settings} setSettings={setSettings} /></div>}
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio label="Mode" value={tweaks.theme}
                      options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
                      onChange={v => setTweak('theme', v)} />
          <TweakColor label="Brand accent" value={tweaks.accent}
                      options={['#6B5BD2', '#2E7D7A', '#C2643E', '#3A6FD8', '#111111']}
                      onChange={v => setTweak('accent', v)} />
        </TweakSection>
        <TweakSection title="Layout">
          <TweakRadio label="Density" value={tweaks.density}
                      options={[{ value: 'comfortable', label: 'Comfy' }, { value: 'compact', label: 'Compact' }]}
                      onChange={v => setTweak('density', v)} />
          <TweakToggle label="Show round badge" value={tweaks.showRoundBadge}
                       onChange={v => setTweak('showRoundBadge', v)} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
