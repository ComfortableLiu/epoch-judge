import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Epoch Judge',
  description: 'Epoch Judge 在线评测系统用户手册',
  lang: 'zh-CN',
  base: '/epoch-judge/',
  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: '首页', link: '/' },
      { text: '学生手册', link: '/student' },
      { text: '教师手册', link: '/teacher' },
      { text: '管理员手册', link: '/admin' },
    ],
    sidebar: [
      {
        text: '用户手册',
        items: [
          { text: '首页', link: '/' },
          { text: '学生手册', link: '/student' },
          { text: '教师手册', link: '/teacher' },
          { text: '管理员手册', link: '/admin' },
        ],
      },
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/anthropic/epoch-judge' },
    ],
    footer: {
      message: 'Epoch Judge 用户手册',
      copyright: '© 2024 Epoch Judge',
    },
    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },
    outline: {
      label: '页面导航',
    },
    lastUpdated: {
      text: '最后更新于',
    },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
  },
});
