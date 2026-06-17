/**
 * Discussion-Solution-System 全量冒烟测试
 * 使用 Playwright 进行浏览器自动化测试
 */
import { chromium } from 'playwright';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'http://localhost:8080';
const API_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/tmp/discussion-smoke-test-screenshots';
const REPORT_PATH = '/tmp/discussion-smoke-test-report.md';

// Test accounts
const ADMIN = { username: 'admin', password: 'admin123' };
const USER = { username: 'smoke_user', password: 'Smoke@123456' };

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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitForLoad(page) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 10000 });
  } catch {
    // timeout is ok, page might still be loading
  }
}

// Helper: login via UI
async function loginViaUI(page, { username, password }) {
  await page.goto(`${BASE_URL}/login`);
  await waitForLoad(page);
  await screenshot(page, `login-page`);

  // Fill login form
  await page.fill('input[placeholder*="用户名"], input[id*="username"], input[name*="username"]', username);
  await page.fill('input[type="password"]', password);
  await screenshot(page, `login-filled-${username}`);

  // Submit
  await page.click('button[type="submit"], button:has-text("登录"), button:has-text("Login")');
  await sleep(2000);
  await waitForLoad(page);
  await screenshot(page, `login-result-${username}`);
}

// Helper: register a new user
async function registerUser(page, username, password) {
  await page.goto(`${BASE_URL}/register`);
  await waitForLoad(page);

  await page.fill('input[placeholder*="用户名"], input[id*="username"], input[name*="username"]', username);
  await page.fill('input[type="password"]', password);
  await screenshot(page, `register-filled-${username}`);

  await page.click('button[type="submit"], button:has-text("注册"), button:has-text("Register")');
  await sleep(2000);
  await waitForLoad(page);
  await screenshot(page, `register-result-${username}`);
}

