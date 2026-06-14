/* ============================================================
   result.jsx — Result summary · MajorCard · AIAdvicePanel
   (exported to window). Uses window.claude.complete for AI.
   ============================================================ */
const { useState, useEffect, useRef } = React;

/* ---- typewriter that reveals text on mount ---- */
function Typewriter({ text, speed = 16, onTick, onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(i);
      onTick && onTick();
      if (i >= text.length) { clearInterval(id); onDone && onDone(); }
    }, speed);
    return () => clearInterval(id);
  }, [text]);
  const done = n >= text.length;
  return (
    <span>
      {text.slice(0, n)}
      {!done && <span style={{
        display: "inline-block", width: 7, height: 15, background: "var(--c-blue)",
        marginLeft: 1, borderRadius: 1, verticalAlign: "-2px", animation: "blink 1s steps(1) infinite",
      }} />}
    </span>
  );
}

/* ---- one expandable major card ---- */
function MajorCard({ rank, item, pct, matchedInds, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [empOpen, setEmpOpen] = useState(false);
  const { INDUSTRIES, EMP } = window.APP_DATA;
  const indName = id => (INDUSTRIES.find(x => x.id === id) || {}).name || id;
  const emp = EMP[item.emp] || EMP.stable;
  return (
    <div style={{
      background: "#fff", borderRadius: "var(--r-md)", border: "1px solid var(--border)",
      boxShadow: "var(--sh-1)", overflow: "hidden",
    }}>
      <div style={{ display: "flex", gap: 12, padding: "14px 14px 12px", alignItems: "flex-start" }}>
        <div style={{
          width: 24, height: 24, flex: "none", borderRadius: 8, marginTop: 2,
          background: rank === 1 ? "var(--c-accent)" : "var(--c-navy)", color: "#fff",
          font: "800 13px/1 var(--font-num)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>{rank}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ font: "700 16px/1.25 var(--font-cn)", color: "var(--t-title)" }}>{item.name}</span>
            {item.isNew && <span className="badge-new"><Icon name="sparkle" size={11} />新专业</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ font: "500 12px/1 var(--font-cn)", color: "var(--t-2nd)" }}>{item.cat}</span>
            <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--g-6)" }} />
            <span className={"emp-tag emp-tag--" + emp.tone} onClick={() => setEmpOpen(o => !o)}>
              <span className="dot" />{emp.label}<Icon name="info" size={11} />
            </span>
          </div>
          {empOpen && (
            <div className="rise" style={{
              marginTop: 8, font: "500 11.5px/1.5 var(--font-cn)", color: "var(--t-body)",
              background: "var(--g-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "8px 10px",
            }}>{emp.note}</div>
          )}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>
            {matchedInds.slice(0, 3).map(id => (
              <span key={id} className="chip chip--cyan" style={{ height: 22 }}>{indName(id)}</span>
            ))}
          </div>
        </div>
        <MatchRing pct={pct} />
      </div>

      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", border: "none", borderTop: "1px solid var(--border)", cursor: "pointer",
        background: open ? "var(--c-blue-wash2)" : "transparent", color: "var(--c-blue)",
        font: "600 13px/1 var(--font-cn)", padding: "11px 14px",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
      }}>
        {open ? "收起" : "推荐理由 · 政策依据 · 就业方向 · 现实提示"}
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
      </button>

      {open && (
        <div className="rise" style={{ padding: "4px 14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Detail icon="target" color="var(--c-accent-600)" label="为什么推荐给你" text={item.why} />
          <Detail icon="landmark" color="var(--c-blue)" label="政策依据" text={item.policy} />
          <div>
            <DetailHead icon="briefcase" color="var(--c-cyan-ink)" label="典型就业方向" />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {item.jobs.map((j, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, font: "500 13px/1.4 var(--font-cn)", color: "var(--t-body)" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--c-cyan)", flex: "none" }} />{j}
                </div>
              ))}
            </div>
          </div>
          {/* honest reality tip */}
          <div style={{
            display: "flex", gap: 9, alignItems: "flex-start",
            background: "var(--c-accent-wash)", borderRadius: "var(--r-sm)", padding: "11px 12px",
          }}>
            <Icon name="message-circle-warning" size={16} color="var(--c-accent-600)" style={{ marginTop: 1 }} />
            <div>
              <div style={{ font: "700 12px/1 var(--font-cn)", color: "var(--c-accent-600)", marginBottom: 5 }}>就业现实提示</div>
              <p style={{ margin: 0, font: "500 12.5px/1.55 var(--font-cn)", color: "var(--t-body)", textWrap: "pretty" }}>{item.tip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function DetailHead({ icon, color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <Icon name={icon} size={15} color={color} />
      <span style={{ font: "700 12.5px/1 var(--font-cn)", color: "var(--t-title)", whiteSpace: "nowrap" }}>{label}</span>
    </div>
  );
}
function Detail({ icon, color, label, text }) {
  return (
    <div>
      <DetailHead icon={icon} color={color} label={label} />
      <p style={{ margin: "7px 0 0", font: "500 13px/1.55 var(--font-cn)", color: "var(--t-body)", textWrap: "pretty" }}>{text}</p>
    </div>
  );
}

/* ---- AI advice + follow-up chat ---- */
function AIAdvicePanel({ contextPrompt, scrollRef }) {
  const [chat, setChat] = useState([]);     // {role, content} for display (assistant + visible user)
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [input, setInput] = useState("");
  const apiRef = useRef([]);                 // full message history for the model
  const quicks = ["这些专业哪个就业最好？", "我数学不好适合吗？", "还有别的方向推荐吗？"];

  function scroll() { if (scrollRef && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }

  async function ask(userText, isFirst) {
    setError(null); setBusy(true);
    const sys = "你是一位务实、温暖、专业的高考志愿规划顾问，面向 17-19 岁考生和家长。语言通俗、鼓励但不浮夸，不堆砌套话。每次回答控制在 250 字以内。请直接输出纯文本，不要使用任何 Markdown 符号（不要出现 #、*、-、> 等），需要分点时用换行加“· ”开头。";
    if (isFirst) {
      apiRef.current = [{ role: "user", content: sys + "\n\n" + contextPrompt }];
    } else {
      apiRef.current.push({ role: "user", content: userText });
      setChat(c => [...c, { role: "user", content: userText }]);
    }
    setTimeout(scroll, 30);
    try {
      const reply = await window.claude.complete({ messages: apiRef.current });
      apiRef.current.push({ role: "assistant", content: reply });
      setChat(c => [...c, { role: "assistant", content: reply, animate: true }]);
    } catch (e) {
      setError("AI 暂时没能给出建议，请稍后重试。");
    } finally {
      setBusy(false);
      setTimeout(scroll, 40);
    }
  }

  if (!started) {
    return (
      <button className="btn btn--accent btn--block" style={{ height: 52, marginTop: 4 }}
        onClick={() => { setStarted(true); ask("", true); }}>
        <Icon name="sparkles" size={18} /> 让 AI 给我一份个性化建议
      </button>
    );
  }

  return (
    <div style={{
      background: "#fff", borderRadius: "var(--r-md)", border: "1px solid var(--border)",
      boxShadow: "var(--sh-1)", padding: "16px 14px", display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{
          width: 30, height: 30, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, var(--c-blue), var(--c-cyan))", color: "#fff",
        }}><Icon name="sparkles" size={17} /></span>
        <span style={{ font: "700 14px/1 var(--font-cn)", color: "var(--t-title)" }}>AI 个性化建议</span>
      </div>

      {chat.map((m, i) => (
        m.role === "assistant" ? (
          <div key={i} style={{
            font: "500 13.5px/1.65 var(--font-cn)", color: "var(--t-body)", whiteSpace: "pre-wrap",
            background: "var(--c-blue-wash2)", borderRadius: "var(--r-sm)", padding: "12px 13px",
            borderLeft: "3px solid var(--c-blue)", textWrap: "pretty",
          }}>
            {m.animate ? <Typewriter text={m.content} onTick={scroll} /> : m.content}
          </div>
        ) : (
          <div key={i} style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              font: "500 13px/1.5 var(--font-cn)", color: "#fff", maxWidth: "82%",
              background: "var(--c-blue)", borderRadius: "14px 14px 4px 14px", padding: "9px 12px",
            }}>{m.content}</div>
          </div>
        )
      ))}

      {busy && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--t-2nd)", font: "500 13px/1 var(--font-cn)" }}>
          <span className="ai-dots"><i /><i /><i /></span> AI 思考中…
        </div>
      )}

      {error && (
        <div style={{
          background: "var(--c-accent-wash)", borderRadius: "var(--r-sm)", padding: "10px 12px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <span style={{ font: "500 12.5px/1.4 var(--font-cn)", color: "var(--c-accent-600)" }}>{error}</span>
          <button className="btn btn--accent" style={{ height: 32, padding: "0 14px", fontSize: 13 }}
            onClick={() => { const last = chat[chat.length - 1]; ask(last && last.role === "user" ? last.content : "", chat.filter(c=>c.role==="assistant").length === 0); }}>
            <Icon name="rotate-cw" size={14} /> 重试
          </button>
        </div>
      )}

      {/* follow-up: only after first advice arrives */}
      {!busy && chat.some(c => c.role === "assistant") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 2 }}>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {quicks.map(q => (
              <button key={q} onClick={() => ask(q, false)} style={{
                cursor: "pointer", font: "500 12px/1.3 var(--font-cn)", color: "var(--c-blue-700)",
                background: "var(--c-blue-wash)", border: "1px solid var(--c-blue-soft)",
                borderRadius: "var(--r-full)", padding: "7px 12px", textAlign: "left",
              }}>{q}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && input.trim()) { ask(input.trim(), false); setInput(""); } }}
              placeholder="继续追问，比如：转专业难不难？" style={{
                flex: 1, height: 42, padding: "0 14px", borderRadius: "var(--r-full)",
                border: "1px solid var(--border-2)", font: "500 13px/1 var(--font-cn)",
                color: "var(--t-title)", outline: "none", background: "var(--g-2)",
              }} />
            <button className="iconbtn" style={{ width: 42, height: 42, background: "var(--c-blue)", border: "none", color: "#fff" }}
              disabled={!input.trim()} onClick={() => { ask(input.trim(), false); setInput(""); }}>
              <Icon name="arrow-up" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---- collapsed greyed section: physics-required majors (history students) ---- */
function PhysicsLockedSection({ items }) {
  const [open, setOpen] = useState(false);
  if (!items || !items.length) return null;
  return (
    <div style={{
      borderRadius: "var(--r-md)", border: "1px dashed var(--border-2)", background: "var(--g-2)", overflow: "hidden",
    }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", border: "none", background: "transparent", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 9, padding: "13px 14px",
      }}>
        <Icon name="lock" size={15} color="var(--t-2nd)" />
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ font: "700 13px/1.3 var(--font-cn)", color: "var(--t-body)" }}>这些专业需要首选物理</div>
          <div style={{ font: "500 11px/1.4 var(--font-cn)", color: "var(--t-2nd)", marginTop: 3 }}>了解一下你选历史类的机会成本</div>
        </div>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} color="var(--t-2nd)" />
      </button>
      {open && (
        <div className="rise" style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((t, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, opacity: 0.62,
              background: "#fff", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: "11px 12px",
            }}>
              <Icon name="atom" size={16} color="var(--t-2nd)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: "700 13.5px/1.2 var(--font-cn)", color: "var(--t-body)" }}>{t.item.name}</div>
                <div style={{ font: "500 11px/1 var(--font-cn)", color: "var(--t-2nd)", marginTop: 3 }}>{t.item.cat} · 需首选物理</div>
              </div>
              <span className="chip chip--grey" style={{ height: 22 }}>无法报考</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- result screen ---- */
function ResultScreen({ result, onRestart, onReselect, scrollRef }) {
  const { describeCode, SUBJECTS, INDUSTRIES } = window.APP_DATA;
  const indName = id => (INDUSTRIES.find(x => x.id === id) || {}).name || id;
  const subj = SUBJECTS.find(s => s.id === result.subject);
  const showInterest = !!result.hollandCode;
  const showIndustry = result.industries && result.industries.length > 0;

  // build AI context
  let ctx = "请基于以下高考生的测评与选择，生成一段 200-300 字的个性化选专业建议（报告体，先点明特质，再说明匹配逻辑，最后给 1-2 条诚实的行动提醒）。\n";
  if (subj) ctx += `首选科目：${subj.name}。\n`;
  if (showInterest) ctx += `兴趣类型（霍兰德）：${describeCode(result.hollandCode)}。\n`;
  if (showIndustry) ctx += `关注的国家战略产业：${result.industries.map(indName).join("、")}。\n`;
  ctx += `系统推荐的 Top 专业：${result.top.map(t => t.item.name).join("、")}。`;

  return (
    <div className="screen" ref={scrollRef}>
      <AppBar onBack={onReselect} title="你的专业推荐"
        right={<button className="iconbtn" onClick={onRestart} aria-label="重新开始"><Icon name="rotate-cw" size={17} /></button>} />

      {/* summary */}
      <div className="rise" style={{
        margin: "14px 16px 0", padding: "16px", borderRadius: "var(--r-md)",
        background: "linear-gradient(135deg, #0B1E45, #18336e)", color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ font: "600 11px/1 var(--font-cn)", color: "rgba(255,255,255,.6)", letterSpacing: ".06em", whiteSpace: "nowrap" }}>你的画像</span>
          {subj && (
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
              font: "600 11px/1 var(--font-cn)", color: "#fff",
              background: "rgba(255,255,255,.14)", borderRadius: "var(--r-full)", padding: "5px 10px",
            }}><Icon name={subj.icon} size={12} color="var(--c-cyan)" />{subj.name}</span>
          )}
        </div>
        {showInterest && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: showIndustry ? 12 : 0 }}>
            <Icon name="compass" size={16} color="var(--c-cyan)" />
            <span style={{ font: "500 13px/1.4 var(--font-cn)", color: "rgba(255,255,255,.78)", whiteSpace: "nowrap" }}>兴趣类型</span>
            <span style={{ font: "700 14px/1.3 var(--font-cn)" }}>{describeCode(result.hollandCode)}</span>
          </div>
        )}
        {showIndustry && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon name="flag" size={16} color="var(--c-cyan)" style={{ marginTop: 3 }} />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {result.industries.map(id => (
                <span key={id} style={{
                  font: "600 12px/1 var(--font-cn)", color: "#fff", whiteSpace: "nowrap",
                  background: "rgba(255,255,255,.14)", borderRadius: "var(--r-full)", padding: "5px 10px",
                }}>{indName(id)}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* top 5 */}
      <div className="section-pad" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 18 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ font: "700 17px/1 var(--font-cn)", color: "var(--t-title)" }}>Top 5 推荐专业</span>
          <span style={{ font: "500 12px/1 var(--font-cn)", color: "var(--t-2nd)" }}>按匹配度排序</span>
        </div>
        {result.top.map((t, i) => (
          <MajorCard key={t.item.name} rank={i + 1} item={t.item} pct={t.pct} matchedInds={t.matchedInds} defaultOpen={i === 0} />
        ))}

        {/* history students: physics-locked opportunity cost */}
        <PhysicsLockedSection items={result.lockedPhysics} />

        <AIAdvicePanel contextPrompt={ctx} scrollRef={scrollRef} />

        {/* bottom actions */}
        <div style={{ display: "flex", gap: 10, marginTop: 6, marginBottom: 8 }}>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onRestart}>
            <Icon name="rotate-cw" size={16} /> 重新测评
          </button>
          <button className="btn btn--ghost" style={{ flex: 1, height: 46 }} onClick={onReselect}>
            <Icon name="flag" size={16} /> 重选方向
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Typewriter, MajorCard, AIAdvicePanel, PhysicsLockedSection, ResultScreen });
