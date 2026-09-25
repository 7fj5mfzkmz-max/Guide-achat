(function () {
  "use strict";
  var box = document.getElementById("comparateur");
  if (!box) return;
  var picker = document.getElementById("compare-picker");
  var resultBox = document.getElementById("compare-result");
  var category = box.dataset.category;
  var dataUrl = category + ".json";
  var MAX_SELECTION = 5, MIN_SELECTION = 2;
  var STORAGE_KEY = "guide-achat-compare-selection";
  var CHAMPS = [
    { cle:"ecran", label:"Écran" }, { cle:"processeur", label:"Processeur" }, { cle:"ram", label:"Mémoire vive" },
    { cle:"stockage", label:"Stockage" }, { cle:"batterie", label:"Batterie" }, { cle:"photo", label:"Photo" },
    { cle:"etancheite", label:"Protection eau/poussière" }, { cle:"os", label:"Système" }
  ];
  var produits=[];

  function readSelection() {
    var ids=[];
    try { ids=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"[]"); } catch(e) {}
    var params=new URLSearchParams(window.location.search).get("selection");
    if (params) ids=params.split(",").filter(Boolean);
    return ids.slice(0,MAX_SELECTION);
  }
  function saveSelection(ids) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0,MAX_SELECTION))); }
  function idsSelectionnes() { return Array.prototype.slice.call(picker.querySelectorAll("input:checked")).map(function(i){return i.value;}); }

  function construirePicker(initial) {
    picker.innerHTML="";
    var toolbar=document.createElement("div"); toolbar.className="compare-toolbar";
    var count=document.createElement("span"); count.id="compare-count"; count.className="compare-count";
    var clear=document.createElement("button"); clear.type="button"; clear.className="btn"; clear.textContent="Effacer la sélection";
    clear.addEventListener("click",function(){ saveSelection([]); picker.querySelectorAll("input").forEach(function(i){i.checked=false;}); surSelectionChangee(); });
    toolbar.appendChild(count); toolbar.appendChild(clear); picker.appendChild(toolbar);
    produits.forEach(function(p){
      var label=document.createElement("label"); label.className="compare-choice";
      var input=document.createElement("input"); input.type="checkbox"; input.value=p.id; input.checked=initial.indexOf(p.id)!==-1; input.addEventListener("change",surSelectionChangee);
      label.appendChild(input); label.appendChild(document.createTextNode(p.nom+" : ≈ "+(typeof p.prix_indicatif==="number"?p.prix_indicatif+" €":"prix à vérifier")));
      picker.appendChild(label);
    });
    updateCount(initial);
  }
  function updateCount(ids){ var count=document.getElementById("compare-count"); if(count) count.textContent=ids.length+" / "+MAX_SELECTION+" modèle"+(ids.length>1?"s":"")+" sélectionné"+(ids.length>1?"s":""); }
  function surSelectionChangee(){
    var ids=idsSelectionnes();
    if(ids.length>MAX_SELECTION) ids=ids.slice(0,MAX_SELECTION);
    saveSelection(ids); updateCount(ids);
    picker.querySelectorAll("input").forEach(function(input){ input.disabled=!input.checked && ids.length>=MAX_SELECTION; });
    afficherComparatif(ids);
  }
  function afficherComparatif(ids){
    resultBox.innerHTML="";
    if(ids.length<MIN_SELECTION){
      var hint=document.createElement("p"); hint.className="hint"; hint.textContent="Sélectionnez au moins "+MIN_SELECTION+" modèles pour afficher la comparaison. Vous pouvez en sélectionner jusqu'à "+MAX_SELECTION+"."; resultBox.appendChild(hint); return;
    }
    var selection=produits.filter(function(p){return ids.indexOf(p.id)!==-1;});
    var wrap=document.createElement("div"); wrap.className="table-wrap";
    var table=document.createElement("table"); var thead=document.createElement("thead"); var tr=document.createElement("tr");
    var first=document.createElement("th"); first.textContent="Caractéristique"; tr.appendChild(first);
    selection.forEach(function(p){var th=document.createElement("th");th.textContent=p.nom;tr.appendChild(th);}); thead.appendChild(tr);table.appendChild(thead);
    var tbody=document.createElement("tbody");
    var rows = [{
      label: "Prix indicatif",
      get: function (p) { return typeof p.prix_indicatif === "number" ? "≈ " + p.prix_indicatif + " €" : "À vérifier"; }
    }].concat(CHAMPS.map(function (c) {
      return {
        label: c.label,
        get: function (p) { return (p.caracteristiques && p.caracteristiques[c.cle]) || " : "; }
      };
    }));
    rows.forEach(function(row){var tr=document.createElement("tr");var td=document.createElement("td");td.textContent=row.label;tr.appendChild(td);selection.forEach(function(p){var cell=document.createElement("td");cell.textContent=row.get(p);cell.style.whiteSpace="normal";tr.appendChild(cell);});tbody.appendChild(tr);});
    table.appendChild(tbody);wrap.appendChild(table);resultBox.appendChild(wrap);
  }
  fetch(dataUrl).then(function(r){if(!r.ok)throw new Error("Réponse HTTP "+r.status);return r.json();}).then(function(data){
    produits=data.produits||[]; var initial=readSelection().filter(function(id){return produits.some(function(p){return p.id===id;});}); construirePicker(initial); afficherComparatif(initial);
  }).catch(function(err){picker.innerHTML="";var e=document.createElement("p");e.className="hint";e.textContent="Le comparateur n'a pas pu charger les données produits ("+err.message+").";picker.appendChild(e);});
})();
