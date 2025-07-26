import { CRDBMS } from "./CORM.js";
// import { Connection, RowDataPacket } from 'mysql2/promise';
// import * as mysql from 'mysql2/promise';
import { CPool } from "../basic/CPool.js";
let mysqlModule = null;

export class CMysql extends CRDBMS 
{
    protected mConn;
    async Init(): Promise<void> 
    {
        //this.mType=CRDBMS.eType.Mysql;
        if (!mysqlModule) {
            mysqlModule = await import("mysql2/promise");
        }

        this.mConn = await mysqlModule.createConnection({
            host: this.mAuth.mAddres,
            port: parseInt(this.mAuth.mPort, 10),
            user: this.mAuth.mID,
            password: this.mAuth.mPW,
            database: this.mDatabase,
        });
    }

    async Send(_qurry: string, _objVec: Array<any> = null): Promise<void> 
    {
        if (!this.mConn) throw new Error('Connection not initialized');
        if (_objVec && _objVec.length > 0) {
            await this.mConn.execute(_qurry, _objVec);
        } else {
            await this.mConn.execute(_qurry);
        }
    }

    async Recv(_qurry: string, _objVec: Array<any> = null): Promise<any[][]>  
    {
        if (!this.mConn) throw new Error('Connection not initialized');
        let rows=[];

        if (_objVec && _objVec.length > 0) {
            [rows] = await this.mConn.query(_qurry, _objVec);
        } else {
            [rows] = await this.mConn.query(_qurry);
        }

        const result: any[][] = [];
        for (const row of rows) {
            result.push(Object.values(row));
        }

        return result;
    }
    async Close() {
        await this.mConn?.end();
    }
    async IsCollection(_name: string): Promise<boolean> {
        let rows= await this.Recv("SHOW TABLES LIKE ?", [_name]);
        
        return rows.length > 0;
    }
    async GetProjection(_table : string) : Promise<string[]>
    {
        let columnRows=await this.Recv(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?",
            [_table]
        );
         
        return columnRows.map(row => row[0]).filter(name => !["USER", "CURRENT_CONNECTIONS", "TOTAL_CONNECTIONS"].includes(name));
    }
}
