// @ts-nocheck — ported from Shadynasty's TradeReportModal, uses Record<string, unknown> extensively
"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTradeReport, getTradeHindsight } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, gradeColor, posColor } from "./tokens";
import PlayerName from "./PlayerName";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
import { useLeagueStore } from "@/lib/stores/league-store";
import { useIsMobile } from "@/hooks/useIsMobile";

/* ═══════════════════════════════════════════════════════════════
   HELPERS — ported from Shadynasty
   ═══════════════════════════════════════════════════════════════ */
function getLetterGrade(s: number) { if(s>=97)return'A+';if(s>=93)return'A';if(s>=90)return'A-';if(s>=87)return'B+';if(s>=83)return'B';if(s>=80)return'B-';if(s>=77)return'C+';if(s>=73)return'C';if(s>=70)return'C-';if(s>=67)return'D+';if(s>=63)return'D';if(s>=60)return'D-';return'F'; }
function getGradeColor(s: number) { return s >= 90 ? '#4ade80' : s >= 80 ? C.green : s >= 70 ? C.blue : s >= 60 ? C.gold : s >= 50 ? C.orange : C.red; }
function getVerdictStyle(v: string) {
  const m: Record<string,{color:string;bg:string;border:string}> = {
    'Won':{color:'#4ade80',bg:'rgba(74,222,128,0.12)',border:'rgba(74,222,128,0.25)'},'Slight Edge':{color:C.green,bg:'rgba(125,211,160,0.12)',border:'rgba(125,211,160,0.25)'},
    'Push':{color:C.secondary,bg:'rgba(176,178,200,0.10)',border:'rgba(176,178,200,0.20)'},'Slight Loss':{color:C.orange,bg:'rgba(224,156,107,0.12)',border:'rgba(224,156,107,0.25)'},
    'Lost':{color:C.red,bg:'rgba(228,114,114,0.12)',border:'rgba(228,114,114,0.25)'},'Fair':{color:C.secondary,bg:'rgba(176,178,200,0.10)',border:'rgba(176,178,200,0.20)'},
    'Win-Win':{color:C.green,bg:'rgba(125,211,160,0.12)',border:'rgba(125,211,160,0.25)'},'ROBBERY':{color:'#ff4444',bg:'rgba(255,68,68,0.15)',border:'rgba(255,68,68,0.3)'},
    'No Data':{color:C.dim,bg:'transparent',border:C.border},
  };
  return m[v]||{color:C.dim,bg:'transparent',border:C.border};
}
function ordinal(n:number){if(!n||isNaN(n))return'—';const s=['th','st','nd','rd'];const v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function noSHA(s:string){return s.replace(/\bSHA\b/gi,'value').replace(/\bsha\b/g,'value');}
function cleanPickName(name:string){return name.replace(/\s*\([^)]*\)/g,'');}


