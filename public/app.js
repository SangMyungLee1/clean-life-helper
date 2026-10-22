(() => {
  const navToggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
    });
  }

  const forms = [...document.querySelectorAll("[data-region-finder]")];
  if (!forms.length) return;

  let regionData = null;
  const normalize = (value) => value.trim().replace(/\s+/g, " ");

  async function loadRegions() {
    if (regionData) return regionData;
    const response = await fetch("/data/regions.json", { credentials: "same-origin" });
    if (!response.ok) throw new Error("지역 정보를 불러오지 못했습니다.");
    regionData = await response.json();
    return regionData;
  }

  loadRegions().then((data) => {
    document.querySelectorAll("#region-options").forEach((list) => {
      const fragment = document.createDocumentFragment();
      data.regions.forEach((region) => {
        const option = document.createElement("option");
        option.value = region.name;
        fragment.append(option);
      });
      list.replaceChildren(fragment);
    });
  }).catch(() => {});

  forms.forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const error = form.querySelector("[data-finder-error]");
      const button = form.querySelector("button[type='submit']");
      error.hidden = true;
      button.disabled = true;
      try {
        const data = await loadRegions();
        const entered = normalize(new FormData(form).get("region") || "");
        const category = new FormData(form).get("category");
        const region = data.regions.find((item) => normalize(item.name) === entered);
        if (!region) {
          error.textContent = "목록에 있는 지역명을 선택해 주세요. 예: 서울 종로구 평창동";
          error.hidden = false;
          return;
        }
        const segments = [category, ...region.segments].map(encodeURIComponent);
        segments[segments.length - 1] += ".html";
        window.location.assign(`/${segments.join("/")}`);
      } catch (reason) {
        error.textContent = reason?.message || "잠시 후 다시 시도해 주세요.";
        error.hidden = false;
      } finally {
        button.disabled = false;
      }
    });
  });
})();
