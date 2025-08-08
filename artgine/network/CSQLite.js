import { CRDBMS } from "./CORM.js";
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
export class CSQLite extends CRDBMS {
    mConn;
    async Init() {
        this.mConn = await open({
            filename: this.mDatabase || './db/artgine.sqlite',
            driver: sqlite3.Database
        });
    }
    async Send(_qurry, _objVec = null) {
        if (!this.mConn)
            throw new Error('Connection not initialized');
        if (_objVec && _objVec.length > 0) {
            await this.mConn.run(_qurry, _objVec);
        }
        else {
            await this.mConn.run(_qurry);
        }
    }
    async Recv(_qurry, _objVec = null) {
        if (!this.mConn)
            throw new Error('Connection not initialized');
        try {
            let rows;
            if (_objVec && _objVec.length > 0) {
                rows = await this.mConn.all(_qurry, _objVec);
            }
            else {
                rows = await this.mConn.all(_qurry);
            }
            const result = [];
            for (const row of rows) {
                result.push(Object.values(row));
            }
            return result;
        }
        catch (err) {
            if (err.message.includes("no such table")) {
                return null;
            }
            else {
                throw err;
            }
        }
    }
    async IsCollection(_name) {
        let rows = await this.Recv("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [_name]);
        return rows.length > 0;
    }
    async Close() {
        await this.mConn?.close();
    }
    async GetProjection(_table) {
        let columnRows = await this.Recv(`PRAGMA table_info(${_table})`);
        return columnRows.map(row => row[1]);
        ;
    }
}
