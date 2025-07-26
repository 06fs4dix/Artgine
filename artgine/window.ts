import { CModal } from "./basic/CModal.js";



window.addEventListener("message", (event) => {
    if (event.data.type === "modalData") {
        const data = event.data.data;

        if(data.header!=null && typeof data.header=="string")
            document.title = data.header;
        let mo=new CModal();
        mo.SetBody(data.body);
        mo.SetHeader(data.body);
        
        mo.Open();
        mo.FullSwitch();
        //alert(data);
    }
});
   