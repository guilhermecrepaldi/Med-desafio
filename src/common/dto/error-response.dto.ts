import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: '2026-09-23T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/pedidos' })
  path!: string;

  @ApiProperty({ example: 'c31c530a-91ea-4aa0-91c0-bcf32146b917' })
  requestId!: string;

  @ApiProperty({ example: ['CodigoPedido não deve estar vazio'] })
  message!: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error!: string;

  @ApiProperty({ example: 'HTTP_400' })
  errorCode!: string;
}
