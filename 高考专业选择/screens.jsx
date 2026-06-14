/* ============================================================
   screens.jsx — Home · Subject · Quiz · Industry  (window)
   v2: single linear flow (no mode select); + subject screen
   ============================================================ */
const { useState, useEffect } = React;

/* ---------- App bar ---------- */
function AppBar({ onBack, title, right }) {
  return (
    <div className="appbar">
      {onBack ? (
        <button className="iconbtn" onClick={onBack} aria-label="返回">
          <Icon name="arrow-left" size={18} />
        </button>
      ) : <span style={{ width: 36 }} />}
      <span className="title" style={{ flex: 1, textAlign: "center" }}>{title}</span>
      {right || <span style={{ width: 36 }} />}
    </div>
  );
}

/* ================= HOME ================= */
function HomeScreen({ onStart }) {
  const META = window.APP_META;
  const values = [
    { icon: "list-checks", title: "30 道题，测出你的兴趣类型", sub: "基于霍兰德职业兴趣模型" },
    { icon: "flag",        title: "对照「十五五」22 个战略方向", sub: "看懂国家重点产业趋势" },
    { icon: "sparkles",    title: "AI 给你一份诚实的选专业建议", sub: "含就业现实提示，不画大饼" },
  ];
  return (
    <div className="screen">
      {/* hero */}
      <div style={{
        background: "linear-gradient(160deg, #0B1E45 0%, #14306e 65%, #1b3f8f 100%)",
        color: "#fff", padding: "34px 22px 30px", position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", right: -50, top: -40, width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 35%, rgba(6,182,212,.5), transparent 65%)", filter: "blur(6px)",
        }} />
        <div style={{ position: "relative" }} className="rise">
          <div className="chip" style={{ background: "rgba(255,255,255,.12)", color: "#cfe0ff", height: 26 }}>
            <Icon name="compass" size={13} /> 国家战略 · 专业匹配
          </div>
          <h1 style={{ margin: "16px 0 10px", font: "700 32px/1.16 var(--font-cn)", letterSpacing: "-.01em" }}>
            趋势选专业
          </h1>
          <p style={{ margin: 0, font: "500 15px/1.55 var(--font-cn)", color: "rgba(255,255,255,.8)", maxWidth: 290 }}>
            跟着国家战略，选对你的专业。<br />兴趣 × 趋势，给你最匹配的方向。
          </p>
        </div>
      </div>

      {/* value points */}
      <div className="section-pad" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 22 }}>
        {values.map((v, i) => (
          <div key={i} className="rise" style={{
            display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
            background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--r-md)",
            boxShadow: "var(--sh-1)", animationDelay: `${0.05 * i}s`,
          }}>
            <span style={{
              width: 44, height: 44, flex: "none", borderRadius: 13,
              background: i === 2 ? "var(--c-accent-wash)" : "var(--c-blue-wash)",
              color: i === 2 ? "var(--c-accent-600)" : "var(--c-blue)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}><Icon name={v.icon} size={23} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 14.5px/1.3 var(--font-cn)", color: "var(--t-title)" }}>{v.title}</div>
              <div style={{ font: "500 12px/1.4 var(--font-cn)", color: "var(--t-2nd)", marginTop: 3 }}>{v.sub}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "auto" }} />

      {/* CTA */}
      <div className="section-pad" style={{ paddingTop: 8, paddingBottom: 10 }}>
        <button className="btn btn--accent btn--block" style={{ height: 54, fontSize: 17 }} onClick={onStart}>
          开始探索 <Icon name="arrow-right" size={19} />
        </button>
        <div style={{ textAlign: "center", marginTop: 10, font: "500 12px/1 var(--font-cn)", color: "var(--t-2nd)" }}>
          全程约 6–8 分钟 · 无需注册
        </div>
      </div>

      {/* footer */}
      <div style={{ padding: "16px 20px 22px", borderTop: "1px solid var(--border)", background: "var(--g-2)" }}>
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 8 }}>
          <Icon name="book-marked" size={14} color="var(--t-2nd)" style={{ marginTop: 1 }} />
          <span style={{ font: "500 11px/1.5 var(--font-cn)", color: "var(--t-2nd)" }}>{META.sources}</span>
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginBottom: 8 }}>
          <Icon name="info" size={14} color="var(--t-2nd)" style={{ marginTop: 1 }} />
          <span style={{ font: "500 11px/1.5 var(--font-cn)", color: "var(--t-2nd)" }}>{META.disclaimer}</span>
        </div>
        <div style={{ font: "500 11px/1 var(--font-cn)", color: "var(--t-dis)", paddingLeft: 21 }}>{META.updated}</div>
      </div>
    </div>
  );
}

