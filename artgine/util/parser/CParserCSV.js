import { CUtil } from "../../basic/CUtil.js";
import { CFile } from "../../system/CFile.js";
import { CParser } from "./CParser.js";
export class CParserCSV extends CParser {
    GetResult() {
        return this.mResult;
    }
    async Load(pa_fileName) {
        if (this.mBuffer == null) {
            this.mBuffer = await CFile.Load(pa_fileName);
        }
        let arr = [];
        let str = CUtil.ArrayToString(this.mBuffer);
        const lines = str.split(/\r?\n/);
        const headers = lines[0].split(",").map(h => h.trim());
        const row = {};
        const line = lines[0].trim();
        const values = line.split(",");
        for (let j = 0; j < headers.length; j++)
            row[j] = values[j]?.trim() ?? "";
        arr.push(row);
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line)
                continue;
            const values = line.split(",");
            const row = {};
            for (let j = 0; j < headers.length; j++)
                row[headers[j]] = values[j]?.trim() ?? "";
            arr.push(row);
        }
        this.mResult = arr;
    }
}