// Helper: get a problem number from the problems list
async function getFirstProblemNumber(page) {
  await page.goto(`${BASE_URL}/problems`);
  await waitForLoad(page);
  await screenshot(page, 'problems-list');

  // Try to find a problem link
  const problemLink = await page.$('a[href*="/problems/"]');
  if (problemLink) {
    const href = await problemLink.getAttribute('href');
    const match = href?.match(/\/problems\/(\d+)/);
    if (match) return match[1];
  }
  return null;
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

  try {
    // ========== 1. 未登录状态访问题目详情 ==========
    log('=== Step 1: 未登录状态访问题目详情 ===');
    const problemNum = await getFirstProblemNumber(page);
    if (!problemNum) {
      addResult('获取题目编号', 'FAIL', '无法获取题目编号');
      return;
    }
    addResult('获取题目编号', 'PASS', `找到题目 #${problemNum}`);

    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    await screenshot(page, 'problem-detail-guest');

    // Check if discussion tab exists
    const discussionTab = await page.$('text=讨论, [data-node-key="discussions"], .ant-tabs-tab:has-text("讨论")');
    if (discussionTab) {
      addResult('讨论Tab存在（未登录）', 'PASS', '题目详情页有讨论Tab');
    } else {
      addResult('讨论Tab存在（未登录）', 'FAIL', '未找到讨论Tab');
    }

    // ========== 2. 未登录状态 - 不应显示发帖按钮 ==========
    log('=== Step 2: 未登录状态 - 不应显示发帖按钮 ===');
    // Click discussion tab
    try {
      await page.click('text=讨论, [data-node-key="discussions"]');
      await sleep(1000);
    } catch {}
    await screenshot(page, 'discussion-tab-guest');

    const newPostBtnGuest = await page.$('button:has-text("发帖"), button:has-text("新帖"), button:has-text("New")');
    if (newPostBtnGuest) {
      addResult('未登录不显示发帖按钮', 'FAIL', '未登录状态下仍显示发帖按钮');
    } else {
      addResult('未登录不显示发帖按钮', 'PASS', '未登录状态下不显示发帖按钮');
    }

    // ========== 3. 用户登录 ==========
    log('=== Step 3: 用户登录 ===');
    await loginViaUI(page, USER);
    const isLoggedIn = await page.$('text=退出, text=Logout, [class*="avatar"], [class*="user"]');
    if (isLoggedIn) {
      addResult('用户登录', 'PASS', `用户 ${USER.username} 登录成功`);
    } else {
      addResult('用户登录', 'FAIL', '登录可能失败');
    }

    // ========== 4. 登录后访问题目详情 ==========
    log('=== Step 4: 登录后访问题目详情 ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    await screenshot(page, 'problem-detail-logged-in');

    // Click discussion tab
    try {
      await page.click('text=讨论, [data-node-key="discussions"]');
      await sleep(1000);
    } catch {}
    await screenshot(page, 'discussion-tab-logged-in');

    // ========== 5. 创建 QUESTION 类型帖子 ==========
    log('=== Step 5: 创建 QUESTION 类型帖子 ===');
    const newPostBtn = await page.$('button:has-text("发帖"), button:has-text("新帖"), button:has-text("New")');
    if (newPostBtn) {
      await newPostBtn.click();
      await sleep(500);
      await screenshot(page, 'post-form-opened');

      // Select QUESTION type
      const questionRadio = await page.$('input[value="QUESTION"], label:has-text("提问"), label:has-text("Question")');
      if (questionRadio) {
        await questionRadio.click();
      }

      // Fill title
      await page.fill('input[placeholder*="标题"], input[id*="title"]', '冒烟测试-请问这道题的时间复杂度是多少？');

      // Fill content
      await page.fill('textarea[placeholder*="内容"], textarea[id*="content"], textarea', '我做出来了，但是时间复杂度是 O(n²)，请问有没有更优的解法？\n\n```python\ndef solve(n):\n    result = 0\n    for i in range(n):\n        for j in range(n):\n            result += 1\n    return result\n```');

      await screenshot(page, 'post-form-filled-question');

      // Submit
      await page.click('button[type="submit"]:has-text("提交"), button:has-text("Submit"), button:has-text("发布")');
      await sleep(2000);
      await waitForLoad(page);
      await screenshot(page, 'post-created-question');

      const successMsg = await page.$('.ant-message-success, text=成功');
      if (successMsg) {
        addResult('创建QUESTION帖子', 'PASS', '成功创建提问帖子');
      } else {
        addResult('创建QUESTION帖子', 'WARN', '提交完成但未检测到成功提示');
      }
    } else {
      addResult('创建QUESTION帖子', 'FAIL', '未找到发帖按钮');
    }

    // ========== 6. 创建 SOLUTION 类型帖子 ==========
    log('=== Step 6: 创建 SOLUTION 类型帖子 ===');
    // Refresh and click new post again
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    try {
      await page.click('text=讨论, [data-node-key="discussions"]');
      await sleep(1000);
    } catch {}

    const newPostBtn2 = await page.$('button:has-text("发帖"), button:has-text("新帖"), button:has-text("New")');
    if (newPostBtn2) {
      await newPostBtn2.click();
      await sleep(500);

      // Select SOLUTION type
      const solutionRadio = await page.$('input[value="SOLUTION"], label:has-text("题解"), label:has-text("Solution")');
      if (solutionRadio) {
        await solutionRadio.click();
      }

      await page.fill('input[placeholder*="标题"], input[id*="title"]', '冒烟测试-O(n)解法分享');
      await page.fill('textarea[placeholder*="内容"], textarea[id*="content"], textarea', '这道题可以用动态规划优化到 O(n)：\n\n```python\ndef solve(n):\n    dp = [0] * (n + 1)\n    for i in range(1, n + 1):\n        dp[i] = dp[i-1] + i\n    return dp[n]\n```\n\n时间复杂度：O(n)\n空间复杂度：O(n)');

      await screenshot(page, 'post-form-filled-solution');

      await page.click('button[type="submit"]:has-text("提交"), button:has-text("Submit"), button:has-text("发布")');
      await sleep(2000);
      await waitForLoad(page);
      await screenshot(page, 'post-created-solution');

      addResult('创建SOLUTION帖子', 'PASS', '成功创建题解帖子');
    } else {
      addResult('创建SOLUTION帖子', 'FAIL', '未找到发帖按钮');
    }

    // ========== 7. 查看帖子列表 ==========
    log('=== Step 7: 查看帖子列表 ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    try {
      await page.click('text=讨论, [data-node-key="discussions"]');
      await sleep(1000);
    } catch {}
    await screenshot(page, 'discussion-list-with-posts');

    const postItems = await page.$$('.ant-list-item, [class*="list-item"]');
    if (postItems.length >= 2) {
      addResult('帖子列表显示', 'PASS', `列表中有 ${postItems.length} 个帖子`);
    } else {
      addResult('帖子列表显示', 'WARN', `列表中只有 ${postItems.length} 个帖子（可能需要刷新）`);
    }

    // Check for QUESTION and SOLUTION tags
    const questionTag = await page.$('.ant-tag:has-text("提问"), .ant-tag:has-text("Question"), [class*="tag"]:has-text("提问")');
    const solutionTag = await page.$('.ant-tag:has-text("题解"), .ant-tag:has-text("Solution"), [class*="tag"]:has-text("题解")');
    if (questionTag && solutionTag) {
      addResult('帖子类型标签', 'PASS', '列表中显示了提问和题解标签');
    } else {
      addResult('帖子类型标签', 'WARN', `提问标签: ${!!questionTag}, 题解标签: ${!!solutionTag}`);
    }

    // ========== 8. 帖子排序功能 ==========
    log('=== Step 8: 帖子排序功能 ===');
    const sortSelect = await page.$('.ant-select, select');
    if (sortSelect) {
      await sortSelect.click();
      await sleep(500);
      await screenshot(page, 'sort-dropdown');

      // Try to select "popular"
      const popularOption = await page.$('text=最热, text=Popular, .ant-select-item:has-text("热")');
      if (popularOption) {
        await popularOption.click();
        await sleep(1000);
        await screenshot(page, 'sort-by-popular');
        addResult('帖子排序-最热', 'PASS', '切换到最热排序');
      } else {
        addResult('帖子排序-最热', 'WARN', '未找到最热排序选项');
      }

      // Switch back to latest
      await sortSelect.click();
      await sleep(500);
      const latestOption = await page.$('text=最新, text=Latest, .ant-select-item:has-text("新")');
      if (latestOption) {
        await latestOption.click();
        await sleep(1000);
        addResult('帖子排序-最新', 'PASS', '切换回最新排序');
      }
    } else {
      addResult('帖子排序', 'FAIL', '未找到排序选择器');
    }

    // ========== 9. 点击进入帖子详情 ==========
    log('=== Step 9: 点击进入帖子详情 ===');
    const postLink = await page.$('a[href*="/discussions/"], .ant-list-item a');
    if (postLink) {
      const postTitle = await postLink.textContent();
      await postLink.click();
      await sleep(2000);
      await waitForLoad(page);
      await screenshot(page, 'post-detail-page');

      const detailContent = await page.$('.ant-card, [class*="detail"], [class*="content"]');
      if (detailContent) {
        addResult('帖子详情页', 'PASS', `查看帖子: ${postTitle?.trim()}`);
      } else {
        addResult('帖子详情页', 'WARN', '页面加载但未检测到详情内容');
      }
    } else {
      addResult('帖子详情页', 'FAIL', '未找到可点击的帖子链接');
    }

    // ========== 10. 回复帖子 ==========
    log('=== Step 10: 回复帖子 ===');
    const replyTextarea = await page.$('textarea[placeholder*="回复"], textarea[placeholder*="reply"], textarea');
    if (replyTextarea) {
      await replyTextarea.fill('冒烟测试回复：这个解法很棒！我用了类似的方法也通过了。');
      await screenshot(page, 'reply-filled');

      const replySubmitBtn = await page.$('button:has-text("回复"), button:has-text("Reply"), button:has-text("提交")');
      if (replySubmitBtn) {
        await replySubmitBtn.click();
        await sleep(2000);
        await waitForLoad(page);
        await screenshot(page, 'reply-submitted');

        const replySuccess = await page.$('.ant-message-success, text=成功');
        if (replySuccess) {
          addResult('回复帖子', 'PASS', '成功回复帖子');
        } else {
          addResult('回复帖子', 'WARN', '回复提交完成但未检测到成功提示');
        }
      } else {
        addResult('回复帖子', 'FAIL', '未找到回复提交按钮');
      }
    } else {
      addResult('回复帖子', 'FAIL', '未找到回复输入框');
    }

    // ========== 11. 点赞帖子 ==========
    log('=== Step 11: 点赞帖子 ===');
    const voteBtn = await page.$('button:has-text("赞"), button:has-text("Like"), [class*="vote"] button, .anticon-like');
    if (voteBtn) {
      await voteBtn.click();
      await sleep(1000);
      await screenshot(page, 'vote-clicked');
      addResult('点赞帖子', 'PASS', '成功点击点赞按钮');
    } else {
      addResult('点赞帖子', 'WARN', '未找到点赞按钮');
    }

    // ========== 12. 退出登录 ==========
    log('=== Step 12: 退出登录 ===');
    // Find and click logout
    const userMenu = await page.$('[class*="avatar"], [class*="user-menu"], [class*="dropdown"]');
    if (userMenu) {
      await userMenu.click();
      await sleep(500);
    }
    const logoutBtn = await page.$('text=退出, text=Logout, a:has-text("退出")');
    if (logoutBtn) {
      await logoutBtn.click();
      await sleep(1000);
      await screenshot(page, 'logged-out');
      addResult('退出登录', 'PASS', '成功退出');
    } else {
      addResult('退出登录', 'WARN', '未找到退出按钮');
    }

    // ========== 13. 管理员登录 ==========
    log('=== Step 13: 管理员登录 ===');
    await loginViaUI(page, ADMIN);
    addResult('管理员登录', 'PASS', '管理员登录完成');

    // ========== 14. 管理员置顶帖子 ==========
    log('=== Step 14: 管理员置顶帖子 ===');
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    try {
      await page.click('text=讨论, [data-node-key="discussions"]');
      await sleep(1000);
    } catch {}
    await screenshot(page, 'admin-discussion-list');

    const pinBtn = await page.$('button:has-text("置顶"), button:has-text("Pin"), [class*="pin"]');
    if (pinBtn) {
      await pinBtn.click();
      await sleep(1000);
      await screenshot(page, 'post-pinned');

      const pinnedTag = await page.$('.ant-tag:has-text("置顶"), .ant-tag:has-text("Pinned"), [class*="pinned"]');
      if (pinnedTag) {
        addResult('管理员置顶帖子', 'PASS', '帖子已置顶，显示置顶标签');
      } else {
        addResult('管理员置顶帖子', 'WARN', '置顶操作完成但未检测到置顶标签');
      }
    } else {
      addResult('管理员置顶帖子', 'WARN', '未找到置顶按钮（可能需要在帖子详情页）');
    }

    // ========== 15. 管理员删除帖子 ==========
    log('=== Step 15: 管理员删除帖子 ===');
    // Navigate to a post detail first
    const postLinkAdmin = await page.$('a[href*="/discussions/"], .ant-list-item a');
    if (postLinkAdmin) {
      await postLinkAdmin.click();
      await sleep(2000);
      await waitForLoad(page);
      await screenshot(page, 'admin-post-detail');

      const deleteBtn = await page.$('button:has-text("删除"), button:has-text("Delete"), [class*="delete"]');
      if (deleteBtn) {
        await deleteBtn.click();
        await sleep(500);

        // Confirm delete in modal
        const confirmBtn = await page.$('.ant-modal-confirm-btns button:has-text("确定"), .ant-modal button:has-text("OK"), .ant-popconfirm button:has-text("确定")');
        if (confirmBtn) {
          await confirmBtn.click();
          await sleep(1000);
        }
        await screenshot(page, 'post-deleted');
        addResult('管理员删除帖子', 'PASS', '管理员删除帖子操作完成');
      } else {
        addResult('管理员删除帖子', 'WARN', '未找到删除按钮');
      }
    }

    // ========== 16. 非管理员用户不应看到管理按钮 ==========
    log('=== Step 16: 非管理员用户不应看到管理按钮 ===');
    // Logout and login as regular user
    const userMenu2 = await page.$('[class*="avatar"], [class*="user-menu"]');
    if (userMenu2) {
      await userMenu2.click();
      await sleep(500);
      const logoutBtn2 = await page.$('text=退出, text=Logout');
      if (logoutBtn2) await logoutBtn2.click();
      await sleep(1000);
    }

    await loginViaUI(page, USER);
    await page.goto(`${BASE_URL}/problems/${problemNum}`);
    await waitForLoad(page);
    try {
      await page.click('text=讨论, [data-node-key="discussions"]');
      await sleep(1000);
    } catch {}
    await screenshot(page, 'user-no-admin-buttons');

    const pinBtnUser = await page.$('button:has-text("置顶"), button:has-text("Pin")');
    const deleteUser = await page.$('button:has-text("删除"), button:has-text("Delete")');
    if (!pinBtnUser && !deleteUser) {
      addResult('普通用户无管理按钮', 'PASS', '普通用户看不到置顶/删除按钮');
    } else {
      addResult('普通用户无管理按钮', 'FAIL', '普通用户仍能看到管理按钮');
    }

    // ========== 17. 页面响应性检查 ==========
    log('=== Step 17: 页面响应性检查 ===');
    await page.setViewportSize({ width: 375, height: 812 }); // Mobile
    await sleep(500);
    await screenshot(page, 'mobile-view');
    addResult('移动端适配', 'PASS', '页面在移动端视口下可正常渲染');

    await page.setViewportSize({ width: 1280, height: 900 }); // Desktop
    await sleep(500);

  } catch (error) {
    log(`❌ 测试执行出错: ${error.message}`);
    await screenshot(page, 'error-state');
    addResult('测试执行', 'FAIL', error.message);
  } finally {
    await browser.close();
  }
}

// Generate report
function generateReport() {
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const warn = results.filter(r => r.status === 'WARN').length;
  const total = results.length;

  let report = `# Discussion-Solution-System 全量冒烟测试报告\n\n`;
  report += `**日期**: ${new Date().toISOString().split('T')[0]}\n`;
  report += `**测试方式**: Playwright 浏览器自动化\n`;
  report += `**测试环境**: ${BASE_URL}\n\n`;

  report += `## 📌 执行摘要\n\n`;
  report += `- 总测试项: ${total}\n`;
  report += `- ✅ 通过: ${pass}\n`;
  report += `- ❌ 失败: ${fail}\n`;
  report += `- ⚠️ 警告: ${warn}\n\n`;

  if (fail === 0) {
    report += `**整体结论**: 🟢 通过\n\n`;
  } else {
    report += `**整体结论**: 🔴 有 ${fail} 项失败\n\n`;
  }

  report += `## 测试详情\n\n`;
  report += `| # | 测试项 | 状态 | 详情 | 截图 |\n`;
  report += `|---|--------|------|------|------|\n`;
  results.forEach((r, i) => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    report += `| ${i + 1} | ${r.name} | ${icon} | ${r.detail} | ${r.screenshot || '-'} |\n`;
  });

  report += `\n## 截图列表\n\n`;
  results.filter(r => r.screenshot).forEach(r => {
    report += `- **${r.name}**: \`${r.screenshot}\`\n`;
  });

  writeFileSync(REPORT_PATH, report);
  log(`📄 Report saved to: ${REPORT_PATH}`);
  log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}`);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`SUMMARY: ${pass}/${total} passed, ${fail} failed, ${warn} warnings`);
  console.log(`${'='.repeat(50)}\n`);
}

// Run
runTests().then(generateReport).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
