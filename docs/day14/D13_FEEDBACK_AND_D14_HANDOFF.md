# D13学习反馈与D14按既定路线推进（2026-11-09）

## 反馈口径
学员报告D13 **浏览器在线练习通过**，**不是学员本地真实C通关**；个人代码副本未修改。批注`(VehicleResult){0}`：“理解”。D13的直接问题为三个文件角色、实际执行顺序与复合字面量；在聊天中解答，**不作为D14新课的中心内容**。

## D13网页问题确诊
`pages-runtime.js`已有D13返回的`rows/statuses/published/valids/warnings/faults`。原`app.js`运行案例展示逻辑遗漏`vehicle_requirements_day13`分支，导致落入D01的mode/valid/status兜底展示，因此所有D13场景误显示“模式未知/无效”和空status。这是**显示层字段映射错误**，不是D13业务模拟的全部失败。修复方式：D13独立展示场景、各帧状态码及按帧表；写失败行中的valid/warning/fault明确为“—”，不能读取旧g_last冒充新数据。

## 新课程按84天计划
原curriculum中D14：**第2周闯关，完成带时间戳的周期ACC监视器**，目标排查“单位错、过期信号、状态抖动”三类问题，15分钟定位任一注入故障；无效输入无有效控制输出。
落实：
- monitor.c中20ms调用间隔与100ms采样年龄分别检查；
- speed_mps明确m/s，使用speed_unit验证；
- speed_cycle/distance_cycle一致快照；
- ACC_OFF/ACTIVE/FAULT状态，35/41m滞环；输入无效时valid=0 alert=0；
- 9场景×7帧，严格GCC实际C和CTest，JS独立回归；
- 另有本地临时篡改阈值使测试失败、恢复后通过的验证。

## 保持
未修改任何个人私有记录仓库数据或既有D01–D13笔记；保留源码中文注释、代码旁解释、自动保存、题号、详细实作及本地真实C验收。新课程完成的GitHub Actions验证是参考源码正确性，不算学员WSL成绩。
