import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { TypeOrmConfigService } from '../../typeorm-config.service';
import databaseConfig from '../../config/database.config';
import appConfig from '../../../config/app.config';
import { PlacementTestSeedModule } from './placement-test/placement-test-seed.module';
import { PlacementTestSeedService } from './placement-test/placement-test-seed.service';

@Module({
  imports: [
    PlacementTestSeedModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, appConfig],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
      dataSourceFactory: async (options: DataSourceOptions) => {
        return new DataSource(options).initialize();
      },
    }),
  ],
})
class SeedTestModule {}

const runSeedTest = async () => {
  const app = await NestFactory.create(SeedTestModule);
  await app.get(PlacementTestSeedService).run();
  await app.close();
};

void runSeedTest();
