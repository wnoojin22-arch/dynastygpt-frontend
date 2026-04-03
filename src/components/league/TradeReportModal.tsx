// @ts-nocheck — ported from Shadynasty's TradeReportModal, uses Record<string, unknown> extensively
"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTradeReport, getTradeHindsight } from "@/lib/api";
import { C, SANS, MONO, DISPLAY, SERIF, fmt, gradeColor, posColor } from "./tokens";
import PlayerName from "./PlayerName";
import { usePlayerCardStore } from "@/lib/stores/player-card-store";
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

/* ═══ LOADING ═══ */
function LoadingSequence(){const[phase,setPhase]=useState(0);const[systems,setSystems]=useState<Array<{label:string;status:string}>>([]);const checks=[{label:"COLLECTING RECEIPTS",delay:0},{label:"GATHERING TRADE DAY INTEL",delay:350},{label:"TRACKING ASSETS",delay:700},{label:"GATHERING HINDSIGHT INTEL",delay:1050},{label:"MEASURING IMPACT",delay:1400},{label:"GENERATING VERDICT",delay:1750}];useEffect(()=>{const t=[setTimeout(()=>setPhase(1),100),setTimeout(()=>setPhase(2),400),setTimeout(()=>setPhase(3),800)];return()=>t.forEach(clearTimeout);},[]);useEffect(()=>{if(phase>=3)checks.forEach(s=>{setTimeout(()=>setSystems(p=>[...p,{label:s.label,status:"ONLINE"}]),s.delay);});},[phase]);return(<div style={{padding:60,display:'flex',flexDirection:'column',alignItems:'center',gap:24,minHeight:400}}>{phase>=1&&<div style={{position:'relative',width:80,height:80,borderRadius:'50%',border:`1px solid ${C.gold}20`}}><div style={{position:'absolute',top:'50%',left:'50%',width:'50%',height:2,transformOrigin:'0 50%',background:`linear-gradient(90deg, ${C.gold}80, transparent)`,animation:'radarSweep 2s linear infinite'}}/></div>}{phase>=2&&<div style={{textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,letterSpacing:'0.35em',color:C.goldBright}}>TRADE REPORT</div></div>}{phase>=3&&<div style={{width:320,display:'flex',flexDirection:'column',gap:4}}>{systems.map((sys,i)=>(<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',fontFamily:MONO,fontSize:10}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:5,height:5,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}60`}}/><span style={{color:C.dim,letterSpacing:'0.08em'}}>{sys.label}</span></div><span style={{color:C.green,fontWeight:700,fontSize:9}}>ONLINE</span></div>))}</div>}</div>);}

/* ═══ GRADE CIRCLE ═══ */
function GradeCircle({score,size=64}:{score:number;size?:number}){const letter=getLetterGrade(score);const color=getGradeColor(score);const r=(size-8)/2;const circ=2*Math.PI*r;const pct=Math.min(score/100,1);return(<div style={{position:'relative',width:size,height:size,flexShrink:0}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="3"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct*circ} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`}/></svg><div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:MONO,fontSize:size*0.3,fontWeight:900,color,lineHeight:1}}>{letter}</div><div style={{fontFamily:MONO,fontSize:size*0.15,fontWeight:700,color:C.dim,lineHeight:1,marginTop:2}}>{score}</div></div></div>);}

/* ═══ GRADE BOX ═══ */
function GradeBox({score,verdict,confidence}:{score:number;verdict:string;confidence?:string}){const vs=getVerdictStyle(verdict);return(<div style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderRadius:8,background:`${vs.color}08`,border:`1px solid ${vs.border}`}}><GradeCircle score={score} size={68}/><div><span style={{fontFamily:MONO,fontSize:14,fontWeight:900,color:vs.color,padding:'4px 12px',borderRadius:4,background:vs.bg,border:`1px solid ${vs.border}`}}>{verdict}</span>{confidence&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:8,letterSpacing:'0.06em'}}>{confidence} Confidence</div>}</div></div>);}

/* ═══ SECTION DIVIDER ═══ */
function SectionDivider({label,accent}:{label:string;accent:string}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,padding:mobile?'12px 12px':'18px 24px',borderTop:`1px solid ${C.border}`,background:`linear-gradient(180deg, ${accent}0a, transparent 80%)`}}><div style={{flex:1,height:1,background:`linear-gradient(90deg, transparent, ${accent}30)`}}/><span style={{fontFamily:MONO,fontSize:13,fontWeight:900,letterSpacing:'0.30em',color:accent}}>{label}</span><div style={{flex:1,height:1,background:`linear-gradient(90deg, ${accent}30, transparent)`}}/></div>);}

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

/* ═══ ASSET CARD ═══ */
function AssetCard({asset,gradeFactors,allTrades,sideOwner}:{asset:any;gradeFactors?:any[];allTrades?:any[];sideOwner?:string}){
  const openCard = usePlayerCardStore.getState().openPlayerCard;
  const isPick=asset.type==='pick';const prod=asset.production;const isCut=asset.roster_status?.status==='not_rostered';
  const isTraded=asset.roster_status?.status==='traded_away';const chain=asset.chain||[];const hasChain=chain.length>0;
  const ppgA=prod&&prod.games_started>0?(prod.total_points/prod.games_started):null;
  const ppgR=prod&&prod.games_on_roster>0?(prod.total_points/prod.games_on_roster):null;
  const posImpact=asset.replacement_impact?.career;const vAt=asset.value_at_trade?.value||0;
  const vNow=asset.value_current?.value||0;const vDelta=asset.value_delta;
  const age=asset.age;const position=asset.position;
  const ownerLower=(sideOwner||'').toLowerCase();

  const flipPackages=hasChain?chain.slice(0,1).map((c:any)=>{
    const tid=c.trade_id;const flipTrade=(allTrades||[]).find((t:any)=>t.trade_id===tid);
    let fullGave:string[]=c.gave||[];let fullGot:string[]=c.got_back||[];
    if(flipTrade){const sA=flipTrade.side_a;const sB=flipTrade.side_b;const ownerIsA=sA&&sA.owner&&sA.owner.toLowerCase()===ownerLower;const ownerSide=ownerIsA?sA:sB;const otherSide=ownerIsA?sB:sA;if(otherSide?.assets_raw)fullGave=otherSide.assets_raw.split(', ').filter(Boolean);if(ownerSide?.assets_raw)fullGot=ownerSide.assets_raw.split(', ').filter(Boolean);}
    return{...c,fullGave,fullGot,partner:flipTrade?(flipTrade.side_a?.owner?.toLowerCase()===ownerLower?flipTrade.side_b?.owner:flipTrade.side_a?.owner):c.flipped_to};
  }):[];

  return(<div style={{padding:'12px 14px',borderRadius:6,background:C.elevated,border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:6}}>
    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
      {isPick&&<StatusTag label="PICK" color={C.gold} bg={C.goldDim} border={C.goldBorder}/>}
      {position&&!isPick&&<span style={{fontFamily:MONO,fontSize:8,fontWeight:800,color:posColor(position),padding:'1px 4px',borderRadius:3,background:`${posColor(position)}15`,border:`1px solid ${posColor(position)}25`}}>{position}</span>}
      {isPick?<span style={{fontFamily:SANS,fontSize:14,fontWeight:700,color:C.primary}}>{asset.name}</span>:<PlayerName name={asset.name} style={{fontFamily:SANS,fontSize:14,fontWeight:700,color:isCut?C.red:C.primary,cursor:'pointer'}} />}
      {age&&<span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>({Math.round(age)})</span>}
      {hasChain&&<StatusTag label="FLIPPED" color={C.orange} bg="rgba(224,156,107,0.12)" border="rgba(224,156,107,0.25)"/>}
      {isCut&&!hasChain&&<StatusTag label="CUT" color={C.red} bg="rgba(228,114,114,0.12)" border="rgba(228,114,114,0.25)"/>}
    </div>
    {(vAt>0||vNow>0)&&<div style={{display:'flex',alignItems:'center',gap:8,fontFamily:MONO,fontSize:10}}><span style={{color:C.dim}}>{fmt(vAt)}</span><span style={{color:C.dim}}>→</span><span style={{color:C.secondary,fontWeight:700}}>{fmt(vNow)}</span>{vDelta!=null&&<span style={{color:vDelta>=0?C.green:C.red,fontWeight:800}}>{vDelta>=0?'+':''}{fmt(vDelta)}</span>}</div>}
    {flipPackages.map((fp:any,fi:number)=>(<div key={fi} style={{padding:'8px 10px',borderRadius:5,background:C.card,border:`1px solid ${C.gold}15`}}><div style={{fontFamily:MONO,fontSize:9,color:C.orange,fontWeight:700,marginBottom:4}}>↗ FLIPPED TO {(fp.partner||fp.flipped_to||'').toUpperCase()}</div><div style={{fontFamily:SANS,fontSize:11,color:C.secondary,lineHeight:1.6}}><span style={{color:C.red,fontWeight:600}}>{(Array.isArray(fp.fullGave)?fp.fullGave:[]).length>1?'Packaged':'Traded'}</span>{' '}<span style={{color:C.primary,fontWeight:600}}>{(Array.isArray(fp.fullGave)?fp.fullGave:[fp.fullGave]).join(' + ')}</span><span style={{color:C.dim}}> → </span><span style={{color:C.green,fontWeight:600}}>Received {(Array.isArray(fp.fullGot)?fp.fullGot:[fp.fullGot]).join(', ')}</span></div></div>))}
    {isPick&&asset.resolved_player&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim}}>{asset.resolved_slot&&<span style={{color:C.secondary}}>{asset.resolved_slot} → </span>}{asset.resolved_player==="Not yet drafted"?"Not yet drafted":<span style={{color:C.primary,fontWeight:600}}>{asset.resolved_player}</span>}</div>}
    {!isPick&&prod&&prod.total_points>0&&<div>
      <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}><span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:C.primary}}>{prod.total_points?.toFixed(1)} pts</span><span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>across {prod.games_on_roster} games</span></div>
      <div style={{display:'flex',gap:0,borderRadius:5,overflow:'hidden',border:`1px solid ${C.border}`,background:C.card}}>
        {ppgA!=null&&<div style={{flex:1,padding:'8px 12px',borderRight:`1px solid ${C.border}`}}><div style={{fontFamily:MONO,fontSize:7,fontWeight:800,letterSpacing:'0.08em',color:C.dim,marginBottom:3}}>PPG ACTIVE</div><div style={{display:'flex',alignItems:'baseline',gap:4}}><span style={{fontFamily:MONO,fontSize:22,fontWeight:900,color:ppgA>=15?C.green:ppgA>=10?C.primary:C.orange}}>{ppgA.toFixed(1)}</span><span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>({prod.games_started}G)</span></div></div>}
        {ppgR!=null&&<div style={{flex:1,padding:'8px 12px'}}><div style={{fontFamily:MONO,fontSize:7,fontWeight:800,letterSpacing:'0.08em',color:C.dim,marginBottom:3}}>PPG ROSTERED</div><div style={{display:'flex',alignItems:'baseline',gap:4}}><span style={{fontFamily:MONO,fontSize:22,fontWeight:900,color:ppgR>=12?C.green:ppgR>=7?C.primary:C.red}}>{ppgR.toFixed(1)}</span><span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>({prod.games_on_roster}G)</span></div></div>}
      </div>
      {prod.seasons&&Object.entries(prod.seasons).map(([yr,s]:any)=>(<div key={yr} style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:1,paddingLeft:4}}>{yr}: {s.points?.toFixed(1)} pts ({s.games}G, {s.ppg?.toFixed(1)} PPG)</div>))}
    </div>}
    {posImpact&&posImpact.impact!=null&&Math.abs(posImpact.impact)>=0.1&&<div style={{padding:'5px 10px',borderRadius:5,background:posImpact.impact>=0?'rgba(125,211,160,0.12)':'rgba(228,114,114,0.12)',border:`1px solid ${posImpact.impact>=0?'rgba(125,211,160,0.25)':'rgba(228,114,114,0.25)'}`,fontFamily:MONO,fontSize:10,display:'flex',alignItems:'center',gap:6}}><span style={{fontWeight:800,color:C.secondary}}>{position} Impact</span><span style={{color:C.dim}}>{posImpact.avg_without?.toFixed(1)}</span><span style={{color:C.dim}}>→</span><span style={{color:C.secondary,fontWeight:700}}>{posImpact.avg_with?.toFixed(1)}</span><span style={{color:posImpact.impact>=0?C.green:C.red,fontWeight:900,fontSize:11}}>({posImpact.impact>=0?'+':''}{posImpact.impact.toFixed(1)})</span></div>}
  </div>);
}

/* ═══ TEAM CONTEXT ═══ */
function ContextCard({sideData}:{sideData:any}){const ctx=sideData?.season_context;const ilpg=sideData?.team_ilpg?.trade_season;if(!ctx)return null;const rb=ctx.record_before_trade;const ra=ctx.record_after_trade;return(<div style={{padding:'12px 14px',borderRadius:6,background:C.card,border:`1px solid ${C.border}`}}><SubHeader label="TEAM CONTEXT"/>{ilpg&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:4,background:C.elevated,marginBottom:8}}><span style={{fontFamily:MONO,fontSize:10,color:C.secondary}}>IDEAL LINEUP</span><div style={{fontFamily:MONO,fontSize:12,color:C.primary}}>{ilpg.before?.avg_ilpg?.toFixed(1)} → {ilpg.after?.avg_ilpg?.toFixed(1)}<span style={{marginLeft:8,fontWeight:800,color:(ilpg.delta||0)>=0?C.green:C.red}}>{(ilpg.delta||0)>=0?'+':''}{ilpg.delta?.toFixed(1)}</span></div></div>}<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{rb&&rb.games>0&&<div style={{padding:'6px 10px',borderRadius:4,background:C.elevated}}><div style={{fontFamily:MONO,fontSize:8,color:C.dim,letterSpacing:'0.08em'}}>BEFORE</div><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,color:C.primary}}>{rb.wins}-{rb.losses}</div></div>}{ra&&ra.games>0&&<div style={{padding:'6px 10px',borderRadius:4,background:C.elevated}}><div style={{fontFamily:MONO,fontSize:8,color:C.dim,letterSpacing:'0.08em'}}>AFTER</div><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,color:C.primary}}>{ra.wins}-{ra.losses}</div></div>}</div>{ctx.season_info&&<div style={{marginTop:8,fontFamily:MONO,fontSize:10,color:C.secondary}}>Season: {ctx.season_info.wins}-{ctx.season_info.losses} ({ordinal(ctx.season_info.final_rank)} place){ctx.season_info.champion&&<span style={{color:C.gold,fontWeight:800}}> Champion</span>}</div>}</div>);}

/* ═══════════════════════════════════════════════════════════════
   FULL REPORT — Two tabs: GRADE (screenshotable) + DETAILS (deep dive)
   ═══════════════════════════════════════════════════════════════ */
function FullReport({reportData,hindsightData,onClose}:{reportData:any;hindsightData:any;onClose:()=>void}){
  const mobile=useIsMobile();
  const [tab,setTab]=useState<'grade'|'details'>('grade');
  const sA=reportData.side_a||{};const sB=reportData.side_b||{};
  const ownerA=sA.owner||"";const ownerB=sB.owner||"";
  const dateStr=String(reportData.trade_date||"").substring(0,10);
  const td=reportData.trade_day||{};const tdA=td.side_a||{};const tdB=td.side_b||{};
  const h=hindsightData&&(hindsightData.side_a||hindsightData.side_b)?hindsightData:(reportData.hindsight||{});
  const hA=h.side_a||{};const hB=h.side_b||{};const hasHindsight=(hA.score>0||hB.score>0);
  const overall=td.overall||h.overall||"";const os=getVerdictStyle(overall);
  const aAssets=sA.assets||[];const bAssets=sB.assets||[];
  const aTotal=aAssets.reduce((s:number,a:any)=>s+(a.value_at_trade?.value||0),0);
  const bTotal=bAssets.reduce((s:number,a:any)=>s+(a.value_at_trade?.value||0),0);
  const aRaw=sA.assets_raw||aAssets.map((a:any)=>a.name).join(", ");
  const bRaw=sB.assets_raw||bAssets.map((a:any)=>a.name).join(", ");
  const tradeDate=reportData.trade_date?new Date(reportData.trade_date):null;
  const tradeAgeMonths=tradeDate?((Date.now()-tradeDate.getTime())/(1000*60*60*24*30.44)):999;
  const hideRemaining=tradeAgeMonths<12;
  const filterGF=(factors:any[])=>factors?factors.filter((f:any)=>!(hideRemaining&&f.category==='remaining')):[];
  const aGradeFactors=filterGF(hA.grade_factors||sA.grade_factors||[]);
  const bGradeFactors=filterGF(hB.grade_factors||sB.grade_factors||[]);
  const aKeyFactors=hA.key_factors||[];const bKeyFactors=hB.key_factors||[];
  const gp={display:'grid' as const,gridTemplateColumns:mobile?'1fr':'1fr 1fr',gap:mobile?10:24,padding:mobile?'10px 12px':'16px 24px',alignItems:'stretch' as const};

  // Championship check for gold highlight
  const aChamp=sA.season_context?.season_info?.champion;
  const bChamp=sB.season_context?.season_info?.champion;

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
  const aBullets=buildBullets(aAssets,aGradeFactors,aKeyFactors,!!aChamp);
  const bBullets=buildBullets(bAssets,bGradeFactors,bKeyFactors,!!bChamp);

  return(<>
    {/* HEADER */}
    <div style={{padding:mobile?'10px 12px':'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:`linear-gradient(135deg, ${C.gold}06, transparent 60%)`,flexWrap:'wrap' as const,gap:8,borderBottom:`1px solid ${C.border}`}}>
      <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{width:4,height:36,borderRadius:2,background:C.gold}}/><div><div style={{fontFamily:MONO,fontSize:9,color:C.dim,letterSpacing:'0.22em'}}>TRADE REPORT</div><div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}><span style={{fontFamily:SANS,fontSize:mobile?14:18,fontWeight:800,color:C.primary}}>{ownerA}</span><span style={{fontFamily:SANS,fontSize:14,color:C.dim}}>⇄</span><span style={{fontFamily:SANS,fontSize:mobile?14:18,fontWeight:700,color:C.secondary}}>{ownerB}</span><span style={{fontFamily:MONO,fontSize:11,color:C.dim,marginLeft:4}}>{dateStr}</span></div></div></div>
      <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{display:mobile?'none':'flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:20,border:'1px solid rgba(212,165,50,0.22)',background:'rgba(212,165,50,0.06)'}}><span style={{fontFamily:SANS,fontSize:9,fontWeight:600,color:'#d4a532',fontStyle:'italic'}}>powered by</span><span style={{fontFamily:SANS,fontSize:12,fontWeight:900,color:'#eeeef2'}}>DynastyGPT<span style={{color:'#d4a532'}}>.com</span></span></div>{overall&&<span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:os.color,padding:'4px 12px',borderRadius:4,background:os.bg,border:`1px solid ${os.border}`}}>{overall}</span>}<div onClick={onClose} style={{width:32,height:32,borderRadius:6,background:C.elevated,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:14,color:C.dim,fontFamily:MONO}}>×</div></div></div>

    {/* SUMMARY BAR */}
    <div style={{padding:mobile?'8px 12px':'10px 24px',borderBottom:`1px solid ${C.border}`,background:C.card,display:'grid',gridTemplateColumns:mobile?'1fr auto 1fr':'1fr auto 1fr',gap:mobile?8:16,alignItems:'center'}}>
      <div><div style={{fontFamily:MONO,fontSize:8,color:C.red,fontWeight:800,letterSpacing:'0.08em',marginBottom:3}}>{ownerA} GAVE</div><div style={{fontFamily:SANS,fontSize:12,color:C.secondary,lineHeight:1.4}}>{bRaw}</div></div>
      <div style={{fontFamily:MONO,fontSize:18,color:`${C.gold}60`}}>⇄</div>
      <div><div style={{fontFamily:MONO,fontSize:8,color:C.green,fontWeight:800,letterSpacing:'0.08em',marginBottom:3}}>{ownerA} GOT</div><div style={{fontFamily:SANS,fontSize:12,color:C.primary,fontWeight:600,lineHeight:1.4}}>{aRaw}</div></div>
    </div>

    {/* GRADE SUMMARY — both grades side by side */}
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:24,padding:'10px 24px',borderBottom:`1px solid ${C.border}`,background:C.card}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontFamily:MONO,fontSize:8,fontWeight:800,letterSpacing:'0.08em',color:'#5eead4'}}>TRADE DAY</span>
        <GradeCircle score={tdA.score||50} size={32}/>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>vs</span>
        <GradeCircle score={tdB.score||50} size={32}/>
      </div>
      {hasHindsight&&<div style={{width:1,height:24,background:C.border}}/>}
      {hasHindsight&&<div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontFamily:MONO,fontSize:8,fontWeight:800,letterSpacing:'0.08em',color:C.gold}}>HINDSIGHT</span>
        <GradeCircle score={hA.score||0} size={32}/>
        <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>vs</span>
        <GradeCircle score={hB.score||0} size={32}/>
      </div>}
    </div>

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

    {/* ═══════ TAB 1: GRADE — compact, screenshotable ═══════ */}
    {tab==='grade'&&(<>
      {/* TRADE DAY — compact, centered label */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,padding:'12px 24px 0'}}>
        <div style={{flex:1,height:1,background:'linear-gradient(90deg, transparent, #5eead430)'}}/>
        <span style={{fontFamily:MONO,fontSize:11,fontWeight:900,letterSpacing:'0.25em',color:'#5eead4'}}>TRADE DAY</span>
        <div style={{flex:1,height:1,background:'linear-gradient(90deg, #5eead430, transparent)'}}/>
      </div>
      <div style={gp}>
        {[{label:ownerA,td:tdA,assets:aAssets,total:aTotal},{label:ownerB,td:tdB,assets:bAssets,total:bTotal}].map((side,idx)=>(
          <div key={idx}>
            {/* Grade + verdict */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span style={{fontFamily:MONO,fontSize:7,fontWeight:800,letterSpacing:'0.08em',color:'#5eead4'}}>TRADE DAY</span>
                <GradeCircle score={side.td.score||50} size={44}/>
              </div>
              <div>
                <div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.10em',color:'#5eead4',marginBottom:3}}>{side.label.toUpperCase()} RECEIVES</div>
                {(()=>{const v=side.td.verdict||'No Data';const vs=getVerdictStyle(v);return <span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:vs.color,padding:'2px 8px',borderRadius:3,background:vs.bg,border:`1px solid ${vs.border}`}}>{v}</span>;})()}
              </div>
            </div>
            {/* Asset rows — tight, no card wrapper */}
            <div style={{display:'flex',flexDirection:'column',gap:2,marginBottom:4}}>
              {side.assets.map((a:any,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'4px 8px',borderRadius:4,background:C.elevated}}>
                  <div style={{display:'flex',alignItems:'center',gap:5,minWidth:0}}>
                    {a.type==='pick'?<span style={{fontFamily:MONO,fontSize:7,fontWeight:800,color:C.gold,background:C.goldDim,padding:'1px 4px',borderRadius:2}}>PICK</span>:
                    a.position&&<span style={{fontFamily:MONO,fontSize:7,fontWeight:800,color:posColor(a.position),padding:'1px 3px',borderRadius:2,background:`${posColor(a.position)}15`}}>{a.position}</span>}
                    <span style={{fontFamily:SANS,fontSize:12,fontWeight:600,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name.replace(/\s*\([^)]*\)/g,'')}</span>
                  </div>
                  <span style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.secondary,flexShrink:0,marginLeft:8}}>{fmt(a.value_at_trade?.value)}</span>
                </div>
              ))}
            </div>
            {/* Total as subtle footer */}
            <div style={{display:'flex',justifyContent:'flex-end',padding:'0 8px',fontFamily:MONO,fontSize:10,color:C.dim}}>
              Total: <span style={{color:C.primary,fontWeight:700,marginLeft:4}}>{fmt(side.total)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* HINDSIGHT — compact */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,padding:'12px 24px 0',borderTop:`1px solid ${C.border}`}}>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg, transparent, ${C.gold}30)`}}/>
        <span style={{fontFamily:MONO,fontSize:11,fontWeight:900,letterSpacing:'0.25em',color:C.gold}}>HINDSIGHT</span>
        <div style={{flex:1,height:1,background:`linear-gradient(90deg, ${C.gold}30, transparent)`}}/>
      </div>
      {hasHindsight?(<div style={gp}>
        {[{label:ownerA,h:hA,bullets:aBullets,champ:aChamp},{label:ownerB,h:hB,bullets:bBullets,champ:bChamp}].map((side,idx)=>(
          <div key={idx}>
            {/* Grade + verdict */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                <span style={{fontFamily:MONO,fontSize:7,fontWeight:800,letterSpacing:'0.08em',color:C.gold}}>HINDSIGHT</span>
                <GradeCircle score={side.h.score||0} size={44}/>
              </div>
              <div>
                <div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.10em',color:C.gold,marginBottom:3}}>{side.label.toUpperCase()}&apos;S SIDE</div>
                {(()=>{const v=side.h.verdict||'—';const vs=getVerdictStyle(v);return <span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:vs.color,padding:'2px 8px',borderRadius:3,background:vs.bg,border:`1px solid ${vs.border}`}}>{v}</span>;})()}
              </div>
            </div>
            {/* Key bullets — 1-3 lines */}
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {side.bullets.map((b,i)=>(
                <div key={i} style={{
                  display:'flex',alignItems:'flex-start',gap:6,padding:'4px 8px',borderRadius:4,
                  background:b.isChamp?`${C.gold}12`:C.elevated,
                  border:b.isChamp?`1px solid ${C.gold}30`:'none',
                }}>
                  <span style={{fontSize:7,color:b.isChamp?C.gold:b.color,flexShrink:0,marginTop:3}}>{b.isChamp?'★':'●'}</span>
                  <span style={{fontFamily:SANS,fontSize:11,color:b.isChamp?C.gold:C.secondary,lineHeight:1.4,fontWeight:b.isChamp?700:400}}>{b.text}</span>
                </div>
              ))}
              {!side.bullets.length&&<span style={{fontFamily:SANS,fontSize:11,color:C.dim,fontStyle:'italic',padding:'4px 8px'}}>No data yet</span>}
            </div>
          </div>
        ))}
      </div>):(<div style={{padding:'20px 24px',textAlign:'center'}}><span style={{fontFamily:SERIF,fontSize:14,fontStyle:'italic',color:C.goldBright}}>Hindsight available after league sync</span></div>)}
      {/* Watermark */}
      <div style={{textAlign:'right',padding:'4px 24px 12px'}}><span style={{fontFamily:SANS,fontSize:10,color:`${C.gold}60`,fontWeight:700,letterSpacing:'0.02em'}}>dynastygpt.com</span></div>
    </>)}

    {/* ═══════ TAB 2: DETAILS — full deep dive ═══════ */}
    {tab==='details'&&(<>
      {/* TRADE DAY expanded */}
      <SectionDivider label="T R A D E  D A Y" accent="#5eead4"/>
      <div style={gp}><div><div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.16em',color:'#5eead4',marginBottom:8}}>{ownerA.toUpperCase()} RECEIVES</div><GradeBox score={tdA.score||50} verdict={tdA.verdict||'No Data'}/></div><div><div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.16em',color:'#5eead4',marginBottom:8}}>{ownerB.toUpperCase()} RECEIVES</div><GradeBox score={tdB.score||50} verdict={tdB.verdict||'No Data'}/></div></div>

      {/* Trade Day Values */}
      <div style={{...gp,paddingTop:0}}>{[{assets:aAssets,total:aTotal},{assets:bAssets,total:bTotal}].map((side,idx)=>(<div key={idx} style={{padding:'16px',borderRadius:8,background:C.card,border:`1px solid ${C.border}`}}><div style={{fontFamily:MONO,fontSize:8,color:C.dim,letterSpacing:'0.1em',marginBottom:6}}>TOTAL VALUE</div><div style={{fontFamily:MONO,fontSize:28,fontWeight:900,color:C.primary,lineHeight:1,marginBottom:12}}>{fmt(side.total)}</div><div style={{display:'flex',flexDirection:'column',gap:4}}>{side.assets.map((a:any,i:number)=>(<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 10px',borderRadius:5,background:C.elevated,border:`1px solid ${C.border}`}}><div style={{display:'flex',alignItems:'center',gap:6}}>{a.type==='pick'&&<StatusTag label="PICK" color={C.gold} bg={C.goldDim} border={C.goldBorder}/>}{a.position&&a.type!=='pick'&&<span style={{fontFamily:MONO,fontSize:8,fontWeight:800,color:posColor(a.position),padding:'1px 4px',borderRadius:3,background:`${posColor(a.position)}15`}}>{a.position}</span>}<span style={{fontFamily:SANS,fontSize:12,fontWeight:600,color:C.primary}}>{a.name}</span></div><span style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:C.secondary}}>{fmt(a.value_at_trade?.value)}</span></div>))}</div></div>))}</div>

      {/* HINDSIGHT expanded */}
      <SectionDivider label="H I N D S I G H T" accent={C.gold}/>
      {hasHindsight?(<><div style={gp}><div><div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.16em',color:C.gold,marginBottom:8}}>{ownerA.toUpperCase()}&apos;S SIDE</div><GradeBox score={hA.score||0} verdict={hA.verdict||'—'} confidence={hA.confidence}/></div><div><div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.16em',color:C.gold,marginBottom:8}}>{ownerB.toUpperCase()}&apos;S SIDE</div><GradeBox score={hB.score||0} verdict={hB.verdict||'—'} confidence={hB.confidence}/></div></div>
        {(aGradeFactors.length>0||bGradeFactors.length>0)&&<div style={{...gp,paddingTop:0}}><div>{aGradeFactors.map((gf:any,i:number)=><GradeFactorCard key={i} factor={gf}/>)}</div><div>{bGradeFactors.map((gf:any,i:number)=><GradeFactorCard key={i} factor={gf}/>)}</div></div>}
        {aGradeFactors.length===0&&(aKeyFactors.length>0||bKeyFactors.length>0)&&<div style={{...gp,paddingTop:0}}>{[aKeyFactors,bKeyFactors].map((kf,idx)=>(<div key={idx} style={{padding:'10px 14px',borderRadius:6,background:C.card,border:`1px solid ${C.border}`}}>{kf.length>0?kf.map((f:string,i:number)=>(<div key={i} style={{display:'flex',alignItems:'flex-start',gap:8,padding:'5px 0',borderBottom:i<kf.length-1?`1px solid ${C.white08}`:'none'}}><span style={{fontSize:8,color:C.green,flexShrink:0,marginTop:4}}>●</span><span style={{fontFamily:SANS,fontSize:11,color:C.secondary,lineHeight:1.5}}>{f}</span></div>)):<span style={{fontFamily:SANS,fontSize:11,color:C.dim,fontStyle:'italic'}}>No factors yet</span>}</div>))}</div>}
      </>):(<div style={{padding:'24px',textAlign:'center'}}><span style={{fontFamily:SERIF,fontSize:15,fontStyle:'italic',color:C.goldBright}}>Hindsight grades unlock over time</span><div style={{fontFamily:SANS,fontSize:11,color:C.dim,marginTop:4}}>Sync your league to track production, flips, and championships.</div></div>)}

      {/* ASSETS ACQUIRED — full cards */}
      <div style={{...gp,paddingTop:0}}>{[{owner:ownerA,assets:aAssets,gf:aGradeFactors},{owner:ownerB,assets:bAssets,gf:bGradeFactors}].map(({owner,assets,gf},idx)=>(<div key={idx}><SubHeader label={`${owner.toUpperCase()} ACQUIRED`}/><div style={{display:'flex',flexDirection:'column',gap:6}}>{assets.length>0?assets.map((a:any,i:number)=><AssetCard key={i} asset={a} gradeFactors={gf} allTrades={reportData.all_trades} sideOwner={owner}/>):<span style={{fontFamily:MONO,fontSize:11,color:C.dim}}>No asset data</span>}</div></div>))}</div>

      {/* Replacement Impact */}
      {(()=>{const aI=aAssets.filter((a:any)=>a.replacement_impact?.career?.impact&&Math.abs(a.replacement_impact.career.impact)>=3);const bI=bAssets.filter((a:any)=>a.replacement_impact?.career?.impact&&Math.abs(a.replacement_impact.career.impact)>=3);if(!aI.length&&!bI.length)return null;return(<div style={{...gp,paddingTop:0}}>{[aI,bI].map((assets,idx)=>(assets.length>0?<div key={idx} style={{padding:'12px 14px',borderRadius:6,background:C.card,border:`1px solid ${C.border}`}}><SubHeader label="REPLACEMENT IMPACT"/>{assets.map((a:any,i:number)=>{const ri=a.replacement_impact.career;const ic=ri.impact>=0?C.green:C.red;return(<div key={i} style={{marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span style={{fontFamily:SANS,fontSize:13,fontWeight:700,color:C.primary}}>{a.name}</span><span style={{fontFamily:MONO,fontSize:12,fontWeight:800,color:ic,padding:'2px 8px',borderRadius:4,background:ri.impact>=0?'rgba(125,211,160,0.12)':'rgba(228,114,114,0.12)'}}>{ri.impact>=0?'+':''}{ri.impact.toFixed(1)} PPG</span></div><div style={{fontFamily:MONO,fontSize:10,color:C.dim,display:'flex',gap:16}}><span>With: <span style={{color:C.green,fontWeight:700}}>{ri.avg_with?.toFixed(1)}</span></span><span>Without: <span style={{color:C.red,fontWeight:700}}>{ri.avg_without?.toFixed(1)}</span></span></div></div>);})}</div>:<div key={idx}/>))}</div>);})()}

      {/* Team Context */}
      {(sA.season_context||sB.season_context)&&<div style={{...gp,paddingTop:0,paddingBottom:24}}><ContextCard sideData={sA}/><ContextCard sideData={sB}/></div>}
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
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',animation:'fadeIn 0.2s ease'}}>
      <div onClick={(e)=>e.stopPropagation()} style={{width:mobile?'100vw':'94vw',maxWidth:mobile?'100vw':900,maxHeight:mobile?'100vh':'92vh',borderRadius:mobile?0:12,overflowY:'auto',background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,animation:'modalSlideIn 0.25s ease',position:'relative'}}>
        <div style={{position:'absolute',top:10,right:16,zIndex:10}}><span style={{fontFamily:SANS,fontSize:10,fontWeight:700,color:`${C.gold}60`,letterSpacing:'0.02em'}}>dynastygpt.com</span></div>
        {isLoading?<LoadingSequence/>:hasReport?<FullReport reportData={r} hindsightData={hindsight} onClose={onClose}/>:(
          <div style={{padding:40,textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:12,color:C.red,marginBottom:8}}>Failed to load report</div><div style={{fontFamily:MONO,fontSize:10,color:C.dim}}>Trade ID: {tradeId}</div><div onClick={onClose} style={{marginTop:16,fontFamily:MONO,fontSize:11,color:C.gold,cursor:'pointer',padding:'6px 16px',borderRadius:4,border:`1px solid ${C.goldBorder}`,background:C.goldDim,display:'inline-block'}}>CLOSE</div></div>
        )}
      </div>
    </div>
  </>);
}
