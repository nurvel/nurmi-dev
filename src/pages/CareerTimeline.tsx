import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { careerData, getCareerLayout, type Assignment, type Education } from "../data/career";

const Section = styled.section`--career-marketing:var(--color-accent);--career-it:var(--color-text-secondary);width:100%;padding:48px 0 0;color:var(--color-text-primary);`;
const Head = styled.div`display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:12px;margin-bottom:12px;`;
const Title = styled.h2`font:500 .75rem var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin:0;&:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-accent);margin-right:12px;vertical-align:2px;}`;
const Controls = styled.div`display:flex;flex-wrap:wrap;gap:8px 20px;margin:0 0 8px;font:400 .8125rem var(--font-display);color:var(--color-text-secondary);label{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;}input{accent-color:var(--color-accent);width:18px;height:18px;}`;
const ScrollHint = styled.p`margin:0 0 6px;color:var(--color-text-muted);font:400 .7rem var(--font-display);`;
const Scroll = styled.div`overflow-x:auto;overscroll-behavior-inline:contain;`;
const Canvas = styled.div`--axis-left:4px;min-width:900px;`;
const Axis = styled.div`position:relative;height:22px;margin-left:var(--axis-left);color:var(--color-text-muted);font:500 .68rem var(--font-display);span{position:absolute;top:0;white-space:nowrap;transform:translateX(-50%);}span:first-child{transform:none;}span:last-child{transform:translateX(-100%);}`;
const Legend = styled.div`display:flex;flex-wrap:wrap;gap:16px;margin:0 0 12px;font:400 .7rem var(--font-display);color:var(--color-text-secondary);span{display:inline-flex;align-items:center;gap:6px;}i{display:inline-block;width:20px;height:3px;background:var(--domain-color);}`;
const Lane = styled.div`position:relative;margin-left:var(--axis-left);border-bottom:1px solid var(--color-border);background:repeating-linear-gradient(to right,transparent 0,transparent calc(19.23% - 1px),var(--color-border) calc(19.23% - 1px),var(--color-border) 19.23%);`;
const EmployerLane = styled(Lane)`height:94px;`;
const EmployerMark = styled.button<{ $left:number; $width:number; $tier:number }>`position:absolute;left:${({$left})=>$left}%;width:max(2px,${({$width})=>$width}%);top:0;height:94px;border:0;padding:0;background:transparent;cursor:pointer;&:before{content:"";position:absolute;top:60px;left:0;width:100%;height:6px;background:var(--domain-color);}&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const EmployerName = styled.span<{ $tier:number }>`position:absolute;top:${({$tier})=>$tier*25}px;left:0;z-index:1;padding:1px 3px;background:var(--color-background);color:var(--color-text-primary);font:500 .66rem/1.15 var(--font-display);white-space:nowrap;`;
const RoleLane = styled(Lane)`height:54px;`;
const RoleLabel = styled.span<{ $left:number }>`position:absolute;left:${({$left})=>$left}%;top:4px;white-space:nowrap;color:var(--color-text-primary);font:500 .7rem var(--font-display);`;
const Segment = styled.button<{ $left:number; $width:number }>`position:absolute;left:${({$left})=>$left}%;width:max(3px,${({$width})=>$width}%);top:30px;height:5px;border:0;border-radius:3px;padding:0;background:var(--domain-color);cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const CombinedEmployer = styled(Lane)<{ $left:number; $width:number }>`padding-top:24px;&:before{content:"";position:absolute;top:3px;left:${({$left})=>$left}%;width:${({$width})=>$width}%;height:5px;background:var(--domain-color);}`;
const EmployerHeading = styled.button`position:absolute;z-index:2;left:0;top:0;min-height:24px;border:0;padding:2px 4px;background:var(--color-background);color:var(--color-text-primary);font:600 .72rem var(--font-display);cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);}`;
const CombinedRole = styled.div`height:42px;position:relative;`;
const CombinedRoleLabel = styled(RoleLabel)`top:2px;font-size:.66rem;`;
const CombinedSegment = styled(Segment)`top:24px;`;
const Empty = styled.p`margin:12px 0;color:var(--color-text-secondary);font:400 .85rem var(--font-display);`;
const FocusSummary = styled.div`display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:4px 16px;margin:8px 0 12px;color:var(--color-text-secondary);font:400 .72rem/1.4 var(--font-display);&>p{margin:0;overflow-wrap:anywhere;}`;
const Disclosure = styled.button`min-height:44px;margin:5px 0 0;border:0;border-bottom:1px solid var(--color-border);padding:0 2px;background:transparent;color:var(--color-text-primary);font:600 .88rem var(--font-body);text-align:left;cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const EducationLane = styled.div`min-width:900px;margin:8px 0 0;padding:5px 0 8px;border-bottom:1px solid var(--color-border);`;
const EducationRow = styled.div`position:relative;min-height:64px;display:flex;align-items:stretch;padding-left:var(--axis-left);`;
const EduButton = styled.button`position:relative;z-index:1;width:100%;min-height:56px;border:0;padding:0 0 18px;background:transparent;color:var(--color-text-primary);text-align:left;white-space:normal;overflow-wrap:anywhere;font:400 .7rem/1.3 var(--font-display);cursor:pointer;&::after{content:"";position:absolute;left:var(--event-left);width:var(--event-width);top:40px;height:3px;border-radius:2px;background:var(--color-accent);pointer-events:none;}&[data-kind="point"]::after{width:6px;height:6px;top:39px;transform:rotate(45deg);}&:focus-visible{outline:3px solid var(--color-focus);}`;
const Dialog = styled.dialog`width:min(620px,calc(100vw - 32px));max-height:min(82vh,740px);overflow:auto;border:1px solid var(--color-border);border-radius:12px;padding:24px;background:var(--color-background);color:var(--color-text-primary);box-shadow:0 20px 80px #0005;&::backdrop{background:#0008;}h3{font:600 1.3rem/1.25 var(--font-body);margin:0 0 8px;}p{font:400 .92rem/1.55 var(--font-body);color:var(--color-text-secondary);}button{min-height:44px;padding:8px 12px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text-primary);cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}}`;
const DialogRoles = styled.div`display:flex;flex-wrap:wrap;gap:6px;margin:14px 0;button[aria-pressed="true"]{border-color:var(--color-accent);}`;
const layout = getCareerLayout(careerData);
const YEAR_START = 2001 * 12;
const MONTH_COUNT = 26 * 12;
function offset(month:number):number{return Math.max(0,Math.min(100,((month-YEAR_START)/MONTH_COUNT)*100));}
function percentWidth(start:number,endExclusive:number):number{return Math.max(0,offset(endExclusive)-offset(start));}
function workDetail(item:Assignment,employer:string){return {title:employer,employer,selectedRole:item.id};}
function educationDetail(item:Education){return {title:item.label,institution:item.institution,description:item.type==="certificate"?"Professional certification.":item.type==="training"?"Professional training.":item.type==="studies"?"University studies.":"Education."};}
function roleGroups(assignments:typeof layout.assignments){
  const groups=new Map<string,typeof layout.assignments>();
  for(const assignment of assignments){const group=groups.get(assignment.item.role)??[];group.push(assignment);groups.set(assignment.item.role,group);}
  return [...groups.entries()].map(([role,items])=>({role,items}));
}

