import { describe, expect, it } from 'vitest';

import { MaterialUnitLabelPipe } from './material-unit-label.pipe';

describe('MaterialUnitLabelPipe', () => {
  const pipe = new MaterialUnitLabelPipe();

  it('traduz Gram para Grama', () => {
    expect(pipe.transform('Gram')).toBe('Grama');
  });

  it('traduz Milliliter para Mililitro', () => {
    expect(pipe.transform('Milliliter')).toBe('Mililitro');
  });

  it('traduz Piece para Peça', () => {
    expect(pipe.transform('Piece')).toBe('Peça');
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
