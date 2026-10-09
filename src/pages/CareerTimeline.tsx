import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { careerData, getCareerLayout, type Assignment } from "../data/career";

const Section = styled.section`--career-marketing:var(--color-accent);--career-it:#55ccd1;--career-employer:#b3abbf;html[data-theme="light"] &{--career-it:#087e8b;--career-employer:#655970;}width:100%;padding:48px 0 0;color:var(--color-text-primary);`;
const Head = styled.div`display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:12px;margin-bottom:12px;`;
const Title = styled.h2`font:500 .75rem var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin:0;&:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-accent);margin-right:12px;vertical-align:2px;}`;
const Controls = styled.div`display:flex;flex-wrap:wrap;gap:8px 20px;margin:0 0 8px;font:400 .8125rem var(--font-display);color:var(--color-text-secondary);label{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;}input{accent-color:var(--color-accent);width:18px;height:18px;}`;
const ZoomControls = styled.div`display:flex;align-items:center;gap:10px;margin:0 0 6px;color:var(--color-text-secondary);font:400 .75rem var(--font-display);label{display:flex;align-items:center;gap:10px;min-height:44px;}input{width:min(260px,55vw);height:44px;accent-color:var(--color-accent);touch-action:pan-y;}output{min-width:3.5em;font-variant-numeric:tabular-nums;}`;
const Scroll = styled.div`overflow-x:auto;overscroll-behavior-inline:contain;`;
const Canvas = styled.div<{ $width:number }>`--axis-left:0px;width:${({$width})=>$width}px;min-width:${({$width})=>$width}px;padding-right:190px;`;
const Axis = styled.div`position:relative;width:calc(100% + 190px);height:22px;margin-left:var(--axis-left);color:var(--color-text-muted);font:500 .68rem var(--font-display);span{position:absolute;top:0;white-space:nowrap;transform:translateX(-50%);}span:first-child{transform:none;}`;
const Legend = styled.div`display:flex;flex-wrap:wrap;gap:16px;margin:0 0 12px;font:400 .7rem var(--font-display);color:var(--color-text-secondary);span{display:inline-flex;align-items:center;gap:6px;}i{display:inline-block;width:20px;height:3px;background:var(--domain-color);}`;
const Lane = styled.div`position:relative;isolation:isolate;margin-left:var(--axis-left);border-bottom:1px solid var(--color-border);&:before{content:"";position:absolute;z-index:-1;top:0;bottom:0;left:0;width:calc(100% + 190px);pointer-events:none;background:repeating-linear-gradient(to right,transparent 0,transparent calc(var(--grid-period) - 1px),var(--color-border) calc(var(--grid-period) - 1px),var(--color-border) var(--grid-period));}`;
const RoleLane = styled(Lane)`height:24px;&[data-row="employers"]{height:28px;}`;
const RoleLabel = styled.span`position:absolute;width:178px;margin-left:8px;top:12.5px;transform:translateY(-50%);white-space:normal;text-align:left;color:var(--color-text-primary);font:500 .7rem var(--font-display);line-height:12px;`;
const Segment = styled.button<{ $left:number; $width:number }>`position:absolute;left:${({$left})=>$left}%;width:max(3px,${({$width})=>$width}%);top:0;height:24px;border:0;padding:0;background:transparent;cursor:pointer;&:after{content:"";position:absolute;left:0;top:10px;width:100%;height:5px;border-radius:3px;background:var(--domain-color);pointer-events:none;}&[data-employer-rail]:after{top:18px;}&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const EmployerLabel = styled.span`position:absolute;top:0;transform:none;color:var(--career-employer);border-width:1px;border-style:solid;border-color:transparent;border-radius:4px;padding:0 4px;background:transparent;font:700 .64rem var(--font-display);font-weight:700;font-size:.64rem;line-height:12px;white-space:nowrap;`;
const CombinedEmployer = styled(Lane)`padding-top:24px;`;
const EmployerHeading = styled.button`display:flex;align-items:flex-end;position:absolute;width:max-content;z-index:2;left:0;top:0;min-height:24px;color:var(--career-employer);border-width:1px;border-style:solid;border-color:transparent;border-radius:4px;padding:0 4px;background:transparent;font:700 .64rem var(--font-display);font-weight:700;font-size:.64rem;line-height:12px;text-align:left;overflow-wrap:anywhere;cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);}`;
const CombinedRole = styled.div`height:24px;position:relative;&:nth-child(2)>span{top:6.5px;}&:nth-child(2)>button:after{top:4px;}`;
const CombinedRoleLabel = styled(RoleLabel)`font-size:.72rem;`;
const CombinedSegment = styled(Segment)``;
const Empty = styled.p`margin:12px 0;color:var(--color-text-secondary);font:400 .85rem var(--font-display);`;
const Dialog = styled.dialog`width:min(620px,calc(100vw - 32px));max-height:min(82vh,740px);overflow:auto;border:1px solid var(--color-border);border-radius:12px;padding:24px;background:var(--color-background);color:var(--color-text-primary);box-shadow:0 20px 80px #0005;&::backdrop{background:#0008;}h3{font:600 1.3rem/1.25 var(--font-body);margin:0 0 8px;}p{font:400 .92rem/1.55 var(--font-body);color:var(--color-text-secondary);}button{min-height:44px;padding:8px 12px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text-primary);cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}}`;
const DialogRoles = styled.div`display:flex;flex-wrap:wrap;gap:6px;margin:14px 0;button[aria-pressed="true"]{border-color:var(--color-accent);}`;
const layout = getCareerLayout(careerData);
const YEAR_START = layout.employers.find(({item})=>item.id==="freelance")!.start;
const MONTH_COUNT = Math.ceil(Math.max(...layout.assignments.map(({endExclusive})=>endExclusive))/12)*12-YEAR_START;
const LABEL_SPACE = 190;
function offset(month:number):number{return Math.max(0,Math.min(100,((month-YEAR_START)/MONTH_COUNT)*100));}
function percentWidth(start:number,endExclusive:number):number{return Math.max(0,offset(endExclusive)-offset(start));}
function workDetail(item:Assignment,employer:string){return {title:employer,employer,selectedRole:item.id};}
function roleGroups(assignments:typeof layout.assignments){
  const groups=new Map<string,typeof layout.assignments>();
  for(const assignment of assignments){const group=groups.get(assignment.item.role)??[];group.push(assignment);groups.set(assignment.item.role,group);}
  return [...groups.entries()].map(([role,items])=>({role,items}));
}

