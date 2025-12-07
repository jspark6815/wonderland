import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { NaverPlacesService } from './services/naver-places.service';
import { PlacesCacheService } from './services/places-cache.service';
import { SearchHistoryService } from './services/search-history.service';
import { Place } from '../../entities/place.entity';
import { SearchHistory } from '../../entities/search-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Place, SearchHistory]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [PlacesController],
  providers: [
    PlacesService,
    NaverPlacesService,
    PlacesCacheService,
    SearchHistoryService,
  ],
  exports: [PlacesService, SearchHistoryService],
})
export class PlacesModule {}
