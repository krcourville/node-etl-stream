import pg from "pg";

export const pool = new pg.Pool({
    connectionString: "postgres://postgres:123456@localhost:5432/postgres"
});
