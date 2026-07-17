"use strict";
const C=window.Chakra;
const cv=document.getElementById('dial'), dg=cv.getContext('2d');
/* time state: live now + a scrub offset in days — the chakra mechanic */
const T={off:0};
const HINT=document.getElementById('sub');
function dLive(){const n=new Date();
  return C.dayNo(n.getUTCFullYear(),n.getUTCMonth()+1,n.getUTCDate(),
    n.getUTCHours()+n.getUTCMinutes()/60+n.getUTCSeconds()/3600);}
function dCur(){return dLive()+T.off;}

/* the dial face — identical construction to the portal's ZW.dial, chakra-computed */
function drawDial(d){
  const cx=256,cy=256,Rr=236,Rm=118;
  dg.clearRect(0,0,512,512);
  // chakra look: faint night disc under the ring
  dg.fillStyle='rgba(5,10,24,.55)';dg.beginPath();dg.arc(cx,cy,Rr+12,0,7);dg.fill();
  dg.strokeStyle='rgba(255,233,176,.95)';dg.lineWidth=3;
  dg.beginPath();dg.arc(cx,cy,Rr+10,0,7);dg.stroke();
  dg.strokeStyle='rgba(255,233,176,.5)';dg.lineWidth=1.4;
  dg.beginPath();dg.arc(cx,cy,Rr+4,0,7);dg.stroke();
  for(let a=0;a<360;a+=5){const maj=a%30===0,mid=a%10===0,r2=Rr-(maj?26:mid?16:9);
    dg.strokeStyle=maj?'rgba(232,207,138,.9)':'rgba(201,164,78,.55)';dg.lineWidth=maj?2.4:1.2;
    const ar=(a-90)*Math.PI/180;
    dg.beginPath();dg.moveTo(cx+Rr*Math.cos(ar),cy+Rr*Math.sin(ar));
    dg.lineTo(cx+r2*Math.cos(ar),cy+r2*Math.sin(ar));dg.stroke();}
  const GL=["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
  dg.font='26px serif';dg.textAlign='center';dg.textBaseline='middle';
  for(let s=0;s<12;s++){const ang=(-90-(s*30+15))*Math.PI/180;
    dg.fillStyle=`hsl(${s*30} 60% 55%)`;
    dg.fillText(GL[s],cx+(Rr-52)*Math.cos(ang),cy+(Rr-52)*Math.sin(ang));}
  const gp=C.grahas(d);
  for(const [nm,col,r] of [["Sun","#e6b450",8],["Mercury","#9fb0c0",5],["Venus","#d08a5a",6],
      ["Mars","#e0685a",5.6],["Jupiter","#d9b24a",6.6],["Saturn","#8a97b8",6]]){
    const ang=(-90-gp[nm])*Math.PI/180;dg.fillStyle=col;dg.shadowColor=col;dg.shadowBlur=10;
    dg.beginPath();dg.arc(cx+Rr*Math.cos(ang),cy+Rr*Math.sin(ang),r,0,7);dg.fill();}
  const mang=(-90-gp.Moon)*Math.PI/180;
  dg.fillStyle='#e8ecf7';dg.shadowColor='#cdd6e0';dg.shadowBlur=10;
  dg.beginPath();dg.arc(cx+Rr*Math.cos(mang),cy+Rr*Math.sin(mang),6,0,7);dg.fill();
  dg.shadowBlur=0;
  // central moon — the exact lune construction
  const ph=C.phaseInfo(d),k=Math.cos(ph.elong*Math.PI/180);
  dg.fillStyle='#0d1526';dg.beginPath();dg.arc(cx,cy,Rm,0,7);dg.fill();
  if(ph.illum>0.004){const right=ph.waxing,so=right?1:0,rx=Math.abs(k)*Rm,
    si=(k>0?(right?0:1):(right?1:0));
    const p=new Path2D(`M ${cx} ${cy-Rm} A ${Rm} ${Rm} 0 0 ${so} ${cx} ${cy+Rm}`+
      ` A ${rx} ${Rm} 0 0 ${si} ${cx} ${cy-Rm} Z`);
    dg.fillStyle='#e9e6dc';dg.fill(p);}
  for(const [mx,my,mr,mo] of [[-32,-34,30,.10],[20,-7,23,.09],[-7,39,18,.08],[39,30,14,.07]]){
    dg.fillStyle=`rgba(139,150,184,${mo})`;dg.beginPath();dg.arc(cx+mx,cy+my,mr,0,7);dg.fill();}
  dg.strokeStyle='rgba(216,169,78,.35)';dg.lineWidth=1.5;
  dg.beginPath();dg.arc(cx,cy,Rm,0,7);dg.stroke();
  // a subtle grab affordance ring when scrubbed
  if(Math.abs(T.off)>0.04){dg.strokeStyle='rgba(232,207,138,.5)';dg.lineWidth=2;
    dg.setLineDash([6,10]);dg.beginPath();dg.arc(cx,cy,Rr-2,0,7);dg.stroke();dg.setLineDash([]);}
}
function readout(){
  const d=dCur(), jdn=C.jdnOf(d), g=C.jdn2greg(jdn);
  drawDial(d);
  const wd=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][(jdn+1)%7];
  const mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][g.M-1];
  const hs=C.hijriSunni(jdn);
  document.getElementById('cal').innerHTML=
    `<b>${wd}, ${g.D} ${mo} ${g.Y}</b> · ${hs.d} ${C.HIJRI_M[hs.m-1]} ${hs.y} AH`;
  const ph=C.phaseInfo(d);
  const names=["New","Waxing crescent","First quarter","Waxing gibbous","Full",
    "Waning gibbous","Last quarter","Waning crescent"];
  const idx=Math.round(((ph.waxing?ph.elong:360-ph.elong)/360)*8)%8;
  if(Math.abs(T.off)>0.04){
    const dd=T.off>0?"+":"−";
    HINT.innerHTML=`${names[idx]} · ${Math.round(ph.illum*100)}% · Δ${dd}${Math.abs(T.off).toFixed(Math.abs(T.off)<2?1:0)}d`+
      ` <button id="now">⟲ now</button>`;
    const nb=document.getElementById('now');
    if(nb)nb.onclick=(e)=>{e.stopPropagation();T.off=0;readout();};
  } else {
    HINT.textContent=`${names[idx]} · ${Math.round(ph.illum*100)}% lit · drag the dial to scrub time`;
  }
}

/* THE TOUCH FEATURE — chakra's geared drag: rotate the dial to advance days.
   One full turn of the wheel = one lunar month (29.53 days), matching the orrery feel. */
(function(){
  let drag=null;
  const geom=ev=>{const r=cv.getBoundingClientRect();
    const x=ev.clientX-r.left-r.width/2, y=ev.clientY-r.top-r.height/2;
    return Math.atan2(y,x);};
  cv.addEventListener('pointerdown',ev=>{
    drag={prev:geom(ev),off:T.off};
    try{cv.setPointerCapture(ev.pointerId)}catch(e){}
    cv.style.cursor='grabbing';ev.preventDefault();
  });
  cv.addEventListener('pointermove',ev=>{
    if(!drag)return;
    const a=geom(ev); let d=a-drag.prev;
    if(d>Math.PI)d-=2*Math.PI; if(d<-Math.PI)d+=2*Math.PI;
    drag.prev=a;
    T.off+=d/(2*Math.PI)*29.530588853;      // one turn = one synodic month
    readout();ev.preventDefault();
  });
  const end=()=>{if(drag){drag=null;cv.style.cursor='grab';}};
  cv.addEventListener('pointerup',end);
  cv.addEventListener('pointercancel',end);
  cv.addEventListener('dblclick',ev=>{ev.preventDefault();T.off=0;readout();});
  cv.style.cursor='grab';cv.style.touchAction='none';
})();

readout();
setInterval(()=>{if(Math.abs(T.off)<0.04)readout();}, 60*1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Math.abs(T.off)<0.04)readout();});
// tap the calendar strip (not the dial) to open the full portal
document.getElementById('cal').addEventListener('click',()=>{location.href='index.html';});
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