/* ═══ LOADING ═══ */
function LoadingSequence(){const[phase,setPhase]=useState(0);const[systems,setSystems]=useState<Array<{label:string;status:string}>>([]);const checks=[{label:"COLLECTING RECEIPTS",delay:0},{label:"GATHERING TRADE DAY INTEL",delay:350},{label:"TRACKING ASSETS",delay:700},{label:"GATHERING HINDSIGHT INTEL",delay:1050},{label:"MEASURING IMPACT",delay:1400},{label:"GENERATING VERDICT",delay:1750}];useEffect(()=>{const t=[setTimeout(()=>setPhase(1),100),setTimeout(()=>setPhase(2),400),setTimeout(()=>setPhase(3),800)];return()=>t.forEach(clearTimeout);},[]);useEffect(()=>{if(phase>=3)checks.forEach(s=>{setTimeout(()=>setSystems(p=>[...p,{label:s.label,status:"ONLINE"}]),s.delay);});},[phase]);return(<div style={{padding:60,display:'flex',flexDirection:'column',alignItems:'center',gap:24,minHeight:400}}>{phase>=1&&<div style={{position:'relative',width:80,height:80,borderRadius:'50%',border:`1px solid ${C.gold}20`}}><div style={{position:'absolute',top:'50%',left:'50%',width:'50%',height:2,transformOrigin:'0 50%',background:`linear-gradient(90deg, ${C.gold}80, transparent)`,animation:'radarSweep 2s linear infinite'}}/></div>}{phase>=2&&<div style={{textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,letterSpacing:'0.35em',color:C.goldBright}}>TRADE REPORT</div></div>}{phase>=3&&<div style={{width:320,display:'flex',flexDirection:'column',gap:4}}>{systems.map((sys,i)=>(<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',fontFamily:MONO,fontSize:10}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:5,height:5,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}60`}}/><span style={{color:C.dim,letterSpacing:'0.08em'}}>{sys.label}</span></div><span style={{color:C.green,fontWeight:700,fontSize:9}}>ONLINE</span></div>))}</div>}</div>);}

/* ═══ GRADE CIRCLE ═══ */
function GradeCircle({score,size=64}:{score:number;size?:number}){const letter=getLetterGrade(score);const color=getGradeColor(score);const r=(size-8)/2;const circ=2*Math.PI*r;const pct=Math.min(score/100,1);return(<div style={{position:'relative',width:size,height:size,flexShrink:0}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="3"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct*circ} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`}/></svg><div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:MONO,fontSize:size*0.3,fontWeight:900,color,lineHeight:1}}>{letter}</div><div style={{fontFamily:MONO,fontSize:size*0.15,fontWeight:700,color:C.dim,lineHeight:1,marginTop:2}}>{score}</div></div></div>);}

/* ═══ GRADE BOX ═══ */
function GradeBox({score,verdict,confidence}:{score:number;verdict:string;confidence?:string}){const vs=getVerdictStyle(verdict);return(<div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:6,background:`${vs.color}08`,border:`1px solid ${vs.border}`}}><GradeCircle score={score} size={56}/><div><span style={{fontFamily:MONO,fontSize:13,fontWeight:900,color:vs.color,padding:'3px 10px',borderRadius:4,background:vs.bg,border:`1px solid ${vs.border}`}}>{verdict}</span>{confidence&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:4,letterSpacing:'0.06em'}}>{confidence}</div>}</div></div>);}

/* ═══ SECTION DIVIDER ═══ */
function SectionDivider({label,accent}:{label:string;accent:string}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,paddingTop:6,paddingBottom:6,paddingLeft:12,paddingRight:12,borderTop:`1px solid ${C.border}`,background:`linear-gradient(180deg, ${accent}0a, transparent 80%)`}}><div style={{flex:1,height:1,background:`linear-gradient(90deg, transparent, ${accent}30)`}}/><span style={{fontFamily:MONO,fontSize:11,fontWeight:900,letterSpacing:'0.20em',color:accent}}>{label}</span><div style={{flex:1,height:1,background:`linear-gradient(90deg, ${accent}30, transparent)`}}/></div>);}

function SubHeader({label}:{label:string}){return(<div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.14em',color:C.gold,padding:'6px 0',borderBottom:`1px solid ${C.gold}25`,marginBottom:8}}>{label}</div>);}
function StatusTag({label,color,bg,border}:{label:string;color:string;bg:string;border:string}){return(<span style={{fontFamily:MONO,fontSize:7,fontWeight:800,padding:'1px 5px',borderRadius:3,background:bg,border:`1px solid ${border}`,color}}>{label}</span>);}

/* ═══ GRADE FACTOR CARD ═══ */
function GradeFactorCard({factor}:{factor:any}){
  const sm:Record<string,{color:string;bg:string;border:string;icon:string}>={
    elite:{color:C.goldBright,bg:'rgba(212,165,50,0.12)',border:'rgba(212,165,50,0.30)',icon:'★'},
    positive:{color:C.green,bg:'rgba(125,211,160,0.12)',border:'rgba(125,211,160,0.25)',icon:'✓'},
    neutral:{color:C.secondary,bg:'rgba(176,178,200,0.08)',border:'rgba(176,178,200,0.15)',icon:'○'},
    negative:{color:C.red,bg:'rgba(228,114,114,0.12)',border:'rgba(228,114,114,0.25)',icon:'▼'},
  };
  const s=sm[factor.sentiment]||sm.neutral;
  return(<div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:6,background:s.bg,border:`1px solid ${s.border}`,marginBottom:4}}>
    <span style={{fontSize:12,flexShrink:0,color:s.color,fontWeight:900,width:20,textAlign:'center'}}>{s.icon}</span>
    <div style={{flex:1,minWidth:0}}><div style={{fontFamily:SANS,fontSize:12,fontWeight:700,color:s.color}}>{noSHA(factor.title)}</div><div style={{fontFamily:SANS,fontSize:10,color:C.dim,marginTop:1,lineHeight:1.3}}>{noSHA(factor.detail||'')}</div></div>
    {factor.value&&<span style={{fontFamily:MONO,fontSize:12,fontWeight:900,color:s.color,flexShrink:0}}>{factor.value}</span>}
  </div>);
}

/* ═══ ASSET CARD — ported from Shadynasty ═══ */
function AssetCard({asset,allAssets,gradeFactors,allTrades,sideOwner}:{asset:any;allAssets?:any[];gradeFactors?:any[];allTrades?:any[];sideOwner?:string}){
  const openCard = usePlayerCardStore.getState().openPlayerCard;
  const isPick=asset.type==='pick';const prod=asset.production;const isCut=asset.roster_status?.status==='not_rostered';
  const isTraded=asset.roster_status?.status==='traded_away';const chain=asset.chain||[];const hasChain=chain.length>0;
  const ppgA=prod&&prod.games_started>0?(prod.total_points/prod.games_started):null;
  const ppgR=prod&&prod.games_on_roster>0?(prod.total_points/prod.games_on_roster):null;
  const posImpact=asset.replacement_impact?.career;const vAt=asset.value_at_trade?.value||0;
  const vNow=asset.value_current?.value||0;const vDelta=asset.value_delta;
  const age=asset.age||asset.player_age||asset.resolved_age;
  const position=asset.position||asset.resolved_position;
  const ownerLower=(sideOwner||'').toLowerCase();

  // Build full flip packages by looking up each chain's trade in all_trades
  const flipPackages=hasChain?chain.map((c:any)=>{
    const tid=c.trade_id;
    const flipTrade=(allTrades||[]).find((t:any)=>t.trade_id===tid);
    let fullGave:string[]=[];
    let fullGot:string[]=[];
    if(flipTrade){
      const sA=flipTrade.side_a;const sB=flipTrade.side_b;
      const ownerIsA=sA&&sA.owner&&sA.owner.toLowerCase()===ownerLower;
      const ownerSide=ownerIsA?sA:sB;
      const otherSide=ownerIsA?sB:sA;
      fullGave=otherSide?.assets_raw?otherSide.assets_raw.split(', ').filter(Boolean):[];
      fullGot=ownerSide?.assets_raw?ownerSide.assets_raw.split(', ').filter(Boolean):[];
    }
    if(!fullGave.length)fullGave=c.gave?c.gave.split(', ').filter(Boolean):[asset.name];
    if(!fullGot.length)fullGot=c.got_back?c.got_back.split(', ').filter(Boolean):[];
    return{...c,fullGave,fullGot,partner:flipTrade?(flipTrade.side_a?.owner?.toLowerCase()===ownerLower?flipTrade.side_b?.owner:flipTrade.side_a?.owner):c.flipped_to};
  }):[];

  // Dedupe by trade_id
  const shownFlipTrades=new Set<string>();
  const visibleFlips=flipPackages.filter((fp:any)=>{
    if(shownFlipTrades.has(fp.trade_id))return false;
    shownFlipTrades.add(fp.trade_id);
    return true;
  }).slice(0,1);

  // Flip profit parsing from grade factors
  const flipProfitFactor=(gradeFactors||[]).find((f:any)=>{
    if(f.category!=='flip_profit')return false;
    return(f.detail||'').toLowerCase().includes(asset.name.toLowerCase());
  });
  const parsedFlipProfit=flipProfitFactor?(()=>{
    const m=flipProfitFactor.detail.match(/Acquired .+ for ~([\d,]+\d),?\s*sold for ~([\d,]+\d)/i);
    if(!m)return null;
    const cost=parseInt(m[1].replace(/,/g,''));const sale=parseInt(m[2].replace(/,/g,''));
    return{cost,sale,profit:sale-cost};
  })():null;

  return(<div style={{padding:'12px 14px',borderRadius:6,background:C.elevated,border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:6}}>
    {/* Name + Age + Status Tags */}
    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
      {isPick&&<StatusTag label="PICK" color={C.gold} bg={C.goldDim} border={C.goldBorder}/>}
      {position&&!isPick&&<span style={{fontFamily:MONO,fontSize:8,fontWeight:800,color:posColor(position),padding:'1px 4px',borderRadius:3,background:`${posColor(position)}15`,border:`1px solid ${posColor(position)}25`}}>{position}</span>}
      {isPick?<span style={{fontFamily:SANS,fontSize:14,fontWeight:700,color:C.primary}}>{cleanPickName(asset.name)}</span>:<PlayerName name={asset.name} style={{fontFamily:SANS,fontSize:14,fontWeight:700,color:isCut?C.red:C.primary,cursor:'pointer'}} />}
      {age&&<span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>({Math.round(age)})</span>}
      {hasChain&&<StatusTag label="FLIPPED" color={C.orange} bg="rgba(224,156,107,0.12)" border="rgba(224,156,107,0.25)"/>}
      {hasChain&&vDelta!=null&&vDelta>0&&<StatusTag label="PROFIT" color={C.green} bg="rgba(125,211,160,0.12)" border="rgba(125,211,160,0.25)"/>}
      {isCut&&!hasChain&&<StatusTag label="CUT" color={C.red} bg="rgba(228,114,114,0.12)" border="rgba(228,114,114,0.25)"/>}
      {isTraded&&!hasChain&&<StatusTag label="TRADED" color={C.blue} bg="rgba(107,184,224,0.12)" border="rgba(107,184,224,0.25)"/>}
    </div>

    {/* Value at trade → now */}
    {(vAt>0||vNow>0)&&<div style={{display:'flex',alignItems:'center',gap:8,fontFamily:MONO,fontSize:10}}><span style={{color:C.dim}}>{fmt(vAt)}</span><span style={{color:C.dim}}>→</span><span style={{color:C.secondary,fontWeight:700}}>{fmt(vNow)}</span>{vDelta!=null&&<span style={{color:vDelta>=0?C.green:C.red,fontWeight:800}}>{vDelta>=0?'+':''}{fmt(vDelta)}</span>}</div>}

    {/* Flip chains with profit */}
    {visibleFlips.map((fp:any,fi:number)=>{
      const isPackaged=(fp.fullGave||[]).length>1;
      return(<div key={fi} style={{padding:'8px 10px',borderRadius:5,background:C.card,border:`1px solid ${C.gold}15`}}>
        <div style={{display:'flex',alignItems:'center',gap:4,marginBottom:4}}>
          <span style={{fontFamily:MONO,fontSize:9,color:C.gold,fontWeight:800}}>↗</span>
          <span style={{fontFamily:MONO,fontSize:9,color:C.orange,fontWeight:700}}>FLIPPED TO {(fp.partner||fp.flipped_to||'').toUpperCase()}</span>
        </div>
        <div style={{fontFamily:SANS,fontSize:11,color:C.secondary,lineHeight:1.6}}>
          <span style={{color:C.red,fontWeight:600}}>{isPackaged?'Packaged':'Traded'}</span>{' '}
          <span style={{color:C.primary,fontWeight:600}}>{(fp.fullGave||[]).join(' + ')}</span>
          <span style={{color:C.dim}}> → </span>
          <span style={{color:C.green,fontWeight:600}}>Received {(fp.fullGot||[]).join(', ')}</span>
        </div>
        {parsedFlipProfit&&fi===0&&<div style={{fontFamily:MONO,fontSize:10,color:C.dim,marginTop:4,lineHeight:1.5}}>
          Acquired for ~{fmt(parsedFlipProfit.cost)} · Sold for ~{fmt(parsedFlipProfit.sale)} · <span style={{fontWeight:800,color:parsedFlipProfit.profit>=0?C.green:C.red}}>{parsedFlipProfit.profit>=0?'+':''}{fmt(parsedFlipProfit.profit)} {parsedFlipProfit.profit>=0?'profit':'loss'}</span>
        </div>}
      </div>);
    })}

    {/* Pick resolution */}
    {isPick&&asset.resolved_player&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{asset.resolved_slot&&<span style={{color:C.secondary}}>{asset.resolved_slot} → </span>}{asset.resolved_player==="Not yet drafted"?"Not yet drafted":<span style={{color:C.primary,fontWeight:600}}>{asset.resolved_player}</span>}</div>}

    {/* PPG Stats */}
    {!isPick&&prod&&prod.total_points>0&&<div style={{marginTop:2}}>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:C.primary}}>{prod.total_points?.toFixed(1)} pts</span><span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>across {prod.games_on_roster} games</span></div>
      <div style={{display:'flex',gap:0,borderRadius:5,overflow:'hidden',border:`1px solid ${C.border}`,background:C.card}}>
        {ppgA!=null&&<div style={{flex:1,padding:'8px 12px',borderRight:`1px solid ${C.border}`}}>
          <div style={{fontFamily:MONO,fontSize:7,fontWeight:800,letterSpacing:'0.08em',color:C.dim,marginBottom:3}}>PPG ACTIVE</div>
          <div style={{display:'flex',alignItems:'baseline',gap:4}}><span style={{fontFamily:MONO,fontSize:22,fontWeight:900,color:ppgA>=15?C.green:ppgA>=10?C.primary:C.orange}}>{ppgA.toFixed(1)}</span><span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>({prod.games_started}G)</span></div>
          <div style={{fontFamily:MONO,fontSize:8,color:C.dim,marginTop:2}}>pts per start</div>
        </div>}
        {ppgR!=null&&<div style={{flex:1,padding:'8px 12px'}}>
          <div style={{fontFamily:MONO,fontSize:7,fontWeight:800,letterSpacing:'0.08em',color:C.dim,marginBottom:3}}>PPG ROSTERED</div>
          <div style={{display:'flex',alignItems:'baseline',gap:4}}><span style={{fontFamily:MONO,fontSize:22,fontWeight:900,color:ppgR>=12?C.green:ppgR>=7?C.primary:C.red}}>{ppgR.toFixed(1)}</span><span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>({prod.games_on_roster}G)</span></div>
          <div style={{fontFamily:MONO,fontSize:8,color:C.dim,marginTop:2}}>pts per week owned</div>
        </div>}
      </div>
      {prod.seasons&&Object.entries(prod.seasons).map(([yr,s]:any)=>(<div key={yr} style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:1,paddingLeft:4}}>{yr}: {s.points?.toFixed(1)} pts ({s.games}G, {s.ppg?.toFixed(1)} PPG)</div>))}
    </div>}

    {/* Positional impact */}
    {posImpact&&posImpact.impact!=null&&Math.abs(posImpact.impact)>=0.1&&<div style={{marginTop:2,padding:'5px 10px',borderRadius:5,background:posImpact.impact>=0?'rgba(125,211,160,0.12)':'rgba(228,114,114,0.12)',border:`1px solid ${posImpact.impact>=0?'rgba(125,211,160,0.25)':'rgba(228,114,114,0.25)'}`,fontFamily:MONO,fontSize:10,display:'flex',alignItems:'center',gap:6}}>
      <span style={{fontWeight:800,color:C.secondary,letterSpacing:'0.04em'}}>{(position||posImpact?.position||'Position')} Position Impact</span>
      <span style={{color:C.dim,marginLeft:2}}>{posImpact.avg_without?.toFixed(1)}</span><span style={{color:C.dim}}>→</span>
      <span style={{color:C.secondary,fontWeight:700}}>{posImpact.avg_with?.toFixed(1)}</span>
      <span style={{color:posImpact.impact>=0?C.green:C.red,fontWeight:900,fontSize:11}}>({posImpact.impact>=0?'+':''}{posImpact.impact.toFixed(1)})</span>
    </div>}
  </div>);
}

/* ═══ TEAM CONTEXT ═══ */
function ContextCard({sideData}:{sideData:any}){const ctx=sideData?.season_context;const ilpg=sideData?.team_ilpg?.trade_season;if(!ctx)return null;const rb=ctx.record_before_trade;const ra=ctx.record_after_trade;return(<div style={{padding:'12px 14px',borderRadius:6,background:C.card,border:`1px solid ${C.border}`}}><SubHeader label="TEAM CONTEXT"/>{ilpg&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:4,background:C.elevated,marginBottom:8}}><span style={{fontFamily:MONO,fontSize:12,color:C.secondary}}>IDEAL LINEUP</span><div style={{fontFamily:MONO,fontSize:13,color:C.primary}}>{ilpg.before?.avg_ilpg?.toFixed(1)} → {ilpg.after?.avg_ilpg?.toFixed(1)}<span style={{marginLeft:8,fontWeight:800,color:(ilpg.delta||0)>=0?C.green:C.red}}>{(ilpg.delta||0)>=0?'+':''}{ilpg.delta?.toFixed(1)}</span></div></div>}<div style={{display:'flex',flexDirection:'row',gap:8}}>{rb&&rb.games>0&&<div style={{flex:1,padding:'6px 10px',borderRadius:4,background:C.elevated}}><div style={{fontFamily:MONO,fontSize:12,color:C.dim,letterSpacing:'0.08em'}}>BEFORE</div><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,color:C.primary}}>{rb.wins}-{rb.losses}</div></div>}{ra&&ra.games>0&&<div style={{flex:1,padding:'6px 10px',borderRadius:4,background:C.elevated}}><div style={{fontFamily:MONO,fontSize:12,color:C.dim,letterSpacing:'0.08em'}}>AFTER</div><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,color:C.primary}}>{ra.wins}-{ra.losses}</div></div>}</div>{ctx.season_info&&<div style={{marginTop:8,fontFamily:MONO,fontSize:12,color:C.secondary}}>Season: {ctx.season_info.wins}-{ctx.season_info.losses} ({ordinal(ctx.season_info.final_rank)} place){ctx.season_info.champion&&<span style={{color:C.gold,fontWeight:800}}> Champion</span>}</div>}</div>);}

/* ═══ COLLAPSIBLE SECTION ═══ */
function CollapsiblePill({label,defaultOpen,children}:{label:string;defaultOpen:boolean;children:React.ReactNode}){
  const [open,setOpen]=useState(defaultOpen);
  return(<div style={{marginBottom:2,borderRadius:6,border:`1px solid ${C.border}`,overflow:'hidden'}}>
    <div onClick={()=>setOpen(!open)} style={{padding:'4px 8px',background:C.elevated,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.10em',color:C.gold}}>{label}</span>
      <span style={{fontFamily:MONO,fontSize:12,color:C.dim}}>{open?'▴':'▾'}</span>
    </div>
    {open&&<div style={{padding:'4px 6px'}}>{children}</div>}
  </div>);
}

/* ═══════════════════════════════════════════════════════════════
   FULL REPORT — Two tabs: GRADE (screenshotable) + DETAILS (deep dive)
   ═══════════════════════════════════════════════════════════════ */
function FullReport({reportData,hindsightData,onClose}:{reportData:any;hindsightData:any;onClose:()=>void}){
  const mobile=useIsMobile();
  const [tab,setTab]=useState<'grade'|'details'>('grade');
  const currentOwner=useLeagueStore((s)=>s.currentOwner);

  // ── PERSPECTIVE: resolve mySide / theirSide from logged-in owner ──
  const sA=reportData.side_a||{};const sB=reportData.side_b||{};
  const ownerA=(sA.owner||"").toLowerCase();const ownerB=(sB.owner||"").toLowerCase();
  const meIsA=currentOwner&&ownerA===currentOwner.toLowerCase();
  const meIsB=currentOwner&&ownerB===currentOwner.toLowerCase();
  const amInTrade=meIsA||meIsB;
  // If I'm in the trade: my perspective. If not: default to side_a.
  const mySide=meIsB?sB:sA;
  const theirSide=meIsB?sA:sB;
  const myName=mySide.owner||"";const theirName=theirSide.owner||"";
  const myLabel=amInTrade?'YOU':myName.split(' ')[0].toUpperCase();
  const theirLabel=theirName.split(' ')[0].toUpperCase();

  const dateStr=String(reportData.trade_date||"").substring(0,10);
  const td=reportData.trade_day||{};
  // Trade day grades — match perspective
  const myTD=td.side_a?.owner?.toLowerCase()===myName.toLowerCase()?td.side_a:(td.side_b?.owner?.toLowerCase()===myName.toLowerCase()?td.side_b:td.side_a)||{};
  const theirTD=td.side_a?.owner?.toLowerCase()===theirName.toLowerCase()?td.side_a:(td.side_b?.owner?.toLowerCase()===theirName.toLowerCase()?td.side_b:td.side_b)||{};
  // Hindsight grades — match perspective
  const h=hindsightData&&(hindsightData.side_a||hindsightData.side_b)?hindsightData:(reportData.hindsight||{});
  const myH=h.side_a?.owner?.toLowerCase()===myName.toLowerCase()?h.side_a:(h.side_b?.owner?.toLowerCase()===myName.toLowerCase()?h.side_b:h.side_a)||{};
  const theirH=h.side_a?.owner?.toLowerCase()===theirName.toLowerCase()?h.side_a:(h.side_b?.owner?.toLowerCase()===theirName.toLowerCase()?h.side_b:h.side_b)||{};
  const hasHindsight=(myH.score>0||theirH.score>0);
  const overall=td.overall||h.overall||"";const os=getVerdictStyle(overall);

  // Assets — from MY perspective (what I received = mySide.assets)
  const myAssets=mySide.assets||[];const theirAssets=theirSide.assets||[];
  const myTotal=myAssets.reduce((s:number,a:any)=>s+(a.value_at_trade?.value||0),0);
  const theirTotal=theirAssets.reduce((s:number,a:any)=>s+(a.value_at_trade?.value||0),0);
  // GAVE = what the other side received (theirSide.assets_raw). GOT = what I received (mySide.assets_raw).
  const myGave=theirSide.assets_raw||theirAssets.map((a:any)=>a.name).join(", ");
  const myGot=mySide.assets_raw||myAssets.map((a:any)=>a.name).join(", ");

  const tradeDate=reportData.trade_date?new Date(reportData.trade_date):null;
  const tradeAgeMonths=tradeDate?((Date.now()-tradeDate.getTime())/(1000*60*60*24*30.44)):999;
  const hideRemaining=tradeAgeMonths<12;
  const filterGF=(factors:any[])=>factors?factors.filter((f:any)=>!(hideRemaining&&f.category==='remaining')):[];
  const myGradeFactors=filterGF(myH.grade_factors||mySide.grade_factors||[]);
  const theirGradeFactors=filterGF(theirH.grade_factors||theirSide.grade_factors||[]);
  const myKeyFactors=myH.key_factors||[];const theirKeyFactors=theirH.key_factors||[];
  const fp={display:'flex' as const,flexDirection:'row' as const,gap:0,paddingTop:mobile?2:8,paddingBottom:mobile?2:8,paddingLeft:mobile?0:16,paddingRight:mobile?0:16};
  const colL={flex:1,minWidth:0,overflow:'hidden' as const,paddingTop:4,paddingBottom:4,paddingLeft:mobile?6:10,paddingRight:mobile?8:14,borderRight:`1px solid ${C.border}`};
  const colR={flex:1,minWidth:0,overflow:'hidden' as const,paddingTop:4,paddingBottom:4,paddingLeft:mobile?8:14,paddingRight:mobile?6:10};

  // Championship check for gold highlight
  const myChamp=mySide.season_context?.season_info?.champion;
  const theirChamp=theirSide.season_context?.season_info?.champion;

  // Build compact key bullets for hindsight (top 2 per side)
  const buildBullets=(assets:any[],gradeFactors:any[],keyFactors:string[],isChamp:boolean)=>{
    const bullets:{text:string;color:string;isChamp?:boolean}[]=[];
    // Grade factors first (most specific)
    for(const gf of gradeFactors.slice(0,2)){
      const col=gf.sentiment==='elite'?C.goldBright:gf.sentiment==='positive'?C.green:gf.sentiment==='negative'?C.red:C.secondary;
      bullets.push({text:noSHA(`${gf.title}${gf.value?' — '+gf.value:''}`),color:col});
    }
    // Fall back to key factors if no grade factors
    if(!bullets.length){for(const kf of keyFactors.slice(0,2)){bullets.push({text:kf,color:C.secondary});}}
    // Fall back to asset production summaries
    if(!bullets.length){
      for(const a of assets.filter((a:any)=>a.type!=='pick'&&a.production?.total_points>0).slice(0,2)){
        const prod=a.production;const ppg=prod.games_started>0?(prod.total_points/prod.games_started):0;
        bullets.push({text:`${a.name}: ${prod.total_points.toFixed(0)} pts, ${ppg.toFixed(1)} PPG across ${prod.games_on_roster}G`,color:C.secondary});
      }
    }
    // Championship line
    if(isChamp) bullets.push({text:'Won championship with acquired players',color:C.gold,isChamp:true});
    // Flip profit
    for(const a of assets){for(const c of (a.chain||[])){if(c.flip_profit>100) bullets.push({text:`Flipped ${a.name} for ${c.got_back?.join(', ')||'picks'}`,color:C.orange});}}
    return bullets.slice(0,3);
  };
  const myBullets=buildBullets(myAssets,myGradeFactors,myKeyFactors,!!myChamp);
  const theirBullets=buildBullets(theirAssets,theirGradeFactors,theirKeyFactors,!!theirChamp);

  return(<>
    {/* HEADER */}
    <div style={{padding:mobile?'10px 12px':'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:`linear-gradient(135deg, ${C.gold}06, transparent 60%)`,flexWrap:'wrap' as const,gap:8,borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:4,height:36,borderRadius:2,background:C.gold}}/><div><div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:'0.22em'}}>TRADE REPORT</div><div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}><span style={{fontFamily:SANS,fontSize:mobile?14:18,fontWeight:800,color:C.primary}}>{myName}</span><span style={{fontFamily:SANS,fontSize:14,color:C.dim}}>⇄</span><span style={{fontFamily:SANS,fontSize:mobile?14:18,fontWeight:700,color:C.secondary}}>{theirName}</span><span style={{fontFamily:MONO,fontSize:11,color:C.dim,marginLeft:4}}>{dateStr}</span></div></div></div>
      <div style={{display:'flex',alignItems:'center',gap:12}}>{overall&&<span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:os.color,padding:'4px 12px',borderRadius:4,background:os.bg,border:`1px solid ${os.border}`}}>{overall}</span>}<div onClick={onClose} style={{width:mobile?40:32,height:mobile?40:32,borderRadius:mobile?20:6,background:mobile?C.card:C.elevated,border:`1px solid ${mobile?C.goldBorder:C.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:mobile?18:14,color:mobile?C.gold:C.dim,fontFamily:MONO,flexShrink:0}}>×</div></div></div>

    {/* SUMMARY BAR — from YOUR perspective */}
    <div style={{paddingTop:mobile?4:8,paddingBottom:mobile?4:8,paddingLeft:mobile?8:24,paddingRight:mobile?8:24,borderBottom:`1px solid ${C.border}`,background:C.card,display:'flex',flexDirection:'row',alignItems:'center',gap:mobile?6:16}}>
      <div style={{flex:1,minWidth:0}}><div style={{fontFamily:MONO,fontSize:mobile?10:12,color:C.red,fontWeight:800,letterSpacing:'0.06em',marginBottom:2}}>{amInTrade?'YOU GAVE':`${myLabel} GAVE`}</div><div style={{fontFamily:SANS,fontSize:mobile?12:13,color:C.secondary,lineHeight:1.3}}>{myGave}</div></div>
      <div style={{fontFamily:MONO,fontSize:16,color:`${C.gold}60`,flexShrink:0}}>⇄</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontFamily:MONO,fontSize:mobile?10:12,color:C.green,fontWeight:800,letterSpacing:'0.06em',marginBottom:2}}>{amInTrade?'YOU GOT':`${myLabel} GOT`}</div><div style={{fontFamily:SANS,fontSize:mobile?12:13,color:C.primary,fontWeight:600,lineHeight:1.3}}>{myGot}</div></div>
    </div>

    {/* GRADE SUMMARY — desktop only */}
    {!mobile&&<div style={{display:'flex',flexDirection:'row',paddingTop:8,paddingBottom:8,paddingLeft:24,paddingRight:24,borderBottom:`1px solid ${C.border}`,background:C.card,alignItems:'center'}}>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <div style={{textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:'#5eead4',marginBottom:2}}>TD</div><GradeCircle score={myTD.score||50} size={28}/></div>
        <div style={{textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:C.gold,marginBottom:2}}>HS</div><GradeCircle score={myH.score||0} size={28}/></div>
        <div style={{fontFamily:MONO,fontSize:12,fontWeight:800,color:C.primary,marginLeft:2}}>{myLabel}</div>
      </div>
      <div style={{width:1,height:28,background:C.border,margin:'0 4px',flexShrink:0}}/>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
        <div style={{fontFamily:MONO,fontSize:12,fontWeight:800,color:C.secondary,marginRight:2}}>{theirLabel}</div>
        <div style={{textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:'#5eead4',marginBottom:2}}>TD</div><GradeCircle score={theirTD.score||50} size={28}/></div>
        <div style={{textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:C.gold,marginBottom:2}}>HS</div><GradeCircle score={theirH.score||0} size={28}/></div>
      </div>
    </div>}

    {/* TABS */}
    <div style={{display:'flex',borderBottom:`1px solid ${C.border}`}}>
      {(['grade','details'] as const).map(t=>(
        <div key={t} onClick={()=>setTab(t)} style={{
          flex:1,padding:'10px 0',textAlign:'center',cursor:'pointer',transition:'all 0.15s',
          fontFamily:MONO,fontSize:12,fontWeight:700,letterSpacing:'0.08em',
          color:tab===t?C.gold:C.dim,
          borderBottom:tab===t?`3px solid ${C.gold}`:'3px solid transparent',
        }}>{t==='grade'?'GRADE':'DETAILS'}</div>
      ))}
    </div>

    {/* ═══════ TAB 1: GRADE — flexbox 50/50, no grid ═══════ */}
    {tab==='grade'&&(<>
      {/* ── TRADE DAY section ── */}
      <SectionDivider label="TRADE DAY" accent="#5eead4"/>
      <div style={{display:'flex',flexDirection:'row'}}>
        {[
          {label:myLabel,header:`${myLabel} RECEIVES`,side:myTD,assets:myAssets,total:myTotal},
          {label:theirLabel,header:`${theirLabel} RECEIVES`,side:theirTD,assets:theirAssets,total:theirTotal},
        ].map((s,idx)=>{const v=s.side.verdict||'No Data';const vs=getVerdictStyle(v);return(
          <div key={idx} style={idx===0?colL:colR}>
            {/* Owner RECEIVES header */}
            <div style={{fontFamily:MONO,fontSize:mobile?11:13,fontWeight:900,letterSpacing:'0.06em',color:s.label==='YOU'?C.gold:C.primary,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.header}</div>
            {/* Grade circle + verdict */}
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
              <GradeCircle score={s.side.score||50} size={mobile?56:64}/>
              <div style={{fontFamily:MONO,fontSize:13,fontWeight:800,color:vs.color,lineHeight:1.3}}>{v}</div>
            </div>
            {/* Assets */}
            {s.assets.map((a:any,i:number)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:3,minWidth:0,marginBottom:1}}>
                {a.type==='pick'?<span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:C.gold,flexShrink:0}}>PK</span>:
                a.position&&<span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:posColor(a.position),flexShrink:0}}>{a.position}</span>}
                <span style={{fontFamily:SANS,fontSize:14,fontWeight:600,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>{a.name.replace(/\s*\([^)]*\)/g,'')}</span>
                <span style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:C.secondary,flexShrink:0}}>{fmt(a.value_at_trade?.value)}</span>
              </div>
            ))}
            <div style={{fontFamily:MONO,fontSize:12,color:C.dim,textAlign:'right',marginTop:2}}>= <span style={{color:C.primary,fontWeight:700}}>{fmt(s.total)}</span></div>
          </div>
        );})}
      </div>

      {/* ── HINDSIGHT section ── */}
      <SectionDivider label="HINDSIGHT" accent={C.gold}/>
      <div style={{display:'flex',flexDirection:'row'}}>
        {[
          {label:myLabel,header:`${myLabel}'S SIDE`,h:myH,bullets:myBullets,champ:myChamp},
          {label:theirLabel,header:`${theirLabel}'S SIDE`,h:theirH,bullets:theirBullets,champ:theirChamp},
        ].map((s,idx)=>{const v=hasHindsight?(s.h.verdict||'—'):'Pending';const vs=getVerdictStyle(v);return(
          <div key={idx} style={idx===0?colL:colR}>
            <div style={{fontFamily:MONO,fontSize:mobile?11:13,fontWeight:900,letterSpacing:'0.06em',color:s.label==='YOU'?C.gold:C.primary,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.header}</div>
            {hasHindsight?(<>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <GradeCircle score={s.h.score||0} size={mobile?56:64}/>
                <div style={{fontFamily:MONO,fontSize:13,fontWeight:800,color:vs.color,lineHeight:1.3}}>{v}</div>
              </div>
              {s.bullets.length>0&&s.bullets.map((b:{text:string;color:string;isChamp?:boolean},i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:4,marginBottom:1}}>
                  <span style={{fontSize:7,color:b.isChamp?C.gold:b.color,flexShrink:0,marginTop:4}}>●</span>
                  <span style={{fontFamily:SANS,fontSize:13,color:b.isChamp?C.gold:C.secondary,lineHeight:1.3,fontWeight:b.isChamp?700:400}}>{b.text}</span>
                </div>
              ))}
            </>):(<div style={{paddingTop:4,paddingBottom:4}}>
              <div style={{fontFamily:SERIF,fontSize:14,fontStyle:'italic',color:C.goldBright}}>Pending</div>
            </div>)}
          </div>
        );})}
      </div>
    </>)}

    {/* ═══════ TAB 2: DETAILS — collapsible pills, always 1fr 1fr ═══════ */}
    {tab==='details'&&(<>
      {/* TRADE DAY — collapsible */}
      <CollapsiblePill label="TRADE DAY GRADES" defaultOpen={true}>
        <div style={fp}>
          {[{label:`${myLabel} RECEIVES`,td:myTD},{label:`${theirLabel} RECEIVES`,td:theirTD}].map((side,idx)=>(
            <div key={idx} style={idx===0?colL:colR}>
              <div style={{fontFamily:MONO,fontSize:12,fontWeight:800,letterSpacing:'0.10em',color:'#5eead4',marginBottom:6}}>{side.label}</div>
              <GradeBox score={side.td.score||50} verdict={side.td.verdict||'No Data'}/>
            </div>
          ))}
        </div>
      </CollapsiblePill>

      {/* TRADE DAY VALUES — collapsible */}
      <CollapsiblePill label="TRADE DAY VALUES" defaultOpen={false}>
        <div style={fp}>
          {[{assets:myAssets,total:myTotal},{assets:theirAssets,total:theirTotal}].map((side,idx)=>(
            <div key={idx} style={{...(idx===0?colL:colR),paddingTop:mobile?8:12,paddingBottom:mobile?8:12,paddingLeft:mobile?8:12,paddingRight:mobile?8:12,borderRadius:6,background:C.card,border:`1px solid ${C.border}`}}>
              <div style={{fontFamily:MONO,fontSize:mobile?16:24,fontWeight:900,color:C.primary,marginBottom:6}}>{fmt(side.total)}</div>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                {side.assets.map((a:any,i:number)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:mobile?'3px 6px':'5px 8px',borderRadius:4,background:C.elevated,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:3,minWidth:0,flex:1}}>
                      {a.type==='pick'&&<StatusTag label="PK" color={C.gold} bg={C.goldDim} border={C.goldBorder}/>}
                      {a.position&&a.type!=='pick'&&<span style={{fontFamily:MONO,fontSize:12,fontWeight:800,color:posColor(a.position),padding:'1px 3px',borderRadius:2,background:`${posColor(a.position)}15`,flexShrink:0}}>{a.position}</span>}
                      <span style={{fontFamily:SANS,fontSize:13,fontWeight:600,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{cleanPickName(a.name)}</span>
                    </div>
                    <span style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.secondary,flexShrink:0,marginLeft:4}}>{fmt(a.value_at_trade?.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CollapsiblePill>

      {/* HINDSIGHT — collapsible */}
      <CollapsiblePill label="HINDSIGHT GRADES" defaultOpen={hasHindsight}>
        {hasHindsight?(<>
          <div style={fp}>
            {[{label:`${myLabel}'S SIDE`,h:myH},{label:`${theirLabel}'S SIDE`,h:theirH}].map((side,idx)=>(
              <div key={idx} style={idx===0?colL:colR}>
                <div style={{fontFamily:MONO,fontSize:12,fontWeight:800,letterSpacing:'0.10em',color:C.gold,marginBottom:6}}>{side.label}</div>
                <GradeBox score={side.h.score||0} verdict={side.h.verdict||'—'} confidence={side.h.confidence}/>
              </div>
            ))}
          </div>
          {(myGradeFactors.length>0||theirGradeFactors.length>0)&&<div style={{...fp,paddingTop:4}}>
            <div style={colL}>{myGradeFactors.map((gf:any,i:number)=><GradeFactorCard key={i} factor={gf}/>)}</div>
            <div style={colR}>{theirGradeFactors.map((gf:any,i:number)=><GradeFactorCard key={i} factor={gf}/>)}</div>
          </div>}
          {myGradeFactors.length===0&&(myKeyFactors.length>0||theirKeyFactors.length>0)&&<div style={{...fp,paddingTop:4}}>
            {[myKeyFactors,theirKeyFactors].map((kf,idx)=>(
              <div key={idx} style={{...(idx===0?colL:colR),paddingTop:6,paddingBottom:6,paddingLeft:8,paddingRight:8,borderRadius:5,background:C.card,border:`1px solid ${C.border}`}}>
                {kf.length>0?kf.map((f:string,i:number)=>(
                  <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6,padding:'3px 0',borderBottom:i<kf.length-1?`1px solid ${C.white08}`:'none'}}>
                    <span style={{fontSize:8,color:C.green,flexShrink:0,marginTop:3}}>●</span>
                    <span style={{fontFamily:SANS,fontSize:12,color:C.secondary,lineHeight:1.4}}>{f}</span>
                  </div>
                )):<span style={{fontFamily:SANS,fontSize:12,color:C.dim,fontStyle:'italic'}}>No factors</span>}
              </div>
            ))}
          </div>}
        </>):(<div style={{padding:'12px',textAlign:'center'}}><span style={{fontFamily:SERIF,fontSize:13,fontStyle:'italic',color:C.goldBright}}>Hindsight grades unlock over time</span></div>)}
      </CollapsiblePill>

      {/* ASSETS ACQUIRED — collapsible per owner */}
      <CollapsiblePill label={`ASSETS ACQUIRED (${myAssets.length + theirAssets.length})`} defaultOpen={true}>
        <div style={fp}>
          {[{label:`${myLabel} RECEIVED`,assets:myAssets,gf:myGradeFactors,owner:myName},{label:`${theirLabel} RECEIVED`,assets:theirAssets,gf:theirGradeFactors,owner:theirName}].map(({label,assets,gf,owner},idx)=>(
            <div key={idx} style={idx===0?colL:colR}>
              <SubHeader label={label}/>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {assets.length>0?assets.map((a:any,i:number)=><AssetCard key={i} asset={a} allAssets={assets} gradeFactors={gf} allTrades={reportData.all_trades} sideOwner={owner}/>):<span style={{fontFamily:MONO,fontSize:12,color:C.dim}}>No data</span>}
              </div>
            </div>
          ))}
        </div>
      </CollapsiblePill>

      {/* Replacement Impact — ported from Shadynasty ImpactCard */}
      {(()=>{const myI=myAssets.filter((a:any)=>a.replacement_impact?.career?.impact&&Math.abs(a.replacement_impact.career.impact)>=3);const theirI=theirAssets.filter((a:any)=>a.replacement_impact?.career?.impact&&Math.abs(a.replacement_impact.career.impact)>=3);if(!myI.length&&!theirI.length)return null;return(
        <CollapsiblePill label="REPLACEMENT IMPACT" defaultOpen={false}>
          <div style={fp}>
            {[myI,theirI].map((assets,idx)=>(
              <div key={idx} style={idx===0?colL:colR}>
                {assets.length>0?assets.map((a:any,i:number)=>{const ri=a.replacement_impact.career;const ic=ri.impact>=0?C.green:C.red;
                  const seasons=a.replacement_impact.seasons||{};const allRep:string[]=[];Object.values(seasons).forEach((s:any)=>{if((s as any).replacements)allRep.push(...(s as any).replacements);});
                  const uniqRep=[...new Set(allRep)].slice(0,3);
                  return(
                  <div key={i} style={{marginBottom:i<assets.length-1?12:0}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4,minWidth:0}}>
                      <span style={{fontFamily:SANS,fontSize:13,fontWeight:700,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{cleanPickName(a.name)}</span>
                      <span style={{fontFamily:MONO,fontSize:12,fontWeight:800,color:ic,paddingTop:2,paddingBottom:2,paddingLeft:8,paddingRight:8,borderRadius:4,background:ri.impact>=0?'rgba(125,211,160,0.12)':'rgba(228,114,114,0.12)',flexShrink:0}}>{ri.impact>=0?'+':''}{ri.impact.toFixed(1)} PPG</span>
                    </div>
                    <div style={{fontFamily:MONO,fontSize:10,color:C.dim,display:'flex',gap:16}}>
                      <span>With: <span style={{color:C.green,fontWeight:700}}>{ri.avg_with?.toFixed(1)}</span>{ri.total_weeks_with!=null&&` (${ri.total_weeks_with}wk)`}</span>
                      <span>Without: <span style={{color:C.red,fontWeight:700}}>{ri.avg_without?.toFixed(1)}</span>{ri.total_weeks_without!=null&&` (${ri.total_weeks_without}wk)`}</span>
                    </div>
                    {uniqRep.length>0&&<div style={{fontFamily:SANS,fontSize:10,color:C.dim,marginTop:3}}>Replaced by: <span style={{color:C.secondary}}>{uniqRep.join(', ')}</span></div>}
                  </div>
                );}):(<span style={{fontFamily:MONO,fontSize:12,color:C.dim}}>—</span>)}
              </div>
            ))}
          </div>
        </CollapsiblePill>
      );})()}

      {/* Team Context — collapsible */}
      {(mySide.season_context||theirSide.season_context)&&(
        <CollapsiblePill label="TEAM CONTEXT" defaultOpen={false}>
          <div style={fp}><div style={colL}><ContextCard sideData={mySide}/></div><div style={colR}><ContextCard sideData={theirSide}/></div></div>
        </CollapsiblePill>
      )}
    </>)}
  </>);
}

/* ═══════════════════════════════════════════════════════════════
   MODAL WRAPPER — fetches data, renders Shadynasty layout
   ═══════════════════════════════════════════════════════════════ */
export default function TradeReportModal({ leagueId, tradeId, onClose }: {
  leagueId: string; tradeId: string; onClose: () => void;
}) {
  const mobile=useIsMobile();
  const { data: report, isLoading } = useQuery({
    queryKey: ["trade-report", leagueId, tradeId],
    queryFn: () => getTradeReport(leagueId, tradeId),
    enabled: !!tradeId,
  });
  const { data: hindsight } = useQuery({
    queryKey: ["trade-hindsight", leagueId, tradeId],
    queryFn: () => getTradeHindsight(leagueId, tradeId),
    enabled: !!tradeId,
  });

  const r = report as Record<string, unknown> | undefined;
  const hasReport = r && (r.side_a || r.sides);

  return(<>
    <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes modalSlideIn{from{opacity:0;transform:scale(0.97) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes radarSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:mobile?'flex-start':'center',justifyContent:'center',animation:'fadeIn 0.2s ease'}}>
      <div onClick={(e)=>e.stopPropagation()} style={{width:mobile?'100vw':'96vw',maxWidth:mobile?'100vw':1100,maxHeight:mobile?'100vh':'92vh',borderRadius:mobile?0:12,overflowY:'auto',background:C.bg,border:mobile?'none':`1px solid ${C.border}`,animation:'modalSlideIn 0.25s ease',position:'relative'}}>
        <div style={{position:'absolute',top:mobile?6:10,right:mobile?10:16,zIndex:10}}><div style={{display:'flex',alignItems:'center',gap:4,padding:mobile?'2px 6px':'3px 10px',borderRadius:12,background:'rgba(212,165,50,0.06)',border:'1px solid rgba(212,165,50,0.22)'}}><span style={{fontFamily:SANS,fontSize:mobile?7:9,fontWeight:600,color:'#d4a532',fontStyle:'italic'}}>powered by</span><span style={{fontFamily:SANS,fontSize:mobile?8:10,fontWeight:900,color:'#eeeef2'}}>DynastyGPT<span style={{color:'#d4a532'}}>.com</span></span></div></div>
        {isLoading?<LoadingSequence/>:hasReport?<FullReport reportData={r} hindsightData={hindsight} onClose={onClose}/>:(
          <div style={{padding:40,textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:12,color:C.red,marginBottom:8}}>Failed to load report</div><div style={{fontFamily:MONO,fontSize:10,color:C.dim}}>Trade ID: {tradeId}</div><div onClick={onClose} style={{marginTop:16,fontFamily:MONO,fontSize:11,color:C.gold,cursor:'pointer',padding:'6px 16px',borderRadius:4,border:`1px solid ${C.goldBorder}`,background:C.goldDim,display:'inline-block'}}>CLOSE</div></div>
        )}
      </div>
    </div>
  </>);
}
