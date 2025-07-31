import { CCMDMgr } from "./CCMDMgr.js";
if (CCMDMgr.IsTSC() == false || CCMDMgr.GetFileCount("node_modules") == 0) {
    await CCMDMgr.RunCMD("npm install", false);
    await CCMDMgr.RunCMD("npx tsc", false);
}
await CCMDMgr.RunCMD("npx electron .", false);
