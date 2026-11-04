import {useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {onAuthStateChanged,createUserWithEmailAndPassword,sendPasswordResetEmail,signInWithEmailAndPassword,signOut,type User} from 'firebase/auth';
import {
 Activity,ArrowDownToLine,ArrowLeft,ArrowRight,BarChart3,Check,CheckCircle2,ChevronRight,
 CircleAlert,Cloud,Database,FileCode2,FileSpreadsheet,FileText,FolderTree,
 HardDrive,Layers3,LayoutDashboard,LockKeyhole,LogOut,Menu,Plus,RefreshCw,Search,
 Settings2,ShieldCheck,SlidersHorizontal,Sparkles,Trash2,Upload,Workflow,X
} from 'lucide-react';
import {auth,configured} from './firebase';
import type {DatasetRecord,Preview,SourceRecord} from './types';
import {cleaned,previewFile,toCsv} from './parse';
import {generateStatisticalDemo} from './synthetic';
import {evaluatePreview,type EvaluationSummary} from './evaluation';
import {assertNoDescendants,traceLineage} from './lineage';
import {qualityReport,type QualityReport} from './quality';
import {addSource,completePreview,downloadDataset,removeDataset,saveDataset,watchDatasets,watchSources} from './store';

type Page='home'|'datasets'|'sources'|'quality'|'governance'|'ai'|'settings';
type DetailTab='Overview'|'Explore'|'Quality'|'Prepare'|'Lineage';
const date=(n:number)=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium'}).format(new Date(n));
const number=(n:number|null|undefined)=>n==null?'—':n.toLocaleString();
const size=(n:number)=>n>=1e9?(n/1e9).toFixed(1)+' GB':n>=1e6?(n/1e6).toFixed(1)+' MB':n>=1e3?(n/1e3).toFixed(1)+' KB':n+' B';
const iconFor=(fmt:string)=>fmt==='json'||fmt==='jsonl'?FileCode2:fmt==='txt'?FileText:FileSpreadsheet;
const formatLabel=(fmt:string)=>fmt.toUpperCase();
const sourceOptions:['github'|'kaggle'|'huggingface'|'s3'|'sql'|'other',string][]=[
 ['github','GitHub'],['kaggle','Kaggle'],['huggingface','Hugging Face'],['s3','Amazon S3'],['sql','SQL Database'],['other','Other']
];
const NAV:{id:Page;label:string;icon:typeof Database}[]=[
 {id:'home',label:'Overview',icon:LayoutDashboard},
 {id:'datasets',label:'Datasets',icon:Database},
 {id:'sources',label:'Data sources',icon:Cloud},
 {id:'quality',label:'Data quality',icon:Activity},
 {id:'governance',label:'Governance',icon:ShieldCheck},
 {id:'ai',label:'AI workflows',icon:Workflow},
 {id:'settings',label:'Settings',icon:Settings2}
];

function Status({label,tone='neutral'}:{label:string;tone?:'neutral'|'good'|'warn'|'info'}){
 return <span className={'status '+tone}><span className="status-dot"/>{label}</span>;
}
function Panel({children,className='',title,aside}:{children:ReactNode;className?:string;title?:string;aside?:ReactNode}){
 return <section className={'panel '+className}>{title&&<div className="panel-heading"><h3>{title}</h3>{aside}</div>}{children}</section>;
}
function Empty({icon:Icon,title,description,action}:{icon:typeof Database;title:string;description:string;action?:ReactNode}){
 return <div className="empty"><div className="empty-icon"><Icon size={22}/></div><h3>{title}</h3><p>{description}</p>{action&&<div className="empty-action">{action}</div>}</div>;
}
function Button({children,onClick,variant='primary',disabled=false}:{children:ReactNode;onClick:()=>void;variant?:'primary'|'secondary'|'ghost';disabled?:boolean}){
 return <button type="button" className={'btn '+variant} onClick={onClick} disabled={disabled}>{children}</button>;
}
function Startup(){
 return <div className="setup-wrap"><div className="brand-mark"><Layers3 size={27}/></div><h1>Ownlayer is ready for Firebase setup.</h1>
 <p>The frontend, data workspace and Firebase integration code are in place. Ownlayer uses the existing Firebase project. Verify the shared project's access rules and the separate Hosting target before deploying.</p>
 <Panel title="Required Firebase Web App environment variables">
  <pre className="env-sample">VITE_FIREBASE_API_KEY=...{'\n'}VITE_FIREBASE_AUTH_DOMAIN=...{'\n'}VITE_FIREBASE_PROJECT_ID=...{'\n'}VITE_FIREBASE_STORAGE_BUCKET=...{'\n'}VITE_FIREBASE_APP_ID=...</pre>
  <p className="muted small">Enable Email/Password Authentication, Firestore Database and Cloud Storage in the existing Firebase project. Never deploy the included security-rule fragments as replacements for the live shared rules. Never publish service-account credentials.</p>
 </Panel><a href="https://console.firebase.google.com/" target="_blank" rel="noreferrer" className="btn primary">Open Firebase Console <ArrowRight size={16}/></a></div>;
}
function Login({onDemo}:{onDemo:()=>void}){
 const [mode,setMode]=useState<'login'|'register'>('login'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[success,setSuccess]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!auth)return;
  setBusy(true);setError('');setSuccess('');
  try{if(mode==='login')await signInWithEmailAndPassword(auth,email,password);
   else await createUserWithEmailAndPassword(auth,email,password);
  }catch(err){setError(err instanceof Error?err.message:'Unable to authenticate.');}
  finally{setBusy(false);}
 }
 async function resetPassword(){
  const address=email.trim();
  if(!address){setError('Enter your email address first, then select Reset password.');return;}
  setBusy(true);setError('');setSuccess('');
  try{
   if(!auth)throw new Error('Firebase Authentication is unavailable.');
   await sendPasswordResetEmail(auth,address);
   setSuccess('If this email has an account, a password reset link will be sent. Check your inbox.');
  }catch(err){setError(err instanceof Error?err.message:'Unable to request a password reset.');}
  finally{setBusy(false);}
 }
 return <div className="auth-shell">
  <div className="auth-top"><span className="brand-mark"><Layers3 size={21}/></span><strong>ownlayer<span className="brand-period">.</span></strong></div>
  <div className="auth-content"><div className="auth-copy"><span className="eyebrow">THE DATA INTELLIGENCE WORKSPACE</span><h1>From raw data to<br/><em>ready for what's next.</em></h1>
   <p>Bring your data together. Inspect every record, understand quality, and prepare trusted datasets for your AI workflows.</p>
   <div className="auth-facts"><span><CheckCircle2 size={16}/> Built on Firebase</span><span><ShieldCheck size={16}/> Private-by-default data</span><span><Database size={16}/> Real file previews</span></div></div>
   <form className="auth-card" onSubmit={submit}><div className="auth-card-kicker"><LockKeyhole size={17}/> Secure workspace</div>
   <h2>{mode==='login'?'Welcome back':'Create your workspace'}</h2><p>{mode==='login'?'Sign in to continue to Ownlayer.':'Start with your email and a secure password.'}</p>
   <label>Email address<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" placeholder="you@company.com" required/></label>
   <label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==='login'?'current-password':'new-password'} minLength={6} required placeholder="At least 6 characters"/></label>
   {error&&<div className="error-inline" role="alert"><CircleAlert size={15}/>{error}</div>}
   {success&&<div className="inline-alert success" role="status"><Check size={15}/>{success}</div>}
   {mode==='login'&&<button className="auth-reset" type="button" onClick={()=>void resetPassword()} disabled={busy}>Forgot password?</button>}
   <button className="btn primary full" type="submit" disabled={busy}>{busy?'Please wait…':mode==='login'?'Sign in':'Create account'}<ArrowRight size={16}/></button>
   <button className="btn secondary full demo-entry" type="button" onClick={onDemo}><Sparkles size={16}/> Explore interactive demo — no sign-in</button>
   <div className="auth-swap">{mode==='login'?"Don't have an account?":"Already have an account?"} <button type="button" onClick={()=>{setError('');setMode(mode==='login'?'register':'login');}}>{mode==='login'?'Create an account':'Sign in'}</button></div>
   </form></div><div className="auth-bottom">© 2026 Block Studios · Ownlayer</div></div>;
}
function RowsTable({preview,limit=60,filter=''}:{preview:Preview;limit?:number;filter?:string}){
 const q=filter.toLowerCase().trim();
 const rows=preview.rows.filter(row=>!q||preview.columns.some(c=>(row[c]||'').toLowerCase().includes(q))).slice(0,limit);
 return <div className="table-scroll"><table className="data-table"><thead><tr><th className="index-col">#</th>{preview.columns.map((c,i)=><th key={i} title={c}>{c}</th>)}</tr></thead>
 <tbody>{rows.map((row,i)=><tr key={i}><td className="index-col">{i+1}</td>{preview.columns.map((col,j)=><td key={j} title={row[col]||''}>{row[col]||<span className="empty-cell">—</span>}</td>)}</tr>)}</tbody></table>
 {!rows.length&&<div className="table-empty">No rows match your search.</div>}</div>;
}
function App(){
 const [user,setUser]=useState<User|null>(null),[checking,setChecking]=useState(true);
 const [demo,setDemo]=useState(false);
 useEffect(()=>{if(!auth){setChecking(false);return;}return onAuthStateChanged(auth,u=>{setUser(u);setChecking(false);});},[]);
 if(demo)return <Workspace user={{uid:'ownlayer-demo',email:'demo@ownlayer.local'} as User} isDemo onExitDemo={()=>setDemo(false)}/>;
 if(!configured)return <Startup/>;
 if(checking)return <div className="app-loading"><span className="brand-mark"><Layers3 size={25}/></span>Loading Ownlayer…</div>;
 return user?<Workspace user={user}/>:<Login onDemo={()=>setDemo(true)}/>;
}

