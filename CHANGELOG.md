# 变更日志

本文件记录 “MyBatis Toolkit Pro” 扩展的重要变更。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.1.4] - 2026-03-15

### 修复

- **方法识别与跳转**：修复 Mapper 接口中多行方法签名（如参数列表换行、多行 `@Param`）未被识别、无法跳转到对应 XML 的问题。现支持跨行方法声明：当方法名与开括号在同一行但签名在后续行以 `);` 结束时，会正确解析方法名与参数并建立索引，CodeLens「跳转到 XML」与从 XML 跳回接口可正常使用。

---

## [1.1.3] - 2026-03-15

### 修复

- **索引与跳转**：修复 DAO 接口目录、Mapper XML 目录下存在子目录时无法被扫描和跳转的问题。现按工作区根目录使用 `RelativePattern` 递归收集 `**/*.java` 与 `**/*.xml`，确保如 `dao/order/OrderMapper.java`、`mapper/order/OrderMapper.xml` 等子目录中的文件均被索引；文件监听改为按每个工作区根目录注册递归 watcher，子目录内新建/修改/删除也会正确触发索引更新。

---

## [1.1.2] - 2026-03-09

### 变更

- **SQL 校验**：补充窗口函数与分析函数相关关键字/函数名（如 `ROW_NUMBER`、`RANK`、`PARTITION`、`OVER` 等），避免被误当作列名校验并报“未在表中找到”。
- **列别名（无 AS）识别**：在 `SELECT expr alias`、`ROW_NUMBER() OVER(...) rn` 等场景下自动识别 `alias` 为列别名并加入别名集合，避免被当作真实列校验。
- **SQL 格式化缩进**：当未显式设置 `mybatisToolkit.formatting.indentSize` 时，缩进宽度自动跟随 VS Code 的 `editor.tabSize`（例如设置为 4 空格时，格式化后的 SQL 也使用 4 个空格）。

---

## [1.1.1] - 2026-03-08

### 新增

- **代码生成：MyBatis-Plus / MyBatis 风格可选**
  - 生成前可选择 **MyBatis-Plus（默认）** 或 **MyBatis** 代码风格。
  - MyBatis-Plus：Entity 使用 `@TableName`、`@TableId`、`@TableField` 等注解，Mapper 继承 `BaseMapper`，XML 仅保留 resultMap 与 Base_Column_List。
  - MyBatis：传统 Mapper 接口 + 完整 XML CRUD。
- **MyBatis-Plus 可配置项（均在设置 UI 中可配置，持久化后下次生成回显）**
  - **自动填充字段**（`codeGen.mybatisPlus.fillFields`）：可配置多列及填充策略（INSERT / INSERT_UPDATE），生成 `@TableField(value = "列名", fill = FieldFill.xxx)`；设置中支持添加项、列名与下拉选择。
  - **逻辑删除字段**（`codeGen.mybatisPlus.logicDeleteField`）：指定列名（如 `del_flag`），生成 `@TableLogic`，若该列在填充列表中则同时带 `fill`。
  - **主键生成策略**（`codeGen.mybatisPlus.idType`）：可选 AUTO、ASSIGN_ID、ASSIGN_UUID、INPUT、NONE，生成 `@TableId(type = IdType.xxx)`。
- **代码生成：目录名可自定义**
  - **Entity 目录名**（`codeGen.entityDirName`）：默认 `entity`，可改为 `po`、`domain` 等。
  - **Mapper/DAO 目录名**（`codeGen.mapperDirName`）：默认 `mapper`，可改为 `dao` 等。
  - **Mapper XML 目录名**（`codeGen.xmlDirName`）：默认 `mapper`（位于 `src/main/resources` 下），可改为 `mappers`、`xml` 等。
  - **Service 目录名**（`codeGen.serviceDirName`）：默认 `service`，预留供后续生成 Service 层使用。

### 变更

- **设置 UI**：所有配置项均可在「设置」中搜索 MyBatis / mybatisToolkit 进行配置；配置总说明与各选项的 `markdownDescription` 已补充，便于在 UI 中查看。
- **fillFields**：数组项 schema 完善（required、enumDescriptions、默认说明），便于在设置界面中添加/编辑自动填充字段。

---

## [1.1.0] - 2026-03-07

