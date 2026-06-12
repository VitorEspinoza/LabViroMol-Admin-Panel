import { Pipe, PipeTransform } from '@angular/core';
import { MaterialUnit } from '../../../shared/models/inventory.model';

const MATERIAL_UNIT_LABELS: Record<MaterialUnit, string> = {
  Gram: 'Grama',
  Milliliter: 'Mililitro',
  Piece: 'Peça',
};

export const MATERIAL_UNIT_OPTIONS: { label: string; value: MaterialUnit }[] = [
  { label: 'Grama', value: 'Gram' },
  { label: 'Mililitro', value: 'Milliliter' },
  { label: 'Peça', value: 'Piece' },
];

@Pipe({ name: 'materialUnitLabel' })
export class MaterialUnitLabelPipe implements PipeTransform {
  transform(value: MaterialUnit | string | null | undefined): string {
    if (!value) return '';
    return MATERIAL_UNIT_LABELS[value as MaterialUnit] ?? value;
  }
}
