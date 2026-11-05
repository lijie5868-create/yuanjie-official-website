import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js';

export function initAssessment3D({assessment,qr,trigger,frame}){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const canvas=document.createElement('canvas');
  canvas.className='assessment-3d-canvas';
  canvas.setAttribute('aria-hidden','true');
  frame.prepend(canvas);
  const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(260,260,false);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,30);
  camera.position.set(0,0,8);
  scene.add(new THREE.AmbientLight(0xffffff,2.1));
  const key=new THREE.DirectionalLight(0xffffff,3);
  key.position.set(-3,4,6);scene.add(key);
  const edge=new THREE.DirectionalLight(0xb88949,2);
  edge.position.set(4,-2,-2);scene.add(edge);
  const geometry=new THREE.BoxGeometry(.083,.083,.11);
  const material=new THREE.MeshStandardMaterial({color:0xc5a880,metalness:.42,roughness:.3});
  const dummy=new THREE.Object3D();
  const gold=new THREE.Color(0xc5a880),ink=new THREE.Color(0x111111);
  let mesh,from=[],to=[],ready=false,playing=false,raf=0,start=0;
  const points=(img,kind)=>{
    const side=kind==='qr'?65:48;
    const sample=document.createElement('canvas');sample.width=sample.height=side;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    if(kind==='qr'){
      ctx.fillStyle='#fff';ctx.fillRect(0,0,side,side);
      ctx.drawImage(img,0,0,side,side);
    }else ctx.drawImage(img,0,0,side,side);
    const data=ctx.getImageData(0,0,side,side).data;
    const result=[];
    for(let y=0;y<side;y++)for(let x=0;x<side;x++){
      const i=(y*side+x)*4;
      const visible=kind==='qr'?data[i]<110&&data[i+1]<110&&data[i+2]<110:data[i+3]>110&&data[i]>75;
      if(visible)result.push({x:(x+.5-side/2)*3.5/side,y:(side/2-y-.5)*3.5/side});
    }
    return result;
  };
  const logo=new Image();logo.src='assets/yuanjie-logo-transparent.png';
  Promise.all([logo.decode(),qr.decode()]).then(()=>{
    from=points(logo,'logo');to=points(qr,'qr');
    if(!from.length||!to.length)throw Error('Empty logo or QR geometry');
    const count=Math.max(from.length,to.length);
    mesh=new THREE.InstancedMesh(geometry,material,count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);ready=true;
    if(assessment.open)begin();
  }).catch(error=>{console.warn('Assessment geometry unavailable.',error);canvas.remove();renderer.dispose()});
  const ease=t=>t*t*(3-2*t);
  const draw=now=>{
    if(!playing)return;
    const t=Math.min((now-start)/3000,1);
    const morph=ease(Math.min(Math.max((t-.43)/.46,0),1));
    const spin=(1-ease(Math.min(t/.55,1)))*.75;
    mesh.rotation.y=spin;
    mesh.rotation.x=(1-ease(Math.min(t/.6,1)))*-.2;
    for(let i=0;i<mesh.count;i++){
      const a=from[i%from.length],b=to[i%to.length];
      const ripple=Math.sin(i*1.731)*.34*Math.sin(Math.PI*morph);
      dummy.position.set(THREE.MathUtils.lerp(a.x,b.x,morph)+ripple,THREE.MathUtils.lerp(a.y,b.y,morph)+Math.cos(i*.91)*.25*Math.sin(Math.PI*morph),Math.sin(i*.27)*.22*(1-morph)+Math.sin(Math.PI*morph)*.55);
      const size=(1-morph)*1.65+morph*.9;
      dummy.scale.set(size,size,(1-morph)*2.5+morph*.7);
      dummy.rotation.set(0,spin*(1-morph),0);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      mesh.setColorAt(i,gold.clone().lerp(ink,morph));
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    renderer.render(scene,camera);
    if(t<1)raf=requestAnimationFrame(draw);
    else{playing=false;frame.classList.remove('is-playing');}
  };
  const begin=()=>{
    if(!ready)return;
    cancelAnimationFrame(raf);
    playing=true;frame.classList.add('is-playing');
    start=performance.now();raf=requestAnimationFrame(draw);
  };
  trigger.addEventListener('click',begin);
  assessment.addEventListener('close',()=>{
    playing=false;cancelAnimationFrame(raf);frame.classList.remove('is-playing');
  });
}
