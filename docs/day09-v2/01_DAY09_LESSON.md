# Day09 v2｜控制更新漏掉一次后，为什么不能总用10ms？

> **正式学员讲义草稿，供 Codex 制作页面。** 这是一个模拟时间轴上的 C 练习，不读取真实操作系统调度时间，不运行 ROS 2，也不向车辆发送控制命令。不要把它称为“真正的10ms周期任务”。从本讲义学懂数据和指针后，再看独立的测试/CMake 工程扩展。

## 0. 今天只解决一个问题

假设一辆车匀速前进，速度为10m/s。我们的教学程序每隔10ms记录一次“控制更新时刻”，根据速度与时间计算距离。

- 10m/s：一秒走10米；不是10km/h。按今天的单位，10ms=0.010s。
- 一段位移：`distance = speed_mps × dt_s`。
- 如果本来30ms要更新，但这次没有执行，下一次是在40ms，则从上一次实际更新的20ms到40ms，**dt应该是20ms，不是10ms**。

先口算：

| 时间段 | 正常发生 | 漏30ms后 |
|---|---|---|
| 0→10ms | 10ms，走0.1m | 10ms，走0.1m |
| 10→20ms | 10ms，走0.1m | 10ms，走0.1m |
| 20→30ms | 10ms，走0.1m | 无30ms更新 |
| 30→40ms | 10ms，走0.1m | 从20→40ms一次计20ms，走0.2m |
| 40→50ms | 10ms，走0.1m | 10ms，走0.1m |
| 50→60ms | 10ms，走0.1m | 10ms，走0.1m |

在0–60ms这个**人为规定的恒速时间段**内：

- 正常六段：6×10m/s×0.010s=**0.60m**。
- 漏30ms后若错误地“每执行一次就加0.10m”，只剩五段：**0.50m**。
- 漏30ms后若用“本次实际时刻－上次实际时刻”，五段依次为10、10、20、10、10ms：**0.60m**。

重点：这里比较的是恒速位移估计，不代表控制任务漏执行后安全控制、传感器处理或制动决策能被自动补回。

**进入代码前的1题**：上一次有效更新在20ms，下次实际在40ms。你认为dt是10ms还是20ms？为什么？答出20ms再进入下一屏。

## 1. 本课的数据是从哪里来的？

主课只用三个输入。**不要在主课展示now/stamp/source/valid等原D08附录输入。**

| 用户输入 | C中变量 | 本次示例 | 含义与允许范围 |
|---|---|---:|---|
| 速度 | `speed_mps` | 10 | 单位m/s，合法0–50，始终假设本次运动恒速 |
| 跳过哪轮 | `skip_tick` | 3 | -1不跳过，1–5跳过相应计划轮次；`3` 对应30ms |
| 30ms迟到多少 | `late_ms` | 0 | 合法0–9ms；仅在30ms那轮实际执行时起作用 |

三个输出目标：**每次实际控制时刻** `control_ms`、相邻有效时刻差 `dt_ms`、**两种累计距离** `fixed_distance_m` 与 `measured_distance_m`。

### 时间轴

    计划时刻（ms）：0 ─ 10 ─ 20 ─ 30 ─ 40 ─ 50 ─ 60
    正常实际（ms）：0 ─ 10 ─ 20 ─ 30 ─ 40 ─ 50 ─ 60
    漏30ms后（ms）：0 ─ 10 ─ 20 ─  × ─ 40 ─ 50 ─ 60
                                     ↑
                           此次控制更新不执行

这里有两组不同的事件：控制更新每10ms计划一次，另一组**模拟传感处理事件**在0/20/40/60ms记录。它们只是两份预设的事件时间表，不是两个CPU线程在真实执行。先专注控制更新；感知更新只用于展示两个事件序列彼此独立。

## 2. 先看所有文件与符号来自哪里

主课工程有5个文件，但第一次阅读只按 `demo.c → timing.h → timing.c` 的顺序深入。测试文件和CMake在本课最后的选学区，不抢主线。

