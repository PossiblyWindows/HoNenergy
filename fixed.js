
(function(){
if(location.hostname!="humanornot.so")return;
const qs=sel=>document.querySelector(sel);
const panel=document.createElement('div');
panel.id='vh-panel';
panel.innerHTML=`
<div id="vh-header">
<span id="vh-title">Get energy :)</span>
<div id="vh-controls">
<button id="vh-min">_</button>
<button id="vh-close">✕</button>
</div>
</div>
<div id="vh-body">
<div id="vh-info">Captures POST requests responsible for adding energy when you vote.</div>
<div id="vh-capture-area"><div id="vh-capture-list"></div></div>
<div id="vh-editor"><label>Selected payload (editable):</label><textarea id="vh-payload" rows="8"></textarea></div>
<div id="vh-options">
<label>Repeats: <input id="vh-repeats" type="number" value="1" min="1" style="width:70px"></label>
<label>Delay (ms): <input id="vh-delay" type="number" value="1000" min="0" style="width:90px"></label>
<label>Concurrency: <input id="vh-concurrency" type="number" value="1" min="1" style="width:50px"></label>
<label><input id="vh-once-check" type="checkbox"> Send once (check) before repeating</label>
</div>
<div id="vh-buttons">
<button id="vh-send-check">Send Check</button>
<button id="vh-send">Send (once)</button>
<button id="vh-send-repeats">Send X (specified) times</button>
<button id="vh-send-all">Send All Captures POST requests</button>
<button id="vh-clear">Clear captured POST request list</button>
</div>
<div id="vh-statusbar">Status: idle</div>
</div>
`;
const css=document.createElement('style');
css.textContent=`
#vh-panel{position:fixed;right:20px;bottom:20px;width:420px;background:#0f1724;color:#e6eef8;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);font-family:system-ui;padding:0;z-index:999999;}
#vh-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#172033;cursor:move;border-top-left-radius:12px;border-top-right-radius:12px}
#vh-title{font-weight:700}
#vh-controls button{background:transparent;border:none;color:#98a8c7;padding:4px 8px;cursor:pointer}
#vh-body{padding:12px;max-height:520px;overflow:auto}
#vh-capture-area{border:1px dashed rgba(255,255,255,0.05);padding:6px;margin-bottom:8px;border-radius:6px}
#vh-capture-list{max-height:120px;overflow:auto}
.vh-capture-item{padding:6px;border-radius:6px;margin-bottom:6px;cursor:pointer}
.vh-capture-item.selected{background:rgba(59,130,246,0.2)}
#vh-editor textarea{width:100%;background:#021427;color:#e6eef8;border:1px solid rgba(255,255,255,0.1);padding:8px;border-radius:6px;font-family:monospace}
#vh-options{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}
#vh-buttons{display:flex;gap:8px;flex-wrap:wrap}
#vh-buttons button{background:#0b1220;border:1px solid rgba(255,255,255,0.1);color:#e6eef8;padding:8px 10px;border-radius:8px;cursor:pointer}
#vh-statusbar{margin-top:8px;font-size:13px;color:#9fb0c8}
#vh-panel.minimized{width:220px}
#vh-panel.minimized #vh-body{display:none}
`;
document.head.appendChild(css);document.body.appendChild(panel);
const header=qs('#vh-header');let dragging=false,offsetX=0,offsetY=0;header.addEventListener('mousedown',e=>{if(e.target.tagName==='BUTTON')return;dragging=true;const rect=panel.getBoundingClientRect();offsetX=e.clientX-rect.left;offsetY=e.clientY-rect.top;document.body.style.userSelect='none';});document.addEventListener('mousemove',e=>{if(!dragging)return;panel.style.left=(e.clientX-offsetX)+'px';panel.style.top=(e.clientY-offsetY)+'px';panel.style.right='auto';panel.style.bottom='auto';});document.addEventListener('mouseup',()=>{dragging=false;document.body.style.userSelect='auto';});qs('#vh-min').addEventListener('click',()=>panel.classList.toggle('minimized'));qs('#vh-close').addEventListener('click',()=>panel.remove());
let captures=[],selectedIndex=-1;
function renderCaptures(){const list=qs('#vh-capture-list');list.innerHTML='';captures.slice().reverse().forEach((c,idx)=>{const realIdx=captures.length-1-idx;const div=document.createElement('div');div.className='vh-capture-item'+(realIdx===selectedIndex?' selected':'');div.innerText=new Date(c._capturedAt).toLocaleTimeString()+` — gameId: ${c.gameId}`;div.addEventListener('click',()=>selectCapture(realIdx));list.appendChild(div);});}
function selectCapture(i){selectedIndex=i;qs('#vh-payload').value=JSON.stringify(captures[i],null,2);renderCaptures();}
const origFetch=window.fetch.bind(window);window.fetch=async(...args)=>{captureIfVote(args[0],args[1]?.body);return origFetch(...args);};
const origXHRsend=XMLHttpRequest.prototype.send;XMLHttpRequest.prototype.send=function(body){try{if(this._vh_url&&body)captureIfVote(this._vh_url,body);}catch(e){}return origXHRsend.apply(this,arguments);};
const origXHRopen=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url){this._vh_url=url;return origXHRopen.apply(this,arguments);};
function captureIfVote(url,body){if(typeof url==='string'&&url.includes('httpCheckVote?timestamp')){try{const parsed=JSON.parse(body);parsed._capturedAt=Date.now();captures.push(parsed);selectCapture(captures.length-1);qs('#vh-statusbar').innerText='Captured at '+new Date(parsed._capturedAt).toLocaleTimeString();}catch(e){}}}
async function postToCloud(payload){const url=`https://us-central1-humanornot-v4.cloudfunctions.net/httpCheckVote?timestamp=${Date.now()}`;const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok)throw new Error('HTTP '+res.status);return res.json();}
async function sendWithFallback(base){try{qs('#vh-statusbar').innerText='Trying human...';await postToCloud({...base,vote:'human',castedVoteEntity:'human'});qs('#vh-statusbar').innerText='Sent as human';return;}catch(e){qs('#vh-statusbar').innerText='Human failed, trying AI...';await postToCloud({...base,vote:'ai',castedVoteEntity:'ai',isCorrect:true});qs('#vh-statusbar').innerText='Sent as AI';}}
async function doSend({repeats,delay,onceCheck,concurrency,allCaptures}){
  let queue = [];
  if(allCaptures){queue = captures.map(c=>({...c}));}
  else{
    const raw=qs('#vh-payload').value.trim();if(!raw)return alert('No payload');
    let base;try{base=JSON.parse(raw);}catch(e){return alert('Invalid JSON');}
    for(let i=0;i<repeats;i++)queue.push(base);
  }
  let running=[];
  while(queue.length>0){
    const batch = queue.splice(0,concurrency);
    running = batch.map(p=>sendWithFallback(p).then(()=>new Promise(r=>setTimeout(r,delay))));
    await Promise.all(running);
  }
  qs('#vh-statusbar').innerText='Done';
}
qs('#vh-send').onclick=()=>doSend({repeats:1,delay:0,onceCheck:false,concurrency:1,allCaptures:false});
qs('#vh-send-check').onclick=()=>doSend({repeats:1,delay:0,onceCheck:true,concurrency:1,allCaptures:false});
qs('#vh-send-repeats').onclick=()=>{doSend({repeats:parseInt(qs('#vh-repeats').value)||1,delay:parseInt(qs('#vh-delay').value)||1000,onceCheck:qs('#vh-once-check').checked,concurrency:parseInt(qs('#vh-concurrency').value)||1,allCaptures:false});};
qs('#vh-send-all').onclick=()=>{doSend({repeats:1,delay:parseInt(qs('#vh-delay').value)||1000,onceCheck:false,concurrency:parseInt(qs('#vh-concurrency').value)||1,allCaptures:true});};
qs('#vh-clear').onclick=()=>{captures.length=0;selectedIndex=-1;qs('#vh-payload').value='';renderCaptures();};
qs('#vh-payload').addEventListener('input',()=>{if(selectedIndex>=0){try{captures[selectedIndex]=JSON.parse(qs('#vh-payload').value);}catch(e){}}});
})();
