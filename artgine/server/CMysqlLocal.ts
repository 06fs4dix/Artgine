import { CClass } from "../basic/CClass.js";
import { CPool } from "../basic/CPool.js";
import { CAuthInfo } from "../network/CAuthInfo.js";
import { CMysql } from "../network/CMysql.js";


export class CMysqlLocal extends CMysql
{

    constructor() 
    {
        super();
        this.mAuth=new CAuthInfo();
        this.mAuth.mID="root";
        this.mAuth.mPW="root";
        this.mAuth.mAddres="127.0.0.1";
        this.mAuth.mPort="3306";
        this.mDatabase="artgine";
    }

}

