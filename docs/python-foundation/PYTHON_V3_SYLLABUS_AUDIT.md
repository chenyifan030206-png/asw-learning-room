# Python 零基础导学 V3：GitHub 教材核对、144节深讲与既有V2笔记保护

日期：2026-11-10。课程目标：已经学过一定 C 语言、但从未系统学习过 Python 的初学者。

## 1. 学习者提出的具体问题

旧版导学过于概括：只给一段程序，缺少每个标点、变量和函数调用如何执行的解释。下划线、点号、冒号和双下划线特殊名称尚未解释，课程就进入了类与 ASW 工程。for 与 while 被拆开，而 enumerate 没有先拆解 range、tuple 解包等前置概念。V2 需要先点再面：每个语法拆成可运行的最小单位，解释完整形态、运行顺序、常见错误和修改练习。

## 2. 外部教材核对：基于实际公开章节

- 骆昊 Python-100-Days（https://github.com/jackfrued/Python-100-Days）：阅读 README 和 GitHub 实际 Day03、Day06、Day08 教材。Day03 在介绍变量与类型后讲变量命名，包括字母、数字、下划线和 snake_case；Day06 同章讲 for-in、while、break/continue、嵌套，解释 range 和不使用的循环变量常用 _；Day08 先讲 list、索引、切片与遍历。此版本借鉴知识先后，不使用原教材的示例代码。
- 对照的三个章节链接：
  - https://github.com/jackfrued/Python-100-Days/blob/master/Day01-20/03.Python语言中的变量.md
  - https://github.com/jackfrued/Python-100-Days/blob/master/Day01-20/06.循环结构.md
  - https://github.com/jackfrued/Python-100-Days/blob/master/Day01-20/08.常用数据结构之列表-1.md
- Microsoft 视频仓库 https://github.com/microsoft/c9-python-getting-started：公开 README 确认第一阶段先讲 Python 基础、常见语法、模块与包，后续才进入类、文件与异步，数据科学工具另属下一阶段。其针对具有其他语言基础的学习者；本课程保留 C 对照，但 Python 语法本身仍从零解释。
- Python 官方中文教程 https://docs.python.org/zh-cn/3/tutorial/index.html 与语言参考 https://docs.python.org/zh-cn/3/reference/index.html：核对 for、函数、模块、数据结构及特殊方法等语法规则。
- Harvard CS50P https://cs50.harvard.edu/python/weeks/：先函数/变量，再条件、循环、异常、库、测试、文件，再进入类，重视小例题和练习。
- Automate the Boring Stuff（3e）https://automatetheboringstuff.com/3e/：从控制流、函数、容器、文本进入文件与自动化，重视完成实际任务。以上均仅用于教学组织与外部参考；没有复制原教材源码。对于视频，只核对公开目录与介绍，不声称逐帧看过全部视频。

## 3. V2 的具体重排

23章、144个独立详细语法小节。安排为：

1. 第01–06章：解释器、每个符号、环境、变量类型、运算符、字符串。
2. 第07–09章：if 条件；for 与 while 在同一章详讲；随后逐层分解 range、enumerate、zip、二元组解包与嵌套组合。
3. 第10–12章：list、tuple、dict、set、切片、可变性；先普通 for，再学习列表推导式。
4. 第13–16章：def、参数、return、作用域、默认值和星号、import、模块入口、class、self、__init__、dataclass。
5. 第17–19章：文件、CSV/JSON、异常、Traceback、unittest。
6. 第20–23章：ASW 离线监视工程完整调用链、故障注入、语言/库索引、衔接原D15 NumPy。

每个小节都包含语法形式、逐符号解释、独立示例、按实际运行顺序的执行步骤、期望输出、误用陷阱和动手修改任务。桌面端将代码与执行轨迹并排显示。

## 4. 内容和学习记录边界

旧版20章的章节 ID 均原样保留，只添加3个ID：symbols、iteration-tools、comprehensions，使已有笔记和批注继续按原键读取。先修页不改 D01–D15 主课程，不改个人私有学习记录。本地 Python 实际执行与浏览器阅读自测分开。ASW示例为课程离线监视逻辑，不能用作真实车控。

本页提供一次集中学习的知识图谱，不代表初学者能在一天熟练掌握全部144个小节；可先浏览再按需深练。Python 和 NumPy 的本地通关仍需学员自己运行。

## 主分支V2兼容整合

更新时主分支已包含另一版21章、102节的V2教材，采用v2_01…v2_21章节ID并提供更早V1笔记的只读查看面板。V3在最新主分支而非旧草稿上建立，**保留全部21个原V2章节ID**，新增v3_iteration_tools和v3_comprehensions两个章节，把原有教程扩充/重排为23章144节。保留V1和V2两个JSON及旧笔记处理逻辑，新增V3 JSON，不改D15正式课程和个人云数据。原并行草稿PR #12不应直接合并以覆盖V2功能。
