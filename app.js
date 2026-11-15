(function () {
  "use strict";

  var STORAGE_KEY = "money-calculator.v1";
  var money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

  function pct(n) {
    if (!Number.isFinite(n)) return "—";
    var digits = Math.abs(n) < 10 && n % 1 !== 0 ? 2 : Math.abs(n % 1) < 1e-9 ? 0 : 2;
    return n.toFixed(digits) + "%";
  }

  function num(id) {
    var n = Number(document.getElementById(id).value);
    return Number.isFinite(n) ? n : NaN;
  }

  function setText(id, value) {
    document.getElementById(id).textContent = value;
  }

  var state = {
    tab: "margin",
    discountType: "percent",
    margin: { cost: "40", price: "65", targetMargin: "", targetMarkup: "" },
    tip: { bill: "86.40", tipPercent: "20", people: "3", roundUp: false },
    discount: { original: "120", value: "20" },
  };

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved.tab) state.tab = saved.tab;
      if (saved.discountType) state.discountType = saved.discountType;
      if (saved.margin) Object.assign(state.margin, saved.margin);
      if (saved.tip) Object.assign(state.tip, saved.tip);
      if (saved.discount) Object.assign(state.discount, saved.discount);
    } catch (e) { /* keep defaults */ }
  }

  function persist() {
    state.margin = {
      cost: document.getElementById("cost").value,
      price: document.getElementById("price").value,
      targetMargin: document.getElementById("target-margin").value,
      targetMarkup: document.getElementById("target-markup").value,
    };
    state.tip = {
      bill: document.getElementById("bill").value,
      tipPercent: document.getElementById("tip-percent").value,
      people: document.getElementById("people").value,
      roundUp: document.getElementById("round-up").checked,
    };
    state.discount = {
      original: document.getElementById("original").value,
      value: document.getElementById("discount-value").value,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      tab: state.tab,
      discountType: state.discountType,
      margin: state.margin,
      tip: state.tip,
      discount: state.discount,
    }));
  }

  function applyInputs() {
    document.getElementById("cost").value = state.margin.cost;
    document.getElementById("price").value = state.margin.price;
    document.getElementById("target-margin").value = state.margin.targetMargin;
    document.getElementById("target-markup").value = state.margin.targetMarkup;
    document.getElementById("bill").value = state.tip.bill;
    document.getElementById("tip-percent").value = state.tip.tipPercent;
    document.getElementById("people").value = state.tip.people;
    document.getElementById("round-up").checked = !!state.tip.roundUp;
    document.getElementById("original").value = state.discount.original;
    document.getElementById("discount-value").value = state.discount.value;
    setDiscountType(state.discountType, true);
    selectTab(state.tab, true);
    syncTipPresets();
  }

  function computeMargin() {
    var cost = num("cost");
    var price = num("price");
    if (!(cost >= 0) || !(price >= 0)) {
      setText("out-profit", "—");
      setText("out-margin", "—");
      setText("out-markup", "—");
    } else {
      var profit = price - cost;
      setText("out-profit", money.format(profit));
      setText("out-margin", price === 0 ? "—" : pct((profit / price) * 100));
      setText("out-markup", cost === 0 ? "—" : pct((profit / cost) * 100));
    }

    var targetMargin = num("target-margin");
    if (cost >= 0 && Number.isFinite(targetMargin) && targetMargin < 100) {
      var priceFromMargin = cost / (1 - targetMargin / 100);
      setText("out-price-margin", money.format(priceFromMargin));
    } else if (Number.isFinite(targetMargin) && targetMargin >= 100) {
      setText("out-price-margin", "Margin must be under 100%");
    } else {
      setText("out-price-margin", "—");
    }

    var targetMarkup = num("target-markup");
    if (cost >= 0 && Number.isFinite(targetMarkup)) {
      setText("out-price-markup", money.format(cost * (1 + targetMarkup / 100)));
    } else {
      setText("out-price-markup", "—");
    }
  }

  function computeTip() {
    var bill = num("bill");
    var tipPct = num("tip-percent");
    var people = Math.round(num("people"));
    if (!(bill >= 0) || !(tipPct >= 0) || !(people >= 1)) {
      setText("out-tip", "—");
      setText("out-total", "—");
      setText("out-tip-each", "—");
      setText("out-each", "—");
      return;
    }
    var tip = Math.round(bill * (tipPct / 100) * 100) / 100;
    var total = Math.round((bill + tip) * 100) / 100;
    var each = total / people;
    if (document.getElementById("round-up").checked) {
      each = Math.ceil(each);
    } else {
      each = Math.round(each * 100) / 100;
    }
    var tipEach = Math.round((tip / people) * 100) / 100;
    setText("out-tip", money.format(tip));
    setText("out-total", money.format(total));
    setText("out-tip-each", money.format(tipEach));
    setText("out-each", money.format(each));
  }

  function computeDiscount() {
    var original = num("original");
    var value = num("discount-value");
    if (!(original >= 0) || !(value >= 0)) {
      setText("out-save", "—");
      setText("out-sale", "—");
      setText("out-effective", "—");
      return;
    }
    var save = state.discountType === "percent" ? original * (value / 100) : value;
    if (save > original) save = original;
    save = Math.round(save * 100) / 100;
    var sale = Math.round((original - save) * 100) / 100;
    var effective = original === 0 ? 0 : (save / original) * 100;
    setText("out-save", money.format(save));
    setText("out-sale", money.format(sale));
    setText("out-effective", pct(effective));
  }

  function computeAll() {
    computeMargin();
    computeTip();
    computeDiscount();
    persist();
  }

  function setDiscountType(type, skipCompute) {
    state.discountType = type;
    document.getElementById("dtype-percent").setAttribute("aria-pressed", String(type === "percent"));
    document.getElementById("dtype-amount").setAttribute("aria-pressed", String(type === "amount"));
    document.getElementById("discount-value-label").textContent = type === "percent" ? "Percent off" : "Amount off";
    if (!skipCompute) computeAll();
  }

  var tabs = [
    { id: "margin", tab: "tab-margin", panel: "panel-margin" },
    { id: "tip", tab: "tab-tip", panel: "panel-tip" },
    { id: "discount", tab: "tab-discount", panel: "panel-discount" },
  ];

  function selectTab(id, skipCompute) {
    state.tab = id;
    tabs.forEach(function (t) {
      var selected = t.id === id;
      var tabEl = document.getElementById(t.tab);
      var panel = document.getElementById(t.panel);
      tabEl.setAttribute("aria-selected", String(selected));
      tabEl.tabIndex = selected ? 0 : -1;
      panel.hidden = !selected;
    });
    if (!skipCompute) persist();
  }

  tabs.forEach(function (t, index) {
    var tabEl = document.getElementById(t.tab);
    tabEl.addEventListener("click", function () { selectTab(t.id); });
    tabEl.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next = tabs[(index + 1) % tabs.length];
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = tabs[(index + tabs.length - 1) % tabs.length];
      if (e.key === "Home") next = tabs[0];
      if (e.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      e.preventDefault();
      selectTab(next.id);
      document.getElementById(next.tab).focus();
    });
  });

  document.getElementById("dtype-percent").addEventListener("click", function () { setDiscountType("percent"); });
  document.getElementById("dtype-amount").addEventListener("click", function () { setDiscountType("amount"); });

  document.querySelectorAll(".tip-preset").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.getElementById("tip-percent").value = btn.getAttribute("data-tip");
      syncTipPresets();
      computeAll();
    });
  });

  function syncTipPresets() {
    var current = document.getElementById("tip-percent").value;
    document.querySelectorAll(".tip-preset").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-tip") === current));
    });
  }

  ["cost", "price", "target-margin", "target-markup", "bill", "tip-percent", "people", "original", "discount-value"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", function () {
      if (id === "tip-percent") syncTipPresets();
      computeAll();
    });
  });
  document.getElementById("round-up").addEventListener("change", computeAll);

  load();
  applyInputs();
  computeAll();
})();
