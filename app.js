(() => {
"use strict";
const KEY = "offlineStartPage.links.v1";
const SETTINGS_KEY = "offlineStartPage.settings.v2";
const THEME_KEY = "offlineStartPage.theme.v1";
const TODOS_KEY = "offlineStartPage.todos.v1";
const $ = id => document.getElementById(id);
const starterLinks = [
 {id:"starter-github",name:"GitHub",url:"https://github.com",category:"Development",icon:"🐙",iconMode:"auto",favorite:true},
 {id:"starter-stackoverflow",name:"Stack Overflow",url:"https://stackoverflow.com",category:"Development",icon:"🧩",iconMode:"auto"},
 {id:"starter-vscode",name:"VS Code",url:"https://vscode.dev",category:"Development",icon:"💻",iconMode:"auto"},
 {id:"starter-chatgpt",name:"ChatGPT",url:"https://chatgpt.com",category:"AI Tools",icon:"✳️",iconMode:"auto",favorite:true},
 {id:"starter-claude",name:"Claude",url:"https://claude.ai",category:"AI Tools",icon:"✴️",iconMode:"auto"},
 {id:"starter-gmail",name:"Gmail",url:"https://mail.google.com",category:"Everyday",icon:"✉️",iconMode:"auto",favorite:true},
 {id:"starter-drive",name:"Google Drive",url:"https://drive.google.com",category:"Everyday",icon:"📁",iconMode:"auto"},
 {id:"starter-youtube",name:"YouTube",url:"https://youtube.com",category:"Everyday",icon:"▶️",iconMode:"auto"}
];
const defaultSettings = {title:"Your personal launchpad",backgroundImage:"",overlay:35,tileSize:"comfortable",quickCount:6};
let links = loadJSON(KEY, null);
if (!Array.isArray(links)) links = starterLinks.map(x=>({...x}));
let todos = loadJSON(TODOS_KEY, []);
if (!Array.isArray(todos)) todos = [];
else todos = todos.map(item=>({...item,priority:["low","medium","high"].includes(item.priority)?item.priority:"medium"}));
let settings = {...defaultSettings,...(loadJSON(SETTINGS_KEY,{})||{})};
let editing = false, dragId = null, toastTimer, hiddenExpanded = false;
const safeText = (s) => String(s ?? "");
function loadJSON(key, fallback) { try { const v=localStorage.getItem(key); return v===null?fallback:JSON.parse(v); } catch { return fallback; } }
function saveLinks(){ localStorage.setItem(KEY,JSON.stringify(links)); }
function saveTodos(){ localStorage.setItem(TODOS_KEY,JSON.stringify(todos)); }
function saveSettings(){ localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings)); }
function toast(message){ const el=$("toast"); el.textContent=message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove("show"),2400); }
function validUrl(raw){
 let value=raw.trim(); if(!value) throw Error("Enter a website URL.");
 if(!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) value="https://"+value;
 const u=new URL(value); if(!["http:","https:"].includes(u.protocol)) throw Error("Only http and https URLs are supported.");
 return u.href;
}
function hostOf(raw){try{return new URL(raw).hostname.replace(/^www\./,"")}catch{return raw}}
function escapeHtml(s){return safeText(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function faviconUrl(url){try{return "https://www.google.com/s2/favicons?domain_url="+encodeURIComponent(new URL(url).origin)+"&sz=64"}catch{return ""}}
function iconNode(item, small=false){
 const box=document.createElement("span"); box.className=small?"favicon":"tile-icon";
 const fallback=()=>{box.innerHTML="";box.textContent=item.icon||"🔗"; if(small){box.style.width="21px";box.style.height="21px";box.style.display="grid";box.style.placeItems="center";box.style.fontSize="17px";}};
 if(item.iconMode==="emoji"){fallback();return box;}
 const src=item.iconMode==="image"?(item.image||""):item.image||faviconUrl(item.url);
 if(!src){fallback();return box;}
 const img=document.createElement("img");img.className="favicon";img.alt="";img.src=src;img.loading="lazy";img.onerror=()=>{if(item.iconMode==="auto"&&item.iconMode!=="image"&&item.image){img.src=faviconUrl(item.url);img.onerror=fallback;}else fallback();};box.append(img);
 return box;
}
function updateHeader(){
 const h=new Date().getHours();
 $("greeting").textContent=h<12?"Good morning Milan.":h<18?"Good afternoon Milan.":"Good evening Milan.";
 $("date").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric",year:"numeric"});
 document.title=(settings.title||"My Start Page");
 document.querySelector(".eyebrow").textContent=(settings.title||"Your personal launchpad").toUpperCase();
 document.body.style.setProperty("--overlay",(Number(settings.overlay)||0)/100);
 if(settings.backgroundImage){const escaped=settings.backgroundImage.replace(/["\\]/g,"");document.body.style.setProperty("--background-image",`url("${escaped}")`);}
 else document.body.style.setProperty("--background-image","none");
 document.body.classList.remove("compact","comfortable","large");document.body.classList.add(settings.tileSize||"comfortable");
}
function renderTodos(){
 const todoList=$("todoList");todoList.replaceChildren();
 todos.forEach(item=>{
  const row=document.createElement("li");row.className="planner-item todo-item";row.classList.toggle("is-done",Boolean(item.done));
  const label=document.createElement("label");label.className="todo-label";
  const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.checked=Boolean(item.done);checkbox.setAttribute("aria-label",`Mark ${item.text} ${item.done?"not done":"done"}`);checkbox.addEventListener("change",()=>{item.done=checkbox.checked;saveTodos();renderTodos()});
  const title=document.createElement("span");title.textContent=item.text;label.append(checkbox,title);
  const priority=document.createElement("span");priority.className=`priority-badge priority-${item.priority}`;priority.textContent=item.priority[0].toUpperCase()+item.priority.slice(1);
  const actions=document.createElement("div");actions.className="planner-actions";
  const edit=document.createElement("button");edit.type="button";edit.textContent="Edit";edit.title="Edit to-do";edit.addEventListener("click",()=>{$("todoId").value=item.id;$("todoText").value=item.text;$("todoPriority").value=item.priority;$("todoSubmit").textContent="Save";$("todoCancel").hidden=false;$("todoText").focus()});
  const remove=document.createElement("button");remove.type="button";remove.className="planner-remove";remove.textContent="×";remove.title="Delete to-do";remove.setAttribute("aria-label",`Delete to-do: ${item.text}`);remove.addEventListener("click",()=>{todos=todos.filter(x=>x.id!==item.id);saveTodos();renderTodos()});
  actions.append(edit,remove);row.append(label,priority,actions);todoList.append(row);
 });
 $("todoEmpty").hidden=todos.length>0;
 $("todoCount").textContent=`${todos.filter(x=>x.done).length}/${todos.length}`;
}
function createTile(item){
 const a=document.createElement("a");a.className="tile";a.href=item.url;a.dataset.id=item.id;a.draggable=editing;a.title=item.url;
 const icon=iconNode(item);
 const info=document.createElement("div");info.className="tile-info";
 const name=document.createElement("div");name.className="tile-name";name.textContent=item.name;
 const host=document.createElement("div");host.className="tile-host";host.textContent=hostOf(item.url);
 info.append(name,host);a.append(icon,info);
 a.addEventListener("click",e=>{if(editing)e.preventDefault()});
 const controls=document.createElement("div");controls.className="tile-controls";
 const star=document.createElement("button");star.type="button";star.className="star";star.textContent=item.favorite?"★":"☆";star.title=item.favorite?"Remove from favorites":"Add to favorites";
 star.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();item.favorite=!item.favorite;saveLinks();render();toast(item.favorite?"Added to favorites":"Removed from favorites")});
 const visibility=document.createElement("button");visibility.type="button";visibility.textContent=item.hidden?"Show":"Hide";visibility.title=item.hidden?"Move to main links":"Move to hidden section";
 visibility.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();item.hidden=!item.hidden;saveLinks();render();toast(item.hidden?"Moved to hidden section":"Restored to links")});
 const edit=document.createElement("button");edit.type="button";edit.textContent="Edit";edit.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openLinkDialog(item)});
 const del=document.createElement("button");del.type="button";del.textContent="×";del.title="Delete link";del.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();if(confirm(`Delete "${item.name}"?`)){links=links.filter(x=>x.id!==item.id);saveLinks();render();toast("Link deleted")}});
 controls.append(star,visibility,edit,del);a.append(controls);
 a.addEventListener("dragstart",e=>{if(!editing){e.preventDefault();return}dragId=item.id;a.classList.add("dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",item.id)});
 a.addEventListener("dragend",()=>{dragId=null;a.classList.remove("dragging");document.querySelectorAll(".drop-target").forEach(x=>x.classList.remove("drop-target"))});
 a.addEventListener("dragover",e=>{if(!editing||!dragId||dragId===item.id)return;e.preventDefault();a.classList.add("drop-target")});
 a.addEventListener("dragleave",()=>a.classList.remove("drop-target"));
 a.addEventListener("drop",e=>{if(!editing)return;e.preventDefault();a.classList.remove("drop-target");const source=e.dataTransfer.getData("text/plain")||dragId;if(!source||source===item.id)return;reorderLink(source,item.id)});
 return a;
}
function render(){
 const query=$("search").value.trim().toLowerCase();
 const matches=x=>[x.name,x.url,x.category].some(v=>safeText(v).toLowerCase().includes(query));
 const filtered=links.filter(x=>!x.hidden&&matches(x));
 const hiddenItems=links.filter(x=>x.hidden);
 const groups=new Map();
 filtered.forEach(x=>{const cat=x.category||"Other";if(!groups.has(cat))groups.set(cat,[]);groups.get(cat).push(x)});
 $("links").replaceChildren();$("quickbar").replaceChildren();$("hiddenLinks").replaceChildren();
 $("emptyState").hidden=filtered.length>0||(!query&&hiddenItems.length>0);
 $("hiddenSection").hidden=hiddenItems.length===0||Boolean(query);$("hiddenCount").textContent=hiddenItems.length;
 $("hiddenLinks").hidden=!hiddenExpanded;
 const hiddenToggle=$("hiddenToggle"),hiddenAction=hiddenExpanded?"Hide hidden links":"Show hidden links";
 hiddenToggle.setAttribute("aria-expanded",String(hiddenExpanded));hiddenToggle.setAttribute("aria-label",hiddenAction);hiddenToggle.title=hiddenAction;
 const categories=[...new Set(links.map(x=>x.category).filter(Boolean))].sort();
 $("categories").innerHTML=categories.map(x=>`<option value="${escapeHtml(x)}"></option>`).join("");
 const favorites=links.filter(x=>!x.hidden&&x.favorite).slice(0,Math.max(0,Number(settings.quickCount)||0));
 favorites.forEach(item=>{
  const a=document.createElement("a");a.className="quick-item";a.href=item.url;a.title=item.url;
  a.append(iconNode(item,true));const label=document.createElement("span");label.textContent=item.name;a.append(label);$("quickbar").append(a);
 });
 $("quickbar").hidden=favorites.length===0;
 for(const [cat,items] of groups){
  const section=document.createElement("section");section.className="category";section.dataset.category=cat;
  const head=document.createElement("div");head.className="category-head";
  const title=document.createElement("h2");title.textContent=cat;
  const count=document.createElement("span");count.className="category-count";count.textContent=items.length;
  const tools=document.createElement("div");tools.className="category-tools";
  const rename=document.createElement("button");rename.type="button";rename.textContent="Rename";rename.addEventListener("click",()=>renameCategory(cat));
  const up=document.createElement("button");up.type="button";up.textContent="↑";up.title="Move category up";up.addEventListener("click",()=>moveCategory(cat,-1));
  const down=document.createElement("button");down.type="button";down.textContent="↓";down.title="Move category down";down.addEventListener("click",()=>moveCategory(cat,1));
  tools.append(rename,up,down);head.append(title,count,tools);
  const grid=document.createElement("div");grid.className="grid";
    items.forEach(item=>grid.append(createTile(item)));
  grid.addEventListener("dragover",e=>{if(editing&&dragId){e.preventDefault();e.dataTransfer.dropEffect="move"}});
  grid.addEventListener("drop",e=>{if(!editing||!dragId)return;if(e.target===grid){e.preventDefault();moveToCategory(dragId,cat);}});
  section.append(head,grid);$("links").append(section);
 }
 if(!query)hiddenItems.forEach(item=>$("hiddenLinks").append(createTile(item)));
 document.body.classList.toggle("editing",editing);$("editBtn").textContent=editing?"✓ Done editing":"✎ Edit mode";
}
function reorderLink(sourceId,targetId){
 const source=links.find(x=>x.id===sourceId),target=links.find(x=>x.id===targetId);if(!source||!target)return;
 links=links.filter(x=>x.id!==sourceId);let idx=links.findIndex(x=>x.id===targetId);source.category=target.category;links.splice(idx,0,source);saveLinks();render();toast("Shortcut moved");
}
function moveToCategory(id,cat){const item=links.find(x=>x.id===id);if(!item)return;item.category=cat;saveLinks();render();toast("Moved to "+cat)}
function renameCategory(oldName){const next=prompt("New category name:",oldName);if(!next||!next.trim()||next.trim()===oldName)return;links.forEach(x=>{if(x.category===oldName)x.category=next.trim()});saveLinks();render()}
function moveCategory(cat,dir){const cats=[...new Set(links.map(x=>x.category||"Other"))];const i=cats.indexOf(cat),j=i+dir;if(j<0||j>=cats.length)return;[cats[i],cats[j]]=[cats[j],cats[i]];const rank=new Map(cats.map((c,i)=>[c,i]));links.sort((a,b)=>(rank.get(a.category||"Other")??999)-(rank.get(b.category||"Other")??999));saveLinks();render()}
function openLinkDialog(item=null){
 $("linkForm").reset();$("linkId").value=item?.id||"";$("linkDialogTitle").textContent=item?"Edit shortcut":"Add a shortcut";
 $("name").value=item?.name||"";$("url").value=item?.url||"";$("category").value=item?.category||"";
 $("icon").value=item?.icon||"🔗";$("iconMode").value=item?.iconMode||"auto";$("image").value=item?.image||"";
 $("hidden").checked=Boolean(item?.hidden);
 $("linkDialog").showModal();$("name").focus();
}
function openSettings(){
 $("pageTitle").value=settings.title||"";$("backgroundImage").value=settings.backgroundImage||"";
 $("overlay").value=settings.overlay??35;$("overlayValue").textContent=$("overlay").value+"%";
 $("tileSize").value=settings.tileSize||"comfortable";$("quickCount").value=String(settings.quickCount??6);$("settingsDialog").showModal();
}
$("linkForm").addEventListener("submit",e=>{
 e.preventDefault();try{
  const id=$("linkId").value||crypto.randomUUID();
  const url=validUrl($("url").value);
    const item={id,name:$("name").value.trim(),url,category:$("category").value.trim()||"Other",icon:$("icon").value.trim()||"🔗",iconMode:$("iconMode").value,image:$("image").value.trim(),favorite:links.find(x=>x.id===id)?.favorite||false,hidden:$("hidden").checked};
  const index=links.findIndex(x=>x.id===id);if(index>=0)links[index]=item;else links.push(item);
  saveLinks();$("linkDialog").close();render();toast(index>=0?"Shortcut updated":"Shortcut added");
 }catch(err){alert(err.message||"Please enter a valid URL.");}
});
$("todoForm").addEventListener("submit",e=>{
 e.preventDefault();
 const id=$("todoId").value||crypto.randomUUID(),index=todos.findIndex(x=>x.id===id),current=index>=0?todos[index]:null;
 const todo={id,text:$("todoText").value.trim(),done:current?.done||false,priority:$("todoPriority").value};
 if(index>=0)todos[index]=todo;else todos.push(todo);
 saveTodos();$("todoForm").reset();$("todoId").value="";$("todoSubmit").textContent="Add task";$("todoCancel").hidden=true;renderTodos();toast(index>=0?"To-do updated":"Task added");
});
$("todoCancel").addEventListener("click",()=>{$("todoForm").reset();$("todoId").value="";$("todoSubmit").textContent="Add task";$("todoCancel").hidden=true});
$("settingsForm").addEventListener("submit",e=>{
 e.preventDefault();settings={title:$("pageTitle").value.trim()||"Your personal launchpad",backgroundImage:$("backgroundImage").value.trim(),overlay:Number($("overlay").value),tileSize:$("tileSize").value,quickCount:Number($("quickCount").value)};
 saveSettings();$("settingsDialog").close();updateHeader();render();toast("Settings saved");
});
$("overlay").addEventListener("input",()=> $("overlayValue").textContent=$("overlay").value+"%");
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$(b.dataset.close).close()));
$("addBtn").addEventListener("click",()=>openLinkDialog());
$("settingsBtn").addEventListener("click",openSettings);
$("editBtn").addEventListener("click",()=>{editing=!editing;render();toast(editing?"Edit mode enabled — drag tiles to reorder":"Edit mode disabled")});
$("themeBtn").addEventListener("click",()=>{document.body.classList.toggle("light");localStorage.setItem(THEME_KEY,document.body.classList.contains("light")?"light":"dark")});
$("search").addEventListener("input",render);
$("hiddenToggle").addEventListener("click",()=>{hiddenExpanded=!hiddenExpanded;render()});
$("searchForm").addEventListener("submit",e=>{
 e.preventDefault();const q=$("search").value.trim();if(!q)return;
 const hasMatch=links.some(x=>!x.hidden&&[x.name,x.url,x.category].some(v=>safeText(v).toLowerCase().includes(q.toLowerCase())));
 if(!hasMatch)window.location.href="https://www.google.com/search?q="+encodeURIComponent(q);
});
$("exportBtn").addEventListener("click",()=>{
 const payload={version:4,links,todos,settings,theme:localStorage.getItem(THEME_KEY)||"dark"};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=u;a.download="my-start-page-backup.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast("Backup exported");
});
$("importBtn").addEventListener("click",()=>$("importFile").click());
$("importFile").addEventListener("change",async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text());const incoming=Array.isArray(data)?data:data.links;
  const incomingTodos=Array.isArray(data)?todos:data.todos??todos;
  if(!Array.isArray(incoming)||!incoming.every(x=>x&&x.name&&x.url)||!Array.isArray(incomingTodos))throw Error();
  const clean=incoming.map((x,i)=>({...x,id:String(x.id||crypto.randomUUID()),url:validUrl(String(x.url)),name:String(x.name),category:String(x.category||"Other"),icon:String(x.icon||"🔗"),iconMode:x.iconMode||"auto"}));
  const cleanTodos=incomingTodos.filter(x=>x&&x.text).map(x=>({id:String(x.id||crypto.randomUUID()),text:String(x.text),done:Boolean(x.done),priority:["low","medium","high"].includes(x.priority)?x.priority:"medium"}));
  if(!confirm(`Import ${clean.length} links? This replaces the current link list.`))return;
  links=clean;todos=cleanTodos;if(data.settings)settings={...defaultSettings,...data.settings};saveLinks();saveTodos();saveSettings();
  if(data.theme)localStorage.setItem(THEME_KEY,data.theme);document.body.classList.toggle("light",localStorage.getItem(THEME_KEY)==="light");
  updateHeader();render();renderTodos();toast("Backup imported");
 }catch{alert("This backup file is invalid or contains an unsupported URL.");}
 finally{e.target.value=""}
});
document.addEventListener("keydown",e=>{
 const tag=(document.activeElement?.tagName||"").toLowerCase();
 const typing=["input","textarea","select"].includes(tag);
 if(e.key==="Escape"){document.querySelectorAll("dialog[open]").forEach(d=>d.close());return}
 if(!typing&&e.key==="/"){e.preventDefault();$("search").focus()}
 if(!typing&&e.key.toLowerCase()==="a"&&!e.ctrlKey&&!e.metaKey){e.preventDefault();openLinkDialog()}
 if(!typing&&e.key.toLowerCase()==="e"&&!e.ctrlKey&&!e.metaKey){editing=!editing;render()}
 if(!typing&&e.key.toLowerCase()==="t"&&!e.ctrlKey&&!e.metaKey){document.body.classList.toggle("light");localStorage.setItem(THEME_KEY,document.body.classList.contains("light")?"light":"dark")}
});
if(localStorage.getItem(THEME_KEY)==="light")document.body.classList.add("light");
updateHeader();render();renderTodos();
})();