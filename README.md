# 量子期刊速览

独立的期刊浏览站，按发表状态、期刊、研究主题和日期筛选。站内显示可转载的论文摘要，可选择启用中文翻译。标题与来源链接可打开出版社页面。

## 本地浏览

在本目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000`。包内自带一份实采数据快照，含三篇初始中文译文。运行 `python3 update.py` 可刷新，脚本只依赖 Python 3.10 或更新版本的标准库。

## GitHub Pages 部署

1. 新建 GitHub 仓库，将本目录的内容和隐藏的 `.github/` 一并放到其默认分支根目录。
2. 在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions** 手动运行 **Update journal digest**。它也会每天北京时间 19:20 尝试刷新。首次成功后，可从 Pages 或工作流的部署环境打开网站。
4. 可选在 **Settings → Secrets and variables → Actions** 的 Variables 设置 `CROSSREF_EMAIL`。启用中文摘要时在 Secrets 设置 `OPENAI_API_KEY`，如使用兼容 API，再设置 `OPENAI_BASE_URL` 和 Variables 中的 `MODEL_NAME`。默认使用 OpenAI 的 `gpt-4o-mini`，每次最多翻译 10 篇，保留原文和同版本译文。

## 数据边界

- APS 的 PRL、PRX、PRX Quantum、PRA 分别接入官方接收与发表 RSS。接收日期使用订阅源所列日期。发表 RSS 或带明确出版日期的 Crossref 记录会把同 DOI 条目更新为已发表。
- Nature、Nature Physics、Nature Communications、npj Quantum Information、Science、Science Advances 和 QST 接入期刊 RSS 与 Crossref。Quantum 使用 Crossref。未接入官方接收源的期刊只显示可确认的已发表条目。
- 综合期刊用英文标题、摘要及 APS 栏目关键词筛选量子研究。规则可能遗漏相关论文，期刊名不是分类标签。
- 公开快照只保存 Crossref 中明确允许改编和转载的摘要及许可链接。Quantum 的 CC BY 出版政策也支持其 Crossref 未标明内容版本的许可条目。RSS 导语只参与发现和筛选。摘要缺失时保留出版社入口，公开数据不保存论文正文或 PDF。
- 保留最近 120 天逐次采到的记录。订阅源窗口和 Crossref 登记质量影响覆盖率，接入数量不代表每个期刊每天都有入库文章。来源暂时失败时保留档案中尚在有效期内的记录。全源失败时停止更新。
- 修改 `sources.json` 可以扩充来源。状态来自来源证据，关键词匹配只用于主题。