export default function CareerTimeline(){
  const [showEmployers,setShowEmployers]=useState(true);
  const [showRoles,setShowRoles]=useState(true);
  const [detail,setDetail]=useState<{title:string;employer?:string;institution?:string;description?:string;selectedRole?:string}|null>(null);
  const scrollRef=useRef<HTMLDivElement>(null);
  const [baseCanvasWidth,setBaseCanvasWidth]=useState(900);
  const [zoomPercent,setZoomPercent]=useState(100);
  const zoomRef=useRef(100);
  const pendingAnchorRef=useRef<{month:number;viewportX:number}|null>(null);
  const suppressClickUntilRef=useRef(0);
  const canvasWidth=baseCanvasWidth*zoomPercent/100;
  const railWidth=canvasWidth-LABEL_SPACE;
  const gridPeriod=railWidth*48/276;
  useEffect(()=>{
    const scroll=scrollRef.current;if(!scroll)return;
    const measure=()=>setBaseCanvasWidth(Math.max(900,scroll.clientWidth));
    measure();
    if(typeof ResizeObserver!=="undefined"){
      const observer=new ResizeObserver(measure);observer.observe(scroll);return ()=>observer.disconnect();
    }
    window.addEventListener("resize",measure);return ()=>window.removeEventListener("resize",measure);
  },[]);
  const changeZoom=(value:number,clientX?:number)=>{
    const next=Math.max(75,Math.min(250,Math.round(value)));
    if(next===zoomRef.current)return;
    const scroll=scrollRef.current;
    if(scroll){
      const rect=scroll.getBoundingClientRect();
      const viewportX=Math.max(0,Math.min(rect.width,clientX===undefined?rect.width/2:clientX-rect.left));
      const oldRail=baseCanvasWidth*zoomRef.current/100-LABEL_SPACE;
      const contentX=scroll.scrollLeft+viewportX;
      pendingAnchorRef.current={month:Math.max(0,Math.min(MONTH_COUNT,contentX/oldRail*MONTH_COUNT)),viewportX};
    }
    zoomRef.current=next;
    setZoomPercent(next);
  };
  useLayoutEffect(()=>{
    const anchor=pendingAnchorRef.current;const scroll=scrollRef.current;
    if(!anchor||!scroll)return;
    scroll.scrollLeft=anchor.month*railWidth/MONTH_COUNT-anchor.viewportX;
    pendingAnchorRef.current=null;
  },[zoomPercent,baseCanvasWidth,railWidth]);
  useEffect(()=>{
    const scroll=scrollRef.current;if(!scroll)return;
    let pinch:{distance:number;zoom:number}|null=null;
    const distance=(touches:TouchList)=>Math.abs(touches[0].clientX-touches[1].clientX);
    const tryStart=(touches:TouchList)=>{
      if(touches.length!==2)return;
      const dx=touches[1].clientX-touches[0].clientX;
      const dy=touches[1].clientY-touches[0].clientY;
      if(Math.abs(dx)<24||Math.abs(dx)<=Math.abs(dy))return;
      pinch={distance:Math.abs(dx),zoom:zoomRef.current};
    };
    const onStart=(event:TouchEvent)=>tryStart(event.touches);
    const onMove=(event:TouchEvent)=>{
      if(!pinch){tryStart(event.touches);if(!pinch)return;}
      if(event.touches.length!==2)return;
      event.preventDefault();
      const midpoint=(event.touches[0].clientX+event.touches[1].clientX)/2;
      const currentDistance=distance(event.touches);
      changeZoom(pinch.zoom*currentDistance/pinch.distance,midpoint);
      suppressClickUntilRef.current=Date.now()+500;
    };
    const onEnd=()=>{if(pinch)suppressClickUntilRef.current=Date.now()+500;pinch=null;};
    scroll.addEventListener("touchstart",onStart,{passive:true});
    scroll.addEventListener("touchmove",onMove,{passive:false});
    scroll.addEventListener("touchend",onEnd,{passive:true});
    scroll.addEventListener("touchcancel",onEnd,{passive:true});
    return ()=>{
      scroll.removeEventListener("touchstart",onStart);
      scroll.removeEventListener("touchmove",onMove);
      scroll.removeEventListener("touchend",onEnd);
      scroll.removeEventListener("touchcancel",onEnd);
    };
  },[baseCanvasWidth]);
  const axisYears=Array.from({length:Math.ceil((MONTH_COUNT*(1+LABEL_SPACE/Math.max(1,railWidth)))/48)},(_,i)=>YEAR_START/12+i*4)
    .filter((year)=>((year*12-YEAR_START)/MONTH_COUNT)*railWidth <= railWidth+LABEL_SPACE-24);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const openerRef=useRef<HTMLElement|null>(null);
  const assignmentsByEmployer=useMemo(()=>new Map(layout.employers.map((employer)=>[employer.item.id,layout.assignments.filter(({item})=>item.employerId===employer.item.id)])),[]);
  const open=(value:NonNullable<typeof detail>,element:HTMLElement)=>{openerRef.current=element;setDetail(value);};
  const close=()=>setDetail(null);
  const activeRole=detail?.selectedRole?layout.assignments.find(({item})=>item.id===detail.selectedRole):undefined;
  const roles=detail?.employer?layout.assignments.filter(({item})=>item.employerId===careerData.employers.find(({label})=>label===detail.employer)?.id):[];
  useEffect(()=>{
    const dialog=dialogRef.current;if(!dialog)return;
    if(detail){if(!dialog.open){if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");dialog.querySelector<HTMLElement>("button")?.focus();}}
    else{if(dialog.open&&typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open");openerRef.current?.focus();openerRef.current=null;}
  },[detail]);
  const trapFocus=(event:React.KeyboardEvent<HTMLDialogElement>)=>{
    if(event.key==="Escape"){event.preventDefault();close();return;}
    if(event.key!=="Tab")return;
    const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])"));
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  const both=showEmployers&&showRoles;
  return <Section aria-label="Career"><Head><Title>Career</Title></Head>
    <Controls>
      <label><input type="checkbox" checked={showEmployers} onChange={(event)=>setShowEmployers(event.target.checked)}/>Employers</label>
      <label><input type="checkbox" checked={showRoles} onChange={(event)=>setShowRoles(event.target.checked)}/>Roles</label>
    </Controls>
    <Legend aria-label="Career line colors">{careerData.domains.map((domain)=><span id={`career-legend-${domain.id}`} key={domain.id} style={{"--domain-color":`var(--career-${domain.id})`} as React.CSSProperties}><i aria-hidden="true"/>{domain.label}</span>)}</Legend>
    <ZoomControls><label htmlFor="career-timeline-zoom">Timeline zoom<input id="career-timeline-zoom" type="range" min="75" max="250" step="1" value={zoomPercent} onChange={(event)=>changeZoom(Number(event.target.value))}/></label><output htmlFor="career-timeline-zoom">{zoomPercent}%</output></ZoomControls>
    {!showEmployers&&!showRoles&&<Empty>Select employers or roles to show career timeline information.</Empty>}
    <Scroll ref={scrollRef} aria-label="Scrollable career timeline" tabIndex={0} onClickCapture={(event)=>{if(Date.now()<suppressClickUntilRef.current){event.preventDefault();event.stopPropagation();}}}><Canvas $width={canvasWidth}>
      <Axis aria-label="Year axis" data-month-count={MONTH_COUNT} data-rail-width={railWidth}>{axisYears.map((year)=>{const ratio=(year*12-YEAR_START)/MONTH_COUNT;return <span key={year} style={{left:`calc(${ratio*100}% - ${ratio*LABEL_SPACE}px)`}}>{year}</span>;})}</Axis>
      {showEmployers&&!showRoles&&layout.employers.map((employer)=>{
        const first=assignmentsByEmployer.get(employer.item.id)![0];
        return <RoleLane key={employer.item.id} data-row="employers" data-employer-id={employer.item.id} data-domain={employer.domainId} data-start-month={employer.start-YEAR_START} data-end-month={employer.endExclusive-YEAR_START} style={{"--grid-period":`${gridPeriod}px`} as React.CSSProperties}>
          <EmployerLabel style={{left:`${offset(employer.start)}%`}}>{employer.item.label}</EmployerLabel>
          <Segment type="button" data-employer-rail={employer.item.id} $left={offset(employer.start)} $width={percentWidth(employer.start,employer.endExclusive)} style={{"--domain-color":`var(--career-${employer.domainId})`} as React.CSSProperties} aria-label={`${employer.item.label} details`} aria-describedby={`career-legend-${employer.domainId}`} onClick={(event)=>open(workDetail(first.item,employer.item.label),event.currentTarget)}/>
        </RoleLane>;
      })}
      {!showEmployers&&showRoles&&roleGroups(layout.assignments).map(({role,items})=><RoleLane key={role} data-role-row={role} style={{"--grid-period":`${gridPeriod}px`} as React.CSSProperties}><RoleLabel style={{left:`${offset(Math.max(...items.map(({endExclusive})=>endExclusive)))}%`}}>{role}</RoleLabel>{items.map(({item,start,endExclusive})=>{const employer=careerData.employers.find(({id})=>id===item.employerId)!;return <Segment key={item.id} type="button" data-role-rail={item.id} data-employer-id={item.employerId} data-start-month={start-YEAR_START} data-end-month={endExclusive-YEAR_START} $left={offset(start)} $width={percentWidth(start,endExclusive)} style={{"--domain-color":`var(--career-${item.domainId})`} as React.CSSProperties} aria-label={`${role} at ${employer.label}`} aria-describedby={`career-legend-${item.domainId}`} onClick={(event)=>open(workDetail(item,employer.label),event.currentTarget)}/>;})}</RoleLane>)}
      {both&&layout.employers.map((employer)=>{
        const employerAssignments=assignmentsByEmployer.get(employer.item.id)!;
        const first=employerAssignments[0];
        return <CombinedEmployer key={employer.item.id} data-employer-id={employer.item.id} data-domain={employer.domainId} data-start-month={employer.start-YEAR_START} data-end-month={employer.endExclusive-YEAR_START} style={{"--domain-color":`var(--career-${employer.domainId})`,"--grid-period":`${gridPeriod}px`} as React.CSSProperties}>
          <EmployerHeading type="button" aria-label={`${employer.item.label} details`} aria-describedby={`career-legend-${employer.domainId}`} style={{left:`${offset(employer.start)}%`,transform:"none",maxWidth:`calc(${100-offset(employer.start)}% + ${LABEL_SPACE}px)`}} onClick={(event)=>open(workDetail(first.item,employer.item.label),event.currentTarget)}>{employer.item.label}</EmployerHeading>
          {roleGroups(employerAssignments).map(({role,items})=><CombinedRole key={role} data-role-row={role}><CombinedRoleLabel style={{left:`${offset(Math.max(...items.map(({endExclusive})=>endExclusive)))}%`}}>{role}</CombinedRoleLabel>{items.map(({item,start,endExclusive})=><CombinedSegment key={item.id} type="button" data-role-rail={item.id} data-start-month={start-YEAR_START} data-end-month={endExclusive-YEAR_START} $left={offset(start)} $width={percentWidth(start,endExclusive)} style={{"--domain-color":`var(--career-${item.domainId})`} as React.CSSProperties} aria-label={`${role} at ${employer.item.label}`} aria-describedby={`career-legend-${item.domainId}`} onClick={(event)=>open(workDetail(item,employer.item.label),event.currentTarget)}/>)}</CombinedRole>)}
        </CombinedEmployer>;
      })}
    </Canvas></Scroll>
    <Dialog ref={dialogRef} aria-labelledby="career-dialog-title" aria-describedby="career-dialog-description" onCancel={(event)=>{event.preventDefault();close();}} onKeyDown={trapFocus}>
      {detail&&<><h3 id="career-dialog-title">{detail.title}</h3>{activeRole&&<p><strong>{activeRole.item.role}</strong></p>}{(detail.employer||detail.institution)&&<p>{detail.employer??detail.institution}</p>}
        {detail.employer&&<DialogRoles aria-label="Employer roles">{roles.map(({item})=><button key={item.id} type="button" data-role-id={item.id} aria-label={`${item.role} — ${item.focusDetail}`} aria-pressed={item.id===detail.selectedRole} onClick={()=>setDetail({...detail,selectedRole:item.id})}>{item.role}<small> · {item.focusDetail}</small></button>)}</DialogRoles>}
        <p id="career-dialog-description">{activeRole?.item.description??detail.description}</p>
        {activeRole&&<p><strong>Focus:</strong> {activeRole.item.focusDetail}</p>}
        {activeRole?.alongside.length? <p>Alongside {activeRole.alongside.join(", ")}</p>:null}
        <button type="button" onClick={close}>Close</button></>}
    </Dialog>
  </Section>;
}
