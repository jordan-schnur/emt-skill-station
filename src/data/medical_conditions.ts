// Types for medical condition entries (from js/medical_conditions.js).
// During migration the data lives on window.MEDICAL_CONDITIONS (loaded via script tag).
// Phase 8 will inline the data here directly.

export interface MedicalCondition {
  id: string;
  name: string;
  category: string;
  compareGroup: string;
  onset: string;
  keyDifferentiator: string;
  signs: string[];
  distinguishing: string[];
  criticalFindings: string[];
  treatment: string[];
  compareDimensions: Record<string, string>;
}

declare global {
  interface Window {
    MEDICAL_CONDITIONS: MedicalCondition[];
  }
}

export function getMedicalConditions(): MedicalCondition[] {
  return window.MEDICAL_CONDITIONS ?? [];
}
