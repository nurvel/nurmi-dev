import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { careerData, getCareerLayout, type Assignment, type Education } from "../data/career";

const Section = styled.section`width:100%;padding:48px 0 0;color:var(--color-text-primary);`;
const Head = styled.div`display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:12px;margin-bottom:12px;`;
const Title = styled.h2`font:500 .75rem var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin:0;&:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-accent);margin-right:12px;vertical-align:2px;}`;
const Controls = styled.div`display:flex;flex-wrap:wrap;gap:16px;margin:0 0 8px;font:400 .8125rem var(--font-display);color:var(--color-text-secondary);label{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;}input{accent-color:var(--color-accent);width:18px;height:18px;}`;
const Timeline = styled.div`--axis-left:104px;--axis-right:0px;`;
const Axis = styled.div`position:relative;height:18px;margin-left:var(--axis-left);color:var(--color-text-muted);font:500 .68rem var(--font-display);span{position:absolute;top:0;white-space:nowrap;transform:translateX(-50%);}span:first-child{transform:none;}span:last-child{transform:translateX(-100%);}`;
const Group = styled.section`margin:0 0 8px;&>h3{margin:0 0 4px;font:600 .86rem var(--font-body);color:var(--color-text-primary);}`;
const Lanes = styled.div<{ $height:number }>`position:relative;margin-left:var(--axis-left);height:${({$height})=>$height}px;border-bottom:1px solid var(--color-border);background:repeating-linear-gradient(to right,transparent 0,transparent calc(19.23% - 1px),var(--color-border) calc(19.23% - 1px),var(--color-border) 19.23%);`;
const Block = styled.div<{ $left:number; $width:number; $lane:number; $step:number }>`position:absolute;left:${({$left})=>$left}%;width:${({$width})=>$width}%;top:${({$lane,$step})=>$lane*$step}px;height:${({$step})=>$step-6}px;`;
const Name = styled.button`position:absolute;z-index:2;left:0;top:0;width:100%;height:50px;min-height:44px;padding:0 4px 15px;border:0;background-color:transparent;background-image:linear-gradient(var(--color-accent),var(--color-accent));background-repeat:no-repeat;background-position:var(--bar-left,0%) 36px;background-size:var(--bar-width,100%) 5px;color:var(--color-text-primary);font:600 .76rem/1.2 var(--font-body);text-align:left;cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:1px;border-radius:3px;}`;
const EmployerLabel = styled.span<{ $alignEnd:boolean }>`position:absolute;left:${({$alignEnd})=>$alignEnd?"auto":"0"};right:${({$alignEnd})=>$alignEnd?"0":"auto"};top:0;width:max-content;max-width:none;white-space:nowrap;line-height:1.2;text-align:${({$alignEnd})=>$alignEnd?"right":"left"};`;
const ModeLine = styled.div<{ $top:number }>`position:absolute;top:${({$top})=>$top}px;left:0;width:100%;height:18px;`;
const ModeName = styled.span<{ $left:number }>`position:absolute;left:${({$left})=>$left}%;top:0;transform:translateX(-100%);padding-right:5px;white-space:nowrap;color:var(--color-text-secondary);font:400 .62rem var(--font-display);`;
const ModeRail = styled.span<{ $left:number; $width:number; $mode:string }>`position:absolute;left:${({$left})=>$left}%;width:${({$width})=>$width}%;top:7px;height:3px;border-radius:3px;background:${({$mode})=>$mode==="inhouse"?"var(--color-text-secondary)":"var(--color-accent)"};opacity:.75;`;
const FocusToggle = styled.span<{ $top:number }>`position:absolute;left:0;top:${({$top})=>$top}px;color:var(--color-text-secondary);font:400 .62rem var(--font-display);white-space:nowrap;`;
const Disclosure = styled.button`min-height:44px;margin:5px 0 0;border:0;border-bottom:1px solid var(--color-border);padding:0 2px;background:transparent;color:var(--color-text-primary);font:600 .88rem var(--font-body);text-align:left;cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const EducationLane = styled.div`margin:8px 0 0;padding:5px 0 8px;border-bottom:1px solid var(--color-border);`;
const EducationRow = styled.div`position:relative;min-height:34px;display:flex;align-items:center;padding-left:var(--axis-left);`;
const EduButton = styled.button`position:relative;z-index:1;width:100%;height:32px;border:0;background:transparent;color:var(--color-text-primary);text-align:left;font:400 .7rem var(--font-display);cursor:pointer;&::after{content:"";position:absolute;left:var(--event-left);width:var(--event-width);top:15px;height:3px;border-radius:2px;background:var(--color-accent);pointer-events:none;}&[data-kind="point"]::after{width:6px;height:6px;top:13px;transform:rotate(45deg);}&:focus-visible{outline:3px solid var(--color-focus);}`;
const Dialog = styled.dialog`width:min(620px,calc(100vw - 32px));max-height:min(82vh,740px);overflow:auto;border:1px solid var(--color-border);border-radius:12px;padding:24px;background:var(--color-background);color:var(--color-text-primary);box-shadow:0 20px 80px #0005;&::backdrop{background:#0008;}h3{font:600 1.3rem/1.25 var(--font-body);margin:0 0 8px;}p{font:400 .92rem/1.55 var(--font-body);color:var(--color-text-secondary);}button{min-height:44px;padding:8px 12px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text-primary);cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}}`;
const DialogRoles = styled.div`display:flex;flex-wrap:wrap;gap:6px;margin:14px 0;button[aria-pressed="true"]{border-color:var(--color-accent);}`;
const MobileTimeline = styled.div`@media(max-width:560px){&>div{--axis-left:0px;}&>div>section>div{margin-left:0!important;height:auto!important;display:flex;flex-direction:column;background:none;}.sc-block{position:relative;left:auto;top:auto;width:100%;height:var(--mobile-row-height)!important;border-top:1px solid var(--color-border);}.sc-name{position:absolute;left:0;top:0;width:100%;background-image:linear-gradient(90deg,transparent var(--mobile-bar-left),var(--color-accent) var(--mobile-bar-left),var(--color-accent) calc(var(--mobile-bar-left) + var(--mobile-bar-width)),transparent calc(var(--mobile-bar-left) + var(--mobile-bar-width)));background-position:0 32px;background-size:100% 5px;}.sc-employer-label{white-space:normal;max-width:100%;}.sc-mode-line{width:100%;}.sc-mode-name{left:max(14%,var(--mobile-mode-left));}.sc-mode-rail{left:var(--mobile-mode-left);width:var(--mobile-mode-width);}}`;
const layout = getCareerLayout(careerData);
const YEAR_START = 2001 * 12;
const MONTH_COUNT = 26 * 12;
function offset(month:number):number{return Math.max(0,Math.min(100,((month-YEAR_START)/MONTH_COUNT)*100));}
function percentWidth(start:number,endExclusive:number):number{return Math.max(0,offset(endExclusive)-offset(start));}
function workDetail(item:Assignment,employer:string){return {title:employer,employer,selectedRole:item.id};}
function educationDetail(item:Education){return {title:item.label,institution:item.institution,description:item.type==="certificate"?"Professional certification.":item.type==="training"?"Professional training.":item.type==="studies"?"University studies.":"Education."};}
const modeLabels:Record<string,string>={consultant:"Consulting",inhouse:"In-house",freelance:"Freelance"};