/* ================= SUBJECT ================= */
function SubjectScreen({ onPick, onBack }) {
  const { SUBJECTS } = window.APP_DATA;
  return (
    <div className="screen">
      <AppBar onBack={onBack} title="首选科目" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "8px 22px 120px", gap: 30 }}>
        <div className="rise" style={{ textAlign: "center" }}>
          <h2 style={{ font: "700 23px/1.35 var(--font-cn)", color: "var(--t-title)", margin: 0 }}>
            你的首选科目是？
          </h2>
          <p style={{ font: "500 13.5px/1.5 var(--font-cn)", color: "var(--t-2nd)", margin: "10px auto 0", maxWidth: 260 }}>
            用于过滤你可以报考的专业范围，点击即进入下一步。
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {SUBJECTS.map((s, i) => {
            const isPhys = s.id === "physics";
            return (
              <button key={s.id} onClick={() => onPick(s.id)} className="rise" style={{
                textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", gap: 16,
                padding: "22px 20px", borderRadius: "var(--r-lg)", animationDelay: `${0.06 * i}s`,
                border: "1.5px solid var(--border-2)", background: "#fff", boxShadow: "var(--sh-2)",
              }}>
                <span style={{
                  width: 56, height: 56, flex: "none", borderRadius: 16,
                  background: isPhys ? "var(--c-blue-wash)" : "var(--c-accent-wash)",
                  color: isPhys ? "var(--c-blue)" : "var(--c-accent-600)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}><Icon name={s.icon} size={30} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "700 20px/1.2 var(--font-cn)", color: "var(--t-title)" }}>{s.name}</div>
                  <div style={{ font: "500 12.5px/1.4 var(--font-cn)", color: "var(--t-body)", marginTop: 5 }}>{s.desc}</div>
                </div>
                <Icon name="chevron-right" size={22} color="var(--t-2nd)" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= QUIZ ================= */
function QuizScreen({ index, total, question, onAnswer, onBack }) {
  const [picked, setPicked] = useState(null);
  useEffect(() => { setPicked(null); }, [index]);
  const pct = Math.round((index / total) * 100);

  const opts = [
    { v: "like",    icon: "thumbs-up",  label: "喜欢", tone: "blue" },
    { v: "neutral", icon: "minus",      label: "一般", tone: "grey" },
    { v: "dislike", icon: "thumbs-down",label: "不喜欢", tone: "grey" },
  ];
  function choose(v) {
    if (picked) return;
    setPicked(v);
    setTimeout(() => onAnswer(v), 230);
  }
  return (
    <div className="screen">
      <AppBar onBack={onBack} title="兴趣测评"
        right={<span className="num" style={{ font: "600 13px/1 var(--font-num)", color: "var(--t-2nd)", paddingRight: 4 }}>{index + 1} / {total}</span>} />
      <div style={{ padding: "0 16px" }}>
        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "16px 24px 8px" }}>
        <div key={index} className="rise" style={{ textAlign: "center" }}>
          <div style={{ font: "600 12px/1 var(--font-cn)", color: "var(--c-blue)", letterSpacing: ".08em", marginBottom: 16 }}>
            第 {index + 1} 题
          </div>
          <h2 style={{ font: "700 24px/1.45 var(--font-cn)", color: "var(--t-title)", margin: 0, textWrap: "pretty" }}>
            {question.t}
          </h2>
        </div>
      </div>

      <div style={{ padding: "8px 18px 26px", display: "flex", flexDirection: "column", gap: 12 }}>
        {opts.map(o => {
          const active = picked === o.v;
          const isBlue = o.tone === "blue";
          return (
            <button key={o.v} onClick={() => choose(o.v)} style={{
              display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
              height: 60, padding: "0 22px", borderRadius: "var(--r-md)",
              border: "1.5px solid " + (active ? (isBlue ? "var(--c-blue)" : "var(--g-7)") : "var(--border-2)"),
              background: active ? (isBlue ? "var(--c-blue-wash)" : "var(--g-3)") : "#fff",
              boxShadow: active ? "none" : "var(--sh-1)",
              transition: "all .15s", transform: active ? "scale(.98)" : "none",
            }}>
              <span style={{
                width: 38, height: 38, flex: "none", borderRadius: "var(--r-full)",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: isBlue ? "var(--c-blue-wash)" : "var(--g-3)",
                color: isBlue ? "var(--c-blue)" : "var(--t-body)",
              }}><Icon name={o.icon} size={20} /></span>
              <span style={{ font: "600 17px/1 var(--font-cn)", color: "var(--t-title)", whiteSpace: "nowrap" }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= INDUSTRY ================= */
function IndustryScreen({ selected, onToggle, onContinue, onBack }) {
  const { INDUSTRIES } = window.APP_DATA;
  const MAX = 3;
  const full = selected.length >= MAX;
  const groups = [
    { key: "strategic",  label: "战略性新兴产业", badge: null,                              items: INDUSTRIES.filter(i => i.group === "strategic") },
    { key: "future",     label: "未来产业",       badge: { cls: "badge-future", icon: "zap", text: "未来产业" }, items: INDUSTRIES.filter(i => i.group === "future") },
    { key: "humanities", label: "人文社科战略",   badge: { cls: "badge-human", icon: "book-open", text: "文科友好" }, items: INDUSTRIES.filter(i => i.group === "humanities") },
  ];
  return (
    <div className="screen">
      <AppBar onBack={onBack} title="选择感兴趣的产业" />
      <div className="section-pad" style={{ paddingBottom: 110 }}>
        <p className="rise" style={{ font: "500 14px/1.55 var(--font-cn)", color: "var(--t-body)", margin: "0 0 4px" }}>
          以下是国家「十五五」规划的重点方向，<b style={{ color: "var(--t-title)" }}>选出你感兴趣的（1–3 个）</b>。
        </p>

        {groups.map(g => (
          <div key={g.key} style={{ marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ font: "600 12px/1 var(--font-cn)", color: "var(--t-2nd)", letterSpacing: ".04em", whiteSpace: "nowrap" }}>{g.label}</span>
              {g.badge && <span className={g.badge.cls}><Icon name={g.badge.icon} size={10} />{g.badge.text}</span>}
              <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {g.items.map(it => {
                const on = selected.includes(it.id);
                const dim = full && !on;
                const accent = g.key === "humanities";
                return (
                  <button key={it.id} disabled={dim} onClick={() => onToggle(it.id)} style={{
                    position: "relative", textAlign: "left", cursor: dim ? "not-allowed" : "pointer",
                    padding: "13px 12px", borderRadius: "var(--r-md)", minHeight: 96,
                    border: "1.5px solid " + (on ? "var(--c-blue)" : "var(--border-2)"),
                    background: on ? "var(--c-blue-wash)" : "#fff",
                    opacity: dim ? 0.42 : 1, boxShadow: on ? "none" : "var(--sh-1)",
                    transition: "all .15s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span style={{
                        width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                        background: on ? "rgba(37,99,235,.14)"
                          : (g.key === "future" ? "var(--c-cyan-wash)" : accent ? "var(--c-accent-wash)" : "var(--g-3)"),
                        color: on ? "var(--c-blue)"
                          : (g.key === "future" ? "var(--c-cyan-ink)" : accent ? "var(--c-accent-600)" : "var(--t-body)"),
                      }}><Icon name={it.icon} size={19} /></span>
                      {on && <Icon name="check-circle-2" size={18} color="var(--c-blue)" />}
                    </div>
                    <div style={{ font: "700 14px/1.2 var(--font-cn)", color: "var(--t-title)", marginTop: 10 }}>{it.name}</div>
                    <div style={{ font: "500 11px/1.4 var(--font-cn)", color: "var(--t-2nd)", marginTop: 3 }}>{it.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* sticky CTA */}
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 18px 18px",
        background: "linear-gradient(180deg, rgba(248,249,253,0), var(--g-2) 36%)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ font: "600 13px/1.3 var(--font-cn)", color: "var(--t-body)", flex: "none", whiteSpace: "nowrap" }}>
          已选 <span className="num" style={{ color: "var(--c-blue)", fontWeight: 800 }}>{selected.length}</span>/3
        </div>
        <button className="btn btn--accent" style={{ flex: 1 }} disabled={selected.length === 0} onClick={onContinue}>
          查看推荐 <Icon name="arrow-right" size={17} />
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { AppBar, HomeScreen, SubjectScreen, QuizScreen, IndustryScreen });
