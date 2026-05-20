// Types for EMS clinical mnemonic entries (from js/ems_clinical_mnemonics.js).
// During migration the data lives on window.EMS_CLINICAL_MNEMONICS (loaded via script tag).
// Phase 8 will inline the data here directly.

export interface MnemonicLetter {
  letter: string;
  stand: string;
  detail: string;
}

export interface ClinicalMnemonic {
  id: string;
  acronym: string;
  title: string;
  category: string;
  note: string | null;
  letters: MnemonicLetter[];
}

declare global {
  interface Window {
    EMS_CLINICAL_MNEMONICS: ClinicalMnemonic[];
  }
}

export function getEmsClinicalMnemonics(): ClinicalMnemonic[] {
  return window.EMS_CLINICAL_MNEMONICS ?? [];
}
