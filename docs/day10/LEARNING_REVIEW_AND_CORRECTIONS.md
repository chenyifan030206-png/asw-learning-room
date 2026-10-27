# Day10 学习答疑与知识闭环（公开课程版）

> 由学员在 Day10 学习后提出的六道理解题归纳形成，**是公开教学知识摘要，而非个人学习记录原件**。学员已表示对逐题讲解完全理解；这是自我反馈，不代表已完成新的闭卷检测或本地 GCC/CTest 验证。私人笔记、成绩和批注仍应留在私有记录仓库。

## 0. 为什么原页面没讲透？

Day10 同时展示状态机、结构体、指针、函数、枚举、静态数组、CMake。即使变量总表存在，学生仍需要逐步明确“**定义位置 → 对象身份 → 本轮值 → 哪句改变 → 下一轮读到什么**”。新课程必须先展示这条链，而不是追加大量零散注释。

## 1. 六个问题、典型误解、正确的C语法

| 知识点 | 常见不完整理解 | 必须真正理解的结论 | 源码位置 |
|---|---|---|---|
| 为什么 context 放 for 外？ | “为了固定内容，不让它反复执行” | **对象只初始化一次，成员可每帧更新**，因此下一帧读到上次计算后的状态；把定义放到 for 内会每轮重置 | demo.c 的 context 声明及 for；acc_state.c 的 `*context = next` |
| main 的 context 与形参 context 是同一变量吗？ | “名字一样但在两个文件” | **不是同一变量，且类型不同**：main 中 `AccContext context` 是对象；函数中 `AccContext *context` 是指针参数；`&context` 把前者的地址交给后者。即便在同一个文件也依然不同 | demo.c 调用；acc_state.c 定义 |
| next 是什么，为什么两次赋值？ | 只说“把旧状态复制过去” | `AccContext next = *context` 复制**整个**结构体值到局部新对象；成功时 `*context = next` 将它整体赋回调用者；函数失败提前 return 时不写回上下文 | acc_state.c |
| 为什么距离38m的提示有时0、有时1？ | 错把“上一帧距离”当作判断条件，或以为旧提示0本轮一定0 | 上次保存的是 **spacing_alert**，本帧提供的是 **input->distance_m**；ACTIVE 且旧alert0时只有距离<=35才开启；旧alert1时只有距离>=41才关闭；处于35～41m区间则保持旧值 | acc_state.c 滞环 if |
| 故障解除条件是什么？ | “满足 reset 的三个条件”但未具体列举 | 旧状态是FAULT、**当前故障已清除**、`fault_reset=1`、`driver_enable=0` 才退出到OFF；**不是直接ACTIVE** | acc_state.c 状态优先级 |
| include了头文件为什么还要链接.c？ | “要调用库” | `.h` 给编译器类型和函数原型；`.c` 提供实现；`gcc demo.c acc_state.c ...` 可以直接编译链接，也可借CMake先做库目标再链接；库**并非必选中间步骤** | acc_state.h / acc_state.c / CMakeLists.txt |

## 2. 一定先掌握的两条数据流

**跨帧状态：**

```text
demo.c: AccContext context = {OFF, 0};    // 在for外创建一次
for第0轮: Acc_Step(&context,...)
acc_state.c: AccContext next = *context;   // 复制旧状态
acc_state.c: 按本帧输入改变next
acc_state.c: *context = next;              // 写回main里的对象
for下一轮: 再次把同一个context地址传进去
```

**同样38m却有两种结果：**

```text
state=ACTIVE + old_alert=0 + 本帧distance=38
 -> 38没有达到<=35的进入条件 -> new_alert=0

state=ACTIVE + old_alert=1 + 本帧distance=38
 -> 38没有达到>=41的退出条件 -> new_alert=1

若state不再是ACTIVE -> alert直接清0
```

这里使用**旧提示标志**，不是查看上一帧的距离：`AccContext` 根本没有 previous_distance 成员。

## 3. 正确学习结果如何记录？

- “已通过在线网页题”只能按网页测试来源记录，不等于真实C编译。
- “学员反馈已完全理解”是**当前自我理解状态**，并不伪造单独的闭卷测验结果。
- Day11 教学必须主动预判：`head`/`tail`/`count` 在哪定义、为什么放for外、`queue->slots[index]` 怎么回事、`*out=draft` 怎么回到main、数据何时算完整快照。
- 主课中保留完整代码和逐轮表；把构建原理放到独立扩展层；不为增加注释长度而牺牲逻辑顺序。
