import { ColumnInfo, ConnectionConfig, QueryResult } from '../../types';

/**
 * 数据库适配器接口，统一多数据库的元数据查询与执行，便于 DatabaseService 使用。
 */
export interface IDbAdapter {
    connect(config: ConnectionConfig): Promise<void>;
    disconnect(): Promise<void>;
    getTableNames(): Promise<string[]>;
    getTableComment(tableName: string): string | undefined;
    getTableSchema(tableName: string): Promise<ColumnInfo[]>;
    getCreateTableStatement(tableName: string): Promise<string>;
    /** 执行 SQL，最多返回 maxRows 行，用于查询窗口与性能控制 */
    executeSql(sql: string, maxRows?: number): Promise<QueryResult>;
}
