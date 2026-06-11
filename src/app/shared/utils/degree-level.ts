import { DegreeLevel } from '../models/research.model';

export const DEGREE_LEVEL_LABELS: Record<DegreeLevel, string> = {
  Undergraduate: 'Graduação',
  Specialization: 'Especialização',
  Masters: 'Mestrado',
  Doctorate: 'Doutorado',
  PostDoctorate: 'Pós-Doutorado',
};

export const DEGREE_LEVEL_OPTIONS: { label: string; value: DegreeLevel }[] = (
  Object.keys(DEGREE_LEVEL_LABELS) as DegreeLevel[]
).map(value => ({ label: DEGREE_LEVEL_LABELS[value], value }));
