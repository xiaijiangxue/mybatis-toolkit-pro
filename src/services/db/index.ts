import { ConnectionConfig } from '../../types';
import { IDbAdapter } from './IDbAdapter';
import { MySQLAdapter } from './MySQLAdapter';
import { PgAdapter } from './PgAdapter';
import { OracleAdapter } from './OracleAdapter';

export function createDbAdapter(config: ConnectionConfig): IDbAdapter {
    switch (config.type) {
        case 'PostgreSQL':
            return new PgAdapter();
        case 'Oracle':
            return new OracleAdapter();
        case 'MySQL':
        case 'MariaDB':
        default:
            return new MySQLAdapter();
    }
}

export { IDbAdapter } from './IDbAdapter';
