import { parentPort, workerData } from "worker_threads";
import { CStream } from "https://06fs4dix.github.io/Artgine/artgine/basic/CStream.js";
import { CGeometryInfo } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CGeometryComp.js";
import { CCanvas } from "https://06fs4dix.github.io/Artgine/artgine/app/canvas/CCanvas.js";
import { CSubject } from "https://06fs4dix.github.io/Artgine/artgine/app/subject/CSubject.js";
import { CVec3 } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CVec3.js";
import { CRigidBody } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CRigidBody.js";
import { CForce } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CForce.js";
import { CZone } from "https://06fs4dix.github.io/Artgine/artgine/server/CWorldServer.js";
import { PacketWorld } from "https://06fs4dix.github.io/Artgine/artgine/server/PacketWorld.js";
import { PacketVillage } from "../PacketVillage.js";
import "https://06fs4dix.github.io/Artgine/artgine/artgine.js";
import CBehavior from "https://06fs4dix.github.io/Artgine/artgine/app/component/CBehavior.js";
import { CCollider } from "https://06fs4dix.github.io/Artgine/artgine/app/component/CCollider.js";
import { CBound } from "https://06fs4dix.github.io/Artgine/artgine/geometry/CBound.js";
import { CFrame } from "https://06fs4dix.github.io/Artgine/artgine/util/CFrame.js";
import { CPreferences } from "https://06fs4dix.github.io/Artgine/artgine/basic/CPreferences.js";
import { CString } from "https://06fs4dix.github.io/Artgine/artgine/basic/CString.js";
class CVilComp extends CBehavior {
    Collision(_org, _size, _tar, _push) {
        this.GetOwner().FindComp(CRigidBody);
    }
}
class CUser extends CSubject {
}
class CVillageZone extends CZone {
    mGI;
    mCanvas;
    constructor(_pp) {
        super(_pp);
        this.mGI = new CGeometryInfo(null);
        let pf = new CPreferences();
        pf.mRenderer = CPreferences.eRenderer.Null;
        this.mCanvas = new CCanvas(new CFrame(pf), null, this.mGI);
        let path = CString.PathSub(import.meta.url, 1);
        path = CString.ReplaceAll(path, "file:///", "");
        this.mCanvas.LoadJSON(path + "/Map.json");
    }
    Update(_update) {
        super.Update(_update);
        this.mCanvas.Update(_update);
        this.mGI.Fixed(_update);
    }
    ThreadMessage(parentPort, message) {
        let stream = new CStream(message.toString());
        let header = stream.GetString();
        if (header == PacketWorld.eHeader.ZoneConnect) {
            let ZoneConnect = PacketWorld.ZoneConnect(stream);
            if (this.PushUser(ZoneConnect.uniqueKey))
                return;
            let user = new CUser();
            user.Set("nick", ZoneConnect.nick);
            user.SetKey(ZoneConnect.uniqueKey);
            user.SetPos(new CVec3(5000, 5200));
            user.PushComp(new CRigidBody());
            this.mCanvas.PushSub(user);
            let bound = new CBound();
            bound.InitBound(50);
            bound.SetType(CBound.eType.Box);
            let cl = user.PushComp(new CCollider(bound));
            cl.SetLayer("player");
            cl.PushCollisionLayer("player");
            cl.PushCollisionLayer("object");
            cl.SetRestitution(1);
            let req = new CStream;
            for (let [key, value] of this.mCanvas.GetSubMap()) {
                if (value instanceof CUser) {
                    req.Push("user");
                    req.Push(value.Get("nick"));
                }
                else {
                    req.Push(value.GetProxy().Key());
                    req.Push("");
                }
                req.Push(key);
                req.Push(value.GetPos());
            }
            let info = PacketWorld.WorldInfo(ZoneConnect.uniqueKey, req.Data());
            this.Send(PacketWorld.ZoneRelay(ZoneConnect.uniqueKey, info.Data()));
            req = new CStream;
            req.Push(ZoneConnect.nick);
            req.Push(ZoneConnect.uniqueKey);
            req.Push(new CVec3(5000, 5200));
            this.Send(PacketWorld.ZoneRelay("", PacketWorld.WorldPushUser(ZoneConnect.uniqueKey, req.Data()).Data()));
        }
        else if (header == PacketVillage.eHeader.UserPad) {
            let UserPad = PacketVillage.UserPad(stream);
            let user = this.mCanvas.Find(UserPad.uniqueKey);
            let rb = user.FindComp(CRigidBody);
            rb.Clear();
            if (UserPad.dir.IsZero() == false)
                rb.Push(new CForce("move", UserPad.dir, 200));
            this.Send(PacketWorld.ZoneRelay("", PacketVillage.UserPad(UserPad.uniqueKey, UserPad.dir, user.GetPos()).Data()));
        }
        else if (header == PacketWorld.eHeader.WorldRemoveUser) {
            let WorldRemoveUser = PacketWorld.WorldRemoveUser(stream);
            let user = this.mCanvas.Find(WorldRemoveUser.uniqueKey);
            user.Destroy();
            this.Send(PacketWorld.ZoneRelay("", stream.Data()));
        }
    }
}
const gZone = workerData?.zone;
const gKey = workerData?.key;
var gServer = new CVillageZone(parentPort);
gServer.mZone = gZone;
gServer.mKey = gKey;
parentPort?.on("message", (_msg) => {
    gServer.ThreadMessage(parentPort, _msg);
});
gServer.Send(PacketWorld.ZoneReady(gZone, gKey));
gServer.UpdateLoop();
