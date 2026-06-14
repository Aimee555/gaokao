import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { computeStats, recordEvents, type TrackEventInput } from '../lib/analytics.js';

interface TrackBody {
  events?: TrackEventInput[];
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? '';
const MAX_EVENTS_PER_REQUEST = 50;

/** 校验统计接口口令；未配置 ADMIN_TOKEN 则整个统计功能关闭。 */
function checkAdmin(req: FastifyRequest, reply: FastifyReply): boolean {
  if (!ADMIN_TOKEN) {
    reply.code(403).send({ error: '统计功能未启用（未配置 ADMIN_TOKEN）' });
    return false;
  }
  const q = (req.query ?? {}) as { token?: string };
  const headerToken = req.headers['x-admin-token'];
  const token = q.token ?? (typeof headerToken === 'string' ? headerToken : '');
  if (token !== ADMIN_TOKEN) {
    reply.code(401).send({ error: '口令错误' });
    return false;
  }
  return true;
}

export async function analyticsRoute(app: FastifyInstance) {
  // 前端批量上报埋点事件（无需会话/验证码，刻意做得宽松以免丢数据）。
  app.post<{ Body: TrackBody }>('/track', async (req, reply) => {
    const events = req.body?.events;
    if (!Array.isArray(events) || events.length === 0) {
      return reply.code(204).send();
    }
    try {
      const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined;
      await recordEvents(events.slice(0, MAX_EVENTS_PER_REQUEST), { ip: req.ip, ua });
    } catch (err) {
      app.log.error({ err }, 'track failed');
      // 埋点失败不应影响用户，照常返回成功。
    }
    return reply.code(204).send();
  });

  // 聚合统计 JSON（口令保护）。
  app.get('/stats', async (req, reply) => {
    if (!checkAdmin(req, reply)) return;
    return computeStats();
  });

  // 自带的统计查看页（口令保护，纯静态 HTML，内联 JS 拉 /stats 渲染）。
  app.get('/stats/dashboard', async (_req, reply) => {
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return DASHBOARD_HTML;
  });
}

const DASHBOARD_HTML = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>访问统计</title>
<style>
  *{box-sizing:border-box} body{margin:0;font:14px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6f8fa;color:#1f2328}
  .wrap{max-width:960px;margin:0 auto;padding:24px}
  h1{font-size:20px;margin:0 0 16px} h2{font-size:15px;margin:24px 0 10px;color:#57606a}
  .login{display:flex;gap:8px;margin-bottom:16px}
  input{padding:8px 12px;border:1px solid #d0d7de;border-radius:8px;font-size:14px}
  button{padding:8px 16px;border:0;border-radius:8px;background:#0969da;color:#fff;cursor:pointer;font-size:14px}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}
  .card{background:#fff;border:1px solid #d0d7de;border-radius:12px;padding:16px}
  .card .n{font-size:26px;font-weight:700} .card .l{color:#57606a;font-size:12px}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #d0d7de;border-radius:12px;overflow:hidden}
  th,td{padding:8px 12px;text-align:left;border-bottom:1px solid #eaeef2;font-size:13px}
  th{background:#f6f8fa;color:#57606a;font-weight:600}
  .bar{height:22px;background:#0969da;border-radius:4px;color:#fff;font-size:12px;display:flex;align-items:center;padding:0 8px;min-width:32px}
  .frow{display:flex;align-items:center;gap:10px;margin:6px 0}
  .frow .lbl{width:96px;color:#57606a;font-size:13px;flex:none}
  .err{color:#cf222e;margin:8px 0}
  .muted{color:#8c959f;font-size:12px}
</style></head>
<body><div class="wrap">
<h1>📊 访问统计</h1>
<div class="login">
  <input id="tok" type="password" placeholder="输入管理口令(ADMIN_TOKEN)" />
  <button onclick="load()">查看</button>
</div>
<div id="err" class="err"></div>
<div id="content"></div>
</div>
<script>
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
async function load(){
  const tok=document.getElementById('tok').value.trim();
  const err=document.getElementById('err'); err.textContent='';
  if(tok) localStorage.setItem('admin_tok',tok);
  let res;
  try{ res=await fetch('../stats?token='+encodeURIComponent(tok)); }catch(e){ err.textContent='请求失败'; return; }
  if(!res.ok){ err.textContent = res.status===401?'口令错误':(res.status===403?'统计功能未启用（后端未配置 ADMIN_TOKEN）':'加载失败 '+res.status); return; }
  render(await res.json());
}
function render(d){
  const maxDay=Math.max(1,...d.daily.map(x=>x.opens));
  const html=[];
  html.push('<div class="cards">'+
    card(d.uniqueVisitors,'独立访客 UV')+card(d.pageViews,'访问次数 PV')+
    card(d.sessions,'会话数')+card(d.totalEvents,'事件总数')+'</div>');
  // 漏斗
  html.push('<h2>转化漏斗</h2>');
  d.funnel.forEach(f=>{
    html.push('<div class="frow"><span class="lbl">'+esc(f.label)+'</span>'+
      '<div class="bar" style="width:'+Math.max(f.rate,4)+'%">'+f.visitors+' 人 · '+f.rate+'%</div></div>');
  });
  // 每日
  html.push('<h2>每日访问（近30天）</h2>');
  if(d.daily.length){
    html.push('<table><tr><th>日期</th><th>访客</th><th>打开次数</th><th></th></tr>');
    d.daily.slice().reverse().forEach(x=>{
      html.push('<tr><td>'+esc(x.day)+'</td><td>'+x.visitors+'</td><td>'+x.opens+'</td>'+
        '<td><div class="bar" style="width:'+Math.round(x.opens/maxDay*100)+'%">&nbsp;</div></td></tr>');
    });
    html.push('</table>');
  } else html.push('<p class="muted">暂无数据</p>');
  // 设备 / 来源
  html.push('<h2>设备分布</h2><table><tr><th>设备</th><th>次数</th></tr>'+
    d.devices.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.count+'</td></tr>').join('')+'</table>');
  html.push('<h2>访问来源 Top10</h2><table><tr><th>来源</th><th>次数</th></tr>'+
    d.referrers.map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+x.count+'</td></tr>').join('')+'</table>');
  // 最近事件
  html.push('<h2>最近事件（近100条）</h2><table><tr><th>时间</th><th>事件</th><th>IP</th><th>设备</th><th>来源</th></tr>'+
    d.recent.map(x=>'<tr><td>'+esc(x.t.replace('T',' ').slice(0,19))+'</td><td>'+esc(x.ev)+'</td><td>'+esc(x.ip||'')+'</td><td>'+esc(x.device)+'</td><td>'+esc(x.ref)+'</td></tr>').join('')+'</table>');
  html.push('<p class="muted">生成于 '+esc(d.generatedAt)+'</p>');
  document.getElementById('content').innerHTML=html.join('');
}
function card(n,l){return '<div class="card"><div class="n">'+n+'</div><div class="l">'+esc(l)+'</div></div>'}
// 记住口令，自动加载
const saved=localStorage.getItem('admin_tok');
if(saved){document.getElementById('tok').value=saved;load();}
</script>
</body></html>`;