| 文件 | 里面有什么 | 本课的阅读顺序 |
|---|---|---|
| `demo.c` | 唯一演示程序入口 `main()`；scanf输入；创建 `result`；调用；展示 | ① |
| `timing.h` | `struct Timeline` 成员定义与 `Timeline_Run` 函数声明 | ② |
| `timing.c` | `Timeline_Run` 的真正函数体；创建 `draft` 并更新dt | ③ |
| `test_timing.c` | 测试用的另一个 `main()`，独立可执行文件 | ④ 选学 |
| `CMakeLists.txt` | 构建工具读取的“哪些源文件编译成哪些目标”的规则 | ⑤ 选学 |

### 符号追踪大表（固定在页面侧边，支持点击定位）

| 看到的名字 | **第一次定义的位置** | 是什么？ |
|---|---|---|
| `struct Timeline` | timing.h | 一个**类型**，像成员清单 |
| `control_count` | timing.h，struct Timeline 内 | **成员名**；已写入的控制时刻数量 |
| `result` | demo.c，main 里面的 `struct Timeline result={0};` | 一个真实的**结构体变量** |
| `result.control_count` | demo.c | **点号**访问 result 的成员，结果来自后面的函数写回 |
| `Timeline_Run` | timing.h 声明，timing.c 定义 | 被 demo.c 调用的**函数** |
| `out` | timing.c 的 Timeline_Run 参数 `struct Timeline *out` | 一个**结构体指针**，指向 main 的 result |
| `draft` | timing.c，`struct Timeline draft={0};` | 一个**局部结构体对象**，先在这里计算 |
| `draft.control_count` | timing.c | **点号**访问 draft 的成员，与 result 不是同一变量 |
| `last_control_ms` | timing.c，Timeline_Run 内 | int局部变量，上一次有效控制时刻 |
| `tick` | timing.c 的 for 初始化处 | int循环索引，计划轮次0～6 |
| `now_ms` / `elapsed_ms` | timing.c 的 for 循环体 | 本轮到场时刻/与上次有效更新的差 |

**解开你之前的两个疑问：**

- `draft` 不是库函数，也不是编译器偷偷生成的；它就在 `timing.c` 的 `Timeline_Run()` 内部，通过 `struct Timeline draft={0};` 被定义。它的类型与 main 的 result 相同，都是 `struct Timeline`。
- `result.control_count` 中的 `control_count` 不是一个独立的全局变量。它是在 `timing.h` 里写的结构体**成员名**；`result` 是 demo.c 中的真实对象；二者用点号组合，意思是“读取 result 里面的 control_count 成员”。

## 3. 完整主课源码（3个文件；先看全部，再逐段学习）

页面要有可下载完整源码，以下每个代码块都对应一个真实文件；不要把三个文件黏成一个假单文件。

### 3.1 demo.c（真正的程序入口）

~~~c
#include "timing.h"
#include <stdio.h>

int main(void)
{
    float speed_mps = 0.0f;
    int skip_tick = -1;
    int late_ms = 0;

    // 三个输入：速度、跳过哪轮、30ms这轮迟到多少。
    if (scanf("%f %d %d", &speed_mps, &skip_tick, &late_ms) != 3)
    {
        printf("input_error=1\n");
        return 1;
    }

    // 定义真实输出对象。成员结构在 timing.h 的 struct Timeline 中声明。
    struct Timeline result = {0};

    // 通过 &result 提供地址，让函数可以填写这个对象。
    int status = Timeline_Run(speed_mps, skip_tick, late_ms, &result);
    printf("status=%d\n", status);
    if (status != 0)
    {
        return 0;
    }

    printf("control_ms=");
    for (int i = 0; i < result.control_count; ++i)
    {
        printf("%d%s", result.control_ms[i],
               i + 1 == result.control_count ? "\n" : ",");
    }

    printf("dt_ms=");
    for (int i = 0; i < result.control_count; ++i)
    {
        printf("%d%s", result.dt_ms[i],
               i + 1 == result.control_count ? "\n" : ",");
    }

    printf("perception_ms=");
    for (int i = 0; i < result.perception_count; ++i)
    {
        printf("%d%s", result.perception_ms[i],
               i + 1 == result.perception_count ? "\n" : ",");
    }

    printf("control_count=%d\n", result.control_count);
    printf("update_count=%d\n", result.control_count - 1);
    printf("perception_count=%d\n", result.perception_count);
    printf("fixed_distance_m=%.6f\n", (double)result.fixed_distance_m);
    printf("measured_distance_m=%.6f\n", (double)result.measured_distance_m);
    return 0;
}
~~~

