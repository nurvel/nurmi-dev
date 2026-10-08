import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { careerData, getCareerLayout, type Assignment, type Education } from "../data/career";

const Section = styled.section`width:100%;padding:64px 0 0;color:var(--color-text-primary);`;
const Head = styled.div`display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--color-border);padding-bottom:12px;margin-bottom:20px;`;
const Title = styled.h2`font:500 .75rem var(--font-display);letter-spacing:.12em;text-transform:uppercase;color:var(--color-text-muted);margin:0;&:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-accent);margin-right:12px;vertical-align:2px;}`;
const Controls = styled.div`display:flex;flex-wrap:wrap;gap:16px;margin:0 0 20px;font:400 .8125rem var(--font-display);color:var(--color-text-secondary);label{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer;}input{accent-color:var(--color-accent);width:18px;height:18px;}`;
const Timeline = styled.div`--label-width:150px;--timeline-gap:20px;`;
const Axis = styled.div`position:relative;height:1em;margin:0 0 8px calc(var(--label-width) + var(--timeline-gap));color:var(--color-text-muted);font:500 .7rem var(--font-display);span{position:absolute;top:0;white-space:nowrap;transform:translateX(-50%);}span:first-child{transform:none;}span:last-child{transform:translateX(-100%);}@media(max-width:560px){margin-left:0;}`;
const Employer = styled.div`display:grid;grid-template-columns:var(--label-width) minmax(0,1fr);gap:var(--timeline-gap);align-items:start;padding:10px 0;border-top:1px solid var(--color-border);@media(max-width:560px){grid-template-columns:1fr;gap:6px;}`;
const EmployerName = styled.h3`font:600 .9rem var(--font-body);margin:0;color:var(--color-text-primary);`;
const RoleList = styled.div`min-width:0;`;
const RoleRow = styled.div`position:relative;min-width:0;padding:0 0 10px;&+&{padding-top:4px;} &:last-child{padding-bottom:5px;}`;
const RoleButton = styled.button<{ $focus:boolean }>`position:relative;z-index:1;text-align:left;display:block;max-width:100%;min-height:38px;padding:7px 10px;border:1px solid var(--color-border);border-left:3px solid ${({$focus})=>$focus?"var(--color-accent)":"var(--color-border)"};border-radius:5px;background:var(--color-surface);color:var(--color-text-primary);font:500 .79rem/1.35 var(--font-body);cursor:pointer;&:hover{border-color:var(--color-accent);}&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const Focus = styled.span`display:block;color:var(--color-text-secondary);font:400 .72rem/1.3 var(--font-display);margin-top:2px;`;
const Duration = styled.div`height:3px;margin:4px 0 0;position:relative;border-radius:3px;background:var(--color-border);span{position:absolute;top:0;display:block;height:100%;min-width:3px;border-radius:3px;background:var(--color-accent);}`;
const Domain = styled.span`display:inline-block;margin-left:8px;padding:2px 6px;border:1px solid var(--color-border);border-radius:999px;color:var(--color-text-secondary);font:400 .65rem var(--font-display);vertical-align:1px;`;
const Alongside = styled.span`display:block;margin-top:3px;color:var(--color-text-secondary);font:400 .7rem/1.3 var(--font-display);`;
const EducationLane = styled.div`margin-top:20px;padding:16px 0;border-top:1px solid var(--color-border);border-bottom:1px solid var(--color-border);background:var(--color-surface);h3{margin:0 0 12px;font:600 .9rem var(--font-body);}`;
const EducationRow = styled.div`display:grid;grid-template-columns:var(--label-width) minmax(0,1fr);gap:var(--timeline-gap);align-items:start;padding:8px 0;border-top:1px solid var(--color-border);@media(max-width:560px){grid-template-columns:1fr;gap:4px;}`;
const EduButton = styled.button`justify-self:start;max-width:100%;border:1px solid var(--color-border);border-radius:5px;padding:7px 10px;background:transparent;color:var(--color-text-secondary);font:400 .75rem/1.35 var(--font-display);text-align:left;cursor:pointer;&[data-kind="span"]{border-left:3px solid var(--color-accent);}&:hover{border-color:var(--color-accent);}&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}`;
const Dialog = styled.dialog`width:min(600px,calc(100vw - 32px));max-height:min(80vh,720px);overflow:auto;border:1px solid var(--color-border);border-radius:12px;padding:28px;background:var(--color-background);color:var(--color-text-primary);box-shadow:0 20px 80px #0005;&::backdrop{background:#0008;}h3{font:600 1.3rem/1.25 var(--font-body);margin:0 0 8px;}p{font:400 .95rem/1.6 var(--font-body);color:var(--color-text-secondary);}button{min-height:44px;padding:8px 14px;border:1px solid var(--color-border);border-radius:6px;background:var(--color-surface);color:var(--color-text-primary);cursor:pointer;&:focus-visible{outline:3px solid var(--color-focus);outline-offset:2px;}}@media(max-width:560px){width:100vw;max-width:none;height:100dvh;max-height:none;margin:auto 0 0;border-radius:12px 12px 0 0;}`;