### 新增

- **SQL 查询与执行**
  - **选择数据库**：在 SQL 编辑器标题栏或侧栏选择/连接数据库后再执行 SQL。
  - **新建查询窗口**：通过命令或入口打开空白 SQL 文件，用于编写并执行 SQL。
  - **执行选中 SQL**：在 SQL 文件中执行当前光标所在语句或选中内容。
  - **执行全部 SQL**：按分号拆分并依次执行当前文件中的多条语句；每条语句对应一个独立结果窗口（如「查询结果 (1/N)」），便于分别查看。
- **查询结果面板**
  - 结果表支持**行号列**（第一列显示行号）。
  - **分页**：上一页/下一页，可查看大量结果。
  - **日期时间格式可配置**：在设置中配置 `mybatisToolkit.queryResult.datetimeFormat`、`dateFormat`、`timeFormat`（占位符：`%Y` `%m` `%d` `%H` `%i` `%s`），默认分别为 `%Y-%m-%d %H:%i:%s`、`%Y-%m-%d`、`%H:%i:%s`。
  - 列表与点击单元格**弹出内容**使用同一套格式化，时间显示一致。
  - DML 语句展示影响行数、执行时长；SELECT 展示返回行数。
  - 列宽可拖拽、单元格点击可查看完整内容。
- **快捷键**（仅在 SQL 编辑器中生效）
  - **Ctrl+Shift+,**（Mac：Cmd+Shift+,）：执行选中 SQL。
  - **Ctrl+Shift+.**（Mac：Cmd+Shift+.）：执行全部 SQL。
  - 可在 VS Code「键盘快捷方式」中搜索「执行选中 SQL」「执行全部 SQL」修改绑定。
- **激活**：增加 `onLanguage:sql`，在打开 SQL 文件时激活扩展，确保上述命令与快捷键可用。
- **生成代码（从表）**
  - 生成前**选择基础目录**：可从工作区根目录列表选择、或「选择其他文件夹」、或「输入路径」；默认当前项目根目录。Entity/Mapper/XML 生成在该目录下的 `src/main/java`、`src/main/resources`。
  - **主键自动识别**：根据列 `Key='PRI'` 识别主键列，生成的 Mapper 接口与 XML 中 update/delete/selectById 使用实际主键列名（如 `user_id`），不再写死 `id`。
  - 生成过程**异常捕获**与明确成功/失败提示。
- **为方法生成 XML（Quick Fix）**
  - 命令 `mybatisToolkit.generateXmlForMethod` 已在 `package.json` 中声明，避免「command not found」。
  - 传 Java 文件 **URI 字符串**而非 document，避免命令序列化后执行失败。
  - 插入前**二次检查**是否已存在同 id，避免重复插入；读 XML 失败时 Quick Fix 不展示。
- **方法名生成 SQL**：实体名转表名时去掉前导下划线（如 `User` → `user`，不再生成 `_user`）。

### 变更

- 执行多条 SQL 时由「仅显示最后一条结果」改为「每条语句一个结果窗口」。
- 查询结果中日期/时间列统一按配置格式显示（包括 Date 对象与常见字符串格式的解析与格式化）。

### 修复

- 修复查询结果中时间列仍显示为 `Date.toString()` 原始格式的问题，改为使用配置的日期时间格式。
- 修复在纯 SQL 文件中快捷键不生效的问题（通过 SQL 激活事件与快捷键绑定）。
- 修复「为 xxx 生成 XML」报错 `command 'mybatisToolkit.generateXmlForMethod' not found`（命令声明 + 传参方式）。

---

## [1.0.1] - 2025-12-17

### 新增

- **多数据库支持**：全面支持 8 种数据库方言（MySQL、PostgreSQL、Oracle、SQL Server、SQLite、DB2、H2、MariaDB）。
- **方言特定格式化**：SQL 格式化按所选数据库语法规则处理（引号、关键字等）。
- **配置**：新增 `mybatisToolkit.defaultDatabaseType`，用于在无活动连接时指定默认方言。
- **连接配置**：数据库连接配置支持 `type` 字段以指定数据库类型。

### 变更

- 参考标准 SQL 关键字与函数列表，使各方言支持更稳健。
- 改进 SQL 分词器性能。
