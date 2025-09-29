declare module 'sql.js' {
  export interface Statement {
    bind(values?: unknown[] | Record<string, unknown>): void;
    get(): unknown[];
    getAsObject(params?: Record<string, unknown>): Record<string, unknown>;
    step(): boolean;
    free(): void;
  }

  export interface Database {
    run(sql: string, params?: Array<string | number | Uint8Array | null>): void;
    prepare(sql: string, params?: Array<string | number | Uint8Array | null>): Statement;
    exec(sql: string): Array<{ columns: string[]; values: unknown[][] }>;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (bytes?: Uint8Array | null) => Database;
  }

  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export default function initSqlJs(config?: InitSqlJsConfig): Promise<SqlJsStatic>;
}