### 3.2 timing.h（告诉其他文件结构体和函数接口是什么）

~~~c
#ifndef ASW_TIMING_H
#define ASW_TIMING_H

// 类型定义：这些成员决定 Timeline 对象内部有哪些数据。
struct Timeline
{
    int control_ms[7];       // 按顺序保存实际执行控制的时刻，单位ms。
    int dt_ms[7];            // 对应每次与上一次有效控制的时间差。
    int perception_ms[4];    // 独立记录的传感处理时刻：0/20/40/60ms。
    int control_count;       // 已填写的控制时刻行数，包含初始0ms一行。
    int perception_count;    // 已填写的感知时刻行数。
    float fixed_distance_m;  // 每次更新都按0.010s估计。
    float measured_distance_m;// 每次更新按实际dt估计。
};

// 函数声明：int是状态；前三个值是输入；out是可写的结果对象地址。
int Timeline_Run(
    float speed_mps,
    int skip_tick,
    int late_ms,
    struct Timeline *out
);

#endif
~~~

### 3.3 timing.c（真正做计算的函数）

~~~c
#include "timing.h"
#include <stddef.h>
#include <math.h>

int Timeline_Run(
    float speed_mps,
    int skip_tick,
    int late_ms,
    struct Timeline *out)
{
    if (out == NULL) return -1;
    if (!isfinite(speed_mps) || speed_mps < 0.0f || speed_mps > 50.0f)
        return -2;
    if (skip_tick != -1 && (skip_tick < 1 || skip_tick > 5))
        return -2;
    if (late_ms < 0 || late_ms > 9)
        return -2;

    // 先在局部对象 draft 计算；成功后再交付给 main 的 result。
    struct Timeline draft = {0};
    int last_control_ms = 0;

    // tick=0..6，对应计划时刻 0、10、20、30、40、50、60ms。
    for (int tick = 0; tick <= 6; ++tick)
    {
        int scheduled_ms = tick * 10;

        // 独立的传感更新示例：每20ms记录一次。
        if (tick % 2 == 0)
        {
            draft.perception_ms[draft.perception_count] = scheduled_ms;
            ++draft.perception_count;
        }

        // 被选中的那轮控制更新不执行；last_control_ms也不更新。
        if (tick == skip_tick)
        {
            continue;
        }

        int now_ms = scheduled_ms;
        if (tick == 3)
        {
            now_ms += late_ms;
        }

        // control_count是已写入数量，也恰好是下一条可写下标。
        int index = draft.control_count;
        draft.control_ms[index] = now_ms;

        if (index > 0)
        {
            int elapsed_ms = now_ms - last_control_ms;
            draft.dt_ms[index] = elapsed_ms;
            float dt_s = (float)elapsed_ms / 1000.0f;

            draft.fixed_distance_m += speed_mps * 0.010f;
            draft.measured_distance_m += speed_mps * dt_s;
        }

        // 只有本轮控制确实执行后，才把“本次”作为下一轮的“上次”。
        last_control_ms = now_ms;
        ++draft.control_count;
    }

    // 将整个草稿结构体的值交给 out 所指向的 main 中 result。
    *out = draft;
    return 0;
}
~~~

### 编译运行（在 WSL 的源码所在文件夹输入，不在 C 源码里输入）

~~~bash
gcc -std=c17 -Wall -Wextra -Wpedantic -g demo.c timing.c -o timeline_demo -lm
./timeline_demo
~~~

