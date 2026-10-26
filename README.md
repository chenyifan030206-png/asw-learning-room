# 智驾学习室 · 免费在线练习版

发布内容：D01—D09课程、完整中文注释代码和讲义下载、离线配色、代码旁解释、交互bit演示、浏览器模拟实验、前端练习检测、浏览器笔记及报告备份。

这不是实际C编译器，不提供服务器端检测。记录自动保存浏览器；可用仅授权私有记录仓库Contents读写的fine-grained令牌开启手动及定时云同步。个人源码注释与文字笔记一起自动保存、云端合并并保留历史。个人记录与授权不在公开仓库，记录仅上传账号本人的asw-learning-records私有仓库。令牌默认仅在标签页会话中保留，可自行选择记住设备。

同步合并通关、运行、检测和笔记；同一天不同笔记保留历史版本，不用旧数据清空新记录。定时仅在网页打开且可见时运行，不变化不创建提交；并发修改用sha校验后重新合并。支持从JSON备份恢复，不与本地SQLite自动双向同步。源码及答案公开，在线关卡不是防作弊系统。

真实C实验与服务端通关请继续使用本地学习服务。此仓库不含个人笔记、SQLite、个人运行日志或凭据；reports中只有合成数据的工程验收证据。

GitHub Pages设置：Deploy from a branch → main → /(root)。入口index.html，资源全部为相对路径，支持仓库子路径。

新课制作后在本地运行learning_app/build_pages.py，随后只推送pages_site目录。不要上传整个asw工作区。

Day09 v2 审阅分支依据 [设计文档](docs/day09-v2/02_CODEX_TASK.md) 实现。尚未合并发布，学习效果等待学员与ChatGPT审核。

- 主课只有三输入，执行步骤采用明确的文件/行号；D08A独立入口保留旧补课历史。
- 旧批注无法对应新版原文时显示“需要复核”，可查看旧引用和改版前讲义；不会清空成绩或笔记。
- `examples/day09/` 是ZIP里的真实C工程来源；`python tools/build_day09_v2.py` 生成课程与资源版本。修改v2时请使用此生成器，避免旧生成流程覆盖v2。
- 本分支验证：`npm ci` → `npx playwright install chromium` → `python tools/verify_content.py` → `npm test` → `python tools/verify_c.py`（Linux/WSL）。浏览器测试下载真实项目ZIP，随后GCC/CMake/CTest验证该ZIP，并逐轮对照JS。
- [验收报告与截图](reports/day09-v2/REVIEW.md)。CI只做检查和上传证据，不部署Pages、不合并main。
