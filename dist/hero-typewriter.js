(()=>{
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer;
  let currentTitle;
  let currentText='';

  function animateTitle(){
    const title=document.querySelector('.home-hero .hero-copy h1');
    if(!title||title===currentTitle)return;
    clearTimeout(timer);
    currentTitle=title;
    const fullText=title.textContent;
    currentText=fullText;
    if(reducedMotion.matches||!fullText.trim())return;
    const characters=Array.from(fullText);
    let index=0;
    title.textContent='';
    title.classList.add('typewriter-active');
    function typeNext(){
      if(title!==currentTitle||!title.isConnected)return;
      title.textContent+=characters[index++];
      if(index<characters.length)timer=setTimeout(typeNext,characters[index-1].trim()?145:250);
      else timer=setTimeout(()=>title.classList.remove('typewriter-active'),1000);
    }
    timer=setTimeout(typeNext,250);
  }

  animateTitle();
  new MutationObserver(()=>animateTitle()).observe(document.body,{childList:true});
  reducedMotion.addEventListener('change',()=>{
    if(reducedMotion.matches&&currentTitle){
      clearTimeout(timer);
      currentTitle.textContent=currentText;
      currentTitle.classList.remove('typewriter-active');
    }
  });
})();
