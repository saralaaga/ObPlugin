# Task View Column Layout Design

## 背景

当前 Task Hub 的任务视图是按日期桶分组的单列列表。它可用，但在任务变多后会暴露几个问题：

- 信息层级偏平，用户需要上下滚动才能比较不同日期、标签和来源。
- 任务行只显示摘要，源笔记、上下文、外部来源状态等信息没有稳定展示区域。
- 点击任务当前主要用于跳转，容易和“先查看详情再决定操作”的工作流冲突。
- Apple Reminders 回写开关加入后，需要更清楚地解释哪些外部任务可写、哪些仍只读。

目标是把任务视图升级成一个安静、密集、可扫描的三栏工作台，同时继续复用现有筛选、任务索引和完成逻辑。

## 设计目标

- 让用户能在一个屏幕内同时看到聚合、任务列表和任务详情。
- 保留顶部筛选条，不把已有筛选能力藏起来。
- 左栏提供快速聚合入口：日期桶、标签、来源。
- 中栏负责高密度任务列表和当前选中态。
- 右栏负责完整详情、上下文和操作。
- 在窄 pane 下自动降级，不出现文字重叠或横向溢出。
- 不引入 React/Vue/Svelte，不引入大型 UI 库。

## 推荐布局

桌面 / 宽 pane：

```text
┌──────────────────────────────────────────────────────────────┐
│ 顶部：视图切换 + 状态/日期/标签/来源/搜索筛选 + 刷新按钮       │
└──────────────────────────────────────────────────────────────┘

┌──────────────┬──────────────────────────┬────────────────────┐
│ 左栏          │ 中栏                      │ 右栏                │
│ 分组/聚合      │ 任务列表                  │ 详情/上下文           │
├──────────────┼──────────────────────────┼────────────────────┤
│ 全部          │ □ 写产品方案 #work         │ 写产品方案            │
│ 逾期          │ □ 回邮件 #client           │ 来源 / 日期 / 标签      │
│ 今天          │ □ Apple Reminder          │ 上下文预览             │
│ 本周          │                          │ 打开源笔记 / 完成       │
│ 未来          │                          │ 外部来源写入状态         │
│ 无日期        │                          │                      │
│              │                          │                      │
│ 标签          │                          │                      │
│ #work        │                          │                      │
│ #life        │                          │                      │
│              │                          │                      │
│ 来源          │                          │                      │
│ Vault        │                          │                      │
│ Apple        │                          │                      │
└──────────────┴──────────────────────────┴────────────────────┘
```

窄 pane：

```text
┌──────────────────────────────┐
│ 顶部筛选                      │
├──────────────────────────────┤
│ 聚合 chips 横向滚动            │
├──────────────────────────────┤
│ 任务列表                      │
├──────────────────────────────┤
│ 当前选中任务详情               │
└──────────────────────────────┘
```

## 交互细节

### 左栏聚合

左栏展示三个区块：

- 日期：全部、逾期、今天、本周、未来、无日期。
- 标签：按当前任务结果计算 top tags，显示任务数量。
- 来源：Vault tasks、Apple Reminders。

点击左栏项会更新现有 `TaskFilterState`，不新增第二套筛选模型。左栏选中态要和顶部筛选保持一致：

- 点击“今天”相当于设置 `dateBucket = "today"`。
- 点击标签相当于设置该标签筛选。
- 点击来源相当于设置来源筛选或来源快捷状态。

第一版来源筛选可以复用现有 source query，但实现时应封装为明确函数，避免散落字符串判断。

### 中栏任务列表

中栏展示当前筛选后的任务。任务行包含：

- checkbox。
- 任务文本。
- 日期 badge。
- 标签摘要。
- 来源 badge。
- 选中态。

点击任务行：只选中任务并刷新右栏详情。

双击任务行：打开源笔记或外部任务提示。

checkbox：

- Vault 任务：沿用当前安全写回逻辑。
- Apple Reminders：只有 `remindersWritebackEnabled` 开启时可点。
- 其他外部项：保持禁用。

### 右栏详情

右栏展示当前选中任务；没有选中任务时展示轻量空状态。详情字段：

- 完整任务文本。
- 状态：未完成 / 已完成。
- 日期。
- 标签。
- 来源名称。
- 源文件路径和行号。
- heading / context preview。
- 外部来源说明。

操作按钮：

- 打开源笔记：仅 Vault 任务可直接跳转。
- 完成 / 重新打开：Vault 任务和开启回写的 Apple Reminders 可用。
- 对只读外部任务显示禁用状态和原因。

## 状态模型

在 `TaskHubView` 中新增局部状态：

