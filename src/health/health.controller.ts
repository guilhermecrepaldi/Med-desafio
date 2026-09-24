import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';

import { errorResponseExample, REQUEST_ID_RESPONSE_HEADERS } from '../common';
import { ErrorResponseDto } from '../common/dto';

class HealthResponseDto {
  @ApiProperty({ example: 'ok' })
  status!: 'ok';
}

@ApiTags('Operação')
@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Verifica se a API e o banco estão acessíveis.' })
  @ApiOkResponse({
    type: HealthResponseDto,
    example: { status: 'ok' },
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  @ApiServiceUnavailableResponse({
    type: ErrorResponseDto,
    description: 'Banco de dados indisponível.',
    example: errorResponseExample(503, '/health', 'Banco de dados indisponível.'),
    headers: REQUEST_ID_RESPONSE_HEADERS,
  })
  async check(): Promise<HealthResponseDto> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Banco de dados indisponível.');
    }

    return { status: 'ok' };
  }
}