输入：`10 3 0`，按回车；预测到场时刻、dt和两种距离后再核对输出。这里直接用 GCC 编译链接两份 .c，**不需要先会 CMake**。

## 4. 从 main() 进入 timing.c 的真实执行链

请保持代码窗口可见，每一步都要标明文件名、所在函数、输入值、执行前、执行后。

### S01｜demo.c：创建三个普通输入变量

- `float speed_mps=0`：创建float数值变量，存10m/s。
- `int skip_tick=-1`：创建整数，-1代表不漏，3代表计划第3轮（30ms）不执行。
- `int late_ms=0`：创建整数，表示30ms更新迟到多少。
- `scanf(...)`：通过地址把输入写给三个变量。输入`10 3 0`后，三个变量变成10、3、0。

### S02｜demo.c：创建 result，调用函数

- `struct Timeline result = {0};`：**不是调用函数**；依据 timing.h 的类型定义，在 main 创建一个真实结构体对象。
- `Timeline_Run(speed_mps,skip_tick,late_ms,&result)`：前三项是普通值，第四项`&result`是结构体地址。
- 函数声明在 timing.h：`int Timeline_Run(float,int,int,struct Timeline *out);`。
- **函数形参 out 是指针，main 的 result 是结构体对象**；out 保存的是 result 的地址，二者名字不同、角色不同。

### S03｜timing.c：检查输入，在函数内部声明 draft

- 执行合法性检查；`10 3 0` 合法。
- `struct Timeline draft={0};`：在当前调用的函数中创建一个**局部结构体对象**；它不是 result，也不是指针。
- `last_control_ms=0`：记录上次有效控制时刻。因为第一轮就在0ms，后续从0开始计算即可。
- 最初 `draft.control_count=0`；这是“已经填写的条目数”，也可以作为下一条目的下标。

### S04｜timing.c：看懂 for 的每一个部件

~~~c
for (int tick = 0; tick <= 6; ++tick)
~~~

- 第1段 `int tick=0`：第一次进入前设置tick为0。
- 第2段 `tick<=6`：每轮开始检查，真则进入循环。
- 第3段 `++tick`：本轮末尾增加1。
- 因此tick依次为0、1、2、3、4、5、6。每一轮都算 `scheduled_ms=tick*10`。

这是**纸面计划时刻**，不是CPU实际等了10ms。

### S05｜timing.c：同一循环中先处理传感事件

~~~c
if (tick % 2 == 0)
{
    draft.perception_ms[draft.perception_count] = scheduled_ms;
    ++draft.perception_count;
}
~~~

- `%` 是整除后的余数：0%2=0、1%2=1、2%2=0。
- 当tick=0/2/4/6时，记录时刻0/20/40/60ms。
- `draft.perception_count` 起始为0；写第0格再变1、写第1格再变2……
- **该代码位于 continue 之前**，所以漏掉某次控制更新不会取消独立的感知时刻记录。

### S06｜timing.c：为什么漏30ms时 continue 如此重要？

~~~c
if (tick == skip_tick)
{
    continue;
}
~~~

本次 `skip_tick=3`。

- tick=0/1/2：条件为假。
- tick=3：条件为真；`continue` 跳过本轮循环剩余的所有语句，直接进入下一轮的迭代部分。
- 因此该轮**不会向control_ms写30**，不会改`last_control_ms`，也不会增加`control_count`。
- tick=4时 `scheduled_ms=40`，上次有效控制时刻依然是20ms。

注意：`continue` 不是 `return`；它没有结束整个函数，只是跳过当前这一轮。

### S07｜timing.c：为什么 control_count 可以当数组下标？

~~~c
int index = draft.control_count;
draft.control_ms[index] = now_ms;
~~~

