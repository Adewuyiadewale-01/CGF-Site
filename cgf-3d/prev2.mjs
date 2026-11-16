import { chromium } from 'playwright'; import fs from 'node:fs';
const svg=fs.readFileSync(process.argv[2],'utf8');
const b=await chromium.launch();const p=await b.newPage({viewport:{width:600,height:990}});
await p.setContent(`<body style="margin:0;background:#131417">${svg}</body>`);await p.screenshot({path:process.argv[3]});await b.close();
