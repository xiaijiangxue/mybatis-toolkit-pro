# MyBatis Toolkit Pro

[English](README_en.md) | [中文](README.md)

Professional MyBatis development toolkit for VS Code. Improve productivity with smart navigation, SQL validation, multi-datasource management, and built-in query execution.

---

## Installation

- **VS Code Marketplace**: Search for "MyBatis Toolkit Pro" and install.
- **VSIX**: Download the `.vsix` from [Releases](https://github.com/xiyeming/mybatis-toolkit-pro/releases) and install via "Install from VSIX...".

**Requirements**: VS Code 1.100.0 or higher.

---

## Feature Overview

| Module | Description |
|--------|-------------|
| Smart Navigation | Mapper ↔ XML jump, table/ResultMap property/Java class go-to-definition, parameter hover and type hints |
| Smart Completion | Parameter property completion, dynamic SQL tag completion |
| Property Rename Sync | Sync XML references and Java getter/setter when renaming entity properties |
| SQL Highlighting & Formatting | 8 database dialects, keyword/function/parameter highlighting, configurable quotes and indent |
| Database Management | Multiple connections, Database Explorer, table schema view, run SQL and view results |
| Query & Results | New query, run selected/all SQL, pagination, row numbers, configurable date format, multiple result tabs |
| Validation | Table/column existence, resultMap/resultType vs Java property matching, nested association/collection |
| Code Generation | Generate Entity / Mapper interface / XML from table |
| Method-to-SQL | Generate XML SQL from Mapper method name (Quick Fix) |

---

## 1. Smart Navigation

### 1.1 Go to Definition

- **Database tables**: Click a table name in XML → jump to virtual schema view.
- **ResultMap properties**: **Ctrl+Click (Cmd+Click)** on `property` in `<resultMap>` → jump to Java field.
- **Java classes**: `resultType` / `parameterType` → jump to the corresponding Java class.

### 1.2 Mapper ↔ XML Jump

- **Shortcut**: `Ctrl+Alt+D` (Windows/Linux) / `Cmd+Alt+D` (macOS)
- **Command Palette**: Run "Jump to XML" or "Jump to Mapper"
- **CodeLens**: Click the "Jump to XML" link above the code

### 1.3 Hover

Hover over `#{variable}` / `${variable}` to see Java type and Javadoc.

---

## 2. Smart Completion

### 2.1 Parameter Property Completion

When typing `#{` or inside `${}` in XML, auto-suggest:

- **Method parameters**: Parameter names defined in Mapper methods
- **Object properties**: Field properties of parameter objects (supports nested objects)
- **Auto-close**: Automatically adds closing `}` after selection

**Example**:
```xml
<!-- After typing #{, auto-suggests userName, userId, etc. -->
<select id="findUser">
    SELECT * FROM user WHERE name = #{userName}
</select>
```

### 2.2 Dynamic SQL Tag Completion

After typing `<`, auto-suggest MyBatis dynamic SQL tags:

| Input | Completion |
|-------|------------|
| `<if` | `<if test=""></if>` |
| `<where` | `<where></where>` |
| `<set` | `<set></set>` |
| `<foreach` | `<foreach collection="" item="" index="" open="" close="" separator=""></foreach>` |
| `<choose` | `<choose><when test=""></when><otherwise></otherwise></choose>` |
| `<when` | `<when test=""></when>` |
| `<otherwise` | `<otherwise></otherwise>` |
| `<trim` | `<trim prefix="" suffix="" prefixOverrides="" suffixOverrides=""></trim>` |
| `<bind` | `<bind name="" value="" />` |
| `<sql` | `<sql id=""></sql>` |
| `<include` | `<include refid="" />` |

---

## 3. Property Rename Sync

When you rename a property in a Java entity class and save, automatically detect and sync all related references:

### 3.1 Supported Update Scope

| File Type | Updates |
|-----------|---------|
| **XML files** | `property` attributes, `#{}` parameters, `${}` parameters, `test` condition expressions |
| **Java files** | `getXxx()` / `setXxx()` / `isXxx()` method names |

### 3.2 Usage

1. Open a Java entity class file
2. Rename a property (e.g., `userName` → `name`)
3. Save the file (Ctrl+S / Cmd+S)
4. A confirmation dialog appears showing all affected files
5. Click a file name to preview changes (diff view)
6. Confirm to auto-update all files

### 3.3 Confirmation Dialog Example

```
Property Rename: userName → name

✓ Confirm update all files
  XML: 2 files 5 changes | Java: 3 files 8 changes
✗ Cancel

─────────────────────────
📄 XML Files (2)
    📄 CustomerMapper.xml - 3 changes
    📄 OrderMapper.xml - 2 changes

─────────────────────────
☕ Java Files (3)
    ☕ CustomerService.java - 4 changes
    ☕ CustomerMapper.java - 2 changes
    ☕ OrderService.java - 2 changes
```

---

## 4. SQL Highlighting & Formatting

- **Dialects**: MySQL, PostgreSQL, Oracle, SQL Server, SQLite, DB2, H2, MariaDB.
- **Highlighting**: Keywords, system functions, MyBatis parameters; dialect-specific keywords (e.g. PostgreSQL `RETURNING`, `ILIKE`).
- **Formatting**: Dialect-aware quotes and indent; supports subqueries, `UNION`, `CASE WHEN`; preserves XML and SQL comments.
- **Default dialect**: Set `mybatisToolkit.defaultDatabaseType`; if a database is connected, the current connection type is used first.

---

## 5. Database Management & Query Execution

### 5.1 Database Explorer (MyBatis sidebar)

- **Connections**: "Add connection" to configure host, port, user, password, database type and name; multiple datasources supported.
- **Actions**: Connect / Disconnect, Edit, Remove, Refresh.
- **Tables & schema**: Expand a connection to see tables; right-click a table for "Open table schema" or "Generate code".

### 5.2 Running SQL

1. **Select database**: Click "Select database" in the SQL editor title bar, or connect from the sidebar, then run SQL.
2. **New query**: Run "New query window" from the command palette or from the Database Explorer to open a blank SQL file.
3. **Execution**:
   - **Run selected SQL**: Execute the selection, or the current statement when nothing is selected.
   - **Run all SQL**: Execute all statements in the current file (split by semicolons).

### 5.3 Shortcuts (SQL editor only)

| Action | Windows / Linux | macOS |
|--------|-----------------|-------|
| Run selected SQL | `Ctrl+Shift+,` | `Cmd+Shift+,` |
| Run all SQL | `Ctrl+Shift+.` | `Cmd+Shift+.` |

You can change these in **Keyboard Shortcuts** (Ctrl+K Ctrl+S) by searching for "Run selected SQL" or "Run all SQL".

### 5.4 Query Results

- **Single execution**: One result tab; shows affected rows, execution time, and row count when applicable.
- **Run all SQL**: Each statement gets its own result tab (e.g. "Query result (1/3)") for separate viewing.
- **Result grid**: Row number column, pagination (prev/next), resizable columns, click a cell to popover full content.
- **Date/time**: Display follows settings; list and popover use the same format.
  - Settings: `queryResult.datetimeFormat`, `queryResult.dateFormat`, `queryResult.timeFormat` (placeholders: `%Y` `%m` `%d` `%H` `%i` `%s`).

### 5.5 Show full structure

From the Database Explorer view title or related entry, run "Show full structure (tables & columns)" to open a result panel with all tables and columns for the current database.

---

## 6. Advanced Validation

- **SQL validation**: Real-time check that table and column names in SQL exist.
- **Result mapping**: Check that `resultMap` / `resultType` match Java class properties (including snake_case to camelCase).
- **Nested**: Validates properties inside `<association>` and `<collection>`; uses resultMap explicit columns to reduce false positives.
- Toggle with `mybatisToolkit.validation.enable` in settings.

---

## 7. Code Generation

- In the **Database Explorer**, right-click a table → "Generate code (Entity/Mapper/XML)".
- Enter the package name when prompted; generates Entity, Mapper interface, and XML with basic CRUD and type mapping; Lombok optional.

---

## 8. Method name to SQL

- In a Mapper interface, write a method name (e.g. `selectUserByNameAndAge`); use the lightbulb Quick Fix to generate the corresponding XML SQL.
- Supports prefixes: `select`, `update`, `delete`, `count`, `insert`; condition links: `And`, `Or`; suffixes like `Like`, `In`, etc.

---

## Configuration Summary

Search for "MyBatis" in VS Code settings to see all options.

| Category | Example | Description |
|-----------|---------|-------------|
| Dialect | `mybatisToolkit.defaultDatabaseType` | Default database type (highlighting/formatting) |
| Connections | `mybatisToolkit.connections` | Multi-datasource list; also host/port/user/password/database |
| Validation | `mybatisToolkit.validation.enable` | Enable/disable SQL and mapping validation |
| Navigation | `mybatisToolkit.navigation.exclude` | Directories to exclude from indexing (e.g. target, node_modules) |
| Performance | `indexParseConcurrency`, `indexDebounceMs`, `validationDebounceMs` | Index concurrency and debounce |
| Query result | `queryResult.datetimeFormat` etc. | Date/time display formats |
| Formatting | `formatting.indentSize` | SQL indent size (spaces) |
| Highlights | `highlights.tableNameColor` etc. | Table name, keyword, function, parameter colors |

---

## Contributing

Issues and suggestions are welcome via [GitHub Issues](https://github.com/xiyeming/mybatis-toolkit-pro/issues). Pull requests are welcome.

## License

[MIT](LICENSE.md)