- 第一次记录0ms时，count=0，所以写`control_ms[0]`，然后在本轮末尾count加到1。
- 第二次记录10ms时，count=1，所以写`control_ms[1]`。
- 漏tick=3时没有写入；到了40ms，`draft.control_count=3`，恰好写到`control_ms[3]`。
- 这就是为什么**下标3对应时刻40ms**（漏30ms情形下），不能把“下标”和“tick”当成一个量。

### S08｜timing.c：真正计算 dt

~~~c
int elapsed_ms = now_ms - last_control_ms;
float dt_s = (float)elapsed_ms / 1000.0f;
~~~

- 在40ms时：`now_ms=40`；`last_control_ms=20`。
- 因此`elapsed_ms=20`（单位ms）。
- 除以1000得`dt_s=0.020`（单位s）。
- `(float)`显式转换为浮点；分母也写`1000.0f`，避免整数除法截断为0。

随后：

~~~c
draft.fixed_distance_m += speed_mps * 0.010f;
draft.measured_distance_m += speed_mps * dt_s;
~~~

- `+=` 表示旧值+本段增量再存回。
- 固定算法这次只加10×0.010=0.10m。
- 实际算法这次加10×0.020=0.20m。

### S09｜timing.c：为什么一定要先计算再更新 last？

~~~c
last_control_ms = now_ms;
++draft.control_count;
~~~

- 如果把 `last_control_ms=now_ms` 放在相减之前，本轮 `now-last` 就会变成0。
- 正确顺序必须是：**先减旧时刻、再把当前时刻设为新参考**。
- 本轮结束后last=40，下一轮50ms能得到10ms。

### S10｜timing.c：为什么 `*out = draft;` 能改变 main 的 result？

~~~c
*out = draft;
return 0;
~~~

- `draft`：当前函数内部算好的一个完整结构体对象。
- `out`：函数参数指针；保存了main中`result`的地址。
- `*out`：这个指针指向的**整个结构体对象**，即main的result。
- `*out = draft`：把draft的全部成员值整体复制到result；不是只传一个地址，也不是把draft的生命周期延长。
- `return 0`：单独把成功状态码返回main。
- 因而 main 的 `status=0`，且它可以读到 `result.control_count` 等已经完成的输出成员。

### S11｜demo.c：从哪个变量读结果？

~~~c
if (status != 0) return 0;
for (int i=0; i<result.control_count; ++i) { ... }
~~~

- main 中`result`是普通结构体对象，所以用点号`.`；函数参数`out`是指针，所以使用`->`或`*out`。
- `result.control_count` 来自timing.h中定义的成员，**由 timing.c 的 draft 逐轮累加，并通过整体赋值拷贝回来**。
- 漏30ms时 count=6，代表6行到场记录；第0行只是0ms初始化，因此真正参与积分的更新段数=5。
- `?:` 只用来选择“最后一项用换行，其他用逗号”，与dt算法无关，先不深入也不影响本课理解。

## 5. 漏30ms：逐轮完整变量变化表（课程核心可视化）

输入`10 3 0`。控制一轮是否记录、last什么时候更新，要一眼看到。

| tick | 计划ms | 控制是否执行 | 本轮写入下标 | last执行前ms | 实际时刻ms | dt(ms) | 固定法本段m | 实际法本段m |
|---:|---:|---|---:|---:|---:|---:|---:|---:|
| 0 | 0 | 是，初始化 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1 | 10 | 是 | 1 | 0 | 10 | 10 | 0.10 | 0.10 |
| 2 | 20 | 是 | 2 | 10 | 20 | 10 | 0.10 | 0.10 |
| 3 | 30 | **否，continue** | — | 20 | — | — | 0 | 0 |
| 4 | 40 | 是 | 3 | 20 | 40 | **20** | **0.10** | **0.20** |
| 5 | 50 | 是 | 4 | 40 | 50 | 10 | 0.10 | 0.10 |
| 6 | 60 | 是 | 5 | 50 | 60 | 10 | 0.10 | 0.10 |
| **合计** | | 6条记录、5段积分 | | | | 60ms | **0.50m** | **0.60m** |

