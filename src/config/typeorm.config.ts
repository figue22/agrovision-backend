import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: `.env.${process.env.APP_ENV || 'development'}` });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'agrovision_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'agrovision_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
