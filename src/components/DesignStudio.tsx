import React, { useEffect, useMemo, useState } from 'react';
import { Check, Eye, RotateCcw, Save, Sparkles, Monitor, Smartphone, Tablet, ChevronUp, ChevronDown, Palette, Type, Layers, Image as ImageIcon, MousePointer2, Navigation, LayoutTemplate, Play, Smartphone as Device } from 'lucide-react';
import { safeFetchJson } from '../lib/apiClient';

type Design = any;
const DEFAULT: Design = {
  version: 2, site:{name:'AgentDesk',publicDomain:'',logoUrl:'',faviconUrl:'',pageTitle:'AgentDesk',pageDescription:''},
  brand:{primaryColor:'#2563EB',secondaryColor:'#0F172A',accentColor:'#7C3AED',backgroundColor:'#020617',surfaceColor:'#0F172A',textColor:'#F8FAFC',mutedTextColor:'#94A3B8',borderColor:'#1E293B',successColor:'#22C55E',dangerColor:'#EF4444'},
  typography:{headingFont:'Inter',bodyFont:'Inter',baseSize:16,headingWeight:700,letterSpacing:-.02,lineHeight:1.5},
  appearance:{theme:'dark',radius:18,shadow:'medium',material:'glass',glassBlur:18,glassOpacity:.62,glassSaturation:150,animationSpeed:1,enableMotion:true},
  background:{mode:'aurora',imageUrl:'',videoUrl:'',overlayColor:'#020617',overlayOpacity:.32,gradientStart:'#2563EB',gradientEnd:'#7C3AED',gradientAngle:135},
  navigation:{style:'glass',sticky:true,showLogin:true,showGetStarted:true,showDemo:true,blur:18},
  buttons:{style:'gradient',radius:16,shadow:true,hoverLift:true,uppercase:false},
  icons:{style:'outline',size:20,strokeWidth:1.8,color:'#60A5FA',opacity:1,container:true,containerRadius:12},
  homepage:{heroHeadline:'Your AI employee for every customer conversation.',heroSubheadline:'Let AgentDesk handle the first response, capture the enquiry, qualify the lead, and keep follow-up moving.',showPosterProcess:true,showBenefits:true,showIntegrations:true,showPricing:true,showFaq:true,showDashboardPreview:true,showProblem:true,showTrustBar:true,sectionOrder:['hero','problem','poster','dashboard','benefits','integrations','pricing','faq'],heroAlignment:'center',heroMinHeight:720,heroBackgroundMode:'aurora'},
  pages:{dashboard:{backgroundColor:'#020617',surfaceColor:'#0F172A',radius:18,density:'comfortable'},login:{backgroundColor:'#020617',surfaceColor:'#0F172A',showLogo:true},pricing:{backgroundColor:'#020617',surfaceColor:'#0F172A',cardRadius:22,highlightColor:'#2563EB'},public:{maxWidth:1200,pagePadding:24}}
};
const FONTS=['Inter','system-ui','Arial','Helvetica','Georgia','Trebuchet MS','Verdana'];
const TABS=[['theme',Palette,'Theme'],['background',ImageIcon,'Background'],['type',Type,'Typography'],['nav',Navigation,'Navigation'],['buttons',MousePointer2,'Buttons'],['icons',Sparkles,'Icons'],['pages',LayoutTemplate,'Pages'],['homepage',Layers,'Homepage']];
const clone=(x:any)=>structuredClone(x);

const normalizeAssetUrl=(raw:string)=>{
  const value=String(raw||'').trim();
  if(!value)return '';
  try{
    const u=new URL(value,window.location.origin);
    const host=u.hostname.toLowerCase();
    const drive=u.pathname.match(/^\/file\/d\/([^/]+)/);
    if((host==='drive.google.com'||host==='docs.google.com')&&drive?.[1]){
      return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(drive[1])}`;
    }
    if(host==='dropbox.com'||host.endsWith('.dropbox.com')){
      u.searchParams.set('raw','1');
      return u.toString();
    }
    if(host==='github.com'){
      const parts=u.pathname.split('/').filter(Boolean);
      const blobIndex=parts.indexOf('blob');
      if(parts.length>=5&&blobIndex===2){
        return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts[3]}/${parts.slice(4).join('/')}`;
      }
    }
    return u.toString();
  }catch{return value;}
};