**观察员（独立传感事件）的时刻**始终为0、20、40、60ms，数量4。tick3虽然跳过控制，但观测代码在continue之前运行；这次tick3本来也不是偶数，故没有观测更新。

主课页面必须可逐步选择任意tick：选中行时，源码高亮当前分支，右侧显示本轮各变量的“执行前→执行后”，同时实时显示两种累计值。

## 6. 两个常见混淆一次说明白

### 6.1 result 与 draft 不是同一个变量

- `demo.c` 中：`struct Timeline result={0};`，这是调用者的输出对象。
- `timing.c` 中：`struct Timeline draft={0};`，这是函数内部的临时计算对象。
- `timing.h` 中：`struct Timeline {...};`，这是类型定义，不是上述任何一个对象。
- `*out=draft` 才使main的result获得完整结果。

### 6.2 control_count、update_count、tick、index 不是同一个概念

- `tick`：计划第几轮，0到6，共7轮。
- `index`：本轮**真正写入输出数组的下标**，可能因continue不同于tick。
- `control_count`：已经保存的控制时刻条数，包含第0项。
- `update_count=control_count-1`：本例真正参与位移累计的段数。
- 漏30ms：tick仍迭代7轮，但control_count=6、update_count=5。

## 7. 核对正常、漏周期、迟到、非法四类实验

| 实验 | 输入（m/s、skip_tick、late_ms） | 应观察到 |
|---|---|---|
| E01 正常 | `10 -1 0` | control=0,10,20,30,40,50,60；dt=0,10,10,10,10,10,10；固定=0.6m；实际=0.6m |
| E02 漏30ms | `10 3 0` | control=0,10,20,40,50,60；dt=0,10,10,20,10,10；固定=0.5m；实际=0.6m |
| E03 迟到5ms | `10 -1 5` | control=0,10,20,35,40,50,60；dt=0,10,10,15,5,10,10；两种最终均为0.6m |
| E04 参数拒绝 | `-1 -1 0` | status=-2；不能使用本次输出 |

请按“预测→执行→对照→写一句原因”的顺序。浏览器演示必须显式标注为 JavaScript 模拟；若需要声称真实C通过，必须展示实际GCC编译与程序输出/CTest记录。

补充边界：`skip_tick=3` 且 `late_ms=5` 时，tick3被continue直接跳过，因此本课代码不会出现35ms那条更新；late设置对这次被跳过的轮次没有效果。不要把它误写成“漏周期并且补记迟到的控制”。

### 课堂迁移题（先隐藏答案）

速度换成20m/s，其余为`skip_tick=3,late_ms=0`。请先独立写出实际dt序列、固定累计、实际累计。通过后再显示：`0,10,10,20,10,10ms`、1.0m、1.2m，并要求解释为什么差0.2m。单凭多选题正确不足以说明真正理解。

## 8. 三个语法微课（每个只结合今天一行）

**`continue`：** 只跳过当前for的一轮剩余代码，不是结束函数；因此不会更新last，也不会写到场数据。

**`++x`：** 在本例单独使用时把x增加1。`++draft.control_count` 表示写完本行后增加有效条数。

**`+=`：** `distance += step` 等价`distance = distance + step`。每一轮累计本段位移，不会重置上次的总距离。

**`*out=draft`：** `out`是结构体指针，`*out`是指向的整个对象；这是结构体整体赋值。与`out->control_count=...`的成员赋值不同。

## 9. 实践：在哪输入代码命令？

在 VS Code 的 WSL Ubuntu 终端，进入已下载项目目录。不要把 `gcc ...` 命令写进C文件，亦不要在没有源文件的父目录编译。

~~~bash
pwd
ls
gcc -std=c17 -Wall -Wextra -Wpedantic -g demo.c timing.c -o timeline_demo -lm
./timeline_demo
~~~

分别输入：`10 -1 0`、`10 3 0`、`10 -1 5`、`-1 -1 0`。每次执行程序只读取一次三参数输入；下一场景需重新运行命令。

