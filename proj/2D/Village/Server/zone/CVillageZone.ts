
import { MessagePort, parentPort, workerData } from "worker_threads";


import { CUpdate } from "https://06fs4dix.github.io/Artgine/artgine/basic/Basic.js";
import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CGeometryInfo } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CGeometryComp.js";
import { CCanvas } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvas.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CClass } from "https://06fs4dix.github.io/Artgine/artgine/basic/CClass.js";
import { CZone } from "https://06fs4dix.github.io/Artgine/artgine/server/CWorldServer.js";

import { PacketWorld } from "https://06fs4dix.github.io/Artgine/artgine/server/PacketWorld.js";
import { PacketVillage } from "../PacketVillage.js";

import  "https://06fs4dix.github.io/Artgine/artgine/artgine.js";




class CVillageZone extends CZone
{
    mGI : CGeometryInfo;
    mCanvas : CCanvas;
    constructor(_pp : MessagePort)
    {
        super(_pp);
        this.mGI=new CGeometryInfo(null);
        this.mCanvas=new CCanvas(null,null,this.mGI);
    }
    override Update(_update: CUpdate): void {
        super.Update(_update);
        this.mCanvas.Update(_update);
        this.mGI.Fixed(_update);
        
    }
    override ThreadMessage(parentPort : MessagePort,message : string)
    {
        let stream=new CStream(message.toString());            
        let header = stream.GetString();
        if(header==PacketWorld.eHeader.ZoneConnect)
        {
            let ZoneConnect=PacketWorld.ZoneConnect(stream);
            
            if(this.PushUser(ZoneConnect.uniqueKey))    return;
        
            let user=new CSubject();
            user.Set("nick",ZoneConnect.nick)
            user.SetKey(ZoneConnect.uniqueKey);
            user.SetPos(new CVec3(5000,5200));
            user.PushComp(new CRigidBody());
            this.mCanvas.PushSub(user);
            
            let req=new CStream;
            
            for(let [key,value] of this.mCanvas.GetSubMap())
            {
                //let wu=new CWorldUser(key,value.GetPos(),value.Get("nick"));
                req.Push(key);
                req.Push(value.GetPos());
                req.Push(value.Get("nick"));
                
            }
            let info=PacketWorld.WorldInfo(ZoneConnect.uniqueKey,req.Data());
            this.Send(PacketWorld.ZoneRelay(ZoneConnect.uniqueKey,info.Data()));
            req=new CStream;
            req.Push(ZoneConnect.uniqueKey);
            req.Push(new CVec3(5000,5200));
            req.Push(ZoneConnect.nick);
            this.Send(PacketWorld.ZoneRelay("",PacketWorld.WorldPushUser(ZoneConnect.uniqueKey,req.Data()).Data()));
                
            
            
            
            
        }
        else if(header==PacketVillage.eHeader.UserPad)
        {
            let UserPad=PacketVillage.UserPad(stream);

            let user=this.mCanvas.Find(UserPad.uniqueKey);
            let rb=user.FindComp(CRigidBody);
            rb.Clear();

            if(UserPad.dir.IsZero()==false)
                rb.Push(new CForce("move",UserPad.dir,100));
            //UserPad.pos=user.GetPos();

            this.Send(PacketWorld.ZoneRelay("",PacketVillage.UserPad(UserPad.uniqueKey,UserPad.dir,user.GetPos()).Data()));
        }
        else if(header==PacketWorld.eHeader.WorldRemoveUser)
        {
            let WorldRemoveUser=PacketWorld.WorldRemoveUser(stream);
            let user=this.mCanvas.Find(WorldRemoveUser.uniqueKey);
            user.Destroy();
            this.Send(PacketWorld.ZoneRelay("",stream.Data()));
        }
       
    }
}

const gZone  = workerData?.zone  ?? "test";
const gOffset  = workerData?.offset  ?? 0;

var gServer=new CVillageZone(parentPort);
gServer.mZone=gZone;
gServer.mOffset=gOffset;
parentPort?.on("message",(_msg)=>{
    gServer.ThreadMessage(parentPort,_msg);
});
gServer.Send(PacketWorld.ZoneReady(gZone,gOffset));
gServer.UpdateLoop();