export default function CareerTimeline(){
  const [showEmployers,setShowEmployers]=useState(true);
  const [showRoles,setShowRoles]=useState(true);
  const [showFocus,setShowFocus]=useState(false);
  const [showEducation,setShowEducation]=useState(false);
  const [detail,setDetail]=useState<{title:string;employer?:string;institution?:string;description?:string;selectedRole?:string}|null>(null);
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
      <label><input type="checkbox" checked={showFocus} onChange={(event)=>setShowFocus(event.target.checked)}/>Areas of focus</label>
    </Controls>
    <Legend aria-label="Career line colors">{careerData.domains.map((domain)=><span id={`career-legend-${domain.id}`} key={domain.id} style={{"--domain-color":`var(--career-${domain.id})`} as React.CSSProperties}><i aria-hidden="true"/>{domain.label}</span>)}</Legend>
    <ScrollHint>Timeline scrolls horizontally when needed; use Shift+mouse wheel or the scrollbar.</ScrollHint>
    {!showEmployers&&!showRoles&&<Empty>Select employers or roles to show career timeline information.</Empty>}
    <Scroll aria-label="Scrollable career timeline" tabIndex={0}><Canvas>
      <Axis aria-label="Year axis">{Array.from({length:6},(_,i)=>2001+i*5).map((year)=><span key={year} style={{left:`${offset(year*12)}%`}}>{year}</span>)}</Axis>
      {showEmployers&&!showRoles&&<EmployerLane data-row="employers">{layout.employers.map((employer,index)=>{
        const first=assignmentsByEmployer.get(employer.item.id)![0];
        return <EmployerMark key={employer.item.id} type="button" data-employer-id={employer.item.id} data-domain={employer.domainId} data-start-month={employer.start-YEAR_START} data-end-month={employer.endExclusive-YEAR_START} $left={offset(employer.start)} $width={percentWidth(employer.start,employer.endExclusive)} $tier={index%2} style={{"--domain-color":`var(--career-${employer.domainId})`} as React.CSSProperties} aria-label={`${employer.item.label} details`} aria-describedby={`career-legend-${employer.domainId}`} onClick={(event)=>open(workDetail(first.item,employer.item.label),event.currentTarget)}><EmployerName $tier={index%2}>{employer.item.label}</EmployerName></EmployerMark>;
      })}</EmployerLane>}
      {!showEmployers&&showRoles&&roleGroups(layout.assignments).map(({role,items})=><RoleLane key={role} data-role-row={role}><RoleLabel $left={0}>{role}</RoleLabel>{items.map(({item,start,endExclusive})=>{const employer=careerData.employers.find(({id})=>id===item.employerId)!;return <Segment key={item.id} type="button" data-role-rail={item.id} data-employer-id={item.employerId} data-start-month={start-YEAR_START} data-end-month={endExclusive-YEAR_START} $left={offset(start)} $width={percentWidth(start,endExclusive)} style={{"--domain-color":`var(--career-${item.domainId})`} as React.CSSProperties} aria-label={`${role} at ${employer.label}`} aria-describedby={`career-legend-${item.domainId}`} onClick={(event)=>open(workDetail(item,employer.label),event.currentTarget)}/>;})}</RoleLane>)}
      {both&&layout.employers.map((employer)=>{
        const employerAssignments=assignmentsByEmployer.get(employer.item.id)!;
        const first=employerAssignments[0];
        return <CombinedEmployer key={employer.item.id} $left={offset(employer.start)} $width={percentWidth(employer.start,employer.endExclusive)} data-employer-id={employer.item.id} data-domain={employer.domainId} data-start-month={employer.start-YEAR_START} data-end-month={employer.endExclusive-YEAR_START} style={{"--domain-color":`var(--career-${employer.domainId})`} as React.CSSProperties}>
          <EmployerHeading type="button" aria-label={`${employer.item.label} details`} aria-describedby={`career-legend-${employer.domainId}`} onClick={(event)=>open(workDetail(first.item,employer.item.label),event.currentTarget)}>{employer.item.label}</EmployerHeading>
          {roleGroups(employerAssignments).map(({role,items})=><CombinedRole key={role} data-role-row={role}><CombinedRoleLabel $left={0}>{role}</CombinedRoleLabel>{items.map(({item,start,endExclusive})=><CombinedSegment key={item.id} type="button" data-role-rail={item.id} data-start-month={start-YEAR_START} data-end-month={endExclusive-YEAR_START} $left={offset(start)} $width={percentWidth(start,endExclusive)} style={{"--domain-color":`var(--career-${item.domainId})`} as React.CSSProperties} aria-label={`${role} at ${employer.item.label}`} aria-describedby={`career-legend-${item.domainId}`} onClick={(event)=>open(workDetail(item,employer.item.label),event.currentTarget)}/>)}</CombinedRole>)}
        </CombinedEmployer>;
      })}
    </Canvas></Scroll>
    {showFocus&&<FocusSummary className="sc-focus-summary" aria-label="Areas of focus">{layout.employers.map((employer)=>{const focus=[...new Set(assignmentsByEmployer.get(employer.item.id)!.map(({item})=>item.focusDetail))];return <p key={employer.item.id}><strong>{employer.item.label}:</strong> {focus.join(" · ")}</p>;})}</FocusSummary>}
    <Disclosure type="button" aria-expanded={showEducation} aria-controls="career-education" onClick={()=>setShowEducation((value)=>!value)}>Education &amp; certificates {showEducation?"−":"+"}</Disclosure>
    {showEducation&&<Scroll aria-label="Scrollable education timeline" tabIndex={0}><EducationLane id="career-education" aria-label="Education & certificates"><Axis aria-label="Education year axis">{Array.from({length:6},(_,i)=>2001+i*5).map((year)=><span key={year} style={{left:`${offset(year*12)}%`}}>{year}</span>)}</Axis>{layout.education.map(({item,start,endExclusive,kind})=><EducationRow key={item.id}>
      <EduButton type="button" data-kind={kind} data-position={`${start-YEAR_START}:${endExclusive-YEAR_START}`} style={{"--event-left":`${offset(start)}%`,"--event-width":`${kind==="point"?6:percentWidth(start,endExclusive)}%`} as React.CSSProperties} aria-label={`Education detail: ${item.label}`} onClick={(event)=>open({...educationDetail(item)},event.currentTarget)}>{item.label}</EduButton>
    </EducationRow>)}</EducationLane></Scroll>}
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
