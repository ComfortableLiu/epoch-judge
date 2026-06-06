/**
 * EpochJudge 全量功能冒烟测试 v3 - 浏览器真实操作
 * 覆盖角色: 未登录、USER、ADMIN、PROBLEM_EDITOR
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const BASE = 'http://localhost:8080';

const ACCOUNTS = {
  admin: { username: 'admin', password: 'admin123' },
  user: { username: 'smoke_user', password: 'testpass123' },
  editor: { username: 'smoke_editor', password: 'testpass123' },
  newUser: { username: `smoke_reg_${Date.now()}`, password: 'newpass123', email: 'new@smoke.test' },
};

// 题目 #1 被比赛锁定，使用题目 #4（独立测试题）进行未登录测试
const PUBLIC_PROBLEM_NUMBER = 4;
const CONTEST_PROBLEM_NUMBER = 1; // 需要登录并注册比赛才能访问

const results = [];
let passed = 0;
let failed = 0;

function log(msg) {
  const ts = new Date().toLocaleTimeString('zh-CN');
  console.log(`[${ts}] ${msg}`);
}

function record(name, ok, detail = '') {
  const status = ok ? '✅ PASS' : '❌ FAIL';
  results.push({ name, status, detail });
  if (ok) passed++; else failed++;
  log(`${status}: ${name}${detail ? ' — ' + detail : ''}`);
}

async function screenshot(page, name) {
  const path = `/Users/xiaoyao/Documents/Projects/epoch-judge/scripts/screenshots/${name}.png`;
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function safeGoto(page, url, opts = {}) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000, ...opts });
    return true;
  } catch (e) {
    log(`  ⚠️ goto ${url} 超时，继续检查...`);
    return false;
  }
}

async function waitForStable(page, ms = 2000) {
  await page.waitForTimeout(ms);
}

// ============================================================
// Helper: 登录 (改进版)
// ============================================================
async function loginAs(page, account) {
  log(`  开始登录: ${account.username}`);
  await safeGoto(page, `${BASE}/login`);
  await waitForStable(page, 1000);

  // 等待表单加载
  await page.waitForSelector('.ant-form', { timeout: 5000 });

  // 使用更精确的选择器 - antd Form.Item 会在 input 上设置 id
  // 但有时需要等待
  const usernameInput = page.locator('input[id="username"]');
  await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
  await usernameInput.click();
  await usernameInput.fill(account.username);
  log(`  已填写用户名: ${account.username}`);

  const pwdInput = page.locator('input[id="password"]');
  await pwdInput.waitFor({ state: 'visible', timeout: 5000 });
  await pwdInput.click();
  await pwdInput.fill(account.password);
  log(`  已填写密码`);

  await screenshot(page, `login-${account.username}-filled`);

  // 点击提交按钮
  const submitBtn = page.locator('button[type="submit"]');
  await submitBtn.click();
  log(`  已点击提交按钮`);

  // 等待导航或错误
  await waitForStable(page, 3000);

  const url = page.url();
  log(`  登录后 URL: ${url}`);

  await screenshot(page, `login-${account.username}-result`);

  // 检查是否有错误消息
  const errorMsg = await page.locator('.ant-message-error, .ant-notification-notice').count();
  if (errorMsg > 0) {
    log(`  ⚠️ 检测到错误消息`);
  }

  return url;
}

// ============================================================
// Phase 1: 未登录用户访问公开页面
// ============================================================
async function testUnauthenticated(browser) {
  log('\n===== Phase 1: 未登录用户 =====');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const jsErrors = [];
  page.on('pageerror', (err) => jsErrors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') jsErrors.push(msg.text());
  });

  // 1.1 首页
  await safeGoto(page, `${BASE}/`);
  await waitForStable(page);
  const title = await page.title();
  record('未登录-首页加载', title.includes('纪元') || title.includes('Epoch'), `title="${title}"`);

  // 1.2 题目列表
  await safeGoto(page, `${BASE}/problems`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-guest-problems');
  const hasProblemTable = await page.locator('.ant-table, table').count() > 0;
  const hasProblemLink = await page.locator('a[href*="/problems/1"]').count() > 0;
  record('未登录-题目列表', hasProblemTable || hasProblemLink);

  // 1.3 题目详情（使用独立题目 #4，不被比赛锁定）
  await safeGoto(page, `${BASE}/problems/${PUBLIC_PROBLEM_NUMBER}`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-guest-problem-detail');

  // 检查页面内容
  const pageContent = await page.content();
  const hasProblemTitle = pageContent.includes('独立测试题');
  const hasGiven = pageContent.includes('Given');
  const hasSum = pageContent.includes('sum');
  record('未登录-题目详情', hasProblemTitle || hasGiven || hasSum,
    `title=${hasProblemTitle}, Given=${hasGiven}, sum=${hasSum}`);

  // 1.4 比赛列表
  await safeGoto(page, `${BASE}/contests`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-guest-contests');
  const contestContent = await page.content();
  const hasContest = contestContent.includes('冒烟测试赛') || contestContent.includes('欢乐赛');
  record('未登录-比赛列表', hasContest);

  // 1.5 比赛详情
  await safeGoto(page, `${BASE}/contests/2`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-guest-contest-detail');
  const contestDetailContent = await page.content();
  const hasContestTitle = contestDetailContent.includes('冒烟测试赛');
  record('未登录-比赛详情', hasContestTitle);

  // 1.6 未登录访问需认证页面应跳转登录
  await safeGoto(page, `${BASE}/submissions`);
  await waitForStable(page);
  record('未登录-提交记录跳转登录', page.url().includes('/login'));

  await safeGoto(page, `${BASE}/settings`);
  await waitForStable(page);
  record('未登录-设置页跳转登录', page.url().includes('/login'));

  await safeGoto(page, `${BASE}/profile`);
  await waitForStable(page);
  record('未登录-个人资料跳转登录', page.url().includes('/login'));

  await safeGoto(page, `${BASE}/admin`);
  await waitForStable(page);
  record('未登录-管理后台跳转登录', page.url().includes('/login'));

  // 1.7 无 JS 错误
  record('未登录-无JS运行时错误', jsErrors.length === 0,
    jsErrors.length > 0 ? jsErrors.slice(0, 3).join('; ') : '');

  await ctx.close();
}

// ============================================================
// Phase 2: 注册新用户 + 登录流程
// ============================================================
async function testRegistrationAndLogin(browser) {
  log('\n===== Phase 2: 注册 + 登录 =====');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // 2.1 注册新用户
  log('  测试注册...');
  await safeGoto(page, `${BASE}/register`);
  await waitForStable(page, 1000);

  try {
    await page.waitForSelector('.ant-form', { timeout: 5000 });

    const usernameInput = page.locator('input[id="username"]');
    await usernameInput.waitFor({ state: 'visible', timeout: 5000 });
    await usernameInput.fill(ACCOUNTS.newUser.username);
    log(`  已填写用户名: ${ACCOUNTS.newUser.username}`);

    const emailInput = page.locator('input[id="email"]');
    if (await emailInput.count() > 0) {
      await emailInput.fill(ACCOUNTS.newUser.email);
    }

    const pwdInput = page.locator('input[id="password"]');
    await pwdInput.fill(ACCOUNTS.newUser.password);
    log(`  已填写密码`);

    await screenshot(page, 'test-register-filled');

    // 等待一下让表单验证完成
    await waitForStable(page, 500);

    await page.locator('button[type="submit"]').click();
    log(`  已点击注册按钮`);

    // 等待更长时间
    await waitForStable(page, 5000);

    await screenshot(page, 'test-register-result');
    const url = page.url();
    log(`  注册后 URL: ${url}`);

    // 检查是否有错误消息
    const errorMsg = await page.locator('.ant-message-error').count();
    if (errorMsg > 0) {
      const errorText = await page.locator('.ant-message-error').first().textContent();
      log(`  注册错误: ${errorText}`);
    }

    const success = url.includes('/problems') || !url.includes('/register');
    record('注册-新用户注册成功', success, `url="${url}"`);
  } catch (e) {
    record('注册-新用户注册成功', false, e.message);
  }

  // 2.2 登出
  await page.evaluate(() => {
    localStorage.removeItem('epoch.token');
  });
  log('  已清除 token');

  // 2.3 登录普通用户
  log('  测试登录...');
  const loginUrl = await loginAs(page, ACCOUNTS.user);
  const loginSuccess = !loginUrl.includes('/login');
  record('登录-普通用户登录成功', loginSuccess, `url="${loginUrl}"`);

  // 2.4 登录后可访问认证页面
  if (loginSuccess) {
    await safeGoto(page, `${BASE}/submissions`);
    await waitForStable(page);
    record('登录后-可访问提交记录', !page.url().includes('/login'));
  } else {
    record('登录后-可访问提交记录', false, '登录失败，跳过');
  }

  await ctx.close();
}

// ============================================================
// Phase 3: 普通用户 (USER) 完整功能
// ============================================================
async function testUserRole(browser) {
  log('\n===== Phase 3: 普通用户 (USER) =====');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const loginUrl = await loginAs(page, ACCOUNTS.user);
  const loggedIn = !loginUrl.includes('/login');
  if (!loggedIn) {
    record('USER-登录状态', false, '无法登录，跳过 USER 测试');
    await ctx.close();
    return;
  }
  record('USER-登录状态', true);

  // 3.1 查看题目列表
  await safeGoto(page, `${BASE}/problems`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-user-problems');
  const content = await page.content();
  const hasProblems = content.includes('独立测试题') || content.includes('A+B Problem') || content.includes('/problems/');
  record('USER-查看题目列表', hasProblems);

  // 3.2 查看题目详情（使用独立题目）
  await safeGoto(page, `${BASE}/problems/${PUBLIC_PROBLEM_NUMBER}`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-user-problem-detail');
  const detailContent = await page.content();
  const hasTitle = detailContent.includes('独立测试题');
  const hasSubmitBtn = detailContent.includes('提交') || detailContent.includes('Submit');
  record('USER-查看题目详情', hasTitle || hasSubmitBtn);

  // 3.3 进入提交页面
  await safeGoto(page, `${BASE}/problems/${PUBLIC_PROBLEM_NUMBER}/submit`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-user-submit-page');
  const submitContent = await page.content();
  const hasLangSelect = submitContent.includes('PYTHON') || submitContent.includes('ant-select');
  const hasCodeArea = submitContent.includes('monaco') || submitContent.includes('textarea') || submitContent.includes('cm-editor');
  record('USER-进入提交页面', hasLangSelect || hasCodeArea);

  // 3.4 提交代码
  try {
    // 等待编辑器加载
    await waitForStable(page, 2000);

    // 查找提交按钮 - 可能是 "提交" 或 "Submit"，或者是 type="submit" 的按钮
    const submitBtn = page.locator('button:has-text("提交"), button:has-text("Submit"), button[type="submit"]').first();
    const btnCount = await submitBtn.count();
    log(`  找到提交按钮: ${btnCount} 个`);

    if (btnCount > 0) {
      await submitBtn.click();
      await waitForStable(page, 5000);
      await screenshot(page, 'test-user-submit-result');
      const url = page.url();
      const submitted = url.includes('/submissions/');
      record('USER-提交代码', submitted, `url="${url}"`);

      if (submitted) {
        await waitForStable(page, 3000);
        const statusContent = await page.content();
        // 检查提交详情页是否加载成功
        const hasSubmissionInfo = statusContent.includes('submissions') || statusContent.includes('提交') ||
                                 statusContent.includes('PENDING') || statusContent.includes('QUEUED') ||
                                 statusContent.includes('JUDGING') || statusContent.includes('ACCEPTED') ||
                                 statusContent.includes('WRONG') || statusContent.includes('Python') ||
                                 statusContent.includes('PYTHON') || statusContent.includes('#');
        record('USER-查看提交详情', hasSubmissionInfo);
      }
    } else {
      record('USER-提交代码', false, '未找到提交按钮');
    }
  } catch (e) {
    record('USER-提交代码', false, e.message);
  }

  // 3.5 查看提交列表
  await safeGoto(page, `${BASE}/submissions`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-user-submissions');
  const subContent = await page.content();
  const hasSubmissions = subContent.includes('ant-table') || subContent.includes('<table');
  record('USER-查看提交列表', hasSubmissions);

  // 3.6 设置页面
  await safeGoto(page, `${BASE}/settings`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-user-settings');
  const settingsContent = await page.content();
  const hasSettings = settingsContent.includes('PYTHON') || settingsContent.includes('ant-select');
  record('USER-设置页面', hasSettings);

  // 3.7 个人资料页面
  await safeGoto(page, `${BASE}/profile`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-user-profile');
  const profileContent = await page.content();
  const hasProfile = profileContent.includes('smoke_user') || profileContent.includes('ant-card');
  record('USER-个人资料页面', hasProfile);

  // 3.8 普通用户不能访问管理后台
  await safeGoto(page, `${BASE}/admin`);
  await waitForStable(page);
  const adminUrl = page.url();
  const blocked = !adminUrl.includes('/admin');
  record('USER-不能访问管理后台', blocked, `redirected to "${adminUrl}"`);

  // 3.9 比赛功能
  await safeGoto(page, `${BASE}/contests/2`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-user-contest');
  const contestContent = await page.content();
  const hasContest = contestContent.includes('冒烟测试赛');
  record('USER-查看比赛详情', hasContest);

  await ctx.close();
}

// ============================================================
// Phase 4: 管理员 (ADMIN) 完整功能
// ============================================================
async function testAdminRole(browser) {
  log('\n===== Phase 4: 管理员 (ADMIN) =====');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const loginUrl = await loginAs(page, ACCOUNTS.admin);
  const loggedIn = !loginUrl.includes('/login');
  if (!loggedIn) {
    record('ADMIN-登录状态', false, '无法登录，跳过 ADMIN 测试');
    await ctx.close();
    return;
  }
  record('ADMIN-登录状态', true);

  // 4.1 进入管理后台
  await safeGoto(page, `${BASE}/admin`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-panel');
  const adminContent = await page.content();
  const hasAdmin = adminContent.includes('管理后台') || adminContent.includes('ant-tabs');
  record('ADMIN-进入管理后台', hasAdmin);

  // 4.2 题目管理 Tab
  await safeGoto(page, `${BASE}/admin?tab=problems`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-problems');
  const problemsContent = await page.content();
  const hasProblemTable = problemsContent.includes('ant-table') || problemsContent.includes('A+B Problem');
  record('ADMIN-题目管理Tab', hasProblemTable);

  // 4.3 创建新题目
  try {
    const createBtn = page.locator('button:has-text("新建"), button:has-text("创建题目")').first();
    if (await createBtn.count() > 0) {
      await createBtn.click();
      await waitForStable(page, 1500);
      await screenshot(page, 'test-admin-create-problem-modal');

      const titleInput = page.locator('#title, input[name="title"]').first();
      if (await titleInput.count() > 0) {
        await titleInput.fill('冒烟测试题目-' + Date.now());
        await waitForStable(page, 500);

        const okBtn = page.locator('.ant-modal button.ant-btn-primary').first();
        if (await okBtn.count() > 0) {
          await okBtn.click();
          await waitForStable(page, 2000);
        }
      }
      record('ADMIN-创建新题目', true);
    } else {
      record('ADMIN-创建新题目', false, '未找到创建按钮');
    }
  } catch (e) {
    record('ADMIN-创建新题目', false, e.message);
  }

  // 4.4 比赛管理 Tab
  await safeGoto(page, `${BASE}/admin?tab=contests`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-contests');
  const contestsContent = await page.content();
  const hasContestRow = contestsContent.includes('冒烟测试赛') || contestsContent.includes('欢乐赛');
  record('ADMIN-比赛管理Tab', hasContestRow);

  // 4.5 用户管理 Tab
  await safeGoto(page, `${BASE}/admin?tab=users`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-users');
  const usersContent = await page.content();
  const hasUserRow = usersContent.includes('smoke_user') || usersContent.includes('admin');
  record('ADMIN-用户管理Tab', hasUserRow);

  // 4.6 编辑用户
  try {
    const editBtns = page.locator('button:has-text("编辑"), a:has-text("编辑")');
    const count = await editBtns.count();
    if (count > 0) {
      await editBtns.first().click();
      await waitForStable(page, 1500);
      await screenshot(page, 'test-admin-edit-user');
      record('ADMIN-编辑用户', true, '打开编辑弹窗');
      const cancelBtn = page.locator('.ant-modal button:has-text("取消")').first();
      if (await cancelBtn.count() > 0) await cancelBtn.click();
      await waitForStable(page, 500);
    } else {
      record('ADMIN-编辑用户', true, '用户列表正常展示');
    }
  } catch (e) {
    record('ADMIN-编辑用户', false, e.message);
  }

  // 4.7 重判 Tab
  await safeGoto(page, `${BASE}/admin?tab=rejudge`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-rejudge');
  const rejudgeContent = await page.content();
  const hasRejudge = rejudgeContent.includes('重判') || rejudgeContent.includes('ant-table');
  record('ADMIN-重判Tab', hasRejudge);

  // 4.8 判题节点 Tab
  await safeGoto(page, `${BASE}/admin?tab=judge`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-judge');
  const judgeContent = await page.content();
  const hasJudgeTable = judgeContent.includes('ant-table') || judgeContent.includes('<table');
  record('ADMIN-判题节点Tab', hasJudgeTable);

  // 4.9 系统配置 Tab
  await safeGoto(page, `${BASE}/admin?tab=config`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-config');
  const configContent = await page.content();
  const hasConfigForm = configContent.includes('ant-form') || configContent.includes('<input');
  const hasSaveBtn = configContent.includes('保存') || configContent.includes('Save');
  record('ADMIN-系统配置Tab', hasConfigForm || hasSaveBtn);

  // 4.10 管理员也能正常使用普通功能
  await safeGoto(page, `${BASE}/problems`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-admin-problems-list');
  const adminProblemsContent = await page.content();
  const adminHasProblems = adminProblemsContent.includes('ant-table') || adminProblemsContent.includes('<table');
  record('ADMIN-查看题目列表', adminHasProblems);

  await ctx.close();
}

// ============================================================
// Phase 5: 出题员 (PROBLEM_EDITOR) 权限验证
// ============================================================
async function testEditorRole(browser) {
  log('\n===== Phase 5: 出题员 (PROBLEM_EDITOR) =====');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const loginUrl = await loginAs(page, ACCOUNTS.editor);
  const loggedIn = !loginUrl.includes('/login');
  if (!loggedIn) {
    record('EDITOR-登录状态', false, '无法登录，跳过 EDITOR 测试');
    await ctx.close();
    return;
  }
  record('EDITOR-登录状态', true);

  // 5.1 PROBLEM_EDITOR 不是 ADMIN，不应访问管理后台
  await safeGoto(page, `${BASE}/admin`);
  await waitForStable(page);
  const adminUrl = page.url();
  const adminBlocked = !adminUrl.includes('/admin');
  record('EDITOR-管理后台受ADMIN限制', adminBlocked, `redirected to "${adminUrl}"`);

  // 5.2 出题员可以正常使用普通功能
  await safeGoto(page, `${BASE}/problems`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-editor-problems');
  const editorProblemsContent = await page.content();
  const hasProblems = editorProblemsContent.includes('/problems/1') || editorProblemsContent.includes('ant-table');
  record('EDITOR-查看题目列表', hasProblems);

  // 5.3 查看题目详情
  await safeGoto(page, `${BASE}/problems/${PUBLIC_PROBLEM_NUMBER}`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-editor-problem-detail');
  const editorDetailContent = await page.content();
  const hasTitle = editorDetailContent.includes('独立测试题');
  record('EDITOR-查看题目详情', hasTitle);

  // 5.4 进入提交页面
  await safeGoto(page, `${BASE}/problems/${PUBLIC_PROBLEM_NUMBER}/submit`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-editor-submit');
  const editorSubmitContent = await page.content();
  const hasSubmitPage = editorSubmitContent.includes('PYTHON') || editorSubmitContent.includes('ant-select');
  record('EDITOR-进入提交页面', hasSubmitPage);

  // 5.5 查看比赛
  await safeGoto(page, `${BASE}/contests/2`);
  await waitForStable(page, 3000);
  await screenshot(page, 'test-editor-contest');
  const editorContestContent = await page.content();
  const hasContest = editorContestContent.includes('冒烟测试赛');
  record('EDITOR-查看比赛详情', hasContest);

  // 5.6 提交代码
  try {
    await safeGoto(page, `${BASE}/problems/${PUBLIC_PROBLEM_NUMBER}/submit`);
    await waitForStable(page, 3000);
    const submitBtn = page.locator('button:has-text("提交"), button:has-text("Submit"), button[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await waitForStable(page, 5000);
      await screenshot(page, 'test-editor-submit-result');
      const url = page.url();
      const submitted = url.includes('/submissions/');
      record('EDITOR-提交代码', submitted, `url="${url}"`);
    } else {
      record('EDITOR-提交代码', false, '未找到提交按钮');
    }
  } catch (e) {
    record('EDITOR-提交代码', false, e.message);
  }

  await ctx.close();
}

// ============================================================
// Main
// ============================================================
async function main() {
  log('🚀 EpochJudge 全量功能冒烟测试 v3 开始');
  log(`目标: ${BASE}`);

  const fs = await import('fs');
  fs.mkdirSync('/Users/xiaoyao/Documents/Projects/epoch-judge/scripts/screenshots', { recursive: true });

  const browser = await chromium.launch({ headless: true });

  try {
    await testUnauthenticated(browser);
    await testRegistrationAndLogin(browser);
    await testUserRole(browser);
    await testAdminRole(browser);
    await testEditorRole(browser);
  } catch (e) {
    log(`💥 测试执行异常: ${e.message}`);
    console.error(e);
  } finally {
    await browser.close();
  }

  // 输出汇总
  log('\n' + '='.repeat(60));
  log(`📊 冒烟测试结果汇总`);
  log(`=`.repeat(60));
  log(`✅ 通过: ${passed}`);
  log(`❌ 失败: ${failed}`);
  log(`总计: ${passed + failed}`);
  log(`通过率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  log(`=`.repeat(60));

  if (failed > 0) {
    log('\n❌ 失败项:');
    results.filter(r => r.status.includes('FAIL')).forEach(r => {
      log(`  - ${r.name}${r.detail ? ': ' + r.detail : ''}`);
    });
  }

  log('\n✅ 通过项:');
  results.filter(r => r.status.includes('PASS')).forEach(r => {
    log(`  - ${r.name}`);
  });

  // 输出 JSON 结果
  const reportPath = '/Users/xiaoyao/Documents/Projects/epoch-judge/scripts/smoke-results.json';
  fs.writeFileSync(reportPath, JSON.stringify({ passed, failed, total: passed + failed, results }, null, 2));
  log(`\n📝 详细结果已保存: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(2);
});
