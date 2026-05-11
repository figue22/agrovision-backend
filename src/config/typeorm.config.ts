import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

config({ path: `.env.${process.env.APP_ENV || 'development'}` });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'agrovision_user',
  password: process.env.DB_PASSWORD || 'postgres123',
  database: process.env.DB_DATABASE || 'agrovision_db',
  entities: [join(process.cwd(), 'src/**/*.entity{.ts,.js}')],
  migrations: [join(process.cwd(), 'src/database/migrations/*{.ts,.js}')],
  synchronize: false,
  logging: true,
});