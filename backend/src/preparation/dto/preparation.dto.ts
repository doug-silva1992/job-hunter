import { ApiProperty } from '@nestjs/swagger';

export class CompanyInfoDto {
  @ApiProperty({ example: 'Acme' })
  nome: string;

  @ApiProperty({ type: String, nullable: true, description: 'O que a empresa faz, em poucas frases.' })
  resumo: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Tecnologia / Fintech' })
  setor: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'Grande porte (5 mil+ funcionários)' })
  porte: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'São Paulo, SP' })
  sede: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'https://acme.com' })
  site: string | null;

  @ApiProperty({ type: [String], description: 'Produtos e serviços principais.' })
  produtos: string[];

  @ApiProperty({ type: [String], description: 'Missão, valores e cultura.' })
  cultura: string[];

  @ApiProperty({ type: [String], description: 'Dicas para a entrevista nesta empresa.' })
  dicas: string[];
}

export class QuizQuestionDto {
  @ApiProperty()
  pergunta: string;

  @ApiProperty({ type: [String], description: '2 a 6 alternativas.' })
  alternativas: string[];

  @ApiProperty({ description: 'Índice (0-based) da alternativa correta.' })
  correta: number;

  @ApiProperty({ type: String, nullable: true, description: 'Por que a alternativa correta é a certa.' })
  explicacao: string | null;
}

export class PreparationDto {
  @ApiProperty({ format: 'uuid' })
  jobId: string;

  @ApiProperty({ type: CompanyInfoDto })
  empresa: CompanyInfoDto;

  @ApiProperty({ type: [QuizQuestionDto] })
  perguntas: QuizQuestionDto[];
}
