import * as vscode from 'vscode';
import { ConnectionConfig } from './types';
import { INDEX_PARSE_CONCURRENCY, INDEX_DEBOUNCE_MS, VALIDATION_DEBOUNCE_MS } from './constants';

const SECTION = 'mybatisToolkit';

/**
 * 统一配置入口：所有扩展配置均由此读取，便于维护与默认值一致。
 * 设置界面（UI）中的项与此处键一一对应。
 */
export function getConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(SECTION);
}

// ---------- 数据库与连接 ----------

export function getDefaultDatabaseType(): string {
    return getConfig().get<string>('defaultDatabaseType', 'MySQL');
}

export function getConnections(): ConnectionConfig[] {
    return getConfig().get<ConnectionConfig[]>('connections', []);
}

export function getLegacyDatabaseConfig(): {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
} {
    const cfg = vscode.workspace.getConfiguration(`${SECTION}.database`);
    return {
        host: cfg.get<string>('host', 'localhost'),
        port: cfg.get<number>('port', 3306),
        user: cfg.get<string>('user', 'root'),
        password: cfg.get<string>('password', ''),
        database: cfg.get<string>('database', '')
    };
}

export function getDatabaseConnectionLimit(): number {
    return vscode.workspace.getConfiguration(`${SECTION}.database`).get<number>('connectionLimit', 10);
}

// ---------- 验证 ----------

export function isValidationEnabled(): boolean {
    return vscode.workspace.getConfiguration(`${SECTION}.validation`).get<boolean>('enable', true);
}

// ---------- 导航与索引 ----------

export function getNavigationExclude(): string[] {
    return getConfig().get<string[]>('navigation.exclude', [
        'target', 'build', 'bin', 'out', 'dist', 'node_modules', '.git'
    ]);
}

// ---------- 性能（可 UI 配置，缺省用 constants） ----------

export function getIndexParseConcurrency(): number {
    return getConfig().get<number>('performance.indexParseConcurrency', INDEX_PARSE_CONCURRENCY);
}

export function getIndexDebounceMs(): number {
    return getConfig().get<number>('performance.indexDebounceMs', INDEX_DEBOUNCE_MS);
}

export function getValidationDebounceMs(): number {
    return getConfig().get<number>('performance.validationDebounceMs', VALIDATION_DEBOUNCE_MS);
}

// ---------- 格式化 ----------

export function getFormattingIndentSize(): number {
    return getConfig().get<number>('formatting.indentSize', 2);
}

// ---------- 查询结果（日期时间格式） ----------

export interface QueryResultDateFormats {
    datetimeFormat: string;
    dateFormat: string;
    timeFormat: string;
}

export function getQueryResultDateFormats(): QueryResultDateFormats {
    const cfg = getConfig();
    return {
        datetimeFormat: cfg.get<string>('queryResult.datetimeFormat', '%Y-%m-%d %H:%i:%s'),
        dateFormat: cfg.get<string>('queryResult.dateFormat', '%Y-%m-%d'),
        timeFormat: cfg.get<string>('queryResult.timeFormat', '%H:%i:%s')
    };
}

// ---------- 高亮颜色 ----------

export interface HighlightColors {
    tableName: string;
    keyword: string;
    function: string;
    param: string;
}

export function getHighlightColors(): HighlightColors {
    const cfg = getConfig();
    return {
        tableName: cfg.get<string>('highlights.tableNameColor', '#FFAB70'),
        keyword: cfg.get<string>('highlights.keywordColor', '#C586C0'),
        function: cfg.get<string>('highlights.functionColor', '#DCDCAA'),
        param: cfg.get<string>('highlights.paramColor', '#9CDCFE')
    };
}
