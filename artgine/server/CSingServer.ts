import { CConsol } from "../basic/CConsol.js";
import { CEvent } from "../basic/CEvent.js";
import { CJSON } from "../basic/CJSON.js";

import { URLPatterns } from "../network/CServerMain.js";
import { CServerRouter } from "../network/CServerRouter.js";
import express,{ Request, Response } from 'express';

import { CORMCondition, CORMField, CORMOption, CRDBMS } from "../network/CORM.js";
import { CUniqueID } from "../basic/CUniqueID.js";
import { CMysql } from "../network/CMysql.js";
import { CPool } from "../basic/CPool.js";
import { CVec3 } from "../geometry/CVec3.js";
import { CMail } from "../network/CMail.js";
import { CAuthInfo } from "../network/CAuthInfo.js";
import { CSQLite } from "../network/CSQLite.js";



CPool.On("CLocalDB",async ()=>{
    let CLocalDB=new CSQLite();
    await CLocalDB.Init();
    return CLocalDB;
},"Product");
let sql=await CPool.Product("CLocalDB")  as CRDBMS;
let con=new Array<CORMCondition>();
let option=new CORMOption();
option.mLimitOffset=0;
option.mLimit=1;
let data=await sql.Select("user_list", con, null, option);
if(data==null)
{
	await sql.Send(`CREATE TABLE IF NOT EXISTS user_list (
        _offset INTEGER PRIMARY KEY AUTOINCREMENT,
        _privateKey TEXT DEFAULT NULL,
        _publicKey TEXT DEFAULT NULL,
        _id TEXT DEFAULT NULL,
        _nick TEXT DEFAULT NULL,
        _email TEXT DEFAULT NULL,
        _loginType TEXT DEFAULT NULL,
        _lock INTEGER DEFAULT 0,
        _datetime DATETIME DEFAULT CURRENT_TIMESTAMP,
        _protectKey TEXT DEFAULT NULL
        )
	`);
}


