import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { VisitFeedback } from '../../entities/visit-feedback.entity';
import { Place } from '../../entities/place.entity';
import { SearchHistory } from '../../entities/search-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([VisitFeedback, Place, SearchHistory]),
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}

