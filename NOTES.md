# 流浪汉模拟器 — 交接笔记

给接手这个项目的对话看的一页说明。换对话、换人，先读这里，就不用重新翻历史。

## 现在是什么状态

- 版本 0.11.1，能正常跑（在应用里点 Run 即可，无报错）。
- 零构建：纯 HTML + ES 模块 + Phaser 4.2.1（`vendor/phaser.min.js`，全局 `Phaser`，不 import）。
- 没有打包这一步。这个项目不存在"编译/构建/打包"，改完文件直接运行。
- 远端：`https://github.com/441423095-dotcom/hobo-sim.git`

## 体量现状

总计约 23,800 行。两个场景文件仍然占了约 60%，但都按功能分节（见下），
所以改一个功能不需要读整个文件，只需要定位到那一节。

| 文件 | 行数 | 说明 |
| --- | --- | --- |
| `src/scenes/StreetScene.js` | ~6,950 | 街道本身：建造、移动、拾荒、偷窃、帮派、时间 |
| `src/scenes/HudScene.js` | ~7,275 | 所有界面：摇杆、按钮、面板、对话、地图 |
| `src/art/scenery.js` | 3,493 | 街道美术，一张张贴图函数 |
| `src/art/sprites.js` | 804 | 人物与道具的像素图 |
| `src/shops.js` | 722 | 每家店的位置、商品、价格 |
| `src/audio.js` | 620 | 全部音效，代码合成 |
| `src/errands.js` | 373 | 店主的私事（纯数据） |
| `src/counter.js` | 357 | 买卖：买货、卖废品、卖赃物、回收、吃东西 |
| `src/repair.js` | 174 | 工具磨损与修理 |
| `src/shopkeepers.js` | 167 | 私事的运行逻辑 |
| 其余 30 多个模块 | 各 10–400 | 每个系统一个小文件 |

## 已经做过的拆分

1. **`src/repair.js`** — 工具耐久（开锁器 / 刀片 / 手推车）、零件、修理价格、修好。
2. **`src/shopkeepers.js`** — 店主私事的整套机器：盯时间/天气/通缉、交差、发奖励。
3. **`src/counter.js`** — 所有柜台的买卖：买食物、买工具、按行买货（buyStock）、
   卖废品、卖赃物、整批卖、回收、把包里的东西当场吃掉。这是最常改的一块，
   现在改价格、改规则只开这一个文件。

拆分的写法是固定的：模块导出函数，第一个参数是场景 `scene`，用 `scene.run`、
`scene.player`、`scene.floatText(...)` 等；场景里保留一个同名方法转发。这样
调用方完全不用改，拆分可以一个一个来。

场景给这些模块留了两个只读上限：`scene.hungerMax` 和 `scene.energyMax`。

## 两个大场景的分节顺序（改功能时先按标题找）

两个文件都用 `// ------ 标题` 分节，按下面这个顺序从上往下排。行号会变，
标题不会，所以搜标题就行。

`StreetScene.js`：chapter one → the gangs → building → public → the counters →
crafting → the city → gameplay → begging → weather, city → the bag →
tester extras → things on the street → the bus stops → the bus depot →
the night market → the slot machine → the bench → the machines → old Zhou →
the shopkeepers' business → police → walkers → frame → layout

`HudScene.js`：construction → the QTE → a mugging → things on the street →
peddling → tester panel → tester bits → begging style → backpack → the seasons →
today's jobs → first time in → talking head → old Zhou's lore → king of hobos →
layout → input → shop → the stalls → the city map → the bench → the nook →
the vending box → the slot machine → end of a run → frame

## 在这个项目里干活的规矩

1. **只做定点修改。** 用"替换某一段"的方式改，不整份重写 `StreetScene.js` / `HudScene.js`。
2. **一次一件事。** 说清改哪一块、改成什么样，不要"把整个游戏再写一遍"。
3. **新功能不要继续堆进两个大场景。** 写成 `src/` 下的独立小模块，场景里一行转发。
4. **不要在聊天里贴大段代码。** 代码在文件里，对话只讨论改哪一段。
5. 改完确认：所有 `import` 路径带 `.js` 且文件真实存在；新场景要在 `src/main.js` 的
   `scene` 数组里注册；纹理/音频 key 与实际加载的一致。

## 下一步还能继续拆的地方（按价值排序）

1. `HudScene` 的每个面板各成一块（商店、地图、背包、家、售货机、老虎机），
   每个约 300–500 行 → `src/panels/` 下一个文件。面板都在建 Phaser 对象、
   存在 `this` 上，搬的时候要一个面板一次、搬完立刻跑一遍。
2. `art/scenery.js` 按区域拆成几个文件（市场、车站、后巷、公园、营地、黑街）。
3. `StreetScene` 的 `police` / `walkers` 两节（约 600 行）→ `src/crowd.js`。

每搬一次都要单独验证一次，不要一口气搬完 —— 那正是之前卡死的原因。

