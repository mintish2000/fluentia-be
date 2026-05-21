import { Logger, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import bcrypt from 'bcryptjs';
import databaseConfig from '../../config/database.config';
import appConfig from '../../../config/app.config';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import { UserEntity } from '../../../users/infrastructure/persistence/relational/entities/user.entity';

const ADMIN_EMAIL = 'user@admin.com';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options?: DataSourceOptions) => {
        if (!options) {
          throw new Error('TypeORM options are not available');
        }

        return new DataSource(options).initialize();
      },
    }),
  ],
})
class AdminPasswordScriptModule {}

const run = async () => {
  const logger = new Logger('AdminPasswordScript');
  const newPassword = process.argv[2]?.trim();

  if (!newPassword) {
    throw new Error(
      'Missing password. Usage: npm run admin:password:reset -- <newPassword>',
    );
  }

  const app = await NestFactory.createApplicationContext(
    AdminPasswordScriptModule,
  );

  try {
    const dataSource = app.get(DataSource);
    const usersRepository = dataSource.getRepository(UserEntity);

    const adminUser = await usersRepository.findOne({
      where: { email: ADMIN_EMAIL },
    });

    if (!adminUser) {
      throw new Error(`User not found: ${ADMIN_EMAIL}`);
    }

    adminUser.password = await bcrypt.hash(newPassword, 10);
    await usersRepository.save(adminUser);

    logger.log(`Password updated for ${ADMIN_EMAIL}`);
  } finally {
    await app.close();
  }
};

void run();
