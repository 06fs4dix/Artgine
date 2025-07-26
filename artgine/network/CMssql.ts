import { CRDBMS } from "./CORM.js";
import * as mssql from "mssql";

export class CMssql extends CRDBMS {
    protected mConn: mssql.ConnectionPool;

    async Init(): Promise<void> {
        this.mConn = await mssql.connect({
            user: this.mAuth.mID,
            password: this.mAuth.mPW,
            server: this.mAuth.mAddres,
            port: parseInt(this.mAuth.mPort, 10),
            database: this.mDatabase,
            options: {
                encrypt: false,
                trustServerCertificate: true
            }
        });
    }

    async Send(_query: string, _objVec: Array<any> = null): Promise<void> {
        if (!this.mConn) throw new Error("Connection not initialized");

        const request = this.mConn.request();
        if (_objVec) {
            _objVec.forEach((val, idx) => {
                request.input(`p${idx}`, val);
            });
        }
        await request.query(_query);
    }

    async Recv(_query: string, _objVec: Array<any> = null): Promise<any[][]> {
        if (!this.mConn) throw new Error("Connection not initialized");

        const request = this.mConn.request();
        if (_objVec) {
            _objVec.forEach((val, idx) => {
                request.input(`p${idx}`, val);
            });
        }
        const result = await request.query(_query);
        return result.recordset.map(row => Object.values(row));
    }

    async Close() {
        await this.mConn?.close();
    }
}
