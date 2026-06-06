#!/usr/bin/env node
/**
 * EpochJudge 全量功能冒烟测试 (Playwright)
 * 覆盖角色：USER / PROBLEM_EDITOR / ADMIN / 未登录访客
 */
import { chromium } from '/Users/xiaoyao/.workbuddy/binaries/node/workspace/node_modules/playwright/index.mjs';

const BASE = 'http://localhost:8080';
const API  = 'http://localhost:3000/api/v1';
const ts = Date.now();

const USERS = {
  admin:    { username: 'admin',        password: 'admin123' },
  editor:   { username: 'smoke_editor', password: 'Smoke@123456' },
  user:     { username: 'smoke_user',   password: 'Smoke@123456' },
};

let results = [];
let passed = 0, failed = 0, skipped = 0;

function log(tag, msg) {
  console.log(`[${new Date().toLocaleTimeString('zh-CN')}] ${tag.padEnd(6)} ${msg}`);
}
function record(name, status, detail = '') {
  results.push({ name, status, detail });
  if (status === 'PASS') { passed++; log('✅', name); }
  else if (status === 'FAIL') { failed++; log('❌', `${name} — ${detail}`); }
  else { skipped++; log('⏭️', `${name} — ${detail}`); }
}
async function shot(page, name) {
  await page.screenshot({ path: `scripts/screenshots/${name.replace(/[^a-zA-Z0-9_-]/g,'_')}.png` }).catch(()=>{});
}
async function api(method, path, body, token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const r = await fetch(`${API}${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, data: await r.json().catch(() => null) };
}
async function clearAuth(page) {
  await page.evaluate(() => localStorage.clear());
}
async function uiLogin(page, username, password) {
  await clearAuth(page);
  await page.goto(`${BASE}/login`);
  await page.waitForTimeout(2000);
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(3000);
}

// ── setup ──
async function setup() {
  log('🔧', '准备测试用户...');
  const { data } = await api('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  if (!data?.accessToken) { log('⚠️', 'Admin 登录失败'); return; }
  const t = data.accessToken;
  log('✅', 'Admin API 登录成功');

  // Clean up old smoke users
  const { data: users } = await api('GET', '/users', null, t);
  if (Array.isArray(users)) {
    for (const u of users) {
      if (u.username === 'smoke_user' || u.username === 'smoke_editor') {
        await api('DELETE', `/users/${u.id}`, null, t);
      }
    }
  }

  await api('POST', '/users', { username: USERS.editor.username, password: USERS.editor.password, role: 'PROBLEM_EDITOR' }, t);
  await api('POST', '/auth/register', { username: USERS.user.username, password: USERS.user.password });

  // Verify
  for (const [role, u] of Object.entries(USERS)) {
    const lr = await api('POST', '/auth/login', { username: u.username, password: u.password });
    log('  ', `${role}: ${lr.data?.accessToken ? '✓' : lr.data?.message}`);
  }
}

// ── Suite 1: 访客 ──
async function s1_guest(p) {
  log('📋', '=== 1: 访客 ===');
  try { await p.goto(BASE); await p.waitForTimeout(2000); await shot(p,'01-home'); await record('访客-首页','PASS'); }
  catch(e){ await record('访客-首页','FAIL',e.message); }

  try { await p.goto(`${BASE}/problems`); await p.waitForTimeout(2000); await shot(p,'02-problems'); await record('访客-题目列表','PASS'); }
  catch(e){ await record('访客-题目列表','FAIL',e.message); }

  try { await p.goto(`${BASE}/problems/1`); await p.waitForTimeout(2000); await shot(p,'03-problem-detail'); await record('访客-题目详情','PASS'); }
  catch(e){ await record('访客-题目详情','FAIL',e.message); }

  try { await p.goto(`${BASE}/contests`); await p.waitForTimeout(2000); await shot(p,'04-contests'); await record('访客-比赛列表','PASS'); }
  catch(e){ await record('访客-比赛列表','FAIL',e.message); }

  for (const [n, path] of [['提交页','/problems/1/submit'],['提交记录','/submissions'],['管理后台','/admin'],['设置页','/settings'],['个人主页','/profile']]) {
    try {
      await p.goto(`${BASE}${path}`); await p.waitForTimeout(2000);
      await record(`访客-${n}重定向`, p.url().includes('login') ? 'PASS' : 'FAIL', p.url());
    } catch(e){ await record(`访客-${n}重定向`,'FAIL',e.message); }
  }
}

// ── Suite 2: 注册 ──
async function s2_register(p) {
  log('📋', '=== 2: 注册 ===');
  try {
    await clearAuth(p);
    await p.goto(`${BASE}/register`); await p.waitForTimeout(2000);
    await p.locator('#username').fill(`smoke_reg_${ts}`);
    await p.locator('#password').fill('Test@123456');
    await shot(p,'05-register');
    await p.locator('button[type="submit"]').click();
    await p.waitForTimeout(3000);
    await shot(p,'06-register-done');
    await record('注册-新用户', !p.url().includes('register') ? 'PASS' : 'FAIL', p.url());
  } catch(e){ await record('注册-新用户','FAIL',e.message); }
}

// ── Suite 3: USER ──
async function s3_user(p) {
  log('📋', '=== 3: USER ===');
  await uiLogin(p, USERS.user.username, USERS.user.password);
  await shot(p,'07-user-login');
  if (p.url().includes('login')) { await record('用户-登录','FAIL',p.url()); return; }
  await record('用户-登录','PASS');

  for (const [n,path] of [['题目列表','/problems'],['比赛列表','/contests'],['提交记录','/submissions'],['设置页','/settings'],['个人主页','/profile']]) {
    try { await p.goto(`${BASE}${path}`); await p.waitForTimeout(2000); await shot(p,`08-user-${n}`); await record(`用户-${n}`,'PASS'); }
    catch(e){ await record(`用户-${n}`,'FAIL',e.message); }
  }

  try { await p.goto(`${BASE}/problems/1`); await p.waitForTimeout(3000); await shot(p,'09-user-detail'); await record('用户-题目详情','PASS'); }
  catch(e){ await record('用户-题目详情','FAIL',e.message); }

  try {
    await p.goto(`${BASE}/problems/1/submit`); await p.waitForTimeout(3000); await shot(p,'10-user-submit');
    await record('用户-提交页','PASS');
  } catch(e){ await record('用户-提交页','FAIL',e.message); }

  try { await p.goto(`${BASE}/admin`); await p.waitForTimeout(2000);
    // AuthGuard redirects non-admin logged-in users to / (not /login)
    await record('用户-管理后台被拒', !p.url().includes('/admin') ? 'PASS' : 'FAIL', p.url());
  } catch(e){ await record('用户-管理后台被拒','FAIL',e.message); }
}

// ── Suite 4: PROBLEM_EDITOR ──
async function s4_editor(p) {
  log('📋', '=== 4: PROBLEM_EDITOR ===');
  await uiLogin(p, USERS.editor.username, USERS.editor.password);
  await shot(p,'11-editor-login');
  if (p.url().includes('login')) { await record('编辑员-登录','FAIL',p.url()); return; }
  await record('编辑员-登录','PASS');

  try { await p.goto(`${BASE}/problems`); await p.waitForTimeout(2000); await shot(p,'12-editor-problems'); await record('编辑员-题目列表','PASS'); }
  catch(e){ await record('编辑员-题目列表','FAIL',e.message); }

  try { await p.goto(`${BASE}/admin`); await p.waitForTimeout(2000);
    // AuthGuard redirects non-admin logged-in users to / (not /login)
    await record('编辑员-管理后台被拒', !p.url().includes('/admin') ? 'PASS' : 'FAIL', p.url());
  } catch(e){ await record('编辑员-管理后台被拒','FAIL',e.message); }

  // API
  const { data } = await api('POST', '/auth/login', { username: USERS.editor.username, password: USERS.editor.password });
  if (data?.accessToken) {
    const t = data.accessToken;
    const pr = await api('GET', '/problems?all=1', null, t);
    await record('编辑员API-题目列表', pr.status===200?'PASS':'FAIL', `${pr.status}`);
    const cr = await api('POST', '/problems', { number:`SMOKE-${ts}`, titleLocales:{zh:'冒烟题',en:'Smoke'}, statementLocales:{zh:'测试',en:'Test'}, difficulty:'EASY' }, t);
    await record('编辑员API-创建题目', cr.status!==403?'PASS':'FAIL', `${cr.status}`);
    const ar = await api('GET', '/admin/judge-nodes', null, t);
    await record('编辑员API-管理接口403', ar.status===403?'PASS':'FAIL', `${ar.status}`);
  }
}

// ── Suite 5: ADMIN ──
async function s5_admin(p) {
  log('📋', '=== 5: ADMIN ===');
  await uiLogin(p, USERS.admin.username, USERS.admin.password);
  await shot(p,'13-admin-login');
  if (p.url().includes('login')) { await record('管理员-登录','FAIL',p.url()); return; }
  await record('管理员-登录','PASS');

  try { await p.goto(`${BASE}/admin`); await p.waitForTimeout(3000); await shot(p,'14-admin-panel');
    await record('管理员-管理后台', (await p.textContent('body'))?.includes('管理后台') ? 'PASS' : 'FAIL');
  } catch(e){ await record('管理员-管理后台','FAIL',e.message); }

  for (const tab of ['users','problems','contests','rejudge','judge','config']) {
    const labels = {users:'用户',problems:'题目',contests:'比赛',rejudge:'重判',judge:'判题',config:'配置'};
    try { await p.goto(`${BASE}/admin?tab=${tab}`); await p.waitForTimeout(2000); await shot(p,`15-${tab}`);
      await record(`管理员-${labels[tab]}`,'PASS');
    } catch(e){ await record(`管理员-${labels[tab]}`,'FAIL',e.message); }
  }

  const { data } = await api('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  if (data?.accessToken) {
    const t = data.accessToken;
    await record('管理员API-判题节点', (await api('GET','/admin/judge-nodes',null,t)).status===200?'PASS':'FAIL');
    await record('管理员API-系统配置', (await api('GET','/admin/config',null,t)).status===200?'PASS':'FAIL');
    await record('管理员API-用户列表', (await api('GET','/users',null,t)).status===200?'PASS':'FAIL');
  }
}

// ── Suite 6: 代码提交 ──
async function s6_submit(p) {
  log('📋', '=== 6: 代码提交 ===');
  await uiLogin(p, USERS.user.username, USERS.user.password);
  const { data: ld } = await api('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  const { data: problems } = await api('GET', '/problems', null, ld?.accessToken);
  if (!Array.isArray(problems) || !problems.length) { await record('提交流程','SKIP','无题目'); return; }
  
  try {
    await p.goto(`${BASE}/problems/${problems[0].number}/submit`);
    await p.waitForTimeout(3000);
    await shot(p,'16-submit');
    await record('提交流程-提交页','PASS');
  } catch(e){ await record('提交流程-提交页','FAIL',e.message); }
}

// ── Suite 7: 比赛 ──
async function s7_contests(p) {
  log('📋', '=== 7: 比赛 ===');
  for (const role of ['user','admin']) {
    try {
      await uiLogin(p, USERS[role].username, USERS[role].password);
      await p.goto(`${BASE}/contests`); await p.waitForTimeout(2000);
      await shot(p,`17-contests-${role}`);
      await record(`比赛-${role}`,'PASS');
    } catch(e){ await record(`比赛-${role}`,'FAIL',e.message); }
  }
}

// ── Suite 8: 导航 ──
async function s8_nav(p) {
  log('📋', '=== 8: 导航 ===');
  await uiLogin(p, USERS.user.username, USERS.user.password);
  for (const [n,path] of [['题目','/problems'],['比赛','/contests'],['提交记录','/submissions']]) {
    try { await p.goto(`${BASE}${path}`); await p.waitForTimeout(2000);
      await record(`导航-${n}`, p.url().includes(path)?'PASS':'FAIL');
    } catch(e){ await record(`导航-${n}`,'FAIL',e.message); }
  }
}

// ── Suite 9: 异常 ──
async function s9_errors(p) {
  log('📋', '=== 9: 异常路径 ===');
  try { await p.goto(`${BASE}/problems/99999`); await p.waitForTimeout(3000); await shot(p,'18-404');
    await record('异常-不存在题目','PASS','无崩溃');
  } catch(e){ await record('异常-不存在题目','FAIL',e.message); }

  try {
    await clearAuth(p);
    await p.goto(`${BASE}/login`); await p.waitForTimeout(1000);
    await p.locator('#username').fill('fake_xyz');
    await p.locator('#password').fill('wrong');
    await p.locator('button[type="submit"]').click();
    await p.waitForTimeout(2000);
    await shot(p,'19-bad-login');
    await record('异常-错误密码', p.url().includes('login')?'PASS':'FAIL');
  } catch(e){ await record('异常-错误密码','FAIL',e.message); }
}

// ── Suite 10: 响应式 ──
async function s10_responsive(p) {
  log('📋', '=== 10: 响应式 ===');
  try { await p.setViewportSize({width:375,height:812}); await p.goto(BASE); await p.waitForTimeout(2000);
    await shot(p,'20-mobile'); await record('响应式-移动端','PASS');
  } catch(e){ await record('响应式-移动端','FAIL',e.message); }
  try { await p.setViewportSize({width:768,height:1024}); await p.goto(`${BASE}/problems`); await p.waitForTimeout(2000);
    await shot(p,'21-tablet'); await record('响应式-平板','PASS');
  } catch(e){ await record('响应式-平板','FAIL',e.message); }
  await p.setViewportSize({width:1280,height:720});
}

// ── Main ──
async function main() {
  log('🚀', `EpochJudge 冒烟测试 — ${new Date().toLocaleString('zh-CN')}`);
  (await import('fs')).mkdirSync('scripts/screenshots', { recursive: true });
  await setup();

  const browser = await chromium.launch({ headless: false, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport:{width:1280,height:720}, locale:'zh-CN' });
  const page = await ctx.newPage();

  try {
    await s1_guest(page);
    await s2_register(page);
    await s3_user(page);
    await s4_editor(page);
    await s5_admin(page);
    await s6_submit(page);
    await s7_contests(page);
    await s8_nav(page);
    await s9_errors(page);
    await s10_responsive(page);
  } catch (e) { log('💥', `中断: ${e.message}`); }

  await browser.close();

  const total = passed + failed + skipped;
  console.log('\n' + '='.repeat(60));
  console.log(`📊 结果: ✅${passed} ❌${failed} ⏭️${skipped} / ${total}`);
  console.log('='.repeat(60));
  for (const r of results) {
    const i = r.status==='PASS'?'✅':r.status==='FAIL'?'❌':'⏭️';
    console.log(`  ${i} ${r.name}${r.detail?` (${r.detail})`:''}`);
  }
  const f = results.filter(r=>r.status==='FAIL');
  if (f.length) { console.log('\n❌ 失败:'); f.forEach(x=>console.log(`  - ${x.name}: ${x.detail}`)); }
  console.log(`\n📸 scripts/screenshots/ | 🏁 完成`);
  process.exit(f.length ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
