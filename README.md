# 量子期刊速览

独立的期刊浏览站，按发表状态、期刊、研究主题和日期筛选。站内显示可转载的论文摘要，可选择启用中文翻译。标题与来源链接可打开出版社页面。

「论文动态」按固定的一级和二级主题筛选，可与「已接收」「已发表」、期刊和时间范围组合使用。「主题统计」展示同一组主题，点击篇数可回到相应列表。每篇论文在同一个一级或二级主题内只计一次。分类使用已有标签、标题和可用的摘要匹配主题，部分仅有元数据的论文只能归入一级，或暂时未分类。主题规则维护在 `topics.js`。

## 本地浏览

在本目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000`。包内自带一份实采数据快照，含三篇初始中文译文。运行 `python3 update.py` 可刷新，脚本只依赖 Python 3.10 或更新版本的标准库。

## GitHub Pages 部署

1. 新建 GitHub 仓库，将本目录的内容和隐藏的 `.github/` 一并放到其默认分支根目录。
2. 在 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 在 **Actions** 手动运行 **Update journal digest**。选择 `publish` 用当前归档直接发布，或选择 `refresh` 更新数据后发布。它也会每天北京时间 19:20 尝试刷新。首次成功后，可从 Pages 或工作流的部署环境打开网站。
4. 可选在 **Settings → Secrets and variables → Actions** 的 Variables 设置 `CROSSREF_EMAIL`。启用中文摘要时在 Secrets 设置 `OPENAI_API_KEY`，如使用兼容 API，再设置 `OPENAI_BASE_URL` 和 Variables 中的 `MODEL_NAME`。默认使用 OpenAI 的 `gpt-4o-mini`，每次最多翻译 10 篇，保留原文和同版本译文。

## 用 DeepSeek 补齐已有摘要的中文译文

在新仓库的 **Settings → Secrets and variables → Actions** 设置：

| 位置 | 名称 | 值 |
| --- | --- | --- |
| Secrets | `OPENAI_API_KEY` | 你的 DeepSeek API Key |
| Secrets | `OPENAI_BASE_URL` | `https://api.deepseek.com` |
| Variables | `MODEL_NAME` | `deepseek-flash` |

先在 **Actions → Update journal digest → Run workflow** 选择 `refresh`，采集当前可获取的期刊条目并翻译最多 10 篇。等运行结束后，在同一菜单选择 `backfill`，补齐当前归档里所有可展示的摘要。它直接读取归档，跳过原文未变的已有译文。运行摘要会显示新增和剩余篇数。如果因限流或时间上限留下未译条目，处理完原因后再次运行 `backfill`。成功生成的译文会保存在归档中并随网站发布。

本地已有归档时，也可以设置相同的环境变量后运行 `python3 update.py --backfill`。此模式保留原有数据日期。

## 数据边界

- APS 的 PRL、PRX、PRX Quantum、PRA、PR Research、PR Applied、PRB 和 RMP 分别接入官方接收与发表 RSS。接收日期使用订阅源所列日期。发表 RSS 或带明确出版日期的 Crossref 记录会把同 DOI 条目更新为已发表。
- Nature、Nature Physics、Nature Communications、npj Quantum Information、Science、Science Advances 和 QST 接入期刊 RSS 与 Crossref。Nature Communications 和 Nature Physics 同时接入 Nature 的量子信息专题 RSS。Quantum 使用 Crossref。未接入官方接收源的期刊只显示可确认的已发表条目。
- 其他新增来源通过 Crossref 接入，包括 IEEE TQE、ACM TQC、QMI、EPJ Quantum Technology、APL Quantum、AVS Quantum Science、Advanced Quantum Technologies、Materials for Quantum Technology、Quantum Reports、Nature Computational Science 和 APL Photonics。
- 综合期刊用英文标题、摘要及 APS 栏目关键词筛选量子研究。规则可能遗漏相关论文，期刊名不是分类标签。
- 公开快照只保存 Crossref 中明确允许改编和转载的摘要及许可链接。Quantum 的 CC BY 出版政策也支持其 Crossref 未标明内容版本的许可条目。RSS 导语只参与发现和筛选。摘要缺失时保留出版社入口，公开数据不保存论文正文或 PDF。
- 保留最近 120 天逐次采到的记录。订阅源窗口和 Crossref 登记质量影响覆盖率，接入数量不代表每个期刊每天都有入库文章。来源暂时失败时保留档案中尚在有效期内的记录。全源失败时停止更新。
- 修改 `sources.json` 可以扩充来源。状态来自来源证据，关键词匹配只用于主题。

## 查看每日变更

在网站仓库的 `main` 分支中，`data/papers.json` 是网页使用的汇总数据，`data/daily/YYYY-MM-DD.json` 是按北京时间保存的每日变更。第一次有变更时，工作流会创建 `data/daily/`，并和汇总文件一起提交。无需创建额外仓库或配置跨仓库 Token。

`refresh` 和 `backfill` 会记录新增论文、转为已发表、更换或新增的英文摘要和中文译文。同一天多次运行时，同一篇论文合并为一条。如果当天没有这些变化，就不创建日文件。日报从安装新版后开始累计，独立于网站汇总的 120 天浏览窗口。
