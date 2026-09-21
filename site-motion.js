(function(){
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const qs = (s,c=document)=>Array.from(c.querySelectorAll(s));
  const reveal = qs('main h1, main h2, main h3, .section, .cat-card, .method-grid > div, .story-section, .lex-entry, .tool-box, .article-hero-stage, .chapter-marker');
  reveal.forEach(el=>el.setAttribute('data-reveal',''));

  function basicReveal(){
    if(reduce){ reveal.forEach(el=>el.classList.add('is-revealed')); return; }
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-revealed');io.unobserve(e.target)}}),{threshold:.08,rootMargin:'0px 0px -8%'});
    reveal.forEach(el=>io.observe(el));
  }

  function gsapInit(){
    if(reduce || !window.gsap) return;
    const gs=window.gsap;
    if(window.ScrollTrigger) gs.registerPlugin(window.ScrollTrigger);
    gs.from('.brand-mark',{scale:.7,rotation:-18,opacity:0,duration:.8,ease:'back.out(1.7)' });
    gs.from('.hero-kicker,.home-hero h1,.home-hero .hero-lead,.hero-route',{y:45,opacity:0,stagger:.09,duration:1,ease:'power4.out',delay:.1});
    gs.from('.media-device-front',{y:80,rotation:-20,opacity:0,duration:1.25,ease:'power4.out'});
    gs.from('.media-device-back',{y:-60,rotation:24,opacity:0,duration:1.15,ease:'power3.out',delay:.12});
    gs.from('.media-float-tag,.media-float-dot',{scale:0,opacity:0,stagger:.12,duration:.65,ease:'back.out(2)',delay:.5});
    if(window.ScrollTrigger){
      qs('.home-hero .hero-media-stage,.article-hero-stage,.story-media,.visual-intro-stage,.lex-visual').forEach(el=>{
        gs.to(el,{y:-35,ease:'none',scrollTrigger:{trigger:el,start:'top bottom',end:'bottom top',scrub:1.2}});
      });
      qs('.story-illustration').forEach((svg,i)=>{
        gs.fromTo(svg,{scale:.86,rotation:-3},{scale:1.02,rotation:3,ease:'none',scrollTrigger:{trigger:svg,start:'top 80%',end:'bottom 25%',scrub:1.4}});
      });
      qs('.story-stats b').forEach((n,i)=>{
        gs.from(n,{x:i%2?-50:50,opacity:0,duration:.8,ease:'power3.out',scrollTrigger:{trigger:n,start:'top 82%'}});
      });
      qs('.lex-visual').forEach((visual,i)=>{
        const art=visual.querySelector('.lex-art-svg');
        if(!art) return;
        const paths=art.querySelectorAll('.art-line,.art-arrow,.wifi-arc,.radio,.nfc-wave,.esim-wave,.art-pulse,.art-orbit,.coil,.bt-symbol');
        paths.forEach((path,j)=>{
          const len=path.getTotalLength ? path.getTotalLength() : 220;
          gs.set(path,{strokeDasharray:len,strokeDashoffset:len});
          gs.to(path,{strokeDashoffset:0,duration:.9,ease:'power2.out',delay:j*.035,scrollTrigger:{trigger:visual,start:'top 82%'}});
        });
        gs.fromTo(art,{y:22,rotate:i%2?-1.5:1.5,scale:.94},{y:0,rotate:i%2?1:-1,scale:1,ease:'none',scrollTrigger:{trigger:visual,start:'top 92%',end:'bottom 20%',scrub:1.1}});
        const moving=art.querySelectorAll('.art-dot,.art-pulse,.sun-core,.network-core,.nfc-dot,.wifi-dot,.iris-hole');
        moving.forEach((el,j)=>gs.to(el,{scale:1.18,transformOrigin:'center',duration:1.5+j*.15,repeat:-1,yoyo:true,ease:'sine.inOut',delay:j*.12}));
        const halo=art.querySelector('.art-halo');
        if(halo) gs.to(halo,{scale:1.12,opacity:.7,duration:2.8,repeat:-1,yoyo:true,ease:'sine.inOut'});
      });
      qs('.cat-card').forEach((card,i)=>{
        const art=card.querySelector('.cat-card-media');
        if(art) gs.to(art,{y:-18,rotation:i%2?5:-10,ease:'none',scrollTrigger:{trigger:card,start:'top bottom',end:'bottom top',scrub:1.2}});
      });
    }
  }

  function nav(){
    const header=document.querySelector('.site-header');
    if(!header)return;
    const on=()=>header.classList.toggle('is-scrolled',window.scrollY>12);
    on();window.addEventListener('scroll',on,{passive:true});
  }
  function lexActive(){
    const links=qs('.lexique-nav a');
    if(!links.length)return;
    const sections=links.map(a=>document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){links.forEach(a=>a.classList.toggle('is-active',a.getAttribute('href')==='#'+e.target.id))}}),{rootMargin:'-30% 0px -55%'});
    sections.forEach(s=>io.observe(s));
  }
  basicReveal(); gsapInit(); nav(); lexActive();
  if(!reduce && window.gsap){
    qs('.lex-visual').forEach(v=>{
      const art=v.querySelector('.lex-art-svg'); if(!art) return;
      v.addEventListener('pointermove',e=>{const r=v.getBoundingClientRect(); const x=(e.clientX-r.left)/r.width-.5; const y=(e.clientY-r.top)/r.height-.5; gsap.to(art,{x:x*12,y:y*9,rotateY:x*3,rotateX:-y*3,duration:.45,ease:'power2.out',overwrite:true})});
      v.addEventListener('pointerleave',()=>gsap.to(art,{x:0,y:0,rotateX:0,rotateY:0,duration:.7,ease:'power3.out'}));
    });
  }
})();
