declare module 'oracledb' {
    export interface Pool {
        getConnection(): Promise<Connection>;
        close(gracePeriod?: number): Promise<void>;
    }
    export interface Connection {
        execute<T>(sql: string, binds?: object, options?: object): Promise<Result<T>>;
        close(): Promise<void>;
    }
    export interface Result<T> {
        rows?: T[];
    }
    export function createPool(config: object): Promise<Pool>;
}
