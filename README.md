# GitHub 热门项目情报站

一个**自动更新**的开源项目情报网站，展示由 Codex 每日 / 每周 / 每月自动整理的
GitHub 热门项目报告（内容、作用、适用场景、上手方法，以及可强化 AI 客户端能力的潜力项目）。

## 网站结构

```
Github/
├── index.html            # 首页（仪表盘：日报 / 周报 / 月报卡片，支持筛选与搜索）
├── version.json          # 最后更新时间（前端每 60 秒自动检查，有更新自动刷新）
├── assets/
│   ├── style.css         # 样式
│   └── app.js            # 前端逻辑（渲染、筛选、搜索、自动更新检查）
├── reports/
│   ├── index.json        # 报告清单
│   ├── raw/              # 报告原始 Markdown（同步时自动复制进来）
│   └── *.html            # 每份报告的网页版
└── scripts/
    └── build.js          # 构建脚本：扫描报告 → 转网页 → 更新清单/版本号
```

## 如何更新网站（自动）

每晚 / 每周 / 每月的报告生成后，运行同步任务即可把新报告发布到网站：

```bash
node scripts/build.js
git add -A
git commit -m "更新报告"
git push
```

（Codex 的"网站同步"自动化任务会自动执行以上步骤。）

也可以手动把报告 Markdown 文件放到 `reports/source/` 或项目根目录的 `codex项目/GitHub热门项目` 文件夹，再运行 `node scripts/build.js`。

## 如何部署上线

### 方式一：GitHub Pages（推荐，免费、自动更新）

1. 在 GitHub 上创建一个公开仓库（例如 `github-trending-reports`）。
2. 把本文件夹推送到该仓库：
   ```bash
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git branch -M main
   git push -u origin main
   ```
3. 在 GitHub 仓库页面进入 **Settings → Pages**，Source 选择 **Deploy from a branch**，分支选 `main`，路径 `/ (root)`，保存。
4. 等待 1~2 分钟，访问 `https://<你的用户名>.github.io/<仓库名>/` 即可看到网站。
5. 之后每次推送，网站都会自动更新（实时更新的频率 = 报告生成 + 推送 + Pages 构建时间）。

### 方式二：本地查看（无需联网）

直接用浏览器打开 `index.html` 即可（卡片列表已内置在页面里）。
如需完整"自动刷新"效果，可在本目录运行本地服务器：
```bash
python -m http.server 8000
# 或
npx serve .
```
然后访问 `http://localhost:8000`。

## 说明

- 数据来源：GitHub Trending + GitHub API，由 Codex 自动收集整理。
- 报告中的安全 / 逆向类项目仅供授权测试与学习使用。
