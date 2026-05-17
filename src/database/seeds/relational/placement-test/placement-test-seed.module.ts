import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlacementEntity } from '../../../../placement/infrastructure/persistence/relational/entities/placement.entity';
import { PlacementTestSeedService } from './placement-test-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlacementEntity])],
  providers: [PlacementTestSeedService],
  exports: [PlacementTestSeedService],
})
export class PlacementTestSeedModule {}
