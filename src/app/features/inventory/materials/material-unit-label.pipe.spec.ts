import { describe, expect, it } from 'vitest';

import { MaterialUnitLabelPipe } from './material-unit-label.pipe';

describe('MaterialUnitLabelPipe', () => {
  const pipe = new MaterialUnitLabelPipe();

  it('traduz Gram para Grama(s)', () => {
    expect(pipe.transform('Gram')).toBe('Grama(s)');
  });

  it('traduz Milliliter para Mililitro(s)', () => {
    expect(pipe.transform('Milliliter')).toBe('Mililitro(s)');
  });

  it('traduz Piece para Peça(s)', () => {
    expect(pipe.transform('Piece')).toBe('Peça(s)');
  });

  it('retorna string vazia para valores nulos ou vazios', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('retorna o valor original quando não há tradução conhecida', () => {
    expect(pipe.transform('Outro')).toBe('Outro');
  });
});
