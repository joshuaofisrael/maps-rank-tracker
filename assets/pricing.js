import { config } from "../app/config.js";
if (config.paidOpen) {
  document.getElementById("paid-note").innerHTML = "<strong>Founding plans: limited spots, now open.</strong>";
  for (const card of document.querySelectorAll("[data-plan]")) {
    const a = card.querySelector(".plan-btn"), link = config.paymentLinks[card.dataset.plan];
    if (a && link) { a.href = link; a.textContent = "Claim a founding spot"; a.rel = "noopener"; }
  }
}
