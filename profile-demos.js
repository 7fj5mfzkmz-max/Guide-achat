(function () {
  "use strict";
  var gs = window.gsap;
  var ST = window.ScrollTrigger;
  if (!gs) return;
  if (ST) gs.registerPlugin(ST);
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function playOnEnter(target, fn) {
    if (!ST) { fn(); return; }
    ST.create({trigger: target, start: "top 82%", once: true, onEnter: fn});
  }

  document.querySelectorAll(".battery-compare-demo").forEach(function(demo){
    var phones = demo.querySelectorAll(".battery-phone");
    playOnEnter(demo, function(){
      phones.forEach(function(phone, i){
        var level = phone.querySelector(".battery-level");
        if (!level) return;
        gs.set(level, {height: "18%"});
        if (!reduced) {
          gs.to(level, {height: i ? "50%" : "20%", duration: 1.5, delay: i*.18, ease: "power2.out"});
          gs.to(phone, {y: -5, duration: .5, delay: i*.18, yoyo: true, repeat: 1, ease: "power1.inOut"});
        } else gs.set(level, {height: i ? "50%" : "20%"});
      });
    });
  });

  document.querySelectorAll(".brightness-compare-demo").forEach(function(demo){
    playOnEnter(demo, function(){
      var bars = demo.querySelectorAll(".brightness-bar");
      if (!reduced) {
        gs.fromTo(bars, {scaleX:.35, opacity:.45}, {scaleX:1, opacity:1, duration:1.1, stagger:.18, ease:"power2.out"});
        gs.to(demo.querySelectorAll(".brightness-phone"), {y:-5, duration:.55, stagger:.18, yoyo:true, repeat:1, ease:"power1.inOut"});
      } else gs.set(bars, {scaleX:1, opacity:1});
    });
  });

  // RAM blocks: build them once, then animate the occupied blocks with GSAP.
  document.querySelectorAll(".ram-card").forEach(function(card){
    var slots = card.querySelector(".ram-slots");
    if (!slots || slots.children.length) return;
    var ram = Number(card.getAttribute("data-ram"));
    for (var i=0;i<12;i++) {
      var slot=document.createElement("span");
      slot.className=i<ram?"is-used":"";
      slot.style.setProperty("--ram-index", i);
      slots.appendChild(slot);
    }
  });
  document.querySelectorAll(".ram-demo").forEach(function(demo){
    playOnEnter(demo, function(){
      var used=demo.querySelectorAll(".ram-slots .is-used");
      if (reduced) { gs.set(used,{scaleY:1,opacity:1}); return; }
      gs.fromTo(used,{scaleY:.2,opacity:.35},{scaleY:1,opacity:1,duration:.42,stagger:.055,ease:"back.out(1.7)",repeat:-1,yoyo:true,repeatDelay:1.4});
    });
  });

  // Charging: animate the three rates continuously; faster wattage fills faster.
  document.querySelectorAll(".charging-demo").forEach(function(demo){
    playOnEnter(demo, function(){
      demo.querySelectorAll(".charging-card").forEach(function(card){
        var fill=card.querySelector(".battery-fill");
        var speed=Number(card.getAttribute("data-charge-speed"))||50;
        if (!fill) return;
        gs.set(fill,{scaleX:.05});
        if (!reduced) gs.to(fill,{scaleX:.95,duration:Math.max(.9,3.8-speed/35),ease:"power1.inOut",repeat:-1,yoyo:true,repeatDelay:.35});
        else gs.set(fill,{scaleX:.72});
      });
    });
  });

  // Photo comparison remains manual, but gets a subtle GSAP affordance.
  document.querySelectorAll(".photo-slider-container").forEach(function(slider){
    var handle=slider.querySelector(".photo-slider-handle"), before=slider.querySelector(".photo-slider-before");
    if(!handle||!before) return;
    var down=false;
    function update(e){
      if(!down) return;
      var rect=slider.getBoundingClientRect(), x=e.clientX;
      if(x==null && e.touches && e.touches[0]) x=e.touches[0].clientX;
      if(x==null)return;
      var pct=Math.max(0,Math.min(100,((x-rect.left)/rect.width)*100));
      before.style.width=pct+"%"; handle.style.left=pct+"%";
    }
    handle.addEventListener("pointerdown",function(){down=true;});
    window.addEventListener("pointermove",update);
    window.addEventListener("pointerup",function(){down=false;});
    before.style.width="50%"; handle.style.left="50%";
    if(!reduced) gs.fromTo(handle,{scale:1},{scale:1.08,duration:.7,yoyo:true,repeat:-1,ease:"sine.inOut"});
  });
})();
