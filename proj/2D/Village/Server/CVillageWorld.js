import { CWorldServer, CZoneWorker } from "https://06fs4dix.github.io/Artgine/artgine/server/CWorldServer.js";
import { Worker } from "worker_threads";
var gZOffset = 0;
export class CVillageWorld extends CWorldServer {
    ReadyZone() {
        let create = true;
        for (let [key, zone] of this.mZoneMap) {
            if (zone.mState == CZoneWorker.eState.Ready || zone.mState == CZoneWorker.eState.Init) {
                create = false;
            }
        }
        if (create) {
            let czName = "zone" + "/" + "CVillageZone";
            let worker = new Worker(new URL("./" + czName + ".js", import.meta.url), {
                workerData: {
                    zone: "CVillageZone",
                    offset: gZOffset,
                }
            });
            let zw = new CZoneWorker(worker, gZOffset);
            zw.mKey = "CVillageZone";
            this.mZoneMap.set(gZOffset, zw);
            worker.on('message', (msg) => {
                this.ThreadMessage(zw, msg);
            });
            worker.on('exit', (code) => {
                console.log('[main] worker exit code:', code);
            });
            gZOffset++;
        }
    }
    UserSelectZone(_privateKey) {
        return "CVillageZone";
    }
}
