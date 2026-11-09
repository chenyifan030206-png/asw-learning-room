# D14 在线反馈与 D15 课程交接（2026-11-09）

## 学习状态及问题

- 学员明确报告 D14 浏览器在线练习通过；未报告本地真实 C 编译/测试通过。
- 我的笔记与“希望优化”为空；个人代码副本未修改。
- 划线批注一：`monitor.c: (MonitorContext){0}`，疑问是否先创建新结构体再给`ctx`赋值。
  - 当前答复：C99复合字面量创建指定类型对象；本课实际执行的是`*ctx = (MonitorContext){0};`，即对指针指向的已存在上下文进行**结构体值整体赋值**，并非改变ctx指针指向。
- 划线批注二：`MonitorResult Monitor_Step(MonitorContext *ctx, const MonitorInput *input)`，疑问MonitorResult是否为monitor.h中typedef struct定义的返回类型。
  - 当前答复：是，函数返回MonitorResult结构体值（按值返回），函数调用者可`MonitorResult result = Monitor_Step(...)`并访问result.status、result.alert等成员。
- 以上问题本轮直接解释，不将其转成D15主课程主题。

## 按原计划推进

项目`courses.json`第15日的既定计划为“Python 与NumPy基础”：读取控制CSV日志、生成速度/距离/模式三条曲线，区分数组shape、标量与向量，故意混入字符串和缺失值并定位行号，坐标中文/单位准确。D16才是“线性代数与坐标系”。

D15由`demo.py`入口调用`log_reader.py`、`log_analysis.py`、`plot_logs.py`，附独立`test_log.py`、requirements.txt及6份CSV样例。六个案例：正常、字符串、缺失、模式9、重复时间、NaN。浏览器端只模拟相同CSV数据与校验规则，展示成功shape或错误的原CSV行号及字段；Python脚本须本人本地运行。

## 保持与验收

1. D01–D14完整课程、C工程与真实C本地验收要求不更改。
2. Pages源码旁逐段解释、完整中文代码、题号、实践步骤、自动保存代码注释/划线批注和云端记录结构保持。
3. `app.js`优先使用`lesson.source`作为首个显示文件，避免D15仅提供.py时旧逻辑找demo.c报错；Python #注释高亮增加。
4. CI从课程包原样提取Python代码与CSV，实际安装NumPy/Matplotlib、运行unittest、生成三张PNG并核对所有错误行号；JS回归从D01覆盖到D15。CI通过不代表学员本地Python或C通关。
