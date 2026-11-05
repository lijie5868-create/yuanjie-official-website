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
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(35,1,.1,30);
  camera.position.set(0,0,8);
  scene.add(new THREE.AmbientLight(0xffffff,2.1));
  const key=new THREE.DirectionalLight(0xffffff,3);
  key.position.set(-3,4,6);scene.add(key);
  const edge=new THREE.DirectionalLight(0xb88949,2);
  edge.position.set(4,-2,-2);scene.add(edge);
  const geometry=new THREE.BoxGeometry(1,1,1);
  const material=new THREE.MeshStandardMaterial({color:0x111111,metalness:0,roughness:.75});
  const dummy=new THREE.Object3D();
  let mesh,logoObject,ready=false,playing=false,raf=0,start=0;
  const logoMaterial=new THREE.MeshPhysicalMaterial({color:0xc5a880,metalness:.55,roughness:.27,clearcoat:.9,clearcoatRoughness:.15,transparent:true});
  const qrRig=new THREE.Group();scene.add(qrRig);
  const qrFace=new THREE.Mesh(new THREE.BoxGeometry(3.57,3.57,.09),new THREE.MeshBasicMaterial({color:0xffffff}));
  qrFace.position.z=-.055;qrRig.add(qrFace);
  let centerBadge;
  const solidLogo=img=>{
    const n=112,c=document.createElement('canvas');c.width=c.height=n;
    const cx=c.getContext('2d',{willReadFrequently:true});cx.drawImage(img,0,0,n,n);
    const pixels=cx.getImageData(0,0,n,n).data;
    const filled=(x,y)=>x>=0&&y>=0&&x<n&&y<n&&pixels[(y*n+x)*4+3]>130&&pixels[(y*n+x)*4]>75;
    const vertices=[],normals=[];
    const quad=(a,b,d,e,normal)=>{
      for(const p of [a,b,d,a,d,e]){vertices.push(...p);normals.push(...normal)}
    };
    const s=3.7/n,front=.19,back=-.16;
    for(let y=0;y<n;y++)for(let x=0;x<n;x++){
      if(!filled(x,y))continue;
      const l=(x-n/2)*s,r=l+s,t=(n/2-y)*s,b=t-s;
      quad([l,b,front],[r,b,front],[r,t,front],[l,t,front],[0,0,1]);
      quad([r,b,back],[l,b,back],[l,t,back],[r,t,back],[0,0,-1]);
      if(!filled(x-1,y))quad([l,b,back],[l,b,front],[l,t,front],[l,t,back],[-1,0,0]);
      if(!filled(x+1,y))quad([r,b,front],[r,b,back],[r,t,back],[r,t,front],[1,0,0]);
      if(!filled(x,y-1))quad([l,t,front],[r,t,front],[r,t,back],[l,t,back],[0,1,0]);
      if(!filled(x,y+1))quad([l,b,back],[r,b,back],[r,b,front],[l,b,front],[0,-1,0]);
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
    return new THREE.Mesh(g,logoMaterial);
  };
  const qrPoints=img=>{
    const side=33;
    const sample=document.createElement('canvas');sample.width=sample.height=side;
    const ctx=sample.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,55,55,297,297,0,0,side,side);
    const data=ctx.getImageData(0,0,side,side).data;
    const result=[];
    for(let y=0;y<side;y++)for(let x=0;x<side;x++){
      const i=(y*side+x)*4;
      const badge=x>=12&&x<=20&&y>=12&&y<=20;
      const visible=!badge&&data[i]<110&&data[i+1]<110&&data[i+2]<110;
      if(visible)result.push({x:(x+.5-side/2)*3.5/side,y:(side/2-y-.5)*3.5/side});
    }
    return result;
  };
  const logo=new Image();logo.src='assets/yuanjie-logo-transparent.png';
  Promise.all([logo.decode(),qr.decode()]).then(()=>{
    const to=qrPoints(qr);
    if(!to.length)throw Error('Empty QR geometry');
    logoObject=solidLogo(logo);scene.add(logoObject);
    mesh=new THREE.InstancedMesh(geometry,material,to.length);
    for(let i=0;i<to.length;i++){
      dummy.position.set(to[i].x,to[i].y,.055);
      dummy.scale.set(3.5/33*.995,3.5/33*.995,.11);
      dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    const badgeCanvas=document.createElement('canvas');badgeCanvas.width=badgeCanvas.height=108;
    badgeCanvas.getContext('2d').drawImage(qr,163,163,81,81,0,0,108,108);
    const badgeTexture=new THREE.CanvasTexture(badgeCanvas);badgeTexture.colorSpace=THREE.SRGBColorSpace;
    centerBadge=new THREE.Mesh(new THREE.BoxGeometry(.97,.97,.065),[
      new THREE.MeshBasicMaterial({color:0xeeeeee}),new THREE.MeshBasicMaterial({color:0xeeeeee}),
      new THREE.MeshBasicMaterial({color:0xeeeeee}),new THREE.MeshBasicMaterial({color:0xeeeeee}),
      new THREE.MeshBasicMaterial({map:badgeTexture}),new THREE.MeshBasicMaterial({color:0xffffff})
    ]);
    centerBadge.position.z=.075;qrRig.add(centerBadge);
    qrRig.add(mesh);ready=true;
    if(assessment.open)begin();
  }).catch(error=>{console.warn('Assessment geometry unavailable.',error);canvas.remove();renderer.dispose()});
  const ease=t=>t*t*(3-2*t);
  const draw=now=>{
    if(!playing)return;
    const t=Math.min((now-start)/2900,1);
    const retract=ease(Math.min(Math.max((t-.32)/.38,0),1));
    const turn=ease(Math.min(Math.max((t-.52)/.43,0),1));
    qrRig.rotation.x=THREE.MathUtils.lerp(-1.02,0,turn);
    qrRig.rotation.z=THREE.MathUtils.lerp(-.1,0,turn);
    qrRig.position.y=THREE.MathUtils.lerp(-.72,0,turn);
    logoObject.position.set(0,THREE.MathUtils.lerp(.55,-.72,retract)+Math.sin(t*12)*.035*(1-retract),THREE.MathUtils.lerp(.65,.08,retract));
    logoObject.rotation.y=Math.sin(t*5)*.12*(1-retract);
    logoObject.rotation.x=THREE.MathUtils.lerp(-.12,-.9,retract);
    logoObject.scale.setScalar(Math.max(.001,1-retract));
    logoMaterial.opacity=1-retract;
    logoObject.visible=retract<1;
    renderer.render(scene,camera);
    if(t<1)raf=requestAnimationFrame(draw);
    else{playing=false;frame.classList.add('is-finished');}
  };
  const begin=()=>{
    if(!ready)return;
    cancelAnimationFrame(raf);
    playing=true;frame.classList.remove('is-finished');frame.classList.add('is-playing');
    start=performance.now();raf=requestAnimationFrame(draw);
  };
  trigger.addEventListener('click',begin);
  assessment.addEventListener('close',()=>{
    playing=false;cancelAnimationFrame(raf);frame.classList.remove('is-playing','is-finished');
  });
}