function Workspace({user,isDemo=false,onExitDemo}:{user:User;isDemo?:boolean;onExitDemo?:()=>void}){
 const [page,setPage]=useState<Page>('home'),[datasets,setDatasets]=useState<DatasetRecord[]>([]),[sources,setSources]=useState<SourceRecord[]>([]);
 const [selectedId,setSelectedId]=useState<string|null>(null),[tab,setTab]=useState<DetailTab>('Overview');
 const [busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState('');
 const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[filePreview,setFilePreview]=useState<Preview|null>(null);
 const [sourceModal,setSourceModal]=useState(false),[sourceName,setSourceName]=useState(''),[sourceProvider,setSourceProvider]=useState<SourceRecord['provider']>('github'),[sourceLocator,setSourceLocator]=useState('');
 const [fileSearch,setFileSearch]=useState(''),[trim,setTrim]=useState(true),[deduplicate,setDeduplicate]=useState(true);
 const [prepared,setPrepared]=useState<Preview|null>(null),[qualityDetails,setQualityDetails]=useState<QualityReport|null>(null),[mobileMenu,setMobileMenu]=useState(false);
 const [syntheticSource,setSyntheticSource]=useState(''),[syntheticCount,setSyntheticCount]=useState(100),[syntheticSeed,setSyntheticSeed]=useState(42),[syntheticPreview,setSyntheticPreview]=useState<Preview|null>(null),[syntheticEvaluation,setSyntheticEvaluation]=useState<EvaluationSummary|null>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const selected=datasets.find(d=>d.id===selectedId)||null;
 const lineage=useMemo(()=>selectedId?traceLineage(selectedId,datasets):null,[selectedId,datasets]);
 const shown=useMemo(()=>datasets.filter(d=>(filter==='all'||d.status===filter||d.format===filter)&&
  (!search||[d.name,d.source,d.format].join(' ').toLowerCase().includes(search.toLowerCase()))),[datasets,filter,search]);
 useEffect(()=>{
  const offData=watchDatasets(user.uid,setDatasets,setError);
  const offSources=watchSources(user.uid,setSources,setError);
  return()=>{offData();offSources();};
 },[user.uid]);
 useEffect(()=>{setFilePreview(null);setPrepared(null);setQualityDetails(null);setFileSearch('');if(selected?.sample)setFilePreview(selected.sample);},[selectedId,selected?.sample]);
 function open(d:DatasetRecord){setSelectedId(d.id);setTab('Overview');setPage('datasets');setMobileMenu(false);}
 function leave(){setSelectedId(null);setFilePreview(null);setPrepared(null);}
 function navigate(next:Page){leave();setPage(next);setMobileMenu(false);}
 async function act(label:string,fn:()=>Promise<void>){setBusy(label);setError('');setNotice('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Something went wrong.');}finally{setBusy('');}}
 async function upload(file?:File){
  if(!file)return;
  await act('upload',async()=>{
   if(file.size>50*1024*1024)throw new Error('Current Firebase Storage policy allows files up to 50 MB.');
   const preview=await previewFile(file);
   const id=await saveDataset(user.uid,file,preview);
   setSelectedId(id);setTab('Overview');setPage('datasets');setNotice(file.name+' uploaded. Original file preserved.');
  });
  if(inputRef.current)inputRef.current.value='';
 }
 async function createSource(){
  await act('source',async()=>{if(!sourceName.trim()||!sourceLocator.trim())throw new Error('Enter a name and locator.');
   await addSource(user.uid,{name:sourceName.trim(),provider:sourceProvider,locator:sourceLocator.trim()});
   setSourceModal(false);setSourceName('');setSourceLocator('');
   setNotice('Source registered. Automatic synchronization is not configured yet.');
  });
 }
 async function deleteSelected(){
  if(!selected)return;
  try{assertNoDescendants(selected.id,datasets);}catch(e){setError(e instanceof Error?e.message:'Cannot delete a dataset with descendants.');return;}
  if(!window.confirm('Delete "'+selected.name+'" and its original file? This cannot be undone.'))return;
  await act('delete',async()=>{await removeDataset(user.uid,selected);leave();setNotice('Dataset deleted.');});
 }
 async function prepare(){
  if(!selected)return;
  await act('prepare',async()=>{
   const original=await completePreview(selected);
   const after=cleaned(original,trim,deduplicate);
   setPrepared({...original,rows:after,estimatedTotal:after.length});
   setNotice('Preview prepared. No source data has changed.');
  });
 }
 async function saveCleaned(){
  if(!selected||!prepared)return;
  await act('save',async()=>{
   const csv=toCsv(prepared.columns,prepared.rows);
   const name=selected.name.replace(/\.[^.]+$/,'')+'_cleaned.csv';
   const file=new File([csv],name,{type:'text/csv'});
   const parsed=await previewFile(file);
   const id=await saveDataset(user.uid,file,parsed,selected.id);
   setSelectedId(id);setTab('Overview');setNotice('Cleaned copy created. Original dataset is unchanged.');
  });
 }
 async function generateSynthetic(){
  await act('synthetic',async()=>{
   const source=eligibleSynthetic.find(d=>d.id===syntheticSource);
   if(!source)throw new Error('Choose an eligible source dataset first.');
   const preview=await completePreview(source);
   const generated=generateStatisticalDemo(preview,syntheticCount,syntheticSeed);
   setSyntheticPreview(generated);
   setSyntheticEvaluation(evaluatePreview(preview,generated));
   setNotice('Local statistical preview generated. No AI model was called, and no files were saved.');
  });
 }
 async function saveSynthetic(){
  if(!syntheticPreview)return;
  await act('synthetic-save',async()=>{
   const source=eligibleSynthetic.find(d=>d.id===syntheticSource);
   if(!source)throw new Error('Original dataset not found. Select another source.');
   const name=source.name.replace(/\.[^.]+$/,'')+'_statistical_demo.csv';
   const file=new File([toCsv(syntheticPreview.columns,syntheticPreview.rows)],name,{type:'text/csv'});
   const id=await saveDataset(user.uid,file,await previewFile(file),source.id,'Statistical demo');
   setSyntheticPreview(null);setSyntheticEvaluation(null);setSelectedId(id);setPage('datasets');setTab('Overview');
   setNotice('Statistical demo saved as a separate dataset; source preserved.');
  });
 }
 const rowTotal=datasets.reduce((n,d)=>n+(d.rows||0),0),withIssues=datasets.filter(d=>d.profile?.issues.length).length;
 const eligibleSynthetic=datasets.filter(d=>d.size<=2*1024*1024&&['csv','tsv','json','jsonl'].includes(d.format));
 const visiblePreview=filePreview||selected?.sample||null;

 return <div className="shell">
  <aside className={'sidebar '+(mobileMenu?'mobile-open':'')}>
   <div className="sidebar-brand"><div className="brand-mark"><Layers3 size={21}/></div><strong>ownlayer<span className="brand-period">.</span></strong><button className="mobile-close" onClick={()=>setMobileMenu(false)} aria-label="Close navigation"><X size={20}/></button></div>
   <div className="workspace-select"><span className="workspace-avatar">B</span><div><b>Block Studios</b><small>Personal workspace</small></div><ChevronRight size={16}/></div>
   <div className="nav-label">WORKSPACE</div><nav aria-label="Primary navigation">{NAV.map(item=><button key={item.id} className={'nav-item '+(page===item.id?'active':'')} onClick={()=>navigate(item.id)}><item.icon size={17}/>{item.label}{item.id==='datasets'&&<small>{datasets.length}</small>}</button>)}</nav>
   <div className="sidebar-spacer"/><div className="sidebar-footer"><div className="sidebar-profile"><span className="profile-avatar">{(user.email||'U')[0].toUpperCase()}</span><div><strong title={user.email||''}>{user.email?.split('@')[0]||'User'}</strong><small>Workspace member</small></div></div>
    <button onClick={()=>{if(isDemo){onExitDemo?.();return;}if(auth)void signOut(auth);}} className="signout"><LogOut size={16}/>{isDemo?'Exit demo':'Sign out'}</button>
   </div>
  </aside>
  {mobileMenu&&<button className="menu-scrim" aria-label="Close menu" onClick={()=>setMobileMenu(false)}/>}
  <div className="main-shell">
   <header className="topbar"><button className="mobile-nav" onClick={()=>setMobileMenu(true)} aria-label="Open navigation"><Menu size={21}/></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14}/><strong>{selected?selected.name:NAV.find(x=>x.id===page)?.label}</strong></div>
    <div className="top-right"><span className="top-environment"><span/>{isDemo?'Local interactive demo':'Firebase workspace'}</span><span className="top-avatar">{(user.email||'U')[0].toUpperCase()}</span></div></header>
   <main className="main-content">
    {isDemo&&<div className="inline-alert demo-notice" role="status"><Sparkles size={16}/><span><strong>INTERACTIVE DEMO</strong> · Sample records only. Changes stay in this browser; no cloud data or AI model inference is used.</span><button onClick={()=>onExitDemo?.()} aria-label="Exit demo"><X size={16}/></button></div>}
    {notice&&<div className="inline-alert success" role="status"><Check size={16}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="Dismiss"><X size={16}/></button></div>}
    {error&&<div className="inline-alert danger" role="alert"><CircleAlert size={16}/><span>{error}</span><button onClick={()=>setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
    <input type="file" ref={inputRef} accept=".csv,.tsv,.json,.jsonl,.txt" hidden aria-label="Upload data file" onChange={e=>void upload(e.target.files?.[0])}/>
    {selected&&page==='datasets'?<>
     <div className="detail-back"><button onClick={leave}><ArrowLeft size={15}/> All datasets</button></div>
     <div className="dataset-head"><div className="dataset-heading"><span className="dataset-icon"><FileSpreadsheet size={23}/></span><div><div className="eyebrow">DATASET WORKSPACE</div><h1>{selected.name}</h1><p>Original data preserved · {selected.source} · Added {date(selected.createdAt)}</p></div></div>
      <div className="page-actions"><Button variant="secondary" onClick={()=>void act('download',()=>downloadDataset(selected))}><ArrowDownToLine size={16}/> Download original</Button><Button variant="secondary" onClick={()=>void deleteSelected()} disabled={busy==='delete'}><Trash2 size={16}/></Button></div></div>
     <div className="detail-stats"><Stat icon={Database}label="Records" value={number(selected.rows)} detail={selected.rows==null?'Not counted':'File records'}/><Stat icon={SlidersHorizontal} label="Columns" value={number(selected.columns.length)} detail="Detected fields"/><Stat icon={HardDrive}label="File size" value={size(selected.size)} detail={formatLabel(selected.format)}/><Stat icon={ShieldCheck}label="Data health" value={selected.profile?.issues.length?'Review needed':'No flagged issues'} detail={selected.profile?'Checks on '+number(selected.profile.sampledRows)+' records':'Not evaluated'}/></div>
     <div className="detail-tabs" role="tablist" aria-label="Dataset sections">{(['Overview','Explore','Quality','Prepare','Lineage'] as const).map(t=><button key={t} role="tab" aria-selected={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</div>
     {(tab==='Overview'||tab==='Explore')&&<div className="dataset-workspace">
      <Panel className="preview-panel" title={tab==='Overview'?'Your data, at a glance':'Explore actual data'} aside={<span className="subtle">{visiblePreview?'First '+number(Math.min(visiblePreview.rows.length,100))+' records':'No preview'}</span>}>
       {visiblePreview?<><div className="preview-toolbar"><span><FileSpreadsheet size={16}/>{selected.name}</span><label><Search size={15}/><input aria-label="Search preview" placeholder="Search visible rows" value={fileSearch} onChange={e=>setFileSearch(e.target.value)}/></label></div>
        <RowsTable preview={visiblePreview}filter={fileSearch}limit={100}/><div className="preview-footer">{visiblePreview.message||'Read-only data preview.'}<button onClick={()=>setTab('Prepare')}>Prepare data <ArrowRight size={14}/></button></div></>
        :<Empty icon={FileText} title="No preview available" description="Original file is stored, but no preview could be loaded."/>}
      </Panel>
      <div className="insight-rail"><Panel title="File information"><div className="kv"><span>Format</span><b>{formatLabel(selected.format)}</b></div><div className="kv"><span>Uploaded</span><b>{date(selected.createdAt)}</b></div><div className="kv"><span>File size</span><b>{size(selected.size)}</b></div><div className="kv"><span>Stored rows</span><b>{number(selected.rows)}</b></div><div className="kv"><span>Source</span><b>{selected.source}</b></div></Panel>
       <Panel title="What to do next"><div className="next-actions"><button onClick={()=>setTab('Quality')}><Activity size={17}/>Review quality<ArrowRight size={16}/></button><button onClick={()=>setTab('Prepare')}><SlidersHorizontal size={17}/>Clean & prepare<ArrowRight size={16}/></button><button onClick={()=>setTab('Lineage')}><FolderTree size={17}/>View lineage<ArrowRight size={16}/></button></div></Panel></div>
     </div>}
     {tab==='Quality'&&<Panel title="Column-level profiling" aside={<Button disabled={!!busy||selected.size>2*1024*1024||!['csv','tsv','json','jsonl'].includes(selected.format)} onClick={()=>void act('quality-full',async()=>{const full=await completePreview(selected);setQualityDetails(qualityReport(full));setNotice('Full-file quality report calculated locally.');})}>{busy==='quality-full'?'Profiling…':'Analyze full file'}</Button>}>
      <div className="quality-profile-block">
       <p className="muted small">Optional local analysis of the complete file (up to 2 MB). No model inference or server job. Existing stored summary can reflect a sample.</p>
       {qualityDetails?<><div className="quality-metrics"><div><span>Completeness</span><strong>{qualityDetails.completenessPct}%</strong></div><div><span>Duplicate rows</span><strong>{qualityDetails.duplicateRows}</strong></div><div><span>Columns analyzed</span><strong>{qualityDetails.columns}</strong></div></div>
       <div className="table-scroll"><table className="data-table"><thead><tr><th>Column</th><th>Type</th><th>Missing</th><th>Distinct</th><th>Min</th><th>Max</th></tr></thead><tbody>
       {qualityDetails.columnQuality.map(col=><tr key={col.column}><td>{col.column}</td><td>{col.inferredType}</td><td>{col.missing} ({col.missingPct}%)</td><td>{col.distinct}</td><td>{col.min??'—'}</td><td>{col.max??'—'}</td></tr>)}
       </tbody></table></div></>:<p className="muted small">Click Analyze full file to compute per-column missingness, distinct values, inferred types, numeric bounds and duplicates.</p>}
      </div>
     </Panel>}
     {tab==='Quality'&&<div className="two-column"><Panel title="Data quality checks"><div className="quality-hero"><div><span className="eyebrow">QUALITY SUMMARY</span><h2>{selected.profile?.issues.length?'Needs review':'No issues detected'}</h2><p>{selected.profile?'Checked '+number(selected.profile.sampledRows)+' records. '+(selected.size>2*1024*1024?'Large file: sample results only.':'This profile reflects the parsed local file.'):'Quality has not been evaluated.'}</p></div><Status label={selected.profile?.issues.length?'Review needed':'Check complete'} tone={selected.profile?.issues.length?'warn':'good'}/></div>
       <div className="quality-metrics"><div><span>Missing cells</span><strong>{number(selected.profile?.missingCells)}</strong></div><div><span>Duplicate records</span><strong>{number(selected.profile?.duplicates)}</strong></div><div><span>Inspected records</span><strong>{number(selected.profile?.sampledRows)}</strong></div></div>
       <div className="issues-list">{selected.profile?.issues.length?selected.profile.issues.map((issue,i)=><div key={i}><CircleAlert size={16}/>{issue}</div>):<div className="no-issues"><CheckCircle2 size={17}/> No detected issues within evaluated data.</div>}</div></Panel>
       <Panel title="Next step"><div className="quality-next"><ShieldCheck size={26}/><h3>Keep the original safe.</h3><p>Prepare an independent cleaned copy, compare the changes and preserve lineage to the original file.</p><Button onClick={()=>setTab('Prepare')}>Open preparation <ArrowRight size={16}/></Button></div></Panel></div>}
     {tab==='Prepare'&&<div className="two-column"><Panel title="Prepare a cleaned dataset"><div className="prepare-lead"><div className="prepare-icon"><SlidersHorizontal size={22}/></div><div><h3>Safe, non-destructive cleaning</h3><p>Review changes before saving. Your original dataset is never overwritten.</p></div></div>
        <label className="option-row"><div><b>Trim extra whitespace</b><span>Remove leading and trailing spaces from every cell.</span></div><input type="checkbox" checked={trim} onChange={e=>{setTrim(e.target.checked);setPrepared(null);}}/></label>
        <label className="option-row"><div><b>Remove duplicate records</b><span>Keep the first record when all fields match.</span></div><input type="checkbox" checked={deduplicate} onChange={e=>{setDeduplicate(e.target.checked);setPrepared(null);}}/></label>
        <div className="prepare-foot"><Button variant="secondary" onClick={()=>void prepare()} disabled={!!busy||selected.size>2*1024*1024||!['csv','tsv','json','jsonl'].includes(selected.format)}>{busy==='prepare'?'Processing…':'Preview changes'} <ArrowRight size={15}/></Button>
        {prepared&&<Button onClick={()=>void saveCleaned()} disabled={!!busy}>{busy==='save'?'Saving…':'Save as new dataset'} <Check size={15}/></Button>}</div>
        {selected.size>2*1024*1024&&<p className="small muted">File is over 2 MB. Server-side cleaning must be implemented before processing it safely.</p>}
       </Panel><Panel title="Before & after">{prepared?<><div className="compare-stats"><div><span>Before</span><strong>{number(selected.rows)}</strong><small>Records</small></div><ArrowRight size={18}/><div><span>After</span><strong>{number(prepared.estimatedTotal)}</strong><small>Records</small></div></div><p className="small muted">Preview of the transformed records. Save to create a separate dataset.</p><RowsTable preview={{...prepared,rows:prepared.rows.slice(0,12)}} limit={12}/></>
        :<Empty icon={RefreshCw} title="Preview your changes" description="Choose rules, then preview the result before creating a new dataset."/>}</Panel></div>}
     {tab==='Lineage'&&<Panel title="Version and lineage"><div className="lineage">
      {lineage?.nodes.map((node,index)=><div key={node.kind+':'+(node.kind==='dataset'?node.dataset.id:node.id)}>
       {index>0&&<div className="lineage-link"/>}
       <div className="lineage-node"><span className="lineage-icon"><FolderTree size={19}/></span><div>
        <b>{node.kind==='dataset'?(index===0?'Selected dataset':node.dataset.parentId?'Ancestor dataset':'Root dataset'):node.kind==='cycle'?'Cycle detected':'Missing ancestor'}</b>
        <p>{node.kind==='dataset'?node.dataset.name:node.id}</p>
        <small>{node.kind==='dataset'?'Saved '+date(node.dataset.createdAt):node.kind==='cycle'?'Invalid lineage metadata; traversal stopped.':'Source record no longer available; history is incomplete.'}</small>
       </div>
       {node.kind==='dataset'&&index>0&&<Button variant="secondary" onClick={()=>open(node.dataset)}>Open</Button>}
       </div></div>)}
      {lineage&&!lineage.complete&&<p className="muted small" role="alert">Lineage incomplete: missing or cyclic ancestor metadata. Do not treat this chain as a verified audit trail.</p>}
      <div className="lineage-children"><strong>Derived datasets ({lineage?.descendants.length||0})</strong>
       {lineage?.descendants.length?lineage.descendants.map(child=><div key={child.id} className="lineage-node"><span className="lineage-icon"><Database size={18}/></span><div><b>{child.name}</b><small>Saved {date(child.createdAt)}</small></div><Button variant="secondary" onClick={()=>open(child)}>Open</Button></div>):<p className="muted small">No known descendants in this workspace.</p>}
      </div>
     </div></Panel>}
    </>
    :page==='home'?<>
     <div className="page-title"><div><span className="eyebrow">YOUR WORKSPACE</span><h1>Good to see you.</h1><p>Your data foundation, at a glance.</p></div><div className="page-actions"><Button variant="secondary" onClick={()=>navigate('sources')}><Plus size={16}/> Connect source</Button><Button onClick={()=>inputRef.current?.click()}><Upload size={16}/> Upload dataset</Button></div></div>
     <div className="metric-grid"><Stat icon={Database}label="Total datasets" value={number(datasets.length)} detail="Registered in this workspace"/><Stat icon={BarChart3}label="Total records" value={number(rowTotal)} detail="Across counted files"/><Stat icon={Cloud}label="Data sources" value={number(sources.length)} detail="Registered connectors"/><Stat icon={CircleAlert}label="Needs attention" value={number(withIssues)} detail="Datasets with flagged issues"/></div>
     <div className="home-grid"><Panel className="dataset-list" title="Recent datasets" aside={<button className="inline-link" onClick={()=>navigate('datasets')}>View all <ArrowRight size={15}/></button>}>{datasets.length?<DatasetRows datasets={datasets.slice(0,6)} onOpen={open}/>:<Empty icon={Database} title="Your data starts here" description="Upload a CSV, JSON or other supported file to preview, inspect and prepare it." action={<Button onClick={()=>inputRef.current?.click()}><Upload size={16}/>Upload your first file</Button>}/>}</Panel>
     <Panel title="Getting started"><div className="steps"><button onClick={()=>inputRef.current?.click()}><span>01</span><div><b>Upload your data</b><small>CSV, TSV, JSON, JSONL, TXT</small></div><ChevronRight size={17}/></button><button onClick={()=>navigate('datasets')}><span>02</span><div><b>Explore & validate</b><small>See actual rows and quality metrics</small></div><ChevronRight size={17}/></button><button onClick={()=>navigate('datasets')}><span>03</span><div><b>Prepare for AI</b><small>Create a cleaned, traceable copy</small></div><ChevronRight size={17}/></button></div></Panel></div>
     <div className="discreet-footer"><Layers3 size={15}/> Ownlayer · From data to intelligence.</div>
    </>
    :page==='datasets'?<>
     <div className="page-title"><div><span className="eyebrow">DATA WORKSPACE</span><h1>Datasets</h1><p>Discover, explore and prepare all your data in one place.</p></div><div className="page-actions"><Button variant="secondary" onClick={()=>navigate('sources')}><Plus size={16}/> Connect a source</Button><Button onClick={()=>inputRef.current?.click()}><Upload size={16}/> Upload dataset</Button></div></div>
     <Panel className="dataset-list"><div className="catalog-toolbar"><label className="catalog-search"><Search size={17}/><input placeholder="Search datasets…" aria-label="Search datasets" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label="Filter datasets" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All datasets</option><option value="ready">No flagged issues</option><option value="needs-review">Needs review</option><option value="csv">CSV</option><option value="json">JSON</option><option value="jsonl">JSONL</option></select><span className="catalog-count">{shown.length} datasets</span></div>
       {shown.length?<DatasetRows datasets={shown} onOpen={open}/>:<Empty icon={Database} title={datasets.length?'Nothing matches these filters':'No datasets yet'} description={datasets.length?'Try another search or filter.':'Upload a supported file to start your first dataset.'} action={!datasets.length?<Button onClick={()=>inputRef.current?.click()}><Plus size={15}/>Add dataset</Button>:undefined}/>}</Panel>
    </>
    :page==='sources'?<>
     <div className="page-title"><div><span className="eyebrow">CONNECTIONS</span><h1>Data sources</h1><p>Keep track of where your data comes from.</p></div><Button onClick={()=>setSourceModal(true)}><Plus size={16}/> Register source</Button></div>
     <div className="info-strip"><CircleAlert size={18}/><div><b>Connection registry (not yet synced)</b><p>Source names and locations are saved to Firestore. Automated ingestion, credentials and scheduled sync must be implemented before these become live connections.</p></div></div>
     <Panel title="Registered sources">{sources.length?<div className="sources-list">{sources.map(s=><div className="source-row" key={s.id}><div className="source-icon"><Cloud size={20}/></div><div><b>{s.name}</b><p>{s.locator}</p></div><Status label="Registered" tone="info"/><small>{date(s.createdAt)}</small></div>)}</div>:<Empty icon={Cloud}title="No connections registered" description="Add GitHub, Kaggle, Hugging Face or other source information here." action={<Button onClick={()=>setSourceModal(true)}><Plus size={16}/>Register a source</Button>}/>}</Panel>
    </>
    :page==='quality'?<>
     <div className="page-title"><div><span className="eyebrow">TRUST & VALIDATION</span><h1>Data quality</h1><p>Find the datasets that need attention before they reach AI workflows.</p></div></div>
     <div className="metric-grid"><Stat icon={Database}label="Datasets evaluated" value={number(datasets.filter(d=>d.profile).length)}/><Stat icon={CircleAlert}label="Flagged datasets" value={number(withIssues)}/><Stat icon={SlidersHorizontal}label="Missing cells" value={number(datasets.reduce((s,d)=>s+(d.profile?.missingCells||0),0))}/><Stat icon={Activity}label="Duplicate records" value={number(datasets.reduce((s,d)=>s+(d.profile?.duplicates||0),0))}/></div>
     <Panel title="Review dataset quality">{datasets.length?<DatasetRows datasets={datasets}onOpen={d=>{open(d);setTab('Quality');}}/>:<Empty icon={Activity}title="No quality results yet" description="Upload a dataset to run preview profiling."/>}</Panel>
    </>
    :page==='governance'?<>
     <div className="page-title"><div><span className="eyebrow">DATA RESPONSIBILITY</span><h1>Governance</h1><p>Understand where your files are stored and who can access them.</p></div></div>
     <div className="governance-grid"><Panel title="Workspace access"><div className="gov-icon"><LockKeyhole size={25}/></div><h3>Per-user isolation</h3><p>Firestore and Storage rules are configured so authenticated users can access only their own workspace paths. Team roles and organization sharing are not enabled yet.</p><Status tone="good" label="Rules included in repository"/></Panel>
      <Panel title="Original data integrity"><div className="gov-icon"><ShieldCheck size={25}/></div><h3>Non-destructive preparation</h3><p>Cleaning creates a separate file and Firestore record. The source file stays unchanged with its source reference.</p><Status tone="good" label="Supported in this build"/></Panel>
      <Panel title="Privacy readiness"><div className="gov-icon"><CircleAlert size={25}/></div><h3>Needs advanced policy controls</h3><p>Automatic sensitive-data detection, retention enforcement, multi-user roles, audit logging and compliance certification are not implemented in this initial build.</p><Status tone="warn" label="Further work required"/></Panel></div>
    </>
    :page==='ai'?<>
     <div className="page-title"><div><span className="eyebrow">EXPERIMENTAL WORKFLOWS</span><h1>Synthetic data lab</h1><p>Explore a local statistical baseline before integrating a trained generative model.</p></div></div>
     <div className="info-strip"><CircleAlert size={18}/><div><b>Not AI-generated and NOT privacy-preserving</b><p>This browser-based demo draws independent column samples and numeric/date ranges. It may repeat sensitive values and does not preserve relationships between columns. Only use non-sensitive test data. Real synthetic-data foundation model training and inference are still pending.</p></div></div>
     <Panel title="Generate a statistical demo">
      <div className="synthetic-form">
       <label>Source dataset<select aria-label="Synthetic source dataset" value={syntheticSource} onChange={e=>{setSyntheticSource(e.target.value);setSyntheticPreview(null);setSyntheticEvaluation(null);}}>
        <option value="">Select a dataset</option>{eligibleSynthetic.map(d=><option key={d.id} value={d.id}>{d.name} ({number(d.rows)} records)</option>)}
       </select></label>
       <label>Output rows<input type="number" min="1" max="5000" aria-label="Synthetic row count" value={syntheticCount} onChange={e=>{setSyntheticCount(Number(e.target.value));setSyntheticPreview(null);setSyntheticEvaluation(null);}}/></label>
       <label>Reproducible seed<input type="number" min="0" max="4294967295" aria-label="Synthetic seed" value={syntheticSeed} onChange={e=>{setSyntheticSeed(Number(e.target.value));setSyntheticPreview(null);setSyntheticEvaluation(null);}}/></label>
       <Button onClick={()=>void generateSynthetic()} disabled={!syntheticSource||!!busy}>{busy==='synthetic'?'Generating…':'Generate preview'} <Sparkles size={16}/></Button>
      </div>
      {!eligibleSynthetic.length&&<p className="muted small synthetic-hint">Upload a CSV, TSV, JSON or JSONL file of 2 MB or less to use this preview. Sensitive identifier columns and high-cardinality text are blocked.</p>}
      {syntheticPreview&&<div className="synthetic-results">
       <div className="synthetic-result-head"><div><strong>{number(syntheticPreview.rows.length)} generated sample rows</strong><p>Independent statistical synthesis. No remote API requests were made.</p></div><Button onClick={()=>void saveSynthetic()} disabled={!!busy}>{busy==='synthetic-save'?'Saving…':'Save as new dataset'} <ArrowRight size={16}/></Button></div>
       {syntheticEvaluation&&<div className="synthetic-evaluation">
        <div className="synthetic-evaluation-heading"><strong>Basic data evaluation</strong><p>Computed from the original and generated records. These checks do not prove privacy, utility or model quality.</p></div>
        <div className="synthetic-metric-grid">
         <div><span>Schema match</span><strong>{syntheticEvaluation.schemaMatch?'Yes':'No'}</strong></div>
         <div><span>New row combinations</span><strong>{syntheticEvaluation.noveltyPct}%</strong></div>
         <div><span>Numeric in source range</span><strong>{syntheticEvaluation.numericInRangePct===null?'N/A':syntheticEvaluation.numericInRangePct+'%'}</strong></div>
         <div><span>Category coverage</span><strong>{syntheticEvaluation.categoryCoveragePct===null?'N/A':syntheticEvaluation.categoryCoveragePct+'%'}</strong></div>
         <div><span>Missing cells · source</span><strong>{syntheticEvaluation.sourceMissingPct}%</strong></div>
         <div><span>Missing cells · generated</span><strong>{syntheticEvaluation.generatedMissingPct}%</strong></div>
        </div>
        <p className="muted small">Novel row combinations are not a privacy guarantee. Real evaluation also needs correlations, downstream utility, memorization/privacy attacks, and domain-specific validation.</p>
       </div>}
       <RowsTable preview={syntheticPreview} limit={30}/>
       <p className="muted small synthetic-hint">{syntheticPreview.message}</p>
      </div>}
     </Panel>
     <Panel title="Foundation model roadmap"><div className="ai-pending"><span className="ai-hero-icon"><Sparkles size={30}/></span><span className="eyebrow">NOT YET TRAINED</span><h2>Secure model-backed generation</h2><p>A trained generator, privacy evaluation, domain fidelity, and secure server-side inference remain separate engineering tasks. This statistical preview is a reference baseline, not a trained LLM or production synthetic-data service.</p></div></Panel>
    </>
    :<><div className="page-title"><div><span className="eyebrow">WORKSPACE CONFIGURATION</span><h1>Settings</h1><p>Your workspace's connected environment.</p></div></div>
      <Panel title="Account details"><div className="setting-row"><span>Account email</span><b>{user.email}</b></div><div className="setting-row"><span>Environment</span><b>{isDemo?'Offline interactive demo':'Firebase project ai-engine-8ab26'}</b></div><div className="setting-row"><span>Authentication</span><Status tone="good"label="Email / password"/></div><div className="setting-row"><span>Data storage</span><b>{isDemo?'Browser local storage (sample data)':'Cloud Firestore + Cloud Storage'}</b></div></Panel></>}
   </main>
  </div>
  {sourceModal&&<div className="modal-backdrop" onMouseDown={()=>setSourceModal(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="source-title" onMouseDown={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">DATA CONNECTIONS</span><h2 id="source-title">Register a source</h2></div><button onClick={()=>setSourceModal(false)} aria-label="Close"><X size={21}/></button></div><p className="muted small">Register a source location for your catalog. It does not fetch private data or connect credentials yet.</p>
   <label>Connection name<input placeholder="e.g. Customer claims repository" value={sourceName}onChange={e=>setSourceName(e.target.value)}/></label>
   <label>Source type<select value={sourceProvider} onChange={e=>setSourceProvider(e.target.value as SourceRecord['provider'])}>{sourceOptions.map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
   <label>Resource location<input placeholder="Repository URL, dataset ID or connection identifier" value={sourceLocator}onChange={e=>setSourceLocator(e.target.value)}/></label>
   <div className="modal-actions"><Button variant="secondary" onClick={()=>setSourceModal(false)}>Cancel</Button><Button onClick={()=>void createSource()} disabled={!!busy||!sourceName.trim()||!sourceLocator.trim()}>{busy==='source'?'Saving…':'Save source'}</Button></div></div></div>}
 </div>;
}
function Stat({icon:Icon,label,value,detail}:{icon:typeof Database;label:string;value:string;detail?:string}){
 return <div className="stat"><div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17}/></span></div><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>;
}
function DatasetRows({datasets,onOpen}:{datasets:DatasetRecord[];onOpen:(d:DatasetRecord)=>void}){
 return <div className="table-scroll"><table className="catalog-table"><thead><tr><th>Dataset</th><th>Format</th><th>Records</th><th>File size</th><th>Status</th><th>Added</th><th/></tr></thead>
 <tbody>{datasets.map(d=>{const Icon=iconFor(d.format);return <tr key={d.id} onClick={()=>onOpen(d)} tabIndex={0} onKeyDown={e=>{if(e.key==='Enter')onOpen(d);}}><td><div className="catalog-name"><span className="catalog-file"><Icon size={18}/></span><span><b>{d.name}</b><small>{d.source}</small></span></div></td><td><span className="format-tag">{formatLabel(d.format)}</span></td><td>{number(d.rows)}</td><td>{size(d.size)}</td><td><Status label={d.status==='needs-review'?'Needs review':'Ready to explore'} tone={d.status==='needs-review'?'warn':'good'}/></td><td className="muted">{date(d.createdAt)}</td><td><ArrowRight size={17} className="row-arrow"/></td></tr>;})}</tbody></table></div>;
}
export default App;
