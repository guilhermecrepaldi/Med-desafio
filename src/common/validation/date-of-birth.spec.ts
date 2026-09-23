import { BadRequestException } from '@nestjs/common';

import { formatCompactDate, parseCompactDate } from './date-of-birth';

describe('parseCompactDate', () => {
  it('converte uma data válida do contrato externo para DATE do banco', () => {
    expect(parseCompactDate('19970601')).toBe('1997-06-01');
  });

  it.each(['19970229', '19971301', 'abc', '199701'])('rejeita data inválida: %s', (value) => {
    expect(() => parseCompactDate(value)).toThrow(BadRequestException);
  });

  it('preserva o formato externo na resposta', () => {
    expect(formatCompactDate('1997-06-01')).toBe('19970601');
  });
});
