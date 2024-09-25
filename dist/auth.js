"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = __importDefault(require("pg"));
const { Pool, Client } = pg_1.default;
function db() {
    let pool;
    let client;
    async function init() {
        if (global.connection)
            return await global.connection.connect();
        const { Pool } = require('pg');
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        await client.release();
        global.connection = pool;
        await pool.connect();
    }
    init();
    return {
        query: async (query) => {
            const { rows } = await client.query(query);
            return rows;
        }
    };
}
const database = db();
exports.default = database;