export default function CareerTimeline(){
  const [showFocus,setShowFocus]=useState(false);
  const [showEducation,setShowEducation]=useState(false);
  const [detail,setDetail]=useState<{title:string;employer?:string;institution?:string;description?:string;selectedRole?:string}|null>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const openerRef=useRef<HTMLElement|null>(null);
  const employerGroups=useMemo(()=>careerData.domains.map((domain)=>{
    const employers=layout.employers.filter((employer)=>employer.domainId===domain.id);
    const laneIntervals:{start:number;end:number}[][]=[];
    const packed=employers.map((employer)=>{
      const labelSpace=Math.ceil(employer.item.label.length*1.8);
      const alignEnd=offset(employer.start)>82;
      const occupiedStart=alignEnd?Math.max(YEAR_START,employer.endExclusive-labelSpace):employer.start;
      const occupiedEnd=alignEnd?employer.endExclusive:Math.max(employer.endExclusive,employer.start+labelSpace);
      let lane=laneIntervals.findIndex((intervals)=>intervals.every((interval)=>interval.end<=occupiedStart||interval.start>=occupiedEnd));
      if(lane<0)lane=laneIntervals.length;
      laneIntervals[lane]??=[];
      laneIntervals[lane].push({start:occupiedStart,end:occupiedEnd});
      return {...employer,lane,alignEnd};
    });
    return {domain,employers:packed,laneCount:laneIntervals.length};
  }),[]);
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
    <MobileTimeline><Timeline><Axis aria-label="Year axis">{Array.from({length:6},(_,i)=>2001+i*5).map((year)=><span key={year} style={{left:`${offset(year*12)}%`}}>{year}</span>)}</Axis>
      {employerGroups.map(({domain,employers,laneCount})=><Group key={domain.id} aria-labelledby={`career-domain-${domain.id}`}><h3 id={`career-domain-${domain.id}`}>{domain.label}</h3>
        <Lanes $height={Math.max(82,laneCount*(showFocus?112:88))}>{employers.map((employer)=>{
          const blockWidth=percentWidth(employer.start,employer.endExclusive);
          const roles=layout.assignments.filter(({item})=>item.employerId===employer.item.id);
          const focus=[...new Set(roles.map(({item})=>item.focusDetail))];
          const firstOpener=(event:React.MouseEvent<HTMLButtonElement>)=>open({title:employer.item.label,employer:employer.item.label,selectedRole:roles[0]?.item.id},event.currentTarget);
          const laneHeight=showFocus?112:88;
          return <Block className="sc-block" key={employer.item.id} data-employer-id={employer.item.id} data-start-month={employer.start-YEAR_START} data-end-month={employer.endExclusive-YEAR_START} $left={offset(employer.start)} $width={blockWidth} $lane={employer.lane} $step={laneHeight} style={{"--mobile-row-height":`${48+employer.modes.length*16+(showFocus?30:8)}px`} as React.CSSProperties}>
            <Name className="sc-name" type="button" aria-label={`${employer.item.label} details`} style={{"--bar-left":"0%","--bar-width":"100%","--mobile-bar-left":`${offset(employer.start)}%`,"--mobile-bar-width":`${blockWidth}%`} as React.CSSProperties} onClick={firstOpener}><EmployerLabel className="sc-employer-label" $alignEnd={employer.alignEnd}>{employer.item.label}</EmployerLabel></Name>
            {employer.modes.map(({mode,intervals},index)=>intervals.map((interval,intervalIndex)=>{
              const relativeLeft=(offset(interval.start)-offset(employer.start))/blockWidth*100;
              const relativeWidth=percentWidth(interval.start,interval.endExclusive)/blockWidth*100;
              return <ModeLine className="sc-mode-line" key={`${mode}-${intervalIndex}`} $top={48+index*16}>
                <ModeName className="sc-mode-name" $left={relativeLeft} style={{"--mobile-mode-left":`${offset(interval.start)}%`} as React.CSSProperties}>{modeLabels[mode]}</ModeName>
                <ModeRail className="sc-mode-rail" data-mode={mode} data-start-month={interval.start-YEAR_START} data-end-month={interval.endExclusive-YEAR_START} aria-hidden="true" $left={relativeLeft} $width={relativeWidth} $mode={mode} style={{"--mobile-mode-left":`${offset(interval.start)}%`,"--mobile-mode-width":`${percentWidth(interval.start,interval.endExclusive)}%`} as React.CSSProperties}/>
              </ModeLine>;
            }))}
            {showFocus&&<FocusToggle $top={48+employer.modes.length*16+2} aria-label={`${employer.item.label} areas of focus`}>{focus.join(" · ")}</FocusToggle>}
          </Block>;
        })}</Lanes></Group>)}
    </Timeline></MobileTimeline>
    <Disclosure type="button" aria-expanded={showEducation} aria-controls="career-education" onClick={()=>setShowEducation((value)=>!value)}>Education &amp; certificates {showEducation?"−":"+"}</Disclosure>
    {showEducation&&<EducationLane id="career-education" aria-label="Education & certificates">{layout.education.map(({item,start,endExclusive,kind})=><EducationRow key={item.id}>
      <EduButton type="button" data-kind={kind} data-position={`${start-YEAR_START}:${endExclusive-YEAR_START}`} style={{"--event-left":`${offset(start)}%`,"--event-width":`${kind==="point"?6:percentWidth(start,endExclusive)}%`} as React.CSSProperties} aria-label={`Education detail: ${item.label}`} onClick={(event)=>open({...educationDetail(item)},event.currentTarget)}>{item.label}</EduButton>
    </EducationRow>)}</EducationLane>}
    <Dialog ref={dialogRef} aria-labelledby="career-dialog-title" aria-describedby="career-dialog-description" onCancel={(event)=>{event.preventDefault();close();}} onKeyDown={trapFocus}>
      {detail&&<><h3 id="career-dialog-title">{detail.title}</h3>{activeRole&&<p><strong>{activeRole.item.role}</strong></p>}{(detail.employer||detail.institution)&&<p>{detail.employer??detail.institution}</p>}
        {detail.employer&&<DialogRoles aria-label="Employer roles">{roles.map(({item})=><button key={item.id} type="button" data-role-id={item.id} aria-label={`${item.role} — ${item.focusDetail}`} aria-pressed={item.id===detail.selectedRole} onClick={()=>setDetail({...detail,selectedRole:item.id})}>{item.role}<small> · {item.focusDetail}</small></button>)}</DialogRoles>}
        {activeRole?.item.mode&&<p>{modeLabels[activeRole.item.mode]??activeRole.item.mode}</p>}
        <p id="career-dialog-description">{activeRole?.item.description??detail.description}</p>
        {activeRole&&<p><strong>Focus:</strong> {activeRole.item.focusDetail}</p>}
        {activeRole?.alongside.length? <p>Alongside {activeRole.alongside.join(", ")}</p>:null}
        <button type="button" onClick={close}>Close</button></>}
    </Dialog>
  </Section>;
}
