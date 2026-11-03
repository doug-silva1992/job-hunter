// DataSource usado apenas pela CLI do TypeORM (npm run migration:*).
// A CLI lê a versão compilada em dist/, por isso os scripts fazem o build antes.
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from './typeorm.config.js';

try {
  process.loadEnvFile();
} catch {
  // sem .env: usa as variáveis de ambiente já definidas
}

export default new DataSource(dataSourceOptions());