export const DesignStudio: React.FC = () => {
  const [design,setDesign]=useState<Design>(DEFAULT), [saved,setSaved]=useState(false), [loading,setLoading]=useState(true), [tab,setTab]=useState('theme'), [device,setDevice]=useState('desktop'), [preview,setPreview]=useState(true);
  useEffect(()=>{safeFetchJson('/api/site-design').then((r:any)=>r.success&&r.design&&setDesign(r.design)).finally(()=>setLoading(false));},[]);
  const update=(path:string[],value:any)=>{setDesign((p:any)=>{const n=clone(p);let c=n;path.slice(0,-1).forEach(k=>c=c[k]);c[path[path.length-1]]=value;return n});setSaved(false)};
  const save=async()=>{const r:any=await safeFetchJson('/api/site-design',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(design)});if(r.success){setSaved(true);setTimeout(()=>setSaved(false),2000)}};
  const reset=async()=>{const r:any=await safeFetchJson('/api/site-design/reset',{method:'POST'});if(r.success)setDesign(r.design||DEFAULT)};
  const move=(i:number,dir:number)=>{const a=[...design.homepage.sectionOrder],j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];update(['homepage','sectionOrder'],a)};
  const bg=useMemo(()=>{const b=design.background;if(b.mode==='gradient')return `linear-gradient(${b.gradientAngle}deg,${b.gradientStart},${b.gradientEnd})`;return b.mode==='glass'?'radial-gradient(circle at 20% 10%,rgba(37,99,235,.35),transparent 40%),radial-gradient(circle at 80% 20%,rgba(124,58,237,.3),transparent 40%)':b.mode==='aurora'?'radial-gradient(circle at 20% 20%,rgba(37,99,235,.42),transparent 35%),radial-gradient(circle at 80% 10%,rgba(124,58,237,.35),transparent 38%),'+design.brand.backgroundColor:design.brand.backgroundColor},[design]);
  const css={...{'--p':design.brand.primaryColor,'--a':design.brand.accentColor,'--surface':design.brand.surfaceColor} as any,backgroundColor:design.brand.backgroundColor,color:design.brand.textColor,fontFamily:design.typography.bodyFont};
  if(loading)return <div className="p-8 text-slate-400">Loading Visual Studio...</div>;
  return <div className="min-h-full bg-[#05070c] text-white flex flex-col">
    <header className="h-16 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between px-5 sticky top-0 z-30">
      <div><div className="text-[10px] tracking-[.25em] font-black text-blue-400">AGENTDESK CONTROL CENTER</div><div className="font-black text-lg">Visual Studio</div></div>
      <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">{[['desktop',Monitor],['tablet',Tablet],['mobile',Smartphone]].map(([k,I]:any)=><button key={k} onClick={()=>setDevice(k)} className={`p-2 rounded-lg ${device===k?'bg-white/10 text-white':'text-slate-500'}`}><I className="w-4 h-4"/></button>)}</div>
      <div className="flex gap-2"><button onClick={()=>setPreview(!preview)} className="px-3 py-2 rounded-xl border border-white/10 text-xs flex gap-2 items-center"><Eye className="w-4 h-4"/>{preview?'Preview':'Editor'}</button><button onClick={reset} className="p-2 rounded-xl border border-white/10"><RotateCcw className="w-4 h-4"/></button><button onClick={save} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex gap-2 items-center"><Save className="w-4 h-4"/>{saved?'Published':'Publish'}</button></div>
    </header>
    <div className="flex flex-1 min-h-0">
      <aside className="w-64 shrink-0 border-r border-white/10 bg-[#090b11] p-3 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-black px-2 mb-2">Design system</div>
        {TABS.map(([id,I,label]:any)=><button key={id} onClick={()=>setTab(id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm mb-1 ${tab===id?'bg-blue-600/15 text-blue-300 border border-blue-500/20':'text-slate-400 hover:bg-white/5'}`}><I className="w-4 h-4"/>{label}</button>)}
      </aside>
      <section className="w-[360px] shrink-0 border-r border-white/10 bg-[#0b0e15] p-4 overflow-y-auto">
        <Panel title={tab==='theme'?'Theme & Material':tab==='background'?'Background & Motion':tab==='type'?'Typography':tab==='nav'?'Navigation':tab==='buttons'?'Buttons':tab==='icons'?'Icon System':tab==='pages'?'All Pages':'Homepage Builder'}>
        {tab==='theme'&&<><ColorRows d={design} u={update}/><Select label="Material" value={design.appearance.material} opts={['solid','glass','soft-glass','frosted','transparent','elevated']} onChange={v=>update(['appearance','material'],v)}/><Range label="Corner radius" value={design.appearance.radius} min={0} max={40} onChange={v=>update(['appearance','radius'],v)}/><Range label="Glass blur" value={design.appearance.glassBlur} min={0} max={40} onChange={v=>update(['appearance','glassBlur'],v)}/><Range label="Glass opacity" value={design.appearance.glassOpacity} min={.1} max={1} step={.05} onChange={v=>update(['appearance','glassOpacity'],v)}/><Toggle label="Motion & animations" value={design.appearance.enableMotion} onChange={v=>update(['appearance','enableMotion'],v)}/></>}
        {tab==='background'&&<><Select label="Background mode" value={design.background.mode} opts={['solid','gradient','image','video','aurora','particles','shapes','glass']} onChange={v=>update(['background','mode'],v)}/><Input label="Image URL" value={design.background.imageUrl} onChange={v=>update(['background','imageUrl'],v)}/><Input label="Video URL (MP4/WebM)" value={design.background.videoUrl} onChange={v=>update(['background','videoUrl'],v)}/><Color label="Gradient start" value={design.background.gradientStart} onChange={v=>update(['background','gradientStart'],v)}/><Color label="Gradient end" value={design.background.gradientEnd} onChange={v=>update(['background','gradientEnd'],v)}/><Range label="Gradient angle" value={design.background.gradientAngle} min={0} max={360} onChange={v=>update(['background','gradientAngle'],v)}/><Range label="Overlay opacity" value={design.background.overlayOpacity} min={0} max={1} step={.05} onChange={v=>update(['background','overlayOpacity'],v)}/></>}
        {tab==='type'&&<><Select label="Heading font" value={design.typography.headingFont} opts={FONTS} onChange={v=>update(['typography','headingFont'],v)}/><Select label="Body font" value={design.typography.bodyFont} opts={FONTS} onChange={v=>update(['typography','bodyFont'],v)}/><Range label="Base size" value={design.typography.baseSize} min={12} max={24} onChange={v=>update(['typography','baseSize'],v)}/><Range label="Heading weight" value={design.typography.headingWeight} min={400} max={900} step={100} onChange={v=>update(['typography','headingWeight'],v)}/><Range label="Letter spacing" value={design.typography.letterSpacing} min={-.1} max={.2} step={.01} onChange={v=>update(['typography','letterSpacing'],v)}/><Range label="Line height" value={design.typography.lineHeight} min={1} max={2.2} step={.1} onChange={v=>update(['typography','lineHeight'],v)}/></>}
        {tab==='nav'&&<><Select label="Navigation style" value={design.navigation.style} opts={['minimal','floating','glass','solid']} onChange={v=>update(['navigation','style'],v)}/><Toggle label="Sticky navigation" value={design.navigation.sticky} onChange={v=>update(['navigation','sticky'],v)}/><Toggle label="Show Sign In" value={design.navigation.showLogin} onChange={v=>update(['navigation','showLogin'],v)}/><Toggle label="Show Get Started" value={design.navigation.showGetStarted} onChange={v=>update(['navigation','showGetStarted'],v)}/><Toggle label="Show Demo" value={design.navigation.showDemo} onChange={v=>update(['navigation','showDemo'],v)}/><Range label="Navigation blur" value={design.navigation.blur} min={0} max={40} onChange={v=>update(['navigation','blur'],v)}/></>}
        {tab==='buttons'&&<><Select label="Button style" value={design.buttons.style} opts={['solid','gradient','glass','outline','ghost','pill']} onChange={v=>update(['buttons','style'],v)}/><Range label="Button radius" value={design.buttons.radius} min={0} max={40} onChange={v=>update(['buttons','radius'],v)}/><Toggle label="Button shadow" value={design.buttons.shadow} onChange={v=>update(['buttons','shadow'],v)}/><Toggle label="Hover lift" value={design.buttons.hoverLift} onChange={v=>update(['buttons','hoverLift'],v)}/><Toggle label="Uppercase labels" value={design.buttons.uppercase} onChange={v=>update(['buttons','uppercase'],v)}/></>}
        {tab==='icons'&&<><Select label="Icon theme" value={design.icons.style} opts={['filled','outline','duotone','minimal']} onChange={v=>update(['icons','style'],v)}/><Range label="Icon size" value={design.icons.size} min={12} max={64} onChange={v=>update(['icons','size'],v)}/><Range label="Stroke width" value={design.icons.strokeWidth} min={.5} max={4} step={.1} onChange={v=>update(['icons','strokeWidth'],v)}/><Color label="Icon color" value={design.icons.color} onChange={v=>update(['icons','color'],v)}/><Toggle label="Icon containers" value={design.icons.container} onChange={v=>update(['icons','container'],v)}/><Range label="Container radius" value={design.icons.containerRadius} min={0} max={30} onChange={v=>update(['icons','containerRadius'],v)}/></>}
        {tab==='pages'&&<><h3 className="text-xs font-bold text-white mb-3">Dashboard</h3><Color label="Background" value={design.pages.dashboard.backgroundColor} onChange={v=>update(['pages','dashboard','backgroundColor'],v)}/><Color label="Surface" value={design.pages.dashboard.surfaceColor} onChange={v=>update(['pages','dashboard','surfaceColor'],v)}/><Select label="Density" value={design.pages.dashboard.density} opts={['compact','comfortable','spacious']} onChange={v=>update(['pages','dashboard','density'],v)}/><h3 className="text-xs font-bold text-white mt-5 mb-3">Login</h3><Color label="Background" value={design.pages.login.backgroundColor} onChange={v=>update(['pages','login','backgroundColor'],v)}/><Color label="Surface" value={design.pages.login.surfaceColor} onChange={v=>update(['pages','login','surfaceColor'],v)}/><Toggle label="Show logo" value={design.pages.login.showLogo} onChange={v=>update(['pages','login','showLogo'],v)}/><h3 className="text-xs font-bold text-white mt-5 mb-3">Pricing</h3><Color label="Highlight" value={design.pages.pricing.highlightColor} onChange={v=>update(['pages','pricing','highlightColor'],v)}/><Range label="Card radius" value={design.pages.pricing.cardRadius} min={0} max={40} onChange={v=>update(['pages','pricing','cardRadius'],v)}/><Range label="Public max width" value={design.pages.public.maxWidth} min={900} max={1800} onChange={v=>update(['pages','public','maxWidth'],v)}/></>}
        {tab==='homepage'&&<><Input label="Hero headline" value={design.homepage.heroHeadline} onChange={v=>update(['homepage','heroHeadline'],v)}/><textarea value={design.homepage.heroSubheadline} onChange={e=>update(['homepage','heroSubheadline'],e.target.value)} rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm mb-3"/><Select label="Hero alignment" value={design.homepage.heroAlignment} opts={['left','center','right']} onChange={v=>update(['homepage','heroAlignment'],v)}/><Range label="Hero height" value={design.homepage.heroMinHeight} min={420} max={1000} onChange={v=>update(['homepage','heroMinHeight'],v)}/><div className="mt-5 text-xs font-bold mb-2">Sections & order</div>{design.homepage.sectionOrder.map((s:string,i:number)=><div key={s} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 mb-1"><span className="text-xs flex-1 capitalize">{s}</span><button onClick={()=>move(i,-1)} className="p-1"><ChevronUp className="w-3 h-3"/></button><button onClick={()=>move(i,1)} className="p-1"><ChevronDown className="w-3 h-3"/></button></div>)}{[['showProblem','Problem'],['showPosterProcess','Process'],['showDashboardPreview','Dashboard'],['showBenefits','Benefits'],['showIntegrations','Integrations'],['showPricing','Pricing'],['showFaq','FAQ'],['showTrustBar','Trust bar']].map(([k,l]:any)=><Toggle key={k} label={l} value={design.homepage[k]} onChange={v=>update(['homepage',k],v)}/>)}</>}
        </Panel>
      </section>
      <main className="flex-1 p-5 overflow-auto bg-[#11141b]">
        <div className="flex justify-center">
          <div className={`transition-all duration-300 ${device==='desktop'?'w-full max-w-[1200px]':device==='tablet'?'w-[768px] max-w-full':'w-[390px] max-w-full'}`}>
            <div style={{...css,background:bg,borderRadius:design.appearance.radius,overflow:'hidden',minHeight:design.homepage.heroMinHeight,boxShadow:'0 30px 80px rgba(0,0,0,.45)'}} className="relative">\n              {design.background.mode==='image'&&design.background.imageUrl&&<img src={normalizeAssetUrl(design.background.imageUrl)} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" onError={(e)=>{e.currentTarget.style.display='none'}}/>}\n              {design.background.mode==='image'&&design.background.imageUrl&&<div className="absolute inset-0" style={{background:`rgba(2,6,23,${design.background.overlayOpacity})`}}/>}
              {design.background.mode==='video'&&design.background.videoUrl&&<video autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-70"><source src={design.background.videoUrl}/></video>}
              <div className="relative z-10 p-5">
                <div style={{backdropFilter:`blur(${design.navigation.blur}px)`,background:'rgba(255,255,255,.07)',borderRadius:design.appearance.radius}} className="h-14 px-4 flex items-center justify-between border border-white/10">
                  <div className="font-black">{design.site.name}</div><div className="hidden sm:flex gap-3 text-xs text-white/60"><span>Product</span><span>Solutions</span><span>Pricing</span><button style={{background:design.brand.primaryColor,borderRadius:design.buttons.radius}} className="px-3 py-2 text-white">Get Started</button></div>
                </div>
                <section style={{minHeight:Math.min(design.homepage.heroMinHeight,650),textAlign:design.homepage.heroAlignment as any}} className="flex flex-col justify-center py-16 px-6">
                  <div className="inline-flex self-center gap-2 text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5"><Sparkles style={{color:design.icons.color}} className="w-3 h-3"/> AI EMPLOYEE PLATFORM</div>
                  <h1 style={{fontFamily:design.typography.headingFont,fontWeight:design.typography.headingWeight,letterSpacing:`${design.typography.letterSpacing}em`}} className="text-5xl md:text-7xl mt-6 leading-tight">{design.homepage.heroHeadline}</h1>
                  <p style={{fontSize:design.typography.baseSize,lineHeight:design.typography.lineHeight}} className="max-w-2xl mt-5 text-white/65 mx-auto">{design.homepage.heroSubheadline}</p>
                  <div className="flex justify-center gap-3 mt-8"><button style={{background:design.buttons.style==='outline'?'transparent':design.brand.primaryColor,borderColor:design.brand.primaryColor,borderRadius:design.buttons.radius}} className="px-5 py-3 text-sm font-bold border text-white">Get Started</button><button style={{borderRadius:design.buttons.radius,backdropFilter:'blur(10px)'}} className="px-5 py-3 text-sm font-bold border border-white/15 bg-white/5">View Demo</button></div>
                </section>
                <div className="grid grid-cols-3 gap-3">{['Respond','Qualify','Follow Up'].map(x=><div key={x} className="p-4 border border-white/10 bg-white/5" style={{borderRadius:design.appearance.radius}}><Sparkles style={{color:design.icons.color,width:design.icons.size,height:design.icons.size,strokeWidth:design.icons.strokeWidth}}/><div className="font-bold text-sm mt-3">{x}</div><div className="text-[10px] text-white/50 mt-1">AI workflow</div></div>)}</div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>;
};

const Panel=({title,children}:{title:string,children:React.ReactNode})=><div><h2 className="font-black text-lg mb-4">{title}</h2>{children}</div>;
const Input=({label,value,onChange}:{label:string,value:string,onChange:(v:string)=>void})=><label className="block text-xs text-slate-400 mb-3">{label}<input value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"/></label>;
const Color=({label,value,onChange}:{label:string,value:string,onChange:(v:string)=>void})=><label className="flex items-center justify-between text-xs text-slate-400 mb-3">{label}<input type="color" value={value} onChange={e=>onChange(e.target.value)} className="w-10 h-8 bg-transparent"/></label>;
const ColorRows=({d,u}:{d:any,u:any})=><div className="mb-3">{(['primaryColor','secondaryColor','accentColor','backgroundColor','surfaceColor','textColor','mutedTextColor','borderColor','successColor','dangerColor'] as string[]).map(k=><Color key={k} label={k.replace(/([A-Z])/g,' $1')} value={d.brand[k]} onChange={v=>u(['brand',k],v)}/>)}</div>;
const Select=({label,value,opts,onChange}:{label:string,value:string,opts:string[],onChange:(v:string)=>void})=><label className="block text-xs text-slate-400 mb-3">{label}<select value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white">{opts.map(x=><option key={x} value={x}>{x}</option>)}</select></label>;
const Range=({label,value,min,max,step=1,onChange}:{label:string,value:number,min:number,max:number,step?:number,onChange:(v:number)=>void})=><label className="block text-xs text-slate-400 mb-3">{label}<div className="flex gap-2 items-center"><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} className="w-full"/><span className="w-12 text-right text-white">{Number(value).toFixed(step<1?2:0)}</span></div></label>;
const Toggle=({label,value,onChange}:{label:string,value:boolean,onChange:(v:boolean)=>void})=><label className="flex items-center justify-between py-2 text-xs text-slate-300">{label}<button type="button" onClick={()=>onChange(!value)} className={`w-10 h-6 rounded-full p-1 transition ${value?'bg-blue-600':'bg-white/10'}`}><span className={`block w-4 h-4 rounded-full bg-white transition ${value?'translate-x-4':''}`}/></button></label>;