若需要单步调试，可用 `gdb ./timeline_demo`，在 `Timeline_Run` 处断点，再用 `next`、`print tick`、`print draft.control_count`、`print last_control_ms`，观察tick3和tick4。这里调试的是模拟时间计算，不是OS调度精度。

## 10. 工程扩展（默认折叠；不作为首次学习的通关障碍）

### 10.1 测试文件不是“又一个一起运行的主程序”

`test_timing.c` 中也有 `main()`，但它会被构建成**另一个可执行文件**；`demo.c` 的 main 与它不会同时在同一程序中运行。它使用固定输入检查正常0.6m、漏周期0.5m/0.6m、迟到15ms/5ms、非法参数等。

### 10.2 CMakeLists.txt 是什么？

它不是C代码，也不会被CPU当作控制任务周期执行。它是**告诉构建工具如何组织文件**的清单。

| CMake语句 | 本工程里的意思 |
|---|---|
| `cmake_minimum_required(VERSION 3.16)` | 项目要求的最低CMake版本 |
| `project(asw_timeline LANGUAGES C)` | 声明这个构建项目使用C |
| `set(CMAKE_C_STANDARD 17)` | 指定编译C17 |
| `add_library(timing STATIC timing.c)` | 把timing.c编成可复用静态库（这里STATIC与C函数static不同） |
| `add_executable(timeline_demo demo.c)` | 用demo.c生成一个有main的可执行程序 |
| `target_link_libraries(timeline_demo PRIVATE timing)` | 让演示程序链接计算库 |
| `include(CTest)` / `add_test(...)` | 组织独立测试执行 |

CMake完整运行步骤只放工程扩展，不在主课开头作为前置条件。需要构建项目时用：

~~~bash
cmake -S . -B build-main -DCMAKE_BUILD_TYPE=Release
cmake --build build-main
ctest --test-dir build-main --output-on-failure
./build-main/timeline_demo
~~~

### 10.3 下一主题而不是本主题：数据年龄

`age_ms=now_ms-stamp_ms` 是**数据从采集到当前经过多久**，与 `dt_ms=now_ms-last_control_ms` 这种**相邻控制更新的时间差**不同。两者都是时间差，但比较的两个时刻不同。原D08欠的信号有效性、来源、过期判断应移至独立补课D08A；不得假装它已在Day09完成。

## 11. 掌握度检测（需要能解释，而不只是选对）

1. `draft` 在哪个文件、哪个函数、哪一条声明中创建？`result`又在哪创建？二者是什么关系？
2. `control_count` 的名字最初出现在哪个类型中？为什么能写`draft.control_count`和`result.control_count`？
3. `Timeline_Run(...,&result)`的`&`做什么？`*out=draft`究竟修改谁？
4. 漏30ms时，tick3执行到`continue`后，哪些变量**不会**被更新？
5. 下一轮40ms时，为什么`dt`等于20而不是10？若速度20m/s，两种累计值分别是多少？
6. 为什么`result.control_count=6`并不意味着积了6段位移？
7. CMake中的STATIC和C语言的文件作用域`static`函数是不是一个意思？
8. 这里的0.60m能否证明真实ECU漏一次控制任务仍能满足安全要求？为什么？

最关键的验收题是1、2、3、4、5。若回答不了，课程只返回相关步骤补学，不自动进入下一课。

## 12. 页面实施备注

- 本文为**完整学员讲解素材**；Codex 可以适当拆成可交互模块，但不可删掉“符号来源表”“draft/result拆解”“逐轮dt表”“真实/模拟区分”。
- 页面上各代码片段必须能定位到当前完整源码及其真实行号，不靠文本的首个子串索引猜测。
- 不得用“接待员”“观察员”“账本”替代变量的准确类型和职责。
- 现有主课的原始源码和数值行为尽量保持；本讲义 `demo.c` 的输入格式错误时增加可见提示，属于可选可追踪的界面改善，实施时请确认浏览器模拟与C执行对齐。
- 学生第一遍不需要看原D08附录；但附录学习状态不能丢失。