```ts
selectedTaskId?: string;
```

渲染流程：

1. 获取所有任务。
2. 应用现有顶部筛选。
3. 应用左栏快捷筛选。
4. 如果 `selectedTaskId` 不在当前结果内，自动选择第一条任务。
5. 渲染左栏聚合、中栏列表、右栏详情。

注意：不要把选中态写入插件设置。它是 view session 状态。

## 组件拆分

建议把当前 `renderTasksView.ts` 拆成小型 renderer：

- `src/views/renderTasksView.ts`
  - 负责组装三栏任务工作台。
- `src/views/renderTaskSidebar.ts`
  - 左栏聚合导航。
- `src/views/renderTaskList.ts`
  - 中栏任务列表。
- `src/views/renderTaskDetails.ts`
  - 右栏详情和操作按钮。

共享类型：

```ts
type TaskSelectionState = {
  selectedTaskId?: string;
};

type TaskViewHandlers = {
  onSelectTask(task: TaskItem): void;
  onOpenTask(task: TaskItem): void;
  onToggleComplete(task: TaskItem): void;
  onDateBucketSelect(bucket: TaskFilterState["dateBucket"] | undefined): void;
  onTagSelect(tag: string): void;
  onSourceSelect(source: "all" | "vault" | "apple-reminders"): void;
};
```

## 样式方向

整体风格保持 Obsidian 原生感：

- 不做营销式 hero 或装饰性大卡片。
- 三栏是工作台布局，不是卡片套卡片。
- 左栏宽度约 `180px`，中栏 `minmax(260px, 1fr)`，右栏约 `280px`。
- 任务行高度稳定，避免 badge 或 hover 导致布局跳动。
- 使用 `var(--background-primary)`、`var(--background-secondary)`、`var(--text-muted)`、`var(--interactive-accent)`。
- 所有 class 继续使用 `.task-hub-*` 前缀。

建议 CSS 主结构：

```css
.task-hub-task-workbench {
  display: grid;
  grid-template-columns: minmax(150px, 180px) minmax(260px, 1fr) minmax(240px, 300px);
  gap: 10px;
}

@media (max-width: 760px) {
  .task-hub-task-workbench {
    grid-template-columns: 1fr;
  }
}
```

## 数据和行为边界

保留：

- 现有 Markdown 任务扫描和完成写回。
- 现有 Apple Reminders 完成/重新打开回写开关。
- 现有顶部筛选。
- 现有任务跳转。

不做：

- 不新增保存视图。
- 不新增拖拽排序。
- 不新增多选批量操作。
- 不编辑 Apple Reminder 标题、日期或清单。
- 不改 Calendar 视图。

## 测试计划

单元测试：

- 左栏聚合统计能正确显示日期桶、标签、来源数量。
- 点击左栏日期桶会调用对应 handler。
- Apple Reminders checkbox 在回写关闭时禁用，开启时可用。
- 点击任务行只选中，不直接跳转。
- 双击任务行调用打开任务 handler。
- 当前选中任务不在筛选结果中时，自动选择第一条。
- 右栏对 Vault / Apple Reminders / 只读外部任务显示正确操作状态。

验证命令：

```bash
npm test
npm run typecheck
npm run build
npm run smoke
```

手工验证：

- 在测试 vault 中打开任务视图。
- 切换顶部筛选，确认三栏同步刷新。
- 点击左栏日期、标签、来源，确认中栏列表变化。
- 点击任务行，确认右栏详情变化。
- 双击 Vault 任务，确认跳转源笔记。
- Apple Reminders 回写开关关闭时 checkbox 置灰。
- Apple Reminders 回写开关开启时 checkbox 可点。
- 窄 pane 下不发生按钮文字溢出或栏位重叠。

## 风险和取舍

- 三栏布局会增加 `TaskHubView` 的局部状态复杂度，因此要把 renderer 拆小，避免单文件继续膨胀。
- 左栏快捷筛选和顶部筛选可能互相影响，第一版必须明确“左栏只是设置现有筛选”，不要引入平行筛选系统。
- 窄 pane 体验需要手工看，因为 Obsidian pane 宽度变化比普通网页更频繁。
- 右栏详情如果信息过多会变成噪音，第一版只显示任务决策所需字段。

## Self Review

- Placeholder scan: 没有 TBD/TODO 或未决占位。
- Internal consistency: 三栏布局、状态模型和组件拆分一致；左栏复用现有筛选模型。
- Scope check: 只改任务视图，不触碰 Calendar/Tags/扫描/indexing 架构。
- Ambiguity check: 点击、双击、checkbox 和右栏按钮的职责已明确区分。
