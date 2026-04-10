// @ts-nocheck — ported from Shadynasty's TradeReportModal, uses Record<string, unknown> extensively
"use client";

import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTradeReport, getTradeHindsight, getPicks } from "@/lib/api";
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
function cleanPickName(name:string,slot?:string|null,slotMap?:Record<string,string>){
  const base=name.replace(/\s*\([^)]*\)/g,'');
  // 2026 picks: show slot number (e.g. "2026 1.07") instead of "2026 Round 1"
  if(slot&&base.includes('2026')){return `2026 ${slot}`;}
  // Fallback: look up slot from picks data if resolved_slot is null
  if(!slot&&slotMap&&base.includes('2026')){
    const mapped=slotMap[name.toLowerCase().trim()];
    if(mapped) return `2026 ${mapped}`;
  }
  return base;
}


/* ═══ LOADING ═══ */
function LoadingSequence(){const[phase,setPhase]=useState(0);const[systems,setSystems]=useState<Array<{label:string;status:string}>>([]);const checks=[{label:"COLLECTING RECEIPTS",delay:0},{label:"GATHERING TRADE DAY INTEL",delay:350},{label:"TRACKING ASSETS",delay:700},{label:"GATHERING HINDSIGHT INTEL",delay:1050},{label:"MEASURING IMPACT",delay:1400},{label:"GENERATING VERDICT",delay:1750}];useEffect(()=>{const t=[setTimeout(()=>setPhase(1),100),setTimeout(()=>setPhase(2),400),setTimeout(()=>setPhase(3),800)];return()=>t.forEach(clearTimeout);},[]);useEffect(()=>{if(phase>=3)checks.forEach(s=>{setTimeout(()=>setSystems(p=>[...p,{label:s.label,status:"ONLINE"}]),s.delay);});},[phase]);return(<div style={{padding:60,display:'flex',flexDirection:'column',alignItems:'center',gap:24,minHeight:400}}>{phase>=1&&<div style={{position:'relative',width:80,height:80,borderRadius:'50%',border:`1px solid ${C.gold}20`}}><div style={{position:'absolute',top:'50%',left:'50%',width:'50%',height:2,transformOrigin:'0 50%',background:`linear-gradient(90deg, ${C.gold}80, transparent)`,animation:'radarSweep 2s linear infinite'}}/></div>}{phase>=2&&<div style={{textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,letterSpacing:'0.35em',color:C.goldBright}}>TRADE REPORT</div></div>}{phase>=3&&<div style={{width:320,display:'flex',flexDirection:'column',gap:4}}>{systems.map((sys,i)=>(<div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 0',fontFamily:MONO,fontSize:10}}><div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:5,height:5,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}60`}}/><span style={{color:C.dim,letterSpacing:'0.08em'}}>{sys.label}</span></div><span style={{color:C.green,fontWeight:700,fontSize:9}}>ONLINE</span></div>))}</div>}</div>);}

/* ═══ GRADE CIRCLE ═══ */
function GradeCircle({score,size=64}:{score:number;size?:number}){const letter=getLetterGrade(score);const color=getGradeColor(score);const r=(size-8)/2;const circ=2*Math.PI*r;const pct=Math.min(score/100,1);return(<div style={{position:'relative',width:size,height:size,flexShrink:0}}><svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth="3"/><circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct*circ} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`}/></svg><div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}><div style={{fontFamily:MONO,fontSize:size*0.3,fontWeight:900,color,lineHeight:1}}>{letter}</div><div style={{fontFamily:MONO,fontSize:size*0.15,fontWeight:700,color:C.dim,lineHeight:1,marginTop:2}}>{score}</div></div></div>);}

/* ═══ GRADE BOX ═══ */
function GradeBox({score,verdict,confidence,mobile}:{score:number;verdict:string;confidence?:string;mobile?:boolean}){const vs=getVerdictStyle(verdict);return(<div style={{display:'flex',alignItems:'center',gap:mobile?6:10,paddingTop:mobile?4:8,paddingBottom:mobile?4:8,paddingLeft:mobile?6:10,paddingRight:mobile?6:10,borderRadius:6,background:`${vs.color}08`,border:`1px solid ${vs.border}`}}><GradeCircle score={score} size={mobile?40:56}/><div><span style={{fontFamily:MONO,fontSize:mobile?11:13,fontWeight:900,color:vs.color,paddingTop:2,paddingBottom:2,paddingLeft:mobile?6:10,paddingRight:mobile?6:10,borderRadius:4,background:vs.bg,border:`1px solid ${vs.border}`}}>{verdict}</span>{confidence&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim,marginTop:3,letterSpacing:'0.06em'}}>{confidence}</div>}</div></div>);}

/* ═══ SECTION DIVIDER ═══ */
function SectionDivider({label,accent}:{label:string;accent:string}){return(<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,paddingTop:6,paddingBottom:6,paddingLeft:12,paddingRight:12,borderTop:`1px solid ${C.border}`,background:`linear-gradient(180deg, ${accent}0a, transparent 80%)`}}><div style={{flex:1,height:1,background:`linear-gradient(90deg, transparent, ${accent}30)`}}/><span style={{fontFamily:MONO,fontSize:11,fontWeight:900,letterSpacing:'0.20em',color:accent}}>{label}</span><div style={{flex:1,height:1,background:`linear-gradient(90deg, ${accent}30, transparent)`}}/></div>);}

function SubHeader({label}:{label:string}){return(<div style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.12em',color:C.gold,paddingTop:3,paddingBottom:3,borderBottom:`1px solid ${C.gold}25`,marginBottom:4}}>{label}</div>);}
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
  // Simplify production pill: "Production from X, Y" → "Asset Production"
  const title=factor.category==='production'?'Asset Production':noSHA(factor.title);
  const detail=factor.category==='production'?noSHA(factor.detail):factor.detail?noSHA(factor.detail):null;
  return(<div style={{display:'flex',alignItems:'center',gap:6,paddingTop:4,paddingBottom:4,paddingLeft:8,paddingRight:8,borderRadius:5,background:s.bg,border:`1px solid ${s.border}`,marginBottom:3}}>
    <span style={{fontSize:10,flexShrink:0,color:s.color,fontWeight:900,width:16,textAlign:'center'}}>{s.icon}</span>
    <div style={{flex:1,minWidth:0}}><div style={{fontFamily:SANS,fontSize:11,fontWeight:700,color:s.color,lineHeight:1.2}}>{title}</div>{detail&&<div style={{fontFamily:SANS,fontSize:10,color:C.dim,marginTop:1,lineHeight:1.2}}>{detail}</div>}</div>
    {factor.value&&<span style={{fontFamily:MONO,fontSize:11,fontWeight:900,color:s.color,flexShrink:0}}>{factor.value}</span>}
  </div>);
}

/* ═══ ASSET CARD — ported from Shadynasty ═══ */
function AssetCard({asset,allAssets,gradeFactors,allTrades,sideOwner,pickSlotMap}:{asset:any;allAssets?:any[];gradeFactors?:any[];allTrades?:any[];sideOwner?:string;pickSlotMap?:Record<string,string>}){
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
    if(!fullGave.length)fullGave=c.gave?(Array.isArray(c.gave)?c.gave:String(c.gave).split(', ')).filter(Boolean):[asset.name];
    if(!fullGot.length)fullGot=c.got_back?(Array.isArray(c.got_back)?c.got_back:String(c.got_back).split(', ')).filter(Boolean):[];
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

  // Compute production data once
  const showProd=isPick?(asset.became_production||prod):prod;
  const hasProd=showProd&&showProd.total_points>0;
  const _ppgA=hasProd&&showProd.games_started>0?(showProd.total_points/showProd.games_started):null;
  const _ppgR=hasProd&&showProd.games_on_roster>0?(showProd.total_points/showProd.games_on_roster):null;

  // Flip destination — compact description
  const flipDest=visibleFlips.length>0?(()=>{
    const fp=visibleFlips[0];
    const got=fp.fullGot||[];
    if(got.length===0)return null;
    if(got.length===1)return`Packaged for ${got[0]}`;
    const hasPlayer=got.some((g:string)=>!g.match(/^\d{4}\s/));
    return hasPlayer?`Packaged for ${got[0]} + ${got.length-1} more`:'Packaged for picks';
  })():null;

  return(<div style={{paddingTop:5,paddingBottom:5,paddingLeft:8,paddingRight:8,borderRadius:5,background:C.elevated,border:`1px solid ${C.border}`,display:'flex',flexDirection:'column',gap:2}}>
    {/* Line 1: [Pos badge] [Name] [Age] + tags */}
    <div style={{display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
      {isPick&&<StatusTag label="PICK" color={C.gold} bg={C.goldDim} border={C.goldBorder}/>}
      {position&&!isPick&&<span style={{fontFamily:MONO,fontSize:8,fontWeight:800,color:posColor(position),padding:'1px 4px',borderRadius:3,background:`${posColor(position)}15`,border:`1px solid ${posColor(position)}25`}}>{position}</span>}
      {isPick?<span style={{fontFamily:SANS,fontSize:13,fontWeight:700,color:C.primary}}>{cleanPickName(asset.name,asset.resolved_slot,pickSlotMap)}</span>:<PlayerName name={asset.name} style={{fontFamily:SANS,fontSize:13,fontWeight:700,color:isCut?C.red:C.primary,cursor:'pointer'}} />}
      {age&&<span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>({Math.round(age)})</span>}
      {hasChain&&<StatusTag label="FLIPPED" color={C.orange} bg="rgba(224,156,107,0.12)" border="rgba(224,156,107,0.25)"/>}
      {isCut&&!hasChain&&<StatusTag label="CUT" color={C.red} bg="rgba(228,114,114,0.12)" border="rgba(228,114,114,0.25)"/>}
      {isTraded&&!hasChain&&<StatusTag label="TRADED" color={C.blue} bg="rgba(107,184,224,0.12)" border="rgba(107,184,224,0.25)"/>}
      {isPick&&(()=>{const yrM=asset.name.match(/(\d{4})/);const yr=yrM?parseInt(yrM[1]):0;const now=new Date().getFullYear();if(yr>now) return <StatusTag label="PENDING" color="#d4a017" bg="rgba(212,160,23,0.12)" border="rgba(212,160,23,0.25)"/>;if(yr<=now&&(!asset.resolved_player||asset.resolved_player==='Not yet drafted')) return <StatusTag label="UNRESOLVED" color="#d4a017" bg="rgba(212,160,23,0.12)" border="rgba(212,160,23,0.25)"/>;return null;})()}
    </div>

    {/* Pick resolution */}
    {isPick&&asset.resolved_player&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim,paddingLeft:2}}>{asset.resolved_slot&&<span style={{color:C.secondary}}>{asset.resolved_slot} → </span>}{asset.resolved_player==="Not yet drafted"?"Not yet drafted":<span style={{color:C.primary,fontWeight:600}}>{asset.resolved_player}</span>}</div>}

    {/* Flip pill */}
    {flipDest&&(
      <div style={{display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:4,background:'rgba(224,156,107,0.10)',border:'1px solid rgba(224,156,107,0.25)',marginTop:2}}>
        <span style={{fontFamily:MONO,fontSize:9,color:C.orange,fontWeight:800}}>↗</span>
        <span style={{fontFamily:MONO,fontSize:10,fontWeight:700,color:C.orange}}>{flipDest}</span>
      </div>
    )}

    {/* Production pills — three distinct PPG metrics + position impact */}
    {hasProd&&(!isPick||asset.resolved_player)&&(()=>{
      const careerPpg=showProd.career_ppg||0;
      const ppgSinceTrade=_ppgA;
      const ppgRostered=_ppgR;
      // Color for PPG Since Trade: compare against career
      const stC=ppgSinceTrade!=null?(ppgSinceTrade>=careerPpg*1.05?C.green:ppgSinceTrade>=careerPpg*0.85?C.primary:C.orange):C.dim;
      // Color for PPG Rostered: red if significantly lower than PPG Since Trade (injuries/byes hurt)
      const rC=ppgRostered!=null&&ppgSinceTrade!=null?(ppgRostered>=ppgSinceTrade*0.7?C.primary:C.red):C.dim;
      return(
      <div style={{display:'flex',flexDirection:'column',gap:3,marginTop:3}}>
        {/* Total points */}
        <div style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:4,background:'rgba(176,178,200,0.08)',border:'1px solid rgba(176,178,200,0.15)'}}>
          <span style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:C.secondary}}>Total Pts Since Trade</span>
          <span style={{fontFamily:MONO,fontSize:10,fontWeight:900,color:C.primary}}>{showProd.total_points?.toFixed(0)}</span>
          <span style={{fontFamily:MONO,fontSize:8,color:C.dim}}>({showProd.games_on_roster} weeks on roster)</span>
        </div>
        {/* Career PPG */}
        {careerPpg>0&&(
          <div style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:4,background:'rgba(176,178,200,0.06)',border:'1px solid rgba(176,178,200,0.12)'}}>
            <span style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:C.dim}}>Career PPG</span>
            <span style={{fontFamily:MONO,fontSize:10,fontWeight:900,color:C.secondary}}>{careerPpg.toFixed(1)}</span>
            <span style={{fontFamily:MONO,fontSize:8,color:C.dim}}>all-time avg when they play</span>
          </div>
        )}
        {/* PPG Since Trade */}
        {ppgSinceTrade!=null&&ppgSinceTrade>0&&(
          <div style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:4,background:`${stC}10`,border:`1px solid ${stC}25`}}>
            <span style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:C.secondary}}>PPG Since Trade</span>
            <span style={{fontFamily:MONO,fontSize:10,fontWeight:900,color:stC}}>{ppgSinceTrade.toFixed(1)}</span>
            <span style={{fontFamily:MONO,fontSize:8,color:C.dim}}>avg when they play on your roster</span>
          </div>
        )}
        {/* PPG Rostered */}
        {ppgRostered!=null&&(
          <div style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:4,background:`${rC}10`,border:`1px solid ${rC}25`}}>
            <span style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:C.secondary}}>PPG Rostered</span>
            <span style={{fontFamily:MONO,fontSize:10,fontWeight:900,color:rC}}>{ppgRostered.toFixed(1)}</span>
            <span style={{fontFamily:MONO,fontSize:8,color:C.dim}}>every week including injuries &amp; byes</span>
          </div>
        )}
        {/* Position Impact pill */}
        {posImpact&&posImpact.impact!=null&&Math.abs(posImpact.impact)>=0.1&&(
          <div style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:4,background:posImpact.impact>=0?'rgba(125,211,160,0.10)':'rgba(228,114,114,0.10)',border:`1px solid ${posImpact.impact>=0?'rgba(125,211,160,0.25)':'rgba(228,114,114,0.25)'}`}}>
            <span style={{fontFamily:MONO,fontSize:9,fontWeight:700,color:C.secondary}}>{(position||posImpact?.position||'POS')} Impact</span>
            <span style={{fontFamily:MONO,fontSize:10,color:C.dim}}>{posImpact.avg_without?.toFixed(1)}</span>
            <span style={{fontFamily:MONO,fontSize:9,color:C.dim}}>→</span>
            <span style={{fontFamily:MONO,fontSize:10,fontWeight:800,color:C.secondary}}>{posImpact.avg_with?.toFixed(1)}</span>
            <span style={{fontFamily:MONO,fontSize:10,fontWeight:900,color:posImpact.impact>=0?C.green:C.red}}>({posImpact.impact>=0?'+':''}{posImpact.impact.toFixed(1)})</span>
          </div>
        )}
      </div>);})()}
  </div>);
}

/* ═══ TEAM CONTEXT ═══ */
function ContextCard({sideData}:{sideData:any}){const ctx=sideData?.season_context;const ilpg=sideData?.team_ilpg?.trade_season;if(!ctx)return null;const rb=ctx.record_before_trade;const ra=ctx.record_after_trade;return(<div style={{padding:'12px 14px',borderRadius:6,background:C.card,border:`1px solid ${C.border}`}}><SubHeader label="TEAM CONTEXT"/>{ilpg&&<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 10px',borderRadius:4,background:C.elevated,marginBottom:8}}><span style={{fontFamily:MONO,fontSize:12,color:C.secondary}}>IDEAL LINEUP</span><div style={{fontFamily:MONO,fontSize:13,color:C.primary}}>{ilpg.before?.avg_ilpg?.toFixed(1)} → {ilpg.after?.avg_ilpg?.toFixed(1)}<span style={{marginLeft:8,fontWeight:800,color:(ilpg.delta||0)>=0?C.green:C.red}}>{(ilpg.delta||0)>=0?'+':''}{ilpg.delta?.toFixed(1)}</span></div></div>}<div style={{display:'flex',flexDirection:'row',gap:8}}>{rb&&rb.games>0&&<div style={{flex:1,padding:'6px 10px',borderRadius:4,background:C.elevated}}><div style={{fontFamily:MONO,fontSize:12,color:C.dim,letterSpacing:'0.08em'}}>BEFORE</div><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,color:C.primary}}>{rb.wins}-{rb.losses}</div></div>}{ra&&ra.games>0&&<div style={{flex:1,padding:'6px 10px',borderRadius:4,background:C.elevated}}><div style={{fontFamily:MONO,fontSize:12,color:C.dim,letterSpacing:'0.08em'}}>AFTER</div><div style={{fontFamily:MONO,fontSize:14,fontWeight:800,color:C.primary}}>{ra.wins}-{ra.losses}</div></div>}</div>{ctx.season_info&&<div style={{marginTop:8,fontFamily:MONO,fontSize:12,color:C.secondary}}>Season: {ctx.season_info.wins}-{ctx.season_info.losses} ({ordinal(ctx.season_info.final_rank)} place){ctx.season_info.champion&&<span style={{color:C.gold,fontWeight:800}}> Champion</span>}</div>}</div>);}

/* ═══ COLLAPSIBLE SECTION ═══ */
function CollapsiblePill({label,defaultOpen,children}:{label:string;defaultOpen:boolean;children:React.ReactNode}){
  const [open,setOpen]=useState(defaultOpen);
  return(<div style={{marginBottom:2,borderRadius:5,border:`1px solid ${C.border}`,overflow:'hidden'}}>
    <div onClick={()=>setOpen(!open)} style={{paddingTop:5,paddingBottom:5,paddingLeft:8,paddingRight:8,background:C.elevated,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span style={{fontFamily:MONO,fontSize:9,fontWeight:800,letterSpacing:'0.10em',color:C.gold}}>{label}</span>
      <span style={{fontFamily:MONO,fontSize:12,color:C.dim}}>{open?'▴':'▾'}</span>
    </div>
    {open&&<div style={{paddingTop:3,paddingBottom:3,paddingLeft:2,paddingRight:2}}>{children}</div>}
  </div>);
}

/* ═══════════════════════════════════════════════════════════════
   FULL REPORT — Two tabs: GRADE (screenshotable) + DETAILS (deep dive)
   ═══════════════════════════════════════════════════════════════ */
function FullReport({reportData,hindsightData,onClose,pickSlotMap}:{reportData:any;hindsightData:any;onClose:()=>void;pickSlotMap:Record<string,string>}){
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
  // Hindsight grades — match perspective.
  // Use the separate /hindsight endpoint (richer data: key_factors, letter,
  // grade_factors, breakdown) as the base, then overlay the unresolved-picks
  // gate (status/pending_reason) from reportData.hindsight per side.
  const h=hindsightData&&(hindsightData.side_a||hindsightData.side_b)?hindsightData:(reportData.hindsight||{});
  // Overlay pending-picks status from /report endpoint onto each side.
  // The /hindsight endpoint doesn't have this gate; /report does.
  const _rh=reportData.hindsight as any;
  if(_rh?.side_a?.status&&h.side_a){h.side_a.status=_rh.side_a.status;h.side_a.pending_reason=_rh.side_a.pending_reason;}
  if(_rh?.side_b?.status&&h.side_b){h.side_b.status=_rh.side_b.status;h.side_b.pending_reason=_rh.side_b.pending_reason;}
  if(_rh?.overall_status){h.overall=_rh.overall;h.overall_status=_rh.overall_status;}
  const myH=h.side_a?.owner?.toLowerCase()===myName.toLowerCase()?h.side_a:(h.side_b?.owner?.toLowerCase()===myName.toLowerCase()?h.side_b:h.side_a)||{};
  const theirH=h.side_a?.owner?.toLowerCase()===theirName.toLowerCase()?h.side_a:(h.side_b?.owner?.toLowerCase()===theirName.toLowerCase()?h.side_b:h.side_b)||{};
  const hasHindsight=(myH.score>0||theirH.score>0);
  const overall=td.overall||h.overall||"";const os=getVerdictStyle(overall);

  // Hindsight confidence status — mirrors backend get_hindsight_display_label() thresholds
  const tradeDate=reportData.trade_date?new Date(reportData.trade_date):null;
  const daysAgo=tradeDate?Math.floor((Date.now()-tradeDate.getTime())/(1000*60*60*24)):0;
  const hindsightStatus:('confirmed'|'too_soon'|'pending')=daysAgo>=548?'confirmed':daysAgo>=365?'too_soon':'pending';


  // Assets — from MY perspective (what I received = mySide.assets)
  const myAssets=mySide.assets||[];const theirAssets=theirSide.assets||[];
  const myTotal=myAssets.reduce((s:number,a:any)=>s+(a.value_at_trade?.value||0),0);
  const theirTotal=theirAssets.reduce((s:number,a:any)=>s+(a.value_at_trade?.value||0),0);

  // GAVE = what the other side received (theirSide.assets_raw). GOT = what I received (mySide.assets_raw).
  const myGave=theirSide.assets_raw||theirAssets.map((a:any)=>a.name).join(", ");
  const myGot=mySide.assets_raw||myAssets.map((a:any)=>a.name).join(", ");

  const tradeAgeMonths=tradeDate?((Date.now()-tradeDate.getTime())/(1000*60*60*24*30.44)):999;
  const hideRemaining=tradeAgeMonths<12;
  const filterGF=(factors:any[])=>factors?factors.filter((f:any)=>!(hideRemaining&&f.category==='remaining')):[];
  const myGradeFactors=filterGF(myH.grade_factors||mySide.grade_factors||[]);
  const theirGradeFactors=filterGF(theirH.grade_factors||theirSide.grade_factors||[]);
  const myKeyFactors=myH.key_factors||[];const theirKeyFactors=theirH.key_factors||[];
  const fp={display:'flex' as const,flexDirection:'row' as const,gap:0,paddingTop:mobile?2:8,paddingBottom:mobile?2:8,paddingLeft:mobile?2:16,paddingRight:mobile?2:16};
  const colL={flex:1,minWidth:0,overflow:'hidden' as const,paddingTop:3,paddingBottom:3,paddingLeft:mobile?4:10,paddingRight:mobile?6:14,borderRight:`1px solid ${C.border}`};
  const colR={flex:1,minWidth:0,overflow:'hidden' as const,paddingTop:3,paddingBottom:3,paddingLeft:mobile?6:14,paddingRight:mobile?4:10};

  // Championship check for gold highlight
  const myChamp=mySide.season_context?.season_info?.champion;
  const theirChamp=theirSide.season_context?.season_info?.champion;

  // Build compact key bullets for hindsight (top 2 per side)
  // For picks that resolved to players, replace the raw pick label in grade
  // factor text with the actual player name so the bullet reads
  // "Michael Penix gained value — +856" not "2024 Round 2 (...) gained value".
  const _resolvePickNames=(text:string,assets:any[])=>{
    let out=text;
    for(const a of assets){
      if(a.type==='pick'&&a.resolved_player&&a.resolved_player!=='Not yet drafted'){
        const playerName=a.resolved_player.split(' (')[0];
        if(out.includes(a.name)){out=out.replace(a.name,playerName);}
      }
    }
    return out;
  };
  const buildBullets=(assets:any[],gradeFactors:any[],keyFactors:string[],isChamp:boolean)=>{
    const bullets:{text:string;color:string;isChamp?:boolean}[]=[];
    // Grade factors first (most specific)
    for(const gf of gradeFactors.slice(0,2)){
      const col=gf.sentiment==='elite'?C.goldBright:gf.sentiment==='positive'?C.green:gf.sentiment==='negative'?C.red:C.secondary;
      bullets.push({text:_resolvePickNames(noSHA(`${gf.title}${gf.value?' — '+gf.value:''}`),assets),color:col});
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
    {/* HEADER — compact, close button top-left */}
    <div style={{paddingTop:mobile?5:10,paddingBottom:mobile?5:10,paddingLeft:mobile?10:20,paddingRight:mobile?10:20,display:'flex',alignItems:'center',background:`linear-gradient(135deg, ${C.gold}06, transparent 60%)`,gap:mobile?8:10,borderBottom:`1px solid ${C.border}`}}>
      <div onClick={onClose} style={{width:mobile?32:36,height:mobile?32:36,borderRadius:mobile?16:18,background:C.elevated,border:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:mobile?16:18,color:C.primary,fontFamily:MONO,flexShrink:0,fontWeight:700}}>×</div>
      <div style={{width:3,height:mobile?24:30,borderRadius:2,background:C.gold,flexShrink:0}}/>
      <div style={{minWidth:0,flex:1}}>
        <div style={{display:'flex',alignItems:'center',gap:mobile?4:8,flexWrap:'wrap'}}>
          <span style={{fontFamily:SANS,fontSize:mobile?13:16,fontWeight:800,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{myName}</span>
          <span style={{fontFamily:SANS,fontSize:mobile?11:13,color:C.dim,flexShrink:0}}>⇄</span>
          <span style={{fontFamily:SANS,fontSize:mobile?13:16,fontWeight:700,color:C.secondary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{theirName}</span>
          <span style={{fontFamily:MONO,fontSize:mobile?9:10,color:C.dim,flexShrink:0}}>·</span>
          <span style={{fontFamily:MONO,fontSize:mobile?9:10,color:C.dim,flexShrink:0}}>{dateStr}</span>
          {overall&&<span style={{fontFamily:MONO,fontSize:mobile?9:10,fontWeight:800,color:os.color,padding:'1px 6px',borderRadius:3,background:os.bg,border:`1px solid ${os.border}`,flexShrink:0}}>{overall}</span>}
        </div>
      </div>
    </div>

    {/* SUMMARY BAR — single line each, truncated with ellipsis */}
    <div style={{paddingTop:mobile?3:6,paddingBottom:mobile?3:6,paddingLeft:mobile?8:20,paddingRight:mobile?8:20,borderBottom:`1px solid ${C.border}`,background:C.card,display:'flex',flexDirection:'row',alignItems:'center',gap:mobile?6:12}}>
      <div style={{flex:1,minWidth:0}}><div style={{fontFamily:MONO,fontSize:mobile?9:10,color:C.red,fontWeight:800,letterSpacing:'0.06em',marginBottom:1}}>{amInTrade?'YOU GAVE':`${myLabel} GAVE`}</div><div style={{fontFamily:SANS,fontSize:mobile?11:12,color:C.secondary,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{myGave}</div></div>
      <div style={{fontFamily:MONO,fontSize:14,color:`${C.gold}40`,flexShrink:0}}>⇄</div>
      <div style={{flex:1,minWidth:0}}><div style={{fontFamily:MONO,fontSize:mobile?9:10,color:C.green,fontWeight:800,letterSpacing:'0.06em',marginBottom:1}}>{amInTrade?'YOU GOT':`${myLabel} GOT`}</div><div style={{fontFamily:SANS,fontSize:mobile?11:12,color:C.primary,fontWeight:600,lineHeight:1.2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{myGot}</div></div>
    </div>

    {/* GRADE SUMMARY — readable blocks */}
    {(()=>{
      // Per-side pending-picks check: even if the trade is old enough for
      // hindsight (548+ days), a side with unresolved picks should show PENDING.
      const myPP=myH?.status==='pending';
      const theirPP=theirH?.status==='pending';
      const myHScore=(!myPP&&hindsightStatus==='confirmed')?(myH.score||0):0;
      const myHVerdict=myPP?'Pending':hindsightStatus==='confirmed'?(myH.verdict||'—'):hindsightStatus==='too_soon'?'Too Soon':'Pending';
      const theirHScore=(!theirPP&&hindsightStatus==='confirmed')?(theirH.score||0):0;
      const theirHVerdict=theirPP?'Pending':hindsightStatus==='confirmed'?(theirH.verdict||'—'):hindsightStatus==='too_soon'?'Too Soon':'Pending';
      return(
    <div style={{display:'flex',flexDirection:'row',paddingTop:mobile?6:10,paddingBottom:mobile?6:10,paddingLeft:mobile?8:24,paddingRight:mobile?8:24,borderBottom:`1px solid ${C.border}`,background:C.card,gap:mobile?6:12}}>
      {[
        {label:'TRADE DAY',color:'#5eead4',items:[{label:myLabel,score:myTD.score||50,verdict:myTD.verdict,pp:false},{label:theirLabel,score:theirTD.score||50,verdict:theirTD.verdict,pp:false}]},
        {label:'HINDSIGHT',color:C.gold,items:[{label:myLabel,score:myHScore,verdict:myHVerdict,pp:myPP},{label:theirLabel,score:theirHScore,verdict:theirHVerdict,pp:theirPP}]},
      ].map((block,bi)=>(
        <div key={bi} style={{flex:1,padding:mobile?'6px 8px':'8px 14px',borderRadius:6,background:`${block.color}08`,border:`1px solid ${block.color}20`}}>
          <div style={{fontFamily:MONO,fontSize:mobile?8:9,fontWeight:800,letterSpacing:'0.12em',color:block.color,marginBottom:mobile?4:6}}>{block.label}</div>
          <div style={{display:'flex',gap:mobile?6:12}}>
            {block.items.map((side,si)=>{
              const isPendingSide=side.pp||(bi===1&&hindsightStatus!=='confirmed');
              const gc=isPendingSide?C.dim:getGradeColor(side.score);
              const vs=getVerdictStyle(side.verdict||'No Data');
              return(
              <div key={si} style={{flex:1,textAlign:'center'}}>
                <div style={{fontFamily:MONO,fontSize:mobile?8:9,fontWeight:700,color:si===0?C.primary:C.secondary,marginBottom:2}}>{side.label}</div>
                {isPendingSide?(
                  <div style={{fontFamily:MONO,fontSize:mobile?11:13,fontWeight:800,color:C.dim}}>{side.verdict}</div>
                ):(<>
                  <div style={{fontFamily:MONO,fontSize:mobile?20:26,fontWeight:900,color:gc,lineHeight:1}}>{getLetterGrade(side.score)}</div>
                  <div style={{fontFamily:MONO,fontSize:mobile?9:10,fontWeight:700,color:C.dim,marginTop:1}}>{side.score}</div>
                  <div style={{fontFamily:MONO,fontSize:mobile?8:9,fontWeight:800,color:vs.color,marginTop:2}}>{side.verdict||'—'}</div>
                </>)}
              </div>);
            })}
          </div>
        </div>
      ))}
    </div>);})()}

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
      {/* ── TRADE DAY section — full bordered box ── */}
      <div style={{margin:mobile?'6px 6px 0':'10px 16px 0',borderRadius:8,border:'1px solid #5eead430',overflow:'hidden'}}>
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
                <GradeCircle score={s.side.score||50} size={mobile?44:64}/>
                <div style={{fontFamily:MONO,fontSize:13,fontWeight:800,color:vs.color,lineHeight:1.3}}>{v}</div>
              </div>
              {/* Assets */}
              {s.assets.map((a:any,i:number)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:3,minWidth:0,marginBottom:1}}>
                  {a.type==='pick'?<span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:C.gold,flexShrink:0}}>PK</span>:
                  a.position&&<span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:posColor(a.position),flexShrink:0}}>{a.position}</span>}
                  <span style={{fontFamily:SANS,fontSize:14,fontWeight:600,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>{cleanPickName(a.name,a.resolved_slot,pickSlotMap)}</span>
                  <span style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:C.secondary,flexShrink:0}}>{fmt(a.value_at_trade?.value)}</span>
                </div>
              ))}
              <div style={{fontFamily:MONO,fontSize:12,color:C.dim,textAlign:'right',marginTop:2}}>= <span style={{color:C.primary,fontWeight:700}}>{fmt(s.total)}</span></div>
            </div>
          );})}
        </div>
      </div>

      {/* ── HINDSIGHT section — full bordered box ── */}
      <div style={{margin:mobile?'6px 6px 0':'10px 16px 0',borderRadius:8,border:`1px solid ${C.gold}30`,overflow:'hidden'}}>
        <SectionDivider label={hindsightStatus==='confirmed'?'HINDSIGHT':'TRENDING'} accent={C.gold}/>
        <div style={{display:'flex',flexDirection:'row'}}>
          {[
            {label:myLabel,header:`${myLabel}'S SIDE`,h:myH,bullets:myBullets,champ:myChamp,assets:myAssets,sideData:mySide},
            {label:theirLabel,header:`${theirLabel}'S SIDE`,h:theirH,bullets:theirBullets,champ:theirChamp,assets:theirAssets,sideData:theirSide},
          ].map((s,idx)=>{
            const isConf=hindsightStatus==='confirmed';
            const isPP=s.h?.status==='pending';
            const showGrade=isConf&&!isPP;
            const sideTrending=s.sideData?.side_trending||null;
            const sideNetDelta=s.sideData?.side_net_delta||null;
            const tColor=sideTrending==='up'?C.green:sideTrending==='down'?C.red:C.gold;
            const tArrow=sideTrending==='up'?'↑':sideTrending==='down'?'↓':'→';
            return(
            <div key={idx} style={idx===0?colL:colR}>
              <div style={{fontFamily:MONO,fontSize:mobile?11:13,fontWeight:900,letterSpacing:'0.06em',color:s.label==='YOU'?C.gold:C.primary,marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.header}</div>
              {/* Circle: grade letter if confirmed, pending icon if unresolved picks, trending arrow otherwise */}
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                {showGrade?(
                  <GradeCircle score={s.h.score||0} size={mobile?44:64}/>
                ):isPP?(
                  /* Pending picks circle — dashed border, clock-style */
                  <div style={{position:'relative',width:mobile?44:64,height:mobile?44:64,flexShrink:0}}>
                    <svg width={mobile?44:64} height={mobile?44:64} viewBox={`0 0 ${mobile?44:64} ${mobile?44:64}`}>
                      <circle cx={(mobile?44:64)/2} cy={(mobile?44:64)/2} r={((mobile?44:64)-8)/2} fill="none" stroke={C.dim} strokeWidth="2" strokeDasharray="6 4"/>
                    </svg>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontFamily:MONO,fontSize:(mobile?44:64)*0.28,fontWeight:900,color:C.dim,lineHeight:1}}>···</span>
                    </div>
                  </div>
                ):(
                  /* Trending circle — same size/style as GradeCircle but shows arrow */
                  <div style={{position:'relative',width:mobile?44:64,height:mobile?44:64,flexShrink:0}}>
                    <svg width={mobile?44:64} height={mobile?44:64} viewBox={`0 0 ${mobile?44:64} ${mobile?44:64}`}>
                      <circle cx={(mobile?44:64)/2} cy={(mobile?44:64)/2} r={((mobile?44:64)-8)/2} fill="none" stroke={C.border} strokeWidth="3"/>
                      <circle cx={(mobile?44:64)/2} cy={(mobile?44:64)/2} r={((mobile?44:64)-8)/2} fill="none" stroke={tColor} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2*Math.PI*((mobile?44:64)-8)/2} 0`}/>
                    </svg>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontFamily:MONO,fontSize:(mobile?44:64)*0.38,fontWeight:900,color:tColor,lineHeight:1}}>{tArrow}</span>
                    </div>
                  </div>
                )}
                <div>
                  {showGrade?(
                    <span style={{fontFamily:MONO,fontSize:13,fontWeight:800,color:getVerdictStyle(s.h.verdict||'—').color,lineHeight:1.3}}>{s.h.verdict||'—'}</span>
                  ):isPP?(
                    <span style={{fontFamily:MONO,fontSize:13,fontWeight:800,color:C.dim,lineHeight:1.3}}>PENDING</span>
                  ):(
                    <span style={{fontFamily:MONO,fontSize:13,fontWeight:800,color:tColor,lineHeight:1.3}}>TRENDING {tArrow}</span>
                  )}
                  {/* Net delta below verdict/trending label — hide for pending picks (no values to delta) */}
                  {!isPP&&sideNetDelta!=null&&<div style={{fontFamily:MONO,fontSize:mobile?10:11,fontWeight:700,color:sideNetDelta>=0?C.green:C.red,marginTop:2}}>
                    {sideNetDelta>=0?'+':''}{fmt(sideNetDelta)} since trade
                  </div>}
                  {isPP&&<div style={{fontFamily:SANS,fontSize:mobile?10:11,color:C.dim,marginTop:2,lineHeight:1.3}}>{s.h?.pending_reason||'Grade pending — picks haven\'t resolved yet'}</div>}
                </div>
              </div>
              {/* Bullets removed — asset value rows below show the same info cleaner */}
              {/* Asset value change rows — mirrors Trade Day asset format.
                  For picks: if resolved to a player, show the player name
                  instead of the raw pick label so the user sees what the
                  pick actually became. */}
              {s.assets.filter((a:any)=>a.value_delta_pct!=null).map((a:any,ai:number)=>{
                const ac=a.trending_direction==='up'?C.green:a.trending_direction==='down'?C.red:C.dim;
                const aArrow=a.trending_direction==='up'?'↑':a.trending_direction==='down'?'↓':'→';
                const isResolvedPick=a.type==='pick'&&a.resolved_player&&a.resolved_player!=='Not yet drafted';
                const resolvedName=isResolvedPick?a.resolved_player.split(' (')[0]:'';
                const resolvedPos=isResolvedPick&&a.resolved_player.includes('(')?a.resolved_player.split('(')[1]?.replace(')',''):'';
                return(
                <div key={ai} style={{display:'flex',flexDirection:'column',gap:0,minWidth:0,marginBottom:2}}>
                  <div style={{display:'flex',alignItems:'center',gap:3}}>
                    {isResolvedPick?(
                      <span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:resolvedPos?posColor(resolvedPos):C.gold,flexShrink:0}}>{resolvedPos||'PK'}</span>
                    ):a.type==='pick'?(
                      <span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:C.gold,flexShrink:0}}>PK</span>
                    ):a.position?(
                      <span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:posColor(a.position),flexShrink:0}}>{a.position}</span>
                    ):null}
                    <span style={{fontFamily:SANS,fontSize:14,fontWeight:600,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0}}>
                      {isResolvedPick?resolvedName:cleanPickName(a.name,a.resolved_slot,pickSlotMap)}
                    </span>
                    <span style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:C.dim,flexShrink:0}}>{fmt(a.trade_day_value)}</span>
                    <span style={{fontFamily:MONO,fontSize:11,color:C.dim,flexShrink:0}}>→</span>
                    <span style={{fontFamily:MONO,fontSize:12,fontWeight:700,color:C.secondary,flexShrink:0}}>{fmt(a.current_value)}</span>
                    <span style={{fontFamily:MONO,fontSize:11,fontWeight:800,color:ac,flexShrink:0}}>{aArrow}{Math.abs(a.value_delta_pct).toFixed(0)}%</span>
                  </div>
                  {isResolvedPick&&<div style={{fontFamily:MONO,fontSize:9,color:C.dim,paddingLeft:28}}>via {cleanPickName(a.name,a.resolved_slot,pickSlotMap)}</div>}
                </div>);
              })}
              {/* Net total — mirrors Trade Day = total */}
              {(()=>{const netCurrent=s.assets.reduce((sum:number,a:any)=>sum+(a.current_value||0),0);return netCurrent>0?(
                <div style={{fontFamily:MONO,fontSize:12,color:C.dim,textAlign:'right',marginTop:2}}>= <span style={{color:C.primary,fontWeight:700}}>{fmt(netCurrent)}</span></div>
              ):null;})()}
            </div>
          );})}
        </div>
      </div>
    </>)}

    {/* ═══════ TAB 2: DETAILS — collapsible pills, always 1fr 1fr ═══════ */}
    {tab==='details'&&(<>
      {/* TRADE DAY — grade + assets in one pill */}
      <CollapsiblePill label="TRADE DAY" defaultOpen={false}>
        <div style={fp}>
          {[{label:`${myLabel} RECEIVES`,td:myTD,assets:myAssets,total:myTotal},{label:`${theirLabel} RECEIVES`,td:theirTD,assets:theirAssets,total:theirTotal}].map((side,idx)=>(
            <div key={idx} style={idx===0?colL:colR}>
              <div style={{fontFamily:MONO,fontSize:12,fontWeight:800,letterSpacing:'0.10em',color:'#5eead4',marginBottom:6}}>{side.label}</div>
              <GradeBox score={side.td.score||50} verdict={side.td.verdict||'No Data'} mobile={mobile}/>
              <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:2}}>
                {side.assets.map((a:any,i:number)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:mobile?'3px 6px':'5px 8px',borderRadius:4,background:C.elevated,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:3,minWidth:0,flex:1}}>
                      {a.type==='pick'&&<StatusTag label="PK" color={C.gold} bg={C.goldDim} border={C.goldBorder}/>}
                      {a.position&&a.type!=='pick'&&<span style={{fontFamily:MONO,fontSize:12,fontWeight:800,color:posColor(a.position),padding:'1px 3px',borderRadius:2,background:`${posColor(a.position)}15`,flexShrink:0}}>{a.position}</span>}
                      <span style={{fontFamily:SANS,fontSize:13,fontWeight:600,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{cleanPickName(a.name,a.resolved_slot,pickSlotMap)}</span>
                    </div>
                    <span style={{fontFamily:MONO,fontSize:11,fontWeight:700,color:C.secondary,flexShrink:0,marginLeft:4}}>{fmt(a.value_at_trade?.value)}</span>
                  </div>
                ))}
                <div style={{fontFamily:MONO,fontSize:11,color:C.dim,textAlign:'right',marginTop:2}}>= <span style={{color:C.primary,fontWeight:700}}>{fmt(side.total)}</span></div>
              </div>
            </div>
          ))}
        </div>
      </CollapsiblePill>

      {/* HINDSIGHT — collapsible */}
      <CollapsiblePill label="HINDSIGHT GRADES" defaultOpen={false}>
        {hasHindsight||hindsightStatus!=='confirmed'?(<>
          <div style={fp}>
            {[{label:`${myLabel}'S SIDE`,h:myH},{label:`${theirLabel}'S SIDE`,h:theirH}].map((side,idx)=>{
              const detailVerdict=hindsightStatus==='confirmed'?(side.h.verdict||'—'):hindsightStatus==='too_soon'?'Too Soon':'Pending';
              const detailPill=hindsightStatus==='pending'?'LIVE GRADE':hindsightStatus==='too_soon'?'TOO SOON':null;
              const detailPillColor=hindsightStatus==='pending'?C.gold:'#d4a017';
              return(
              <div key={idx} style={idx===0?colL:colR}>
                <div style={{fontFamily:MONO,fontSize:12,fontWeight:800,letterSpacing:'0.10em',color:C.gold,marginBottom:6}}>
                  {side.label}
                  {detailPill&&<span style={{fontFamily:MONO,fontSize:8,fontWeight:800,letterSpacing:'0.08em',color:detailPillColor,background:`${detailPillColor}18`,padding:'2px 6px',borderRadius:3,border:`1px solid ${detailPillColor}30`,marginLeft:8}}>{detailPill}</span>}
                </div>
                <GradeBox score={hindsightStatus==='pending'?0:(side.h.score||0)} verdict={detailVerdict} confidence={hindsightStatus==='confirmed'?side.h.confidence:undefined} mobile={mobile}/>
                {hindsightStatus!=='confirmed'&&<div style={{fontFamily:SANS,fontSize:10,color:C.dim,marginTop:4,lineHeight:1.3}}>Grade updates as production accumulates and picks resolve.</div>}
              </div>
            );})}
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
      <CollapsiblePill label={`ASSETS ACQUIRED (${myAssets.length + theirAssets.length})`} defaultOpen={false}>
        <div style={fp}>
          {[{label:`${myLabel} RECEIVED`,assets:myAssets,gf:myGradeFactors,owner:myName},{label:`${theirLabel} RECEIVED`,assets:theirAssets,gf:theirGradeFactors,owner:theirName}].map(({label,assets,gf,owner},idx)=>(
            <div key={idx} style={idx===0?colL:colR}>
              <SubHeader label={label}/>
              <div style={{display:'flex',flexDirection:'column',gap:4}}>
                {assets.length>0?assets.map((a:any,i:number)=><AssetCard key={i} asset={a} allAssets={assets} gradeFactors={gf} allTrades={reportData.all_trades} sideOwner={owner} pickSlotMap={pickSlotMap}/>):<span style={{fontFamily:MONO,fontSize:12,color:C.dim}}>No data</span>}
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
                      <span style={{fontFamily:SANS,fontSize:13,fontWeight:700,color:C.primary,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',minWidth:0}}>{cleanPickName(a.name,a.resolved_slot,pickSlotMap)}</span>
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

  // Fetch picks for both owners to get 2026 slot labels
  const ownerA = (r?.side_a as any)?.owner as string | undefined;
  const ownerB = (r?.side_b as any)?.owner as string | undefined;
  const { data: picksA } = useQuery({
    queryKey: ["picks", leagueId, ownerA],
    queryFn: () => getPicks(leagueId, ownerA!),
    enabled: !!ownerA,
    staleTime: 60 * 60 * 1000,
  });
  const { data: picksB } = useQuery({
    queryKey: ["picks", leagueId, ownerB],
    queryFn: () => getPicks(leagueId, ownerB!),
    enabled: !!ownerB && ownerB !== ownerA,
    staleTime: 60 * 60 * 1000,
  });

  // Build slot lookup: "2026 round 2 (owner name)" → "2.07"
  const pickSlotMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const pd of [picksA, picksB]) {
      if (!pd) continue;
      const picks = ((pd as any).picks || []) as Array<Record<string, unknown>>;
      for (const pk of picks) {
        if (!pk.slot_label || String(pk.season) !== '2026') continue;
        const owner = String(pk.original_owner || '');
        const round = Number(pk.round);
        // Match the format from enriched_trades: "2026 Round 2 (Owner Name)"
        const key = `2026 round ${round} (${owner})`.toLowerCase().trim();
        map[key] = String(pk.slot_label);
      }
    }
    return map;
  }, [picksA, picksB]);

  return(<>
    <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes modalSlideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}@keyframes modalSlideIn{from{opacity:0;transform:scale(0.97) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes radarSweep{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    <div onClick={onClose} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(8px)',display:'flex',alignItems:mobile?'flex-end':'center',justifyContent:'center',animation:'fadeIn 0.2s ease'}}>
      <div onClick={(e)=>e.stopPropagation()} style={{
        width:mobile?'100vw':'92vw',maxWidth:mobile?'100vw':880,
        height:mobile?'calc(100vh - 56px)':undefined,maxHeight:mobile?undefined:'92vh',
        borderRadius:mobile?'12px 12px 0 0':12,overflowY:'auto',background:C.bg,
        border:mobile?'none':`1px solid ${C.border}`,
        animation:mobile?'modalSlideUp 0.25s ease':'modalSlideIn 0.25s ease',
        position:'relative',paddingBottom:mobile?16:0,
      }}>
        {/* Close handle — mobile: drag handle + X at top right */}
        {mobile&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',paddingTop:8,paddingBottom:4}}>
          <div style={{width:36,height:4,borderRadius:2,background:C.borderLt}}/>
        </div>}
        {/* Powered by — desktop only */}
        {!mobile&&<div style={{position:'absolute',top:10,right:16,zIndex:10}}><div style={{display:'flex',alignItems:'center',gap:4,paddingTop:3,paddingBottom:3,paddingLeft:10,paddingRight:10,borderRadius:12,background:'rgba(212,165,50,0.06)',border:'1px solid rgba(212,165,50,0.22)'}}><span style={{fontFamily:SANS,fontSize:9,fontWeight:600,color:'#d4a532',fontStyle:'italic'}}>powered by</span><span style={{fontFamily:SANS,fontSize:10,fontWeight:900,color:'#eeeef2'}}>DynastyGPT<span style={{color:'#d4a532'}}>.com</span></span></div></div>}
        {isLoading?<LoadingSequence/>:hasReport?<FullReport reportData={r} hindsightData={hindsight} onClose={onClose} pickSlotMap={pickSlotMap}/>:(
          <div style={{paddingTop:40,paddingBottom:40,paddingLeft:20,paddingRight:20,textAlign:'center'}}><div style={{fontFamily:MONO,fontSize:12,color:C.red,marginBottom:8}}>Failed to load report</div><div style={{fontFamily:MONO,fontSize:10,color:C.dim}}>Trade ID: {tradeId}</div><div onClick={onClose} style={{marginTop:16,fontFamily:MONO,fontSize:11,color:C.gold,cursor:'pointer',paddingTop:6,paddingBottom:6,paddingLeft:16,paddingRight:16,borderRadius:4,border:`1px solid ${C.goldBorder}`,background:C.goldDim,display:'inline-block'}}>CLOSE</div></div>
        )}
      </div>
    </div>
  </>);
}
