import { CZone } from "../CZoneServer.js";
import { parentPort, workerData } from "worker_threads";
import { PacketZone } from "../PacketZone.js";
import { CGeometryInfo } from "../../../../../artgine/app/component/CGeometryComp.js";
import { CCanvas } from "../../../../../artgine/app/canvas/CCanvas.js";
import { CSubject } from "../../../../../artgine/app/subject/CSubject.js";
import { CVec3 } from "../../../../../artgine/geometry/CVec3.js";
import { CRigidBody } from "../../../../../artgine/app/component/CRigidBody.js";
import { CForce } from "../../../../../artgine/app/component/CForce.js";
import { CClass } from "../../../../../artgine/basic/CClass.js";
const gZone = workerData?.zone ?? "test";
const gOffset = workerData?.offset ?? 0;
CClass.Push(CVec3);
class CZoneTest extends CZone {
    mGI;
    mCanvas;
    constructor(_pp) {
        super(_pp);
        this.mGI = new CGeometryInfo(null);
        this.mCanvas = new CCanvas(null, null, this.mGI);
    }
    Update(_update) {
        super.Update(_update);
        this.mCanvas.Update(_update);
        this.mGI.Fixed(_update);
    }
    Message(header, stream) {
        if (header == PacketZone.eHeader.ZoneInfoAck) {
            let ZoneInfoAck = PacketZone.ZoneInfoAck(stream);
            let user = new CSubject();
            user.SetKey(ZoneInfoAck.uniqueKey);
            user.SetPos(new CVec3(5000, 5200));
            user.PushComp(new CRigidBody());
            this.mCanvas.PushSub(user);
            let keyList = [ZoneInfoAck.uniqueKey];
            let posList = [new CVec3(5000, 5200)];
            for (let [key, value] of this.mCanvas.GetSubMap()) {
                keyList.push(key);
                posList.push(value.GetPos());
            }
            this.Send(PacketZone.ZoneRelay(ZoneInfoAck.uniqueKey, PacketZone.ZoneInfoReq(keyList, posList).Data()));
            this.Send(PacketZone.ZoneRelay("", PacketZone.UserIn(keyList[0], posList[0]).Data()));
        }
        else if (header == PacketZone.eHeader.UserPad) {
            let UserPad = PacketZone.UserPad(stream);
            let user = this.mCanvas.Find(UserPad.uniqueKey);
            let rb = user.FindComp(CRigidBody);
            rb.Clear();
            if (UserPad.dir.IsZero() == false)
                rb.Push(new CForce("move", UserPad.dir, 100));
            this.Send(PacketZone.ZoneRelay("", PacketZone.UserPad(UserPad.uniqueKey, UserPad.dir, user.GetPos()).Data()));
        }
        else if (header == PacketZone.eHeader.UserClose) {
            let UserClose = PacketZone.UserClose(stream);
            let user = this.mCanvas.Find(UserClose.uniqueKey);
            user.Destroy();
            this.Send(PacketZone.ZoneRelay("", stream.Data()));
        }
    }
}
var gServer = new CZoneTest(parentPort);
gServer.mZone = gZone;
gServer.mOffset = gOffset;
parentPort?.on("message", (_msg) => {
    gServer.ThreadMessage(parentPort, _msg);
});
gServer.Send(PacketZone.ZoneReady(gZone, gOffset));
gServer.UpdateLoop();
