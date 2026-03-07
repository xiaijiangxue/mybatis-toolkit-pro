import * as vscode from 'vscode';
import { ColumnInfo, ConnectionConfig, QueryResult } from '../types';
import { createDbAdapter, IDbAdapter } from './db';
import { getConnections as getConfigConnections, getLegacyDatabaseConfig } from '../config';

export class DatabaseService {
    private static instance: DatabaseService;
    private connections: ConnectionConfig[] = [];
    private activeConnectionId: string | undefined;
    private activeAdapter: IDbAdapter | undefined;

    private tableCache: Map<string, string> = new Map();
    private schemaCache: Map<string, ColumnInfo[]> = new Map();

    private outputChannel: vscode.OutputChannel;
    private _onDidReady = new vscode.EventEmitter<void>();
    public readonly onDidReady = this._onDidReady.event;
    private _onDidConfigChange = new vscode.EventEmitter<void>();
    public readonly onDidConfigChange = this._onDidConfigChange.event;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel("MyBatis Database");
        this.loadConnections();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    private loadConnections() {
        this.connections = getConfigConnections();
        if (this.connections.length === 0) {
            const legacy = getLegacyDatabaseConfig();
            if (legacy.host && legacy.database) {
                this.addConnection({
                    id: 'default',
                    name: 'Default',
                    type: 'MySQL',
                    host: legacy.host,
                    port: legacy.port,
                    user: legacy.user,
                    password: legacy.password,
                    database: legacy.database
                });
            }
        }
    }

    public getConnections(): ConnectionConfig[] {
        return this.connections;
    }

    public async addConnection(config: ConnectionConfig) {
        this.connections.push(config);
        await this.saveConnections();
    }

    public async removeConnection(id: string) {
        this.connections = this.connections.filter(c => c.id !== id);
        if (this.activeConnectionId === id) {
            await this.disconnect();
        }
        await this.saveConnections();
    }

    public async updateConnection(config: ConnectionConfig) {
        const index = this.connections.findIndex(c => c.id === config.id);
        if (index !== -1) {
            this.connections[index] = config;
            await this.saveConnections();
        }
    }

    private async saveConnections() {
        const config = vscode.workspace.getConfiguration('mybatisToolkit');
        await config.update('connections', this.connections, vscode.ConfigurationTarget.Global);
        this._onDidConfigChange.fire();
    }

    public async connect(id: string) {
        const config = this.connections.find(c => c.id === id);
        if (!config) return;

        await this.disconnect();

        this.outputChannel.appendLine(`正在连接到 ${config.name} (${config.host}) [${config.type}]...`);
        try {
            const adapter = createDbAdapter(config);
            await adapter.connect(config);
            this.activeAdapter = adapter;
            this.activeConnectionId = id;

            this.outputChannel.appendLine(`已连接到数据库: ${config.database}`);
            await this.refreshTables();
            this._onDidReady.fire();
            this._onDidConfigChange.fire();
        } catch (error: any) {
            this.outputChannel.appendLine(`连接 ${config.name} 失败: ${error.message}`);
            vscode.window.showErrorMessage(`连接 ${config.name} 失败: ${error.message}`);
            this.activeAdapter = undefined;
            this.activeConnectionId = undefined;
        }
    }

    public async disconnect() {
        if (this.activeAdapter) {
            await this.activeAdapter.disconnect();
            this.activeAdapter = undefined;
        }
        this.activeConnectionId = undefined;
        this.tableCache.clear();
        this.schemaCache.clear();
        this._onDidConfigChange.fire();
    }

    public getActiveConnectionId(): string | undefined {
        return this.activeConnectionId;
    }

    public getActiveDatabaseType(): string | undefined {
        if (!this.activeConnectionId) return undefined;
        const config = this.connections.find(c => c.id === this.activeConnectionId);
        return config?.type;
    }

    public async init() {
        if (this.connections.length > 0) {
            // 可选：自动连接上次使用的连接
        }
    }

    public async refreshTables() {
        if (!this.activeAdapter) return;
        try {
            const names = await this.activeAdapter.getTableNames();
            this.tableCache.clear();
            this.schemaCache.clear();
            for (const name of names) {
                const comment = this.activeAdapter.getTableComment(name) || '';
                this.tableCache.set(name, comment);
            }
            this.outputChannel.appendLine(`已刷新 ${this.tableCache.size} 张表。`);
        } catch (error: any) {
            this.outputChannel.appendLine(`获取表失败: ${error.message}`);
        }
    }

    public hasTable(tableName: string): boolean {
        return this.tableCache.has(tableName);
    }

    public async getTableNames(): Promise<string[]> {
        return Array.from(this.tableCache.keys());
    }

    public getTableComment(tableName: string): string | undefined {
        return this.tableCache.get(tableName);
    }

    public async getTableSchema(tableName: string): Promise<ColumnInfo[]> {
        if (!this.activeAdapter) return [];
        if (this.schemaCache.has(tableName)) {
            return this.schemaCache.get(tableName)!;
        }
        try {
            const columns = await this.activeAdapter.getTableSchema(tableName);
            this.schemaCache.set(tableName, columns);
            return columns;
        } catch (error: any) {
            this.outputChannel.appendLine(`获取 ${tableName} 的架构失败: ${error.message}`);
            return [];
        }
    }

    public async getCreateTableStatement(tableName: string): Promise<string> {
        if (!this.activeAdapter) return '';
        try {
            return await this.activeAdapter.getCreateTableStatement(tableName);
        } catch (error: any) {
            this.outputChannel.appendLine(`获取 ${tableName} 的 DDL 失败: ${error.message}`);
            return '';
        }
    }

    public isConnected(): boolean {
        return !!this.activeAdapter;
    }

    public isReady(): boolean {
        return !!this.activeAdapter && this.tableCache.size > 0;
    }

    /** 执行 SQL（用于查询窗口），最多返回 maxRows 行以保证性能 */
    public async executeSql(sql: string, maxRows = 500): Promise<QueryResult> {
        if (!this.activeAdapter) {
            return { columns: [], rows: [], totalFetched: 0, message: '请先选择并连接数据库' };
        }
        return this.activeAdapter.executeSql(sql, maxRows);
    }
}
