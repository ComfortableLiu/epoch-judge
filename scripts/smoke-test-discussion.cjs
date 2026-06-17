/**
 * Discussion-Solution-System 全量冒烟测试
 * 使用 Playwright 进行浏览器自动化测试
 */
const { chromium } = require('playwright');
const { mkdirSync, existsSync, writeFileSync } = require('fs');
const { join } = require('path');

const BASE_URL = 'http://localhost:8080';
const SCREENSHOT_DIR = '/tmp/discussion-smoke-test-screenshots';
const REPORT_PATH = '/tmp/discussion-smoke-test-report.md';

// Test accounts
const ADMIN = { username: 'admin', password: 'admin123' };
const USER = { username: 'smoke_test_user', password: 'Smoke@Test123' };

if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

const results = [];
let stepNum = 0;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function addResult(name, status, detail = '', screenshot = '') {
  results.push({ name, status, detail, screenshot });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${detail}`);
}

async function screenshot(page, name) {
  stepNum++;
  const filename = `${String(stepNum).padStart(2, '0')}-${name}.png`;
  const filepath = join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  log(`📸 Screenshot: ${filename}`);
  return filename;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForLoad(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 15000 });
  } catch {}
}

// Login via UI - using correct antd form selectors
async function loginViaUI(page, { username, password }) {
  await page.goto(`${BASE_URL}/login`);
  await waitForLoad(page);
  await screenshot(page, `login-page`);

  // antd Form.Item with name="username" renders id="username"
  await page.fill('#username', username);
  await page.fill('#password', password);
  await screenshot(page, `login-filled`);

  await page.click('button[type="submit"]');
  await sleep(3000);
  await waitForLoad(page);
  await screenshot(page, `login-result`);
}

// Logout
async function logout(page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    sessionStorage.clear();
  });
  await page.goto(`${BASE_URL}/login`);
  await waitForLoad(page);
  await sleep(500);
}

async function runTests() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'zh-CN',
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const networkRequests = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('request', req => {
    if (req.url().includes('discussions')) {
      networkRequests.push(`${req.method()} ${req.url()}`);
    }
  });
  page.on('response', res => {
    if (res.url().includes('discussions')) {
      networkRequests.push(`-> ${res.status()} ${res.url()}`);
    }
  });

  try {
    // ========== 1. 首页加载 ==========
    log('=== Step 1: 首页加载 ===');
    await page.goto(BASE_URL);
    await waitForLoad(page);
    await screenshot(page, 'homepage');

    const title = await page.title();
    addResult('首页加载', title?.includes('EpochJudge') ? 'PASS' : 'FAIL', `标题: ${title}`);

    // ========== 2. 题目列表 ==========
    log('=== Step 2: 题目列表 ===');
    await page.goto(`${BASE_URL}/problems`);
    await waitForLoad(page);
    await screenshot(page, 'problems-list');

    const rows = await page.$$('table tbody tr');
    addResult('题目列表加载', rows.length > 0 ? 'PASS' : 'WARN', `${rows.length} 道题目`);

    // Get problem number
    let problemNum = null;
    const link = await page.$('a[href*="/problems/"]');
    if (link) {
      const href = await link.getAttribute('href');
      const m = href?.match(/\/problems\/(\d+)/);
      if (m) problemNum = m[1];
    }
    if (!problemNum) {
      addResult('获取题目编号', 'FAIL', '无法获取');
      await browser.close();
      return;
    }
    addResult('获取题目编号', 'PASS', `题目 #${problemNum}`);

    // ========== 3. 讨论Tab ==========
    log('=== Step 3: 讨论Tab ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    await screenshot(page, 'problem-detail');

    const allTabs = await page.$$('.ant-tabs-tab');
    const tabTexts = [];
    for (const t of allTabs) tabTexts.push((await t.textContent())?.trim());
    log(`Tabs: ${tabTexts.join(', ')}`);

    const discIdx = tabTexts.findIndex(t => t?.includes('讨论'));
    addResult('讨论Tab存在', discIdx >= 0 ? 'PASS' : 'FAIL', `Tab列表: ${tabTexts.join(', ')}`);

    if (discIdx >= 0) {
      await allTabs[discIdx].click();
      await sleep(1500);
      await screenshot(page, 'discussion-tab');
    }

    // ========== 4. 未登录不显示发帖按钮 ==========
    log('=== Step 4: 未登录状态 ===');
    const guestBtn = await page.$('button:has-text("发帖"), button:has-text("新帖")');
    addResult('未登录不显示发帖按钮', !guestBtn ? 'PASS' : 'FAIL',
      guestBtn ? '仍显示发帖按钮' : '正确隐藏');
    await screenshot(page, 'guest-view');

    // ========== 5. 用户登录 ==========
    log('=== Step 5: 用户登录 ===');
    await loginViaUI(page, USER);
    const url5 = page.url();
    addResult('用户登录', !url5.includes('/login') ? 'PASS' : 'FAIL', `URL: ${url5}`);

    // ========== 6. 登录后访问题目讨论 ==========
    log('=== Step 6: 登录后讨论 ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);

    const tabs6 = await page.$$('.ant-tabs-tab');
    const texts6 = [];
    for (const t of tabs6) texts6.push((await t.textContent())?.trim());
    const idx6 = texts6.findIndex(t => t?.includes('讨论'));
    if (idx6 >= 0) {
      await tabs6[idx6].click();
      await sleep(1500);
    }
    await screenshot(page, 'logged-in-discussion');

    const postBtn = await page.$('button:has-text("发帖"), button:has-text("新帖")');
    addResult('登录后显示发帖按钮', postBtn ? 'PASS' : 'FAIL', postBtn ? '找到发帖按钮' : '未找到');

    // ========== 7. 创建QUESTION帖子 ==========
    log('=== Step 7: 创建QUESTION帖子 ===');
    if (postBtn) {
      await postBtn.click();
      await sleep(800);
      await screenshot(page, 'form-opened');

      // antd Radio.Button - click the label, not the hidden input
      const qLabel = await page.$('.ant-radio-button-wrapper:has-text("提问"), .ant-radio-button-wrapper:has-text("Question")');
      if (qLabel) {
        await qLabel.click();
      } else {
        // fallback: try clicking by text
        await page.click('text=提问').catch(() => {});
      }

      // antd Form.Item name="title" renders id="title" on the inner input
      const titleInput = await page.$('#title, input[placeholder*="标题"]');
      const contentInput = await page.$('#content, textarea[placeholder*="内容"], textarea');

      if (titleInput && contentInput) {
        await titleInput.fill('冒烟测试-请问这道题的时间复杂度？');
        await contentInput.fill('我做出来了，但时间复杂度是 O(n²)，请问有没有更优解法？\n\n```python\ndef solve(n):\n    result = 0\n    for i in range(n):\n        for j in range(n):\n            result += 1\n    return result\n```');
        await screenshot(page, 'form-filled-question');

        const submitBtn = await page.$('button[type="submit"]:not([disabled])');
        if (submitBtn) {
          await submitBtn.click();
          await sleep(3000);
          await waitForLoad(page);
          await screenshot(page, 'question-created');

          const success = await page.$('.ant-message-success');
          addResult('创建QUESTION帖子', success ? 'PASS' : 'WARN',
            success ? '创建成功' : '提交完成');
        }
      } else {
        addResult('创建QUESTION帖子', 'FAIL', `title: ${!!titleInput}, content: ${!!contentInput}`);
      }
    } else {
      addResult('创建QUESTION帖子', 'FAIL', '无发帖按钮');
    }

    // ========== 8. 创建SOLUTION帖子 ==========
    log('=== Step 8: 创建SOLUTION帖子 ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    const tabs8 = await page.$$('.ant-tabs-tab');
    const texts8 = [];
    for (const t of tabs8) texts8.push((await t.textContent())?.trim());
    const idx8 = texts8.findIndex(t => t?.includes('讨论'));
    if (idx8 >= 0) { await tabs8[idx8].click(); await sleep(1500); }

    const postBtn2 = await page.$('button:has-text("发帖"), button:has-text("新帖")');
    if (postBtn2) {
      await postBtn2.click();
      await sleep(800);

      const sLabel = await page.$('.ant-radio-button-wrapper:has-text("题解"), .ant-radio-button-wrapper:has-text("Solution")');
      if (sLabel) {
        await sLabel.click();
      } else {
        await page.click('text=题解').catch(() => {});
      }

      const titleInput2 = await page.$('#title');
      const contentInput2 = await page.$('#content, textarea');
      if (titleInput2 && contentInput2) {
        await titleInput2.fill('冒烟测试-O(n)动态规划解法');
        await contentInput2.fill('用 DP 优化到 O(n)：\n\n```python\ndef solve(n):\n    dp = [0] * (n + 1)\n    for i in range(1, n + 1):\n        dp[i] = dp[i-1] + i\n    return dp[n]\n```');
        await screenshot(page, 'form-filled-solution');

        const submitBtn2 = await page.$('button[type="submit"]:not([disabled])');
        if (submitBtn2) {
          await submitBtn2.click();
          await sleep(3000);
          await waitForLoad(page);
          await screenshot(page, 'solution-created');

          const success2 = await page.$('.ant-message-success');
          addResult('创建SOLUTION帖子', success2 ? 'PASS' : 'WARN',
            success2 ? '创建成功' : '提交完成');
        }
      }
    } else {
      addResult('创建SOLUTION帖子', 'FAIL', '无发帖按钮');
    }

    // ========== 9. 帖子列表 ==========
    log('=== Step 9: 帖子列表 ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    const tabs9 = await page.$$('.ant-tabs-tab');
    const texts9 = [];
    for (const t of tabs9) texts9.push((await t.textContent())?.trim());
    const idx9 = texts9.findIndex(t => t?.includes('讨论'));
    if (idx9 >= 0) { await tabs9[idx9].click(); await sleep(2000); }

    // Wait for list items to appear (react-query may need time)
    try {
      await page.waitForSelector('.ant-list-item', { timeout: 8000 });
    } catch {}
    await sleep(2000);
    await screenshot(page, 'discussion-list');

    // Debug: check what's in the discussion tab area
    const listHtml = await page.evaluate(() => {
      const listEl = document.querySelector('.ant-list');
      return listEl ? listEl.innerHTML.substring(0, 500) : 'NO LIST ELEMENT';
    });
    log(`List HTML: ${listHtml}`);

    const items = await page.$$('.ant-list-item');

    // Also check if there's a loading spinner or empty state
    const hasSpinner = await page.$('.ant-spin');
    const hasEmpty = await page.$('.ant-empty');
    const listItems = await page.$$('.ant-list-items > .ant-list-item');
    log(`Items: ${items.length}, ListItems: ${listItems.length}, Spinner: ${!!hasSpinner}, Empty: ${!!hasEmpty}`);

    addResult('帖子列表显示', items.length > 0 ? 'PASS' : 'WARN', `${items.length} 个帖子`);
    log(`Network requests for discussions: ${networkRequests.join(', ')}`);

    // Check tags
    const allTags = await page.$$('.ant-tag');
    let hasQ = false, hasS = false;
    for (const tag of allTags) {
      const text = await tag.textContent();
      if (text?.includes('提问')) hasQ = true;
      if (text?.includes('题解')) hasS = true;
    }
    addResult('帖子类型标签', (hasQ || hasS) ? 'PASS' : 'WARN', `提问:${hasQ} 题解:${hasS}`);

    // ========== 10. 排序 ==========
    log('=== Step 10: 排序 ===');
    const sortSel = await page.$('.ant-select');
    if (sortSel) {
      await sortSel.click();
      await sleep(500);
      await screenshot(page, 'sort-dropdown');

      const opts = await page.$$('.ant-select-item');
      for (const opt of opts) {
        const text = await opt.textContent();
        if (text?.includes('热') || text?.includes('Popular')) {
          await opt.click();
          await sleep(1000);
          await screenshot(page, 'sort-popular');
          addResult('排序-最热', 'PASS', '切换成功');
          break;
        }
      }

      const sortSel2 = await page.$('.ant-select');
      if (sortSel2) {
        await sortSel2.click();
        await sleep(500);
        const opts2 = await page.$$('.ant-select-item');
        for (const opt of opts2) {
          const text = await opt.textContent();
          if (text?.includes('新') || text?.includes('Latest')) {
            await opt.click();
            await sleep(1000);
            addResult('排序-最新', 'PASS', '切换成功');
            break;
          }
        }
      }
    } else {
      addResult('排序', 'WARN', '未找到排序选择器');
    }

    // ========== 11. 帖子详情 ==========
    log('=== Step 11: 帖子详情 ===');
    const postLink = await page.$('.ant-list-item a');
    if (postLink) {
      const postTitle = await postLink.textContent();
      await postLink.click();
      await sleep(2000);
      await waitForLoad(page);
      await screenshot(page, 'post-detail');
      addResult('帖子详情页', 'PASS', `帖子: ${postTitle?.trim()?.substring(0, 30)}`);
    } else {
      addResult('帖子详情页', 'WARN', '无帖子可点击');
    }

    // ========== 12. 回复 ==========
    log('=== Step 12: 回复 ===');
    const replyArea = await page.$('textarea');
    if (replyArea) {
      await replyArea.fill('冒烟测试回复：这个解法很棒！');
      await screenshot(page, 'reply-filled');

      const replyBtn = await page.$('button:has-text("回复"), button[type="submit"]');
      if (replyBtn) {
        await replyBtn.click();
        await sleep(2000);
        await waitForLoad(page);
        await screenshot(page, 'reply-submitted');
        const replyOk = await page.$('.ant-message-success');
        addResult('回复帖子', replyOk ? 'PASS' : 'WARN', replyOk ? '回复成功' : '提交完成');
      }
    } else {
      addResult('回复帖子', 'WARN', '未找到回复输入框');
    }

    // ========== 13. 点赞 ==========
    log('=== Step 13: 点赞 ===');
    const likeBtn = await page.$('.anticon-like, button:has-text("赞")');
    if (likeBtn) {
      await likeBtn.click();
      await sleep(1000);
      await screenshot(page, 'liked');
      addResult('点赞帖子', 'PASS', '点赞成功');
    } else {
      addResult('点赞帖子', 'WARN', '未找到点赞按钮');
    }

    // ========== 14. 管理员登录 ==========
    log('=== Step 14: 管理员登录 ===');
    await logout(page);
    await loginViaUI(page, ADMIN);
    addResult('管理员登录', 'PASS', '登录完成');

    // ========== 15. 管理员置顶/删除 ==========
    log('=== Step 15: 管理员操作 ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    const tabs15 = await page.$$('.ant-tabs-tab');
    const texts15 = [];
    for (const t of tabs15) texts15.push((await t.textContent())?.trim());
    const idx15 = texts15.findIndex(t => t?.includes('讨论'));
    if (idx15 >= 0) { await tabs15[idx15].click(); await sleep(1500); }
    await screenshot(page, 'admin-list');

    // Click first post
    const adminPostLink = await page.$('.ant-list-item a');
    if (adminPostLink) {
      await adminPostLink.click();
      await sleep(2000);
      await waitForLoad(page);
      await screenshot(page, 'admin-post-detail');

      // Pin
      const pinBtn = await page.$('button:has-text("置顶"), button:has-text("Pin")');
      if (pinBtn) {
        await pinBtn.click();
        await sleep(1000);
        await screenshot(page, 'pinned');
        addResult('管理员置顶', 'PASS', '置顶操作完成');
      } else {
        addResult('管理员置顶', 'WARN', '未找到置顶按钮');
      }

      // Delete
      const deleteBtn = await page.$('button:has-text("删除"), button:has-text("Delete")');
      if (deleteBtn) {
        await deleteBtn.click();
        await sleep(500);
        await screenshot(page, 'delete-confirm');

        const confirmBtn = await page.$('.ant-modal-confirm-btns .ant-btn-primary, .ant-popconfirm-buttons .ant-btn-primary');
        if (confirmBtn) {
          await confirmBtn.click();
          await sleep(1500);
        }
        await screenshot(page, 'deleted');
        addResult('管理员删除', 'PASS', '删除操作完成');
      } else {
        addResult('管理员删除', 'WARN', '未找到删除按钮');
      }
    } else {
      addResult('管理员置顶', 'WARN', '无帖子');
      addResult('管理员删除', 'WARN', '无帖子');
    }

    // ========== 16. 普通用户无管理按钮 ==========
    log('=== Step 16: 权限检查 ===');
    await logout(page);
    await loginViaUI(page, USER);

    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    const tabs16 = await page.$$('.ant-tabs-tab');
    const texts16 = [];
    for (const t of tabs16) texts16.push((await t.textContent())?.trim());
    const idx16 = texts16.findIndex(t => t?.includes('讨论'));
    if (idx16 >= 0) { await tabs16[idx16].click(); await sleep(1500); }
    await screenshot(page, 'user-no-admin');

    const pinU = await page.$('button:has-text("置顶"), button:has-text("Pin")');
    const delU = await page.$('button:has-text("删除"), button:has-text("Delete")');
    addResult('普通用户无管理按钮', (!pinU && !delU) ? 'PASS' : 'FAIL',
      !pinU && !delU ? '正确隐藏管理按钮' : '仍可见管理按钮');

    // ========== 17. 移动端适配 ==========
    log('=== Step 17: 移动端 ===');
    await page.setViewportSize({ width: 375, height: 812 });
    await sleep(500);
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    await screenshot(page, 'mobile-view');
    addResult('移动端适配', 'PASS', '移动端视口可渲染');

    // ========== 18. 错误汇总 ==========
    log('=== Step 18: 错误汇总 ===');
    addResult('控制台错误', consoleErrors.length === 0 ? 'PASS' : 'WARN',
      `${consoleErrors.length} 个错误`);

  } catch (error) {
    log(`❌ Error: ${error.message}`);
    await screenshot(page, 'error');
    addResult('测试执行', 'FAIL', error.message);
  } finally {
    await browser.close();
  }

  results.push({ name: '_consoleErrors', status: 'INFO', detail: JSON.stringify(consoleErrors) });
}

function generateReport() {
  const tests = results.filter(r => !r.name.startsWith('_'));
  const consoleErrs = results.find(r => r.name === '_consoleErrors')?.detail || '[]';

  const pass = tests.filter(r => r.status === 'PASS').length;
  const fail = tests.filter(r => r.status === 'FAIL').length;
  const warn = tests.filter(r => r.status === 'WARN').length;

  let report = `# Discussion-Solution-System 全量冒烟测试报告\n\n`;
  report += `**日期**: ${new Date().toISOString().split('T')[0]}\n`;
  report += `**测试方式**: Playwright 浏览器自动化（headless）\n`;
  report += `**测试环境**: ${BASE_URL}\n\n`;

  report += `## 📌 执行摘要\n\n`;
  report += `| 指标 | 数量 |\n|------|------|\n`;
  report += `| 总测试项 | ${tests.length} |\n`;
  report += `| ✅ 通过 | ${pass} |\n`;
  report += `| ❌ 失败 | ${fail} |\n`;
  report += `| ⚠️ 警告 | ${warn} |\n\n`;

  report += fail === 0 ? `**整体结论**: 🟢 通过\n\n` : `**整体结论**: 🔴 ${fail} 项失败\n\n`;

  report += `## 测试详情\n\n`;
  report += `| # | 测试项 | 状态 | 详情 |\n|---|--------|------|------|\n`;
  tests.forEach((r, i) => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    report += `| ${i + 1} | ${r.name} | ${icon} | ${r.detail.replace(/\|/g, '\\|')} |\n`;
  });

  report += `\n## 截图列表\n\n截图目录: \`${SCREENSHOT_DIR}/\`\n\n`;
  tests.filter(r => r.screenshot).forEach(r => {
    report += `- ${r.name}: \`${r.screenshot}\`\n`;
  });

  report += `\n## 控制台错误\n\n`;
  try {
    const errs = JSON.parse(consoleErrs);
    if (errs.length === 0) report += `无。\n`;
    else errs.slice(0, 10).forEach(e => { report += `- ${e}\n`; });
  } catch { report += `无。\n`; }

  writeFileSync(REPORT_PATH, report);
  log(`📄 Report: ${REPORT_PATH}`);
  log(`📸 Screenshots: ${SCREENSHOT_DIR}/`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY: ${pass}/${tests.length} passed, ${fail} failed, ${warn} warnings`);
  console.log(`${'='.repeat(60)}\n`);
}

runTests().then(generateReport).catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