type Detail = { title: string; employer?: string; institution?: string; description: string; focus?: string; mode?: string };
const layout = getCareerLayout(careerData);
const YEAR_START = 2001 * 12;
const MONTH_COUNT = 26 * 12;
function offset(month: number): number { return Math.max(0, Math.min(100, ((month - YEAR_START) / MONTH_COUNT) * 100)); }
function workDetail(item: Assignment, employer: string): Detail { return { title: item.role, employer, description: item.description, focus: item.focusDetail, mode: item.mode }; }
function educationDetail(item: Education): Detail { return { title: item.label, institution: item.institution, description: item.type === "certificate" ? "Professional certification." : item.type === "training" ? "Professional training." : item.type === "studies" ? "University studies." : "Education." }; }
function durationStyle(start: number, endExclusive: number, point = false) { return { left: `${offset(start)}%`, width: point ? "5px" : `${Math.max(0.3, offset(endExclusive) - offset(start))}%` }; }

export default function CareerTimeline() {
  const [showFocus, setShowFocus] = useState(true);
  const [showEducation, setShowEducation] = useState(false);
  const [detail, setDetail] = useState<Detail | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (detail) {
      if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
      dialog.querySelector<HTMLElement>("button")?.focus();
    } else {
      if (dialog.open && typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open");
      openerRef.current?.focus();
      openerRef.current = null;
    }
  }, [detail]);
  const open = (value: Detail, element: HTMLElement) => { openerRef.current = element; setDetail(value); };
  const close = () => setDetail(null);
  const years = Array.from({length:26},(_,i)=>2001+i);
  const trapFocus = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key !== "Tab") return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled])"));
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <Section aria-label="Career">
    <Head><Title>Career</Title></Head>
    <Controls><label><input type="checkbox" checked={showFocus} onChange={(e)=>setShowFocus(e.target.checked)} />Areas of focus</label><label><input type="checkbox" checked={showEducation} onChange={(e)=>setShowEducation(e.target.checked)} />Education</label></Controls>
    <Timeline>
      <Axis aria-label="Year axis">{years.filter((year)=>(year-2001)%5===0).map((year)=><span key={year} style={{left:`${offset(year*12)}%`}}>{year}</span>)}</Axis>
      {careerData.employers.map((employer)=>{
        const assignments=layout.assignments.filter(({item})=>item.employerId===employer.id);
        return <Employer key={employer.id}><EmployerName>{employer.label}</EmployerName><RoleList>{assignments.map(({item,start,endExclusive,domain,alongside})=><RoleRow key={item.id}>
          <RoleButton type="button" $focus={showFocus} aria-label={`${item.role} at ${employer.label}`} onClick={(event)=>open(workDetail(item,employer.label),event.currentTarget)}>{item.role}<Domain>{domain.label}</Domain>{showFocus&&<Focus>{item.focusDetail}</Focus>}{alongside.length>0&&<Alongside>Alongside {alongside.join(", ")}</Alongside>}</RoleButton>
          <Duration aria-hidden="true" data-start-month={start-YEAR_START} data-end-month={endExclusive-YEAR_START}><span style={durationStyle(start,endExclusive)} /></Duration>
        </RoleRow>)}</RoleList></Employer>;
      })}
      {showEducation&&<EducationLane><h3>Education &amp; certificates</h3>{layout.education.map(({item,start,endExclusive,kind})=><EducationRow key={item.id}>
        <EduButton type="button" data-kind={kind} data-position={`${start-YEAR_START}:${endExclusive-YEAR_START}`} aria-label={`Education detail: ${item.label}`} onClick={(event)=>open(educationDetail(item),event.currentTarget)}>{item.label}</EduButton>
        <Duration aria-hidden="true" data-kind={kind}><span style={durationStyle(start,endExclusive,kind==="point")} /></Duration>
      </EducationRow>)}</EducationLane>}
    </Timeline>
    <Dialog ref={dialogRef} aria-labelledby="career-dialog-title" aria-describedby="career-dialog-description" onCancel={(event)=>{event.preventDefault();close();}} onKeyDown={trapFocus}>
      {detail&&<><h3 id="career-dialog-title">{detail.title}</h3><p>{detail.employer??detail.institution}</p>{detail.mode&&<p>{detail.mode === "inhouse" ? "In-house" : detail.mode === "consultant" ? "Consulting" : "Freelance"}</p>}<p id="career-dialog-description">{detail.description}</p>{detail.focus&&<p><strong>Focus:</strong> {detail.focus}</p>}<button type="button" onClick={close}>Close</button></>}
    </Dialog>
  </Section>;
}
