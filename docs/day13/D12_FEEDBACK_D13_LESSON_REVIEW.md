# D12在线反馈 → D13教学设计与验收口径

## 输入证据（2026-11-04）

学员报告D12“**浏览器练习通过**”，并明确**不是本地真实C通关**。
希望优化：未填写。个人副本代码注释：未修改。
源码划线批注：
- `mock.c：STEPS[5][3]` → “数组嵌套，5个场景，每个场景里有3帧”：概念正确；需要补充类型、下标、遍历和元素总数。
- `mock.c：static表示文件内可用，不表示值永远不能变` → 留空：需讲清文件作用域内部链接、静态存储期与const的差别，并对照可变的g_next。
- `mock.c：(VehicleResult){0}` → “为什么这里结构体用了括号，是一种定义方式吗”：需解释C99复合字面量，是表达式，不是声明一个名为VehicleResult的变量；对照命名对象`VehicleResult tmp={0}`。

## D13保持和改动

保持：现有D01–D12课程，整体多文件架构、完整中文C源代码、main→app→mock.Read/Write→main执行链、可点击代码片段解释、自动保存划线批注与逐文件个人代码副本、Q/P题号、真实C在WSL本地独立通关。
新增：
1. D12原`STEPS[5][3]`补习，D13延伸为`STEPS[9][3]`，逐帧验证9个场景。
2. 用`static const STEPS`与`static g_next`区别只读数据和可变模块状态；Mock_Select使用`g_last=(VehicleResult){0}`。
3. 给输入加教学用时间戳、使能与故障位；保留35m教学提示，增加对NaN、范围、超时101ms、Write失败的处理。
4. R01–R06→T01–T06需求-测试映射；在线9场景、Q01–Q10、P1–P4；本地GCC/CTest及故障注入修复前后对照独立进行。

## R / T映射

| 需求 | 正常或故障目标 | 验证 |
|---|---|---|
| R01 | 正常帧三次有效，warning=0/1/0 | T01·场景0 |
| R02 | Read失败发布valid=0、fault=1，status=-2 | T02·场景1 |
| R03 | 无效雷达、负车速、NaN、未使能、设备故障分别输出故障码 | T03·场景2/4/5/7/8 |
| R04 | 年龄严格大于100ms：status=-3、fault=4 | T04·场景6 |
| R05 | Write失败status=-4、published=0且旧结果不可冒充新结果 | T05·场景3 |
| R06 | 所有异常场景的第2帧恢复valid=1、fault=0 | T06·场景1–8末帧 |

## 发布和测试边界

- `asw-learning-records`个人私有仓库及其记录完全不触及；页面自动保存/云同步前端保持既有实现。
- `pages-runtime.js`新增D13 JavaScript模拟，必须明确标注模拟而非GCC；不可因为课程CI通过就写用户“真实C通关”。
- `.github/workflows/day13-c-tests.yml`从`courses.json`抽取**原样**C源码，实际用GCC编译两个独立main、核对9个场景输出并执行CMake/CTest；另验证D01–D13 JS回归。
- 课程在独立分支以PR形式评审，评审通过后合并到main才会部署Pages；没有修改正式主分支。
