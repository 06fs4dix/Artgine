import { CUniqueID } from "../../../../artgine/basic/CUniqueID.js";
import { CWorldServer, CZoneWorker } from "../../../../artgine/server/CWorldServer.js";
import { Worker } from "worker_threads";
export class CVillageWorld extends CWorldServer {
    ReadyZone() {
        let create = true;
        for (let [key, zone] of this.mZoneMap) {
            if (zone.mState == CZoneWorker.eState.Ready || zone.mState == CZoneWorker.eState.Init) {
                create = false;
            }
        }
        if (create) {
            let zKey = CUniqueID.GetHash();
            let czName = "zone" + "/" + "CVillageZone";
            let worker = new Worker(new URL("./" + czName + ".js", import.meta.url), {
                workerData: {
                    zone: "CVillageZone",
                    key: zKey,
                }
            });
            let zw = new CZoneWorker(worker, zKey);
            zw.mZone = "CVillageZone";
            this.mZoneMap.set(zKey, zw);
            worker.on('message', (msg) => {
                this.ThreadMessage(zw, msg);
            });
            worker.on('exit', (code) => {
                console.log('[main] worker exit code:', code);
            });
        }
    }
    UserSelectZone(_privateKey) {
        return "CVillageZone";
    }
}