@URLPatterns(["/Sing/SingIn","/Sing/FireBase","/Sing/Join","/Sing/FindPW","/Sing/PrivateInfo","/Sing/PublicInfo"])
export class CSingServer extends CServerRouter
{
    mFindPWMap=new Map<string,string>();
    constructor()
    {
        super();
        // this.On("/User",(jsonData : object, _req: Request, _res: Response)=>{
        //     _res.redirect("/some/target/page"); // ← 여기로 리디렉션
        //     return "test";
        // });
        
        this.On("/Sing/SingIn",async (_json : CJSON, _req: Request, _res: Response)=>{
            let sql=await CPool.Product("CLocalDB")  as CRDBMS;
            var privateKey=_json.GetStr("privateKey");
            var chk=await sql.Select("user_list", [new CORMCondition("_privateKey", "==", privateKey,"and"),
                new CORMCondition("_lock", "==", 0,"and")], null, null);
            CPool.Recycle(sql);
            if(chk.length==0)
                return "-1";
            _req.session.privateKey=privateKey;
            return "0";
        });
        this.On("/Sing/FireBase",async (_json : CJSON, _req: Request, _res: Response)=>{
            let sql=await CPool.Product("CLocalDB")  as CRDBMS;
            var publicKey=CUniqueID.Get();
            var privateKey=_json.GetStr("privateKey");
            sql.Insert("user_list", [new CORMField("_privateKey",privateKey),new CORMField("_email",""),
                    new CORMField("_publicKey",publicKey),new CORMField("_id",publicKey),new CORMField("_nick",publicKey),
                    new CORMField("_loginType","firebase")]);
            CPool.Recycle(sql);
        });
        this.On("/Sing/Join",async (_json : CJSON, _req: Request, _res: Response)=>{
            let sql=await CPool.Product("CLocalDB")  as CRDBMS;
            var privateKey=_json.GetStr("privateKey");
            var newPrivateKey=_json.GetStr("newPrivateKey");
            var nick=_json.GetStr("nick");
            var id=_json.GetStr("id");
            var email=_json.GetStr("email");
            var loginType=_json.GetStr("loginType");
            
            
            
            let chk : object[]=null;
        
            
            
            
            
            if(loginType!="modify")
            {
                chk=await sql.Select("user_list", [new CORMCondition("_privateKey", "==", privateKey,"or")], null, null);
                if(chk.length==0)
                    return "-1";
                
                chk=await sql.Select("user_list", [new CORMCondition("_nick", "==", nick,"or")], null, null);
                if(chk.length==0)
                    return "-2";
                
                chk=await sql.Select("user_list", [new CORMCondition("_email", "==", email,"or")], null, null);
                if(chk.length==0)
                    return "-3";
                
                var publicKey=CUniqueID.Get();
                sql.Insert("user_list", [new CORMField("_privateKey",privateKey),new CORMField("_email",email),
                        new CORMField("_publicKey",publicKey),new CORMField("_id",id),new CORMField("_nick",nick),
                        new CORMField("_loginType",loginType)]);
                
                await this.TagAdd(sql,_json,publicKey);
                CPool.Recycle(sql);
                
                
                return publicKey;
            }
            else
            {
                
                chk=await sql.Select("user_list", [new CORMCondition("_privateKey", "==", newPrivateKey,"or")], null, null);
                if(chk.length==0)
                    return "-5";
                
                if(newPrivateKey.length==0)
                    newPrivateKey=privateKey;
                
                let option=new CORMOption();
                option.mOrderBy="_offset";
                option.mLimit=1;
                
                var userVec=await sql.Select("user_list", [new CORMCondition("_privateKey", "==", privateKey)], 
                        ["_offset","_publicKey","_id","_loginType","_nick","_email"], option);
                        
                if(userVec.length!=0)//이미 존재
                    return "-100";
                
                //닉변경시 다시 확인
                if(userVec[0]._nick!=nick)
                {
                    chk=await sql.Select("user_list", [new CORMCondition("_nick", "==", nick,"or")], null, null);
                    if(chk.length!=0)
                        return "-2";
                }
                
            
                if(userVec[0]._email!=email)
                {
                    chk=await sql.Select("user_list", [new CORMCondition("_email", "==", email,"or")], null, null);
                    if(chk.length!=0)
                        return "-3";
                }
                
                
                
                await sql.Update("user_list", [new CORMCondition("_offset", "==", userVec[0][0])], 
                        [new CORMField("_lock",1)]);
                
                
                sql.Insert("user_list", [new CORMField("_privateKey",newPrivateKey),new CORMField("_email",email),
                        new CORMField("_publicKey",userVec[0]._publicKey),new CORMField("_id",userVec[0]._id),new CORMField("_nick",nick),
                        new CORMField("_loginType",userVec[0]._loginType)]);
                await this.TagAdd(sql,_json,userVec[0]._publicKey);
                
                CPool.Recycle(sql);
                
                _req.session.privateKey=newPrivateKey;
                return userVec[0]._publicKey;
            }

        });
        this.On("/Sing/FindPW",async (_json : CJSON, _req: Request, _res: Response)=>{
            if(_json.GetStr("value")=="")
            {
                let ranKey=Math.trunc(Math.random()*10000000);
                this.mFindPWMap.set(_json.GetStr("email"), ranKey+"");
                
                let authInfo=new CAuthInfo();
                authInfo.mID="id";
                authInfo.mPW="pw";
                authInfo.mAddres="smtp.naver.com";
                authInfo.mPort="465";
                await CMail.Send(authInfo, _json.GetStr("email"), "Find Password!", "Insert Number : "+ranKey);
                
                return "0";
            }
            else
            {
                let option=new CORMOption();
                option.mOrderBy="_offset";
                option.mLimit=1;
                let ranKey=this.mFindPWMap.get(_json.GetStr("email"));
                if(ranKey!=_json.GetStr("value"))
                    return "-1";
                let sql=await CPool.Product("CLocalDB")  as CRDBMS;
                var privateKey=await sql.Select("user_list", [new CORMCondition("_email", "==", _json.GetStr("email"),"or")], ["_privateKey"], option);
                if(privateKey[0]._privateKey=="")
                    return "-2";
                    
                
                return privateKey;
            }
        });
        this.On("/Sing/PrivateInfo",async (_json : CJSON, _req: Request, _res: Response)=>{
            let option=new CORMOption();
            option.mOrderBy="_offset";
            option.mLimit=1;
            let sql=await CPool.Product("CLocalDB")  as CRDBMS;
            let jsonArr=await sql.Select("user_list", [new CORMCondition("_privateKey", "==", _json.GetStr("key"))], 
                    ["_publicKey","_id","_nick","_email","_loginType"], option);
            
            
            
            CPool.Recycle(sql);
            if(jsonArr.length==0)
                return "null";
            
            return JSON.stringify(jsonArr);
            
        });
        this.On("/Sing/PublicInfo",async (_json : CJSON, _req: Request, _res: Response)=>{
            let option=new CORMOption();
            option.mOrderBy="_offset";
            option.mLimit=1;
            let sql=await CPool.Product("CLocalDB")  as CRDBMS;
            let jsonArr=await sql.Select("user_list", [new CORMCondition("_publicKey", "==", _json.GetStr("key"))], 
                    ["_publicKey","_nick"], option);

            CPool.Recycle(sql);
            if(jsonArr.length==0)
                return "null";
            
            return JSON.stringify(jsonArr);
        });
        this.On("/Sing/TagArr",async (_json : CJSON, _req: Request, _res: Response)=>{
            let sql=await CPool.Product("CLocalDB")  as CRDBMS;
            var tagArr=_json.GetArray("tagArr");
            var publicKey=_json.GetStr("publicKey");
            let json=new CJSON("{}");
            for(var each0 of tagArr.mArray)
            {
                let tag=each0;
                let jsonArr=await sql.Select("user_list_"+tag,[new CORMCondition("_publicKey","==",publicKey)],null,null);
                CPool.Recycle(sql);
                json.Set(tag, jsonArr[0]);
            }
            
            return json.ToStr();
        });
        this.On("/Sing/Tag",async (_json : CJSON, _req: Request, _res: Response)=>{
            let option=new CORMOption();
            option.mOrderBy="_offset";
            option.mLimit=1;
            
            let sql=await CPool.Product("CLocalDB")  as CRDBMS;
            var tag=_json.GetStr("tag");
            var publicKey=_json.GetStr("publicKey");
            //let json=new CJSON("{}");
            
                
            let jsonArr=sql.Select("user_list_"+tag,[new CORMCondition("_publicKey","==",publicKey)],null,option);
            CPool.Recycle(sql);
            //json.Set(tag, jsonArr.get(0));
            
            
            return JSON.stringify(jsonArr);
        });
    
    }
    async TagAdd(sql : CRDBMS,_json : CJSON,_publicKey : string)
	{
		for(let key in _json)
		{
			if(key=="privateKey" || key =="newPrivateKey" || key =="nick" || key =="id" ||
					key =="email" || key =="loginType")
			{
				continue;
			}
			let tag=_json.Get(key);
			let fieldVec=new Array<CORMField>();
			fieldVec.push(new CORMField("_offset",0));
			fieldVec.push(new CORMField("_publicKey",_publicKey));
			for(let key2 in tag)
			{
				fieldVec.push(new CORMField(key2,tag.GetVal(key2)));
			}
			if(await sql.IsCollection("user_list_"+key)==false)
				sql.CreateCollection("user_list_"+key, fieldVec,"_offset");
			sql.Insert("user_list_"+key, fieldVec);
		}
		
	}
}