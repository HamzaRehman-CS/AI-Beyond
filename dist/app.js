import * as THREE from 'three';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

const $=(s,root=document)=>root.querySelector(s), $$=(s,root=document)=>[...root.querySelectorAll(s)];
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)};
const motionPreference=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=motionPreference.matches;
const limitedDevice=(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4||navigator.connection?.saveData;
const levels=[{particles:5000,dpr:.85},{particles:10000,dpr:1.1},{particles:22000,dpr:1.4}];
let quality=limitedDevice?0:innerWidth<700?1:2;
document.documentElement.classList.toggle('light-effects',quality===0);
const modal=$('#modal'), modalBody=$('#modal-body');
let viewport={w:innerWidth,h:innerHeight}, raf=0, dirty=true, maxTrack=0, lastActive='', lastDraw=0, isScrolling=false, scrollIdleTimer=0;
let lastTime=performance.now(), rotation=0, rotationTarget=0, manualUntil=0, selectedCard=0, currentY=window.scrollY;
let pointer={x:0,y:0,active:false}, pointerDown=false;
const renderStats={ringDraws:0,chromeDraws:0,chromeResizes:0};
let metrics={}, frameCount=0, frameCost=16.7, slowFrames=0, lastQualityChange=performance.now();
const deck=$('.deck'), neural=$('.neural-stage'), track=$('.project-track'), build=$('.build-panel');
const buildCopy=$('.build-copy'), prompt=$('.prompt-panel'), sculpture=$('.sculpture-wrap');
const allLimits=$('.all-limits'),beyond=$('.beyond'),meter=$('.project-meter'),outro=$('.outro');
const floating=$$('.floating-art'),floatSpeeds=[.8,1.3,.6,1.6,1.1],navLinks=$$('.header a[href]'),dots=$$('[data-card]');
const sectionNames=['wearable','neural','programs','updates','prompts'];
const sections=sectionNames.map(id=>document.getElementById(id));

function schedule(){if(!raf&&!document.hidden&&!modal.open)raf=requestAnimationFrame(animate);}
function invalidate(){dirty=true;schedule();}
function measure(){viewport={w:innerWidth,h:innerHeight};sections.forEach(el=>metrics[el.id]={top:el.offsetTop,height:el.offsetHeight});maxTrack=Math.max(0,track.scrollWidth-innerWidth);resizeRing();resizeChrome();invalidate();}
function progress(id,y){const m=metrics[id];return clamp((y-m.top)/Math.max(1,m.height-viewport.h));}
function goTo(id){const el=document.getElementById(id);if(!el)return;closeModal();window.scrollTo({top:el.offsetTop,behavior:reduced?'instant':'smooth'});history.replaceState(null,'','#'+id);}
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(a){e.preventDefault();goTo(a.getAttribute('href').slice(1));}});
// Native wheel/touch scrolling stays on the browser's compositor thread. During a
// live scroll, the Updates canvas keeps its last frame while CSS moves the panel.
// That prevents a full WebGL redraw from competing with scrolling.
addEventListener('scroll',()=>{
 isScrolling=true;
 clearTimeout(scrollIdleTimer);
 scrollIdleTimer=setTimeout(()=>{isScrolling=false;invalidate();},96);
 invalidate();
},{passive:true});
addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=1-e.clientY/innerHeight*2;pointer.active=e.pointerType!=='touch';if(!reduced)schedule();},{passive:true});
addEventListener('pointerdown',()=>{pointerDown=true;schedule()},{passive:true});
addEventListener('pointerup',()=>{pointerDown=false;schedule()},{passive:true});
document.addEventListener('mouseleave',()=>{pointer.active=false;pointerDown=false;});
function rotateCard(direction){manualUntil=performance.now()+6500;rotationTarget-=direction*90;selectedCard=((Math.round(rotationTarget/90)%4)+4)%4;updateDots();invalidate();}
function updateDots(){dots.forEach((b,i)=>{b.classList.toggle('active',i===selectedCard);b.setAttribute('aria-pressed',String(i===selectedCard));});}
$('#next-card').onclick=()=>rotateCard(-1);$('#previous-card').onclick=()=>rotateCard(1);
dots.forEach(b=>b.onclick=()=>{manualUntil=performance.now()+6500;selectedCard=+b.dataset.card;rotationTarget=selectedCard*90+Math.round(rotationTarget/360)*360;updateDots();invalidate()});
let touchX=null;
$('.deck-wrap').addEventListener('touchstart',e=>touchX=e.touches[0].clientX,{passive:true});
$('.deck-wrap').addEventListener('touchend',e=>{if(touchX!==null&&Math.abs(e.changedTouches[0].clientX-touchX)>40)rotateCard(e.changedTouches[0].clientX<touchX?-1:1);touchX=null},{passive:true});

let ringRenderer,ringScene,ringCamera,points,particleUniforms,chromeRenderer,chromeScene,chromeCamera,star;
function initRing(){
 ringRenderer=new THREE.WebGLRenderer({canvas:$('#particles'),alpha:true,antialias:false,powerPreference:'high-performance'});
 ringRenderer.setPixelRatio(Math.min(devicePixelRatio,levels[quality].dpr));
 ringScene=new THREE.Scene();ringCamera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.1,50);ringCamera.position.z=9;
 const count=levels[quality].particles, positions=new Float32Array(count*3), colors=new Float32Array(count*3), sizes=new Float32Array(count), seeds=new Float32Array(count),tint=new THREE.Color();
 let seed=7182;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646};
 for(let i=0;i<count;i++){
  const a=random()*Math.PI*2,b=random()*Math.PI*2;
  const tube=.22+Math.pow(random(),1.7)*.63;
  const radius=3.13+Math.cos(b)*tube+.10*Math.sin(a*7+b*3);
  positions[i*3]=radius*Math.cos(a);positions[i*3+1]=radius*Math.sin(a);positions[i*3+2]=Math.sin(b)*tube;
  const shine=random();tint.setRGB(mix(.22,.94,shine),mix(.05,.84,shine),mix(.37,1,shine));
  tint.multiplyScalar(.6+random()*.8);tint.toArray(colors,i*3);sizes[i]=1.4+Math.pow(random(),2)*5.2;seeds[i]=random()*20;
 }
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geo.setAttribute('aSeed',new THREE.BufferAttribute(seeds,1));
 particleUniforms={uTime:{value:0},uScatter:{value:0},uPointer:{value:new THREE.Vector2(99,99)},uPower:{value:0},uDpr:{value:Math.min(devicePixelRatio,levels[quality].dpr)}};
 const mat=new THREE.ShaderMaterial({uniforms:particleUniforms,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexShader:`
 uniform float uTime,uScatter,uPower,uDpr;uniform vec2 uPointer;attribute float aSize,aSeed;varying vec3 vColor;varying float vAlpha;
 void main(){vec3 p=position;float angle=atan(p.y,p.x);float wave=sin(angle*6.0+uTime*.7+aSeed*.08)*.12+sin(angle*11.0-uTime*.5+p.z*3.)*.07;
 p.xy+=normalize(p.xy)*wave;p.z+=sin(angle*5.+uTime*.8+aSeed*.14)*.26;
 p.xy*=1.+.025*sin(uTime*.6);p+=normalize(vec3(p.xy,p.z+.01))*uScatter*(2.+aSeed*.25);
 vec2 d=p.xy-uPointer;float force=exp(-dot(d,d)*.4)*uPower;p.xy+=normalize(d+.001)*force*.65;p.z+=force*.8;
 vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uDpr*(9./-mv.z);vColor=color;vAlpha=(.28+.52*fract(aSeed))*(1.-uScatter*.9);}`,
 fragmentShader:`varying vec3 vColor;varying float vAlpha;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=1.-smoothstep(.12,.5,d);gl_FragColor=vec4(vColor,a*vAlpha);}`});
 points=new THREE.Points(geo,mat);ringScene.add(points);resizeRing();
}
function resizeRing(){if(!ringRenderer)return;ringCamera.aspect=innerWidth/innerHeight;ringCamera.position.z=innerWidth<700?12:9;ringCamera.updateProjectionMatrix();ringRenderer.setSize(innerWidth,innerHeight,false);}
function resizeChrome(){if(!chromeRenderer)return;renderStats.chromeResizes++;const mobile=innerWidth<700;chromeRenderer.setSize(Math.round(innerWidth*(mobile?.96:.98)),Math.round(innerHeight*(mobile?.89:.94)),false);}
function initChrome(){
 chromeRenderer=new THREE.WebGLRenderer({canvas:$('#chrome'),antialias:quality>0,alpha:true,powerPreference:'high-performance'});chromeRenderer.setPixelRatio(Math.min(devicePixelRatio,levels[quality].dpr));chromeRenderer.toneMapping=THREE.ACESFilmicToneMapping;chromeRenderer.toneMappingExposure=1.1;
 chromeScene=new THREE.Scene();chromeCamera=new THREE.PerspectiveCamera(36,1,.1,100);chromeCamera.position.z=8;
 const pmrem=new THREE.PMREMGenerator(chromeRenderer),room=new RoomEnvironment();chromeScene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 const shape=new THREE.Shape();shape.moveTo(-.13,2.08);shape.quadraticCurveTo(0,2.30,.13,2.08);shape.bezierCurveTo(.42,.85,.85,.42,2.08,.13);shape.quadraticCurveTo(2.30,0,2.08,-.13);shape.bezierCurveTo(.85,-.42,.42,-.85,.13,-2.08);shape.quadraticCurveTo(0,-2.30,-.13,-2.08);shape.bezierCurveTo(-.42,-.85,-.85,-.42,-2.08,-.13);shape.quadraticCurveTo(-2.30,0,-2.08,.13);shape.bezierCurveTo(-.85,.42,-.42,.85,-.13,2.08);
 const boundary=shape.getSpacedPoints(quality===0?96:144).slice(0,-1),n=boundary.length,rings=quality===0?12:18,vertices=[],indices=[];
 for(let side=0;side<2;side++)for(let j=0;j<=rings;j++)for(let i=0;i<n;i++){const r=j/rings,b=boundary[i];vertices.push(b.x*r,b.y*r,(side===0?1:-1)*(.13+.07*Math.sqrt(Math.max(0,1-r*r))));}
 const sideLength=(rings+1)*n;
 for(let side=0;side<2;side++)for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const a=side*sideLength+j*n+i,b=side*sideLength+j*n+(i+1)%n,c=a+n,d=b+n;side===0?indices.push(a,c,b,b,c,d):indices.push(a,b,c,b,d,c);}
 for(let i=0;i<n;i++){const a=rings*n+i,b=rings*n+(i+1)%n;indices.push(a,a+sideLength,b,b,a+sideLength,b+sideLength);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
 const material=quality===0?new THREE.MeshStandardMaterial({color:0xa0a3aa,metalness:1,roughness:.27,envMapIntensity:1.1,side:THREE.DoubleSide}):new THREE.MeshPhysicalMaterial({color:0xa0a3aa,metalness:1,roughness:.27,clearcoat:1,clearcoatRoughness:.18,envMapIntensity:1.1,side:THREE.DoubleSide});
 star=new THREE.Mesh(geo,material);chromeScene.add(star);
 const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(-3,4,5);chromeScene.add(light);const fill=new THREE.DirectionalLight(0xb088ff,1.5);fill.position.set(4,-3,2);chromeScene.add(fill);resizeChrome();
}
function lowerQuality(){if(quality===0)return;quality--;document.documentElement.classList.toggle('light-effects',quality===0);const dpr=Math.min(devicePixelRatio,levels[quality].dpr);if(ringRenderer){points.geometry.setDrawRange(0,Math.min(levels[quality].particles,points.geometry.attributes.position.count));ringRenderer.setPixelRatio(dpr);particleUniforms.uDpr.value=dpr;resizeRing();}if(chromeRenderer){chromeRenderer.setPixelRatio(dpr);resizeChrome();}lastQualityChange=performance.now();invalidate();}
// Prepare each scene near its section, never both during the initial hero paint.
const sceneObserver=new IntersectionObserver(entries=>{for(const entry of entries){if(!entry.isIntersecting)continue;sceneObserver.unobserve(entry.target);const initialize=()=>{try{entry.target.id==='neural'?initRing():initChrome();}catch(e){console.warn('Using lightweight scene fallback:',e.message);if(entry.target.id==='neural'){ringRenderer?.dispose();ringRenderer=null;$('#particles').style.background='radial-gradient(ellipse at center,transparent 30%,#793d9970 46%,transparent 64%)';}else{chromeRenderer?.dispose();chromeRenderer=null;$('#chrome').style.background='url(assets/chrome-reference.webp) center / cover';}}invalidate();};if('requestIdleCallback'in window)requestIdleCallback(initialize,{timeout:600});else setTimeout(initialize,32);}},{rootMargin:'200px 0px'});
sceneObserver.observe($('#neural'));sceneObserver.observe($('#updates'));

function animate(now){
 raf=0;if(document.hidden||modal.open)return;
 const elapsed=Math.min((now-lastTime)/1000,.25),dt=Math.min(elapsed,.05);lastTime=now;
 
 const targetY = window.scrollY;
 if (!reduced && Math.abs(targetY - currentY) > 0.5) {
  currentY = mix(currentY, targetY, 1 - Math.pow(0.85, dt * 60));
  dirty = true;
 } else {
  currentY = targetY;
 }
 const changed=dirty;dirty=false;
 const y=currentY,h=viewport.h,w=viewport.w,mobile=w<700,t=reduced?0:now/1000;
 
 const visible=id=>y+h>metrics[id].top&&y<metrics[id].top+metrics[id].height;
 const heroVisible=visible('wearable'),ringVisible=visible('neural'),projectsVisible=visible('programs'),galleryVisible=visible('updates'),promptVisible=visible('prompts');
 let continuous=false;
 if(changed){
  let active=sections[0].id;
  for(const section of sections){section.classList.toggle('is-visible',visible(section.id));if(y>=metrics[section.id].top-h*.25)active=section.id;}
  if(active!==lastActive){lastActive=active;for(const a of navLinks)a.setAttribute('aria-current',a.hash==='#'+active?'location':'false');}
 }
 if(heroVisible){
  const deckP=progress('wearable',y);
  if(!reduced&&now>manualUntil)rotationTarget+=dt*9;
  rotation=reduced?rotationTarget:mix(rotation,rotationTarget,1-Math.pow(.92,dt*60));
  const spin=rotation+deckP*135;
  deck.style.transform=`translate3d(0,${30-deckP*22}px,0) scale(${mobile?1.04:.81}) rotateX(${reduced||mobile?0:pointer.y*.9}deg) rotateY(${spin}deg)`;
  const index=((Math.round(spin/90)%4)+4)%4;if(index!==selectedCard){selectedCard=index;updateDots();}
  continuous=!reduced;
 }
 const drawDue=now-lastDraw>=15;
 if(ringVisible){
  const np=progress('neural',y),fade=smooth(.27,.94,np);
  if(changed)beyond.style.transform=`translate3d(0,${-np*30}px,0)`;
  if(ringRenderer&&(changed||(!reduced&&drawDue))){
   particleUniforms.uTime.value=t;particleUniforms.uScatter.value=fade;
   particleUniforms.uPointer.value.set(pointer.x*5.4,pointer.y*3.9);
   particleUniforms.uPower.value=mix(particleUniforms.uPower.value,!reduced&&pointer.active?(pointerDown?1.5:.65):0,.08);
   points.rotation.set(Math.sin(t*.13)*.16,Math.sin(t*.17)*.12,t*.022);
   ringRenderer.render(ringScene,ringCamera);renderStats.ringDraws++;
  }
  continuous||=!reduced&&fade<.999;
 }
 if(projectsVisible&&changed){const pp=progress('programs',y);track.style.transform=`translate3d(${-maxTrack*pp}px,0,0)`;meter.style.setProperty('--meter',`${pp*200}%`);}
 if(galleryVisible){
  const gp=progress('updates',y),travel=smooth(0,.58,gp),expand=smooth(.38,.88,gp),artOpacity=1-smooth(.55,.88,gp);
  if(changed){for(let i=0;i<floating.length;i++){const el=floating[i],speed=floatSpeeds[i];el.style.transform=`translate3d(${-travel*w*.65*speed}px,${-travel*h*.27*speed}px,0) scale(${1-travel*.10})`;el.style.opacity=artOpacity;el.style.pointerEvents=artOpacity>.15?'auto':'none';}}
  const left=mix(66,mobile?2:1,travel),top=mix(66,mobile?9:5,travel),width=mix(47,mobile?96:98,expand),height=mix(49,mobile?89:94,expand);
  if(changed){
   // Fixed canvas allocation; only compositor transforms change the panel size.
   build.style.transform=`translate3d(${w*left/100}px,${h*top/100}px,0) scale(${width/(mobile?96:98)},${height/(mobile?89:94)})`;
   const reveal=smooth(.68,.91,gp);buildCopy.style.opacity=reveal;buildCopy.style.transform=`translate3d(0,${(1-reveal)*30}px,0)`;buildCopy.style.pointerEvents=reveal>.8?'auto':'none';
   if(chromeCamera){chromeCamera.aspect=(w*width)/(h*height);chromeCamera.updateProjectionMatrix();}
  }
  if(chromeRenderer&&changed&&!isScrolling){
   star.position.set(mix(1.3,mobile?.75:2.8,expand),mix(-.3,mobile?-1.25:-.55,expand),0);
   star.rotation.set(-.30,-.32,-.27);star.scale.setScalar(mix(1.05,mobile?.85:1.35,expand));chromeRenderer.render(chromeScene,chromeCamera);renderStats.chromeDraws++;
  }
}
 if(promptVisible){
  const qp=progress('prompts',y),out=smooth(.4,1,qp);
  if(changed){prompt.style.transform=`translate3d(${out*-12}%,${out*-3}%,0) rotateZ(${out*-22}deg) rotateY(${out*52}deg) scale(${1-out*.69})`;prompt.style.opacity=1-smooth(.7,1,qp);prompt.style.pointerEvents=out>.75?'none':'auto';outro.style.opacity=smooth(.65,1,qp);outro.style.transform=`translate3d(0,${(1-out)*20}px,0)`;outro.style.pointerEvents=qp>.8?'auto':'none';}
  if(!reduced&&!mobile&&qp<.98){sculpture.style.transform=`perspective(1400px) rotateY(${-5+pointer.x*4}deg) rotateZ(${.5+Math.sin(t*.35)*.8}deg) translateY(${Math.sin(t*.6)*5}px)`;continuous=true;}
 }
 if(drawDue)lastDraw=now;
 if((ringVisible||galleryVisible)&&continuous&&now-lastQualityChange>2500){frameCost=mix(frameCost,elapsed*1000,.08);slowFrames=frameCost>27?slowFrames+elapsed:Math.max(0,slowFrames-elapsed);if(slowFrames>1.5){lowerQuality();slowFrames=0;}}
 frameCount++;if(continuous||dirty)schedule();
}


const products={
 core:{title:'Intelligence, beyond limits.',label:'Neural Core',copy:'One model, every surface. Explore a neural engine designed to help turn your next idea into action — across the devices you already use.',interest:'Neural Core'},
 analysis:{title:'See the bigger picture.',label:'System Analyser',copy:'Bring research, ideas, and decisions into one place. Explore connected workflows that help you understand the impact of your next move.',interest:'System Analyser'},
 lending:{title:'A new perspective on lending.',label:'Capital.cloud',copy:'Explore the business lending concept featured in our product collection. Clear information, connected workflows, and a simpler application experience.',interest:'Business Lending'},
 templates:{title:'A head start for your next idea.',label:'Creative Library',copy:'Explore visual experiments, creative directions, and reusable prompt ideas. Find your next starting point in the collection.',interest:'Templates'}
};
const projects={archin:{title:'Archin',label:'Architecture Design · Website',copy:'An architectural exploration of nature and the impossible. A violet floral arch emerges from an ocean of blue — an exercise in scale, material, and atmosphere.'},zumar:{title:'Zumar',label:'Web Design & Development',copy:'A portal into another perspective. Flowing architectural forms, light, and reflection create an immersive world built around a single point of curiosity.'},nova:{title:'Nova',label:'Brand · Motion · Web',copy:'A quieter kind of future. Expansive violet dunes and a distant horizon form a visual identity inspired by the space between the familiar and the unknown.'}};
const arts={'neural-face':{title:'Intelligence in motion',label:'Nano Banana',prompt:'A cinematic close-up portrait in profile, sculpted from electric blue light. Horizontal light trails flow across the face. Deep blue shadows, luminous white background, strong contrast, editorial composition.'},'portrait-green':{title:'A moment of focus',label:'Editorial',prompt:'A contemplative editorial portrait of a person in a sage green leather jacket, seated sideways against an olive backdrop. Soft studio lighting, subtle film grain, rich natural texture.'},'portrait-blue':{title:'Between two lights',label:'Color study',prompt:'A cinematic side-profile portrait illuminated by cyan and red light. Deep shadows, a quiet upward gaze, dark clothing, saturated colors, a minimal studio background.'},'portrait-red':{title:'A different point of view',label:'Midjourney',prompt:'A fashion editorial portrait against a muted red studio backdrop. A sculptural black jacket, a short dark haircut, dramatic directional lighting, analogue texture.'},'portrait-cyan':{title:'The next horizon',label:'Portrait study',prompt:'A cinematic portrait against a cyan background, a dark high-collar jacket, calm expression, atmospheric lighting, soft grain, futuristic editorial mood.'}};
let returnFocus=null,currentPrompt='';
function openModal(html){returnFocus=document.activeElement;modalBody.innerHTML=html;if(!modal.open)modal.showModal();document.body.style.overflow='hidden';document.documentElement.classList.add('page-paused');if(raf)cancelAnimationFrame(raf);raf=0;}
function closeModal(){if(modal.open)modal.close();}
modal.addEventListener('close',()=>{document.body.style.overflow='';document.documentElement.classList.toggle('page-paused',document.hidden);lastTime=performance.now();invalidate();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
$('.modal-close').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal){const r=modal.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function join(interest='Neural Core'){
 openModal(`<span class="modal-eyebrow">Your next chapter</span><h2 id="modal-title">Start something<br>extraordinary.</h2><p class="modal-copy">Tell us what you’re interested in. Your request will be saved on this device.</p><form id="join-form"><label for="join-name">Your name</label><input id="join-name" name="name" autocomplete="name" placeholder="Alex Morgan" required maxlength="100"><label for="join-email">Email address</label><input id="join-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required maxlength="254"><label for="join-interest">I’m interested in</label><select id="join-interest" name="interest">${['Neural Core','System Analyser','Business Lending','Templates','Studio collaboration'].map(x=>`<option${x===interest?' selected':''}>${x}</option>`).join('')}</select><button class="white-button" type="submit">Start Journey <span>↗</span></button><p class="form-note">Local preview: requests are saved locally. No email is sent and no payment is collected.</p><p class="form-status" role="status"></p></form>`);
 $('#join-form').onsubmit=async e=>{e.preventDefault();const form=e.target,button=$('button',form),status=$('.form-status',form);button.disabled=true;button.textContent='Saving…';try{const response=await fetch('/api/join',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});if(!response.ok)throw new Error('Unable to save. Please try again.');status.textContent='You’re on the list. Your request has been saved locally.';form.reset();button.textContent='Request saved ✓'}catch(e){status.textContent=e.message;button.disabled=false;button.textContent='Try again'}};
}
function pricing(){openModal(`<span class="modal-eyebrow">Space for your next idea</span><h2 id="modal-title">Choose your starting point.</h2><p class="modal-copy">Explore the concept, or tell us about something bigger.</p><div class="pricing-grid"><article class="price-card"><h3>Explore</h3><strong>Free preview</strong><ul><li>Browse the creative collection</li><li>Explore sample prompts</li><li>Discover the neural experience</li></ul><button class="glass-button" id="explore-library">Explore collection ↗</button></article><article class="price-card featured"><h3>Studio</h3><strong>Let’s talk</strong><ul><li>Custom creative direction</li><li>Connected AI workflows</li><li>A project shaped around you</li></ul><button class="white-button" id="studio-join">Start a conversation ↗</button></article></div><p class="form-note">Preview offerings only. No checkout or subscription is connected.</p>`);$('#explore-library').onclick=()=>goTo('updates');$('#studio-join').onclick=()=>join('Studio collaboration');}
const searchItems=[{name:'Neural Core',description:'Intelligence, beyond limits',section:'wearable'},{name:'Beyond all limits',description:'Explore the interactive neural field',section:'neural'},{name:'Archin',description:'Architecture Design · Website',project:'archin'},{name:'Zumar',description:'Web Design & Development',project:'zumar'},{name:'Nova',description:'Brand · Motion · Web',project:'nova'},{name:'Creative collection',description:'Prompts, portraits, and visual experiments',section:'updates'},{name:'Prompts that think ahead',description:'Tools for your next idea',section:'prompts'},{name:'Pricing',description:'Explore and Studio',dialog:'pricing'}];
function search(){openModal('<span class="modal-eyebrow">Find your next idea</span><h2 id="modal-title">What’s on your mind?</h2><label for="search-input">Search the site</label><input id="search-input" type="search" placeholder="Try neural, prompts, or Nova…" autocomplete="off"><div class="search-results" aria-live="polite"></div>');const input=$('#search-input');function results(){const q=input.value.toLowerCase().trim(),items=searchItems.filter(x=>(x.name+' '+x.description).toLowerCase().includes(q));$('.search-results').replaceChildren(...items.map(item=>{const b=document.createElement('button'),copy=document.createElement('span'),small=document.createElement('small');copy.textContent=item.name;small.textContent=item.description;copy.append(small);b.append(copy,document.createTextNode('↗'));b.onclick=()=>item.section?goTo(item.section):item.project?projectModal(item.project):pricing();return b}));if(!items.length)$('.search-results').textContent='No matches. Try “neural”, “prompts”, or “pricing”.'}input.oninput=results;results();requestAnimationFrame(()=>input.focus());}
function projectModal(id){const p=projects[id];openModal(`<span class="modal-eyebrow">${p.label}</span><h2 id="modal-title">${p.title}</h2><img class="modal-image" src="assets/${id}.webp" alt="${p.title} visual concept"><p class="modal-copy">${p.copy}</p><button class="white-button" id="project-contact">Create something like this ↗</button>`);$('#project-contact').onclick=()=>join('Studio collaboration');}
document.addEventListener('click',e=>{const d=e.target.closest('[data-dialog]');if(d)({join,pricing,search}[d.dataset.dialog])();const product=e.target.closest('[data-product]');if(product){const p=products[product.dataset.product];openModal(`<span class="modal-eyebrow">${p.label}</span><h2 id="modal-title">${p.title}</h2><p class="modal-copy">${p.copy}</p><button class="white-button" id="product-next">${product.dataset.product==='templates'?'Browse collection':'Get started'} ↗</button>`);$('#product-next').onclick=()=>product.dataset.product==='templates'?goTo('updates'):join(p.interest);}const p=e.target.closest('[data-project]');if(p)projectModal(p.dataset.project);const art=e.target.closest('[data-art]');if(art){const id=art.dataset.art,a=arts[id];currentPrompt=a.prompt;openModal(`<span class="modal-eyebrow">${a.label}</span><h2 id="modal-title">${a.title}</h2><img class="modal-image" src="assets/${id}.webp" alt="${a.title}"><p class="modal-copy">${a.prompt}</p><button class="white-button" id="copy-prompt">Copy prompt ↗</button>`);$('#copy-prompt').onclick=async()=>{try{await navigator.clipboard.writeText(currentPrompt);$('#copy-prompt').textContent='Copied ✓'}catch{$('#copy-prompt').textContent='Select and copy the prompt above'}};}});
addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();search();}});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(measure,100)},{passive:true});
addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('page-paused',document.hidden||modal.open);if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{lastTime=performance.now();invalidate();}});
motionPreference.addEventListener('change',e=>{reduced=e.matches;invalidate();});
measure();
if(location.hash&&document.getElementById(location.hash.slice(1)))setTimeout(()=>goTo(location.hash.slice(1)),100);
window.__site={getState:()=>({webgl:!!ringRenderer&&!!chromeRenderer,particles:points?Math.min(points.geometry.drawRange.count,points.geometry.attributes.position.count):0,quality:['low','balanced','high'][quality],pixelRatio:levels[quality].dpr,renderStats:{...renderStats,frames:frameCount},sections:metrics,scroll:scrollY,reducedMotion:reduced})};
