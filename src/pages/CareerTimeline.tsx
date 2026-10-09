import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { careerData, getCareerLayout, type Assignment, type Education } from "../data/career";

const Section = styled.section`--career-marketing:var(--color-accent);--career-it:var(--color-text-secondary);width:100%;padding:48px 0 0;color:var(--color-text-primary);`;
const Head = styled.div`display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:12px;margin-bottom:12px;`;
const Title = styled.h2`font:500 .75rem var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin:0;&:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-accent);margin-right:12px;vertical-align:2px;}`;
const Controls = styled.div`display:flex;flex-wrap:wrap;gap:16px;margin:0 0 8px;font:400 .8125rem var(--font-display);color:var(--color-text-secondary);label{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;}input{accent-color:var(--color-accent);width:18px;height:18px;}`;
const Timeline = styled.div`--axis-left:104px;--axis-right:0px;`;
const Axis = styled.div`position:relative;height:18px;margin-left:var(--axis-left);color:var(--color-text-muted);font:500 .68rem var(--font-display);span{position:absolute;top:0;white-space:nowrap;transform:translateX(-50%);}span:first-child{transform:none;}span:last-child{transform:translateX(-100%);}`;
const Legend = styled.div`display:flex;flex-wrap:wrap;gap:16px;margin:0 0 12px;font:400 .7rem var(--font-display);color:var(--color-text-secondary);span{display:inline-flex;align-items:center;gap:6px;}i{display:inline-block;width:20px;height:3px;background:var(--domain-color);}`;
const Group = styled.div`margin:0 0 8px;`;
const Lanes = styled.div<{ $height:number }>`position:relative;margin-left:var(--axis-left);height:${({$height})=>$height}px;border-bottom:1px solid var(--color-border);background:repeating-linear-gradient(to right,transparent 0,transparent calc(19.23% - 1px),var(--color-border) calc(19.23% - 1px),var(--color-border) 19.23%);`;
const Block = styled.div<{ $left:number; $width:number; $top:number; $height:number }>`position:absolute;left:${({$left})=>$left}%;width:${({$width})=>$width}%;top:${({$top})=>$top}px;height:${({$height})=>$height-6}px;`;
const Name = styled.button`position:absolute;z-index:2;left:0;top:0;width:100%;height:50px;min-height:44px;padding:0 4px 15px;border:0;background-color:transparent;background-image:linear-gradient(var(--domain-color),var(--domain-color));background-repeat:no-repeat;background-position:var(--bar-left,0%) 36px;background-size:var(--bar-width,100%) 5px;color:var(--color-text-primary);font:600 .76rem/1.2 var(--font-body);text-align:left;cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:1px;border-radius:3px;}`;
const EmployerLabel = styled.span<{ $alignEnd:boolean }>`position:absolute;left:${({$alignEnd})=>$alignEnd?"auto":"0"};right:${({$alignEnd})=>$alignEnd?"0":"auto"};top:0;width:max-content;max-width:none;white-space:nowrap;font:500 .68rem/1.2 var(--font-display);text-align:${({$alignEnd})=>$alignEnd?"right":"left"};`;
const RoleLine = styled.div<{ $top:number }>`position:absolute;top:${({$top})=>$top}px;left:0;width:100%;height:32px;`;
const RoleName = styled.span<{ $left:number; $alignEnd:boolean }>`position:absolute;left:${({$left})=>$left}%;top:0;transform:${({$alignEnd})=>$alignEnd?"translateX(-100%)":"none"};white-space:nowrap;color:var(--color-text-primary);font:500 .72rem/1.2 var(--font-display);`;
const RoleRail = styled.span<{ $left:number; $width:number }>`position:absolute;left:${({$left})=>$left}%;width:${({$width})=>$width}%;top:20px;height:3px;border-radius:3px;background:var(--domain-color);`;
const FocusSummary = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:4px 16px;margin:8px 0 12px;color:var(--color-text-secondary);font:400 .72rem/1.4 var(--font-display);&>p{margin:0;overflow-wrap:anywhere;}`;
const Disclosure = styled.button`min-height:44px;margin:5px 0 0;border:0;border-bottom:1px solid var(--color-border);padding:0 2px;background:transparent;color:var(--color-text-primary);font:600 .88rem var(--font-body);text-align:left;cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const EducationLane = styled.div`--axis-left:104px;margin:8px 0 0;padding:5px 0 8px;border-bottom:1px solid var(--color-border);@media(max-width:560px){--axis-left:64px;}`;
const EducationRow = styled.div`position:relative;min-height:64px;display:flex;align-items:stretch;padding-left:var(--axis-left);`;
const EduButton = styled.button`position:relative;z-index:1;width:100%;min-height:56px;border:0;padding:0 0 18px;background:transparent;color:var(--color-text-primary);text-align:left;white-space:normal;overflow-wrap:anywhere;font:400 .7rem/1.3 var(--font-display);cursor:pointer;&::after{content:"";position:absolute;left:var(--event-left);width:var(--event-width);top:40px;height:3px;border-radius:2px;background:var(--color-accent);pointer-events:none;}&[data-kind="point"]::after{width:6px;height:6px;top:39px;transform:rotate(45deg);}&:focus-visible{outline:3px solid var(--color-focus);}`;
const Dialog = styled.dialog`width:min(620px,calc(100vw - 32px));max-height:min(82vh,740px);overflow:auto;border:1px solid var(--color-border);border-radius:12px;padding:24px;background:var(--color-background);color:var(--color-text-primary);box-shadow:0 20px 80px #0005;&::backdrop{background:#0008;}h3{font:600 1.3rem/1.25 var(--font-body);margin:0 0 8px;}p{font:400 .92rem/1.55 var(--font-body);color:var(--color-text-secondary);}button{min-height:44px;padding:8px 12px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text-primary);cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}}`;
const DialogRoles = styled.div`display:flex;flex-wrap:wrap;gap:6px;margin:14px 0;button[aria-pressed="true"]{border-color:var(--color-accent);}`;
const MobileTimeline = styled.div`@media(max-width:560px){&>div{--axis-left:64px;}&>div>div>div{height:auto!important;display:flex;flex-direction:column;background:none;}.sc-block{position:relative;left:auto;top:auto;width:100%;height:var(--mobile-row-height)!important;border-top:1px solid var(--color-border);}.sc-name{position:absolute;left:0;top:0;width:100%;background-image:linear-gradient(90deg,transparent var(--mobile-bar-left),var(--domain-color) var(--mobile-bar-left),var(--domain-color) calc(var(--mobile-bar-left) + var(--mobile-bar-width)),transparent calc(var(--mobile-bar-left) + var(--mobile-bar-width)));background-position:0 32px;background-size:100% 5px;}.sc-employer-label{white-space:normal;max-width:100%;}.sc-role-line{left:0;width:100%;}.sc-role-name{left:0;transform:none;width:100%;white-space:normal;overflow-wrap:anywhere;}.sc-role-rail{left:var(--mobile-role-left);width:var(--mobile-role-width);top:30px;}.sc-focus-summary{margin-left:0;}}`;
const layout = getCareerLayout(careerData);
const YEAR_START = 2001 * 12;
const MONTH_COUNT = 26 * 12;
function offset(month:number):number{return Math.max(0,Math.min(100,((month-YEAR_START)/MONTH_COUNT)*100));}
function percentWidth(start:number,endExclusive:number):number{return Math.max(0,offset(endExclusive)-offset(start));}
function workDetail(item:Assignment,employer:string){return {title:employer,employer,selectedRole:item.id};}
function educationDetail(item:Education){return {title:item.label,institution:item.institution,description:item.type==="certificate"?"Professional certification.":item.type==="training"?"Professional training.":item.type==="studies"?"University studies.":"Education."};}
const ROLE_STEP=44;

