import { chromium } from 'playwright';
const b=await chromium.launch();const p=await b.newPage({viewport:{width:600,height:830}});
await p.goto('file://'+process.argv[2]);await p.screenshot({path:process.argv[3]});await b.close();
