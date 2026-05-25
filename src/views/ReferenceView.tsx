import { route, navigate } from "../store/appStore";
import { ConditionsMode } from "./reference/ConditionsMode";
import { MnemonicsMode } from "./reference/MnemonicsMode";
import { MedsMode } from "./reference/MedsMode";

type RefTab = "conditions" | "mnemonics" | "meds";

const TABS: { id: RefTab; label: string }[] = [
  { id: "conditions", label: "Conditions" },
  { id: "mnemonics", label: "Mnemonics" },
  { id: "meds", label: "Meds" },
];

export function ReferenceView() {
  const tab = (route.value.referenceTab as RefTab) ?? "conditions";

  return (
    <div class="ref-wrap">
      <div class="eyebrow">Reference</div>
      <h1 class="page-title">Look it up.</h1>
      <p class="page-sub">Conditions, mnemonics, and BLS medications — browse or quiz yourself.</p>
      <div class="ref-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            class={`ref-tab-btn${tab === t.id ? " active" : ""}`}
            type="button"
            onClick={() => navigate({ view: "reference", referenceTab: t.id })}
          >{t.label}</button>
        ))}
      </div>
      {tab === "conditions" && <ConditionsMode />}
      {tab === "mnemonics" && <MnemonicsMode />}
      {tab === "meds" && <MedsMode />}
    </div>
  );
}