export default function CareerTimeline(){
  const [showFocus,setShowFocus]=useState(false);
  const [showEducation,setShowEducation]=useState(false);
  const [timelineWidth,setTimelineWidth]=useState(1000);
  const [detail,setDetail]=useState<{title:string;employer?:string;institution?:string;description?:string;selectedRole?:string}|null>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const timelineRef=useRef<HTMLDivElement>(null);
  const openerRef=useRef<HTMLElement|null>(null);
  useEffect(()=>{
    const timeline=timelineRef.current;
    if(!timeline||typeof ResizeObserver==="undefined")return;
    const observer=new ResizeObserver(([entry])=>setTimelineWidth(entry.contentRect.width));
    observer.observe(timeline);
    return ()=>observer.disconnect();
  },[]);
  const packedLayout=useMemo(()=>{
    const railWidth=Math.max(1,timelineWidth-104);
    const labelSpace=(text:string)=>((text.length*6+16)/railWidth)*MONTH_COUNT;
    const laneIntervals:{start:number;end:number}[][]=[];
    const laneHeights:number[]=[];
    const packed=layout.employers.map((employer)=>{
      const roles=layout.assignments.filter(({item})=>item.employerId===employer.item.id);
      const alignEnd=offset(employer.start)>70;
      const labelIntervals=[{start:employer.start,endExclusive:employer.endExclusive,label:employer.item.label},...roles.map(({item,start,endExclusive})=>({start,endExclusive,label:item.role}))];
      const occupiedStart=Math.min(...labelIntervals.map(({start,endExclusive,label})=>alignEnd?endExclusive-labelSpace(label):start));
      const occupiedEnd=Math.max(...labelIntervals.map(({start,endExclusive,label})=>alignEnd?endExclusive:Math.max(endExclusive,start+labelSpace(label))));
      let lane=laneIntervals.findIndex((intervals)=>intervals.every((interval)=>interval.end<=occupiedStart||interval.start>=occupiedEnd));
      if(lane<0)lane=laneIntervals.length;
      laneIntervals[lane]??=[];
      laneIntervals[lane].push({start:occupiedStart,end:occupiedEnd});
      const height=52+roles.length*ROLE_STEP;
      laneHeights[lane]=Math.max(laneHeights[lane]??0,height);
      return {...employer,roles,lane,alignEnd,height};
    });
    const laneTops=laneHeights.map((_,index)=>laneHeights.slice(0,index).reduce((sum,height)=>sum+height,0));
    return {employers:packed.map((employer)=>({...employer,top:laneTops[employer.lane]})),height:laneHeights.reduce((sum,height)=>sum+height,0)};
  },[timelineWidth]);
  const activeRole=detail?.selectedRole?layout.assignments.find(({item})=>item.id===detail.selectedRole):undefined;
  useEffect(()=>{
    const dialog=dialogRef.current;if(!dialog)return;
    if(detail){if(!dialog.open){if(typeof dialog.showModal==="function")dialog.showModal();else dialog.setAttribute("open","");dialog.querySelector<HTMLElement>("button")?.focus();}}
    else{if(dialog.open&&typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open");openerRef.current?.focus();openerRef.current=null;}
  },[detail]);
  const open=(value:NonNullable<typeof detail>,element:HTMLElement)=>{openerRef.current=element;setDetail(value);};
  const close=()=>setDetail(null);
  const trapFocus=(event:React.KeyboardEvent<HTMLDialogElement>)=>{
    if(event.key==="Escape"){event.preventDefault();close();return;}
    if(event.key!=="Tab")return;
    const controls=Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])"));
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  };
  const roles=detail?.employer?layout.assignments.filter(({item})=>item.employerId===careerData.employers.find(({label})=>label===detail.employer)?.id):[];
  return <Section aria-label="Career"><Head><Title>Career</Title></Head>
    <Controls><label><input type="checkbox" checked={showFocus} onChange={(event)=>setShowFocus(event.target.checked)}/>Areas of focus</label></Controls>
    <Legend aria-label="Career line colors">{careerData.domains.map((domain)=><span id={`career-legend-${domain.id}`} key={domain.id} style={{"--domain-color":`var(--career-${domain.id})`} as React.CSSProperties}><i aria-hidden="true"/>{domain.label}</span>)}</Legend>
    <MobileTimeline><Timeline ref={timelineRef}><Axis aria-label="Year axis">{Array.from({length:6},(_,i)=>2001+i*5).map((year)=><span key={year} style={{left:`${offset(year*12)}%`}}>{year}</span>)}</Axis>
      <Group><Lanes className="sc-lanes" $height={packedLayout.height}>{packedLayout.employers.map((employer)=>{
        const blockWidth=percentWidth(employer.start,employer.endExclusive);
        const firstOpener=(event:React.MouseEvent<HTMLButtonElement>)=>open(workDetail(employer.roles[0].item,employer.item.label),event.currentTarget);
        return <Block className="sc-block" key={employer.item.id} data-employer-id={employer.item.id} data-domain={employer.domainId} data-start-month={employer.start-YEAR_START} data-end-month={employer.endExclusive-YEAR_START} $left={offset(employer.start)} $width={blockWidth} $top={employer.top} $height={employer.height} style={{"--domain-color":`var(--career-${employer.domainId})`,"--mobile-row-height":`${employer.height}px`} as React.CSSProperties}>
          <Name className="sc-name" type="button" aria-label={`${employer.item.label} details`} aria-describedby={`career-legend-${employer.domainId}`} style={{"--bar-left":"0%","--bar-width":"100%","--mobile-bar-left":`${offset(employer.start)}%`,"--mobile-bar-width":`${blockWidth}%`} as React.CSSProperties} onClick={firstOpener}><EmployerLabel className="sc-employer-label" $alignEnd={employer.alignEnd}>{employer.item.label}</EmployerLabel></Name>
          {employer.roles.map(({item,start,endExclusive},index)=>{
            const relativeLeft=(offset(start)-offset(employer.start))/blockWidth*100;
            const relativeWidth=percentWidth(start,endExclusive)/blockWidth*100;
            const labelLeft=employer.alignEnd?relativeLeft+relativeWidth:relativeLeft;
            return <RoleLine className="sc-role-line" key={item.id} $top={48+index*ROLE_STEP}>
              <RoleName className="sc-role-name" $left={labelLeft} $alignEnd={employer.alignEnd}>{item.role}</RoleName>
              <RoleRail className="sc-role-rail" data-role-rail={item.id} data-start-month={start-YEAR_START} data-end-month={endExclusive-YEAR_START} aria-hidden="true" $left={relativeLeft} $width={relativeWidth} style={{"--mobile-role-left":`${offset(start)}%`,"--mobile-role-width":`${percentWidth(start,endExclusive)}%`} as React.CSSProperties}/>
            </RoleLine>;
          })}
        </Block>;
      })}</Lanes></Group>
    </Timeline></MobileTimeline>
    {showFocus&&<FocusSummary aria-label="Areas of focus" className="sc-focus-summary">{packedLayout.employers.map((employer)=>{
      const focus=[...new Set(employer.roles.map(({item})=>item.focusDetail))];
      return <p key={employer.item.id}><strong>{employer.item.label}:</strong> {focus.join(" · ")}</p>;
    })}</FocusSummary>}
    <Disclosure type="button" aria-expanded={showEducation} aria-controls="career-education" onClick={()=>setShowEducation((value)=>!value)}>Education &amp; certificates {showEducation?"−":"+"}</Disclosure>
    {showEducation&&<EducationLane id="career-education" aria-label="Education & certificates"><Axis aria-label="Education year axis">{Array.from({length:6},(_,i)=>2001+i*5).map((year)=><span key={year} style={{left:`${offset(year*12)}%`}}>{year}</span>)}</Axis>{layout.education.map(({item,start,endExclusive,kind})=><EducationRow key={item.id}>
      <EduButton type="button" data-kind={kind} data-position={`${start-YEAR_START}:${endExclusive-YEAR_START}`} style={{"--event-left":`${offset(start)}%`,"--event-width":`${kind==="point"?6:percentWidth(start,endExclusive)}%`} as React.CSSProperties} aria-label={`Education detail: ${item.label}`} onClick={(event)=>open({...educationDetail(item)},event.currentTarget)}>{item.label}</EduButton>
    </EducationRow>)}</EducationLane>}
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
