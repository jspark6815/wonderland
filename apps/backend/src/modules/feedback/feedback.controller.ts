import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { CreateVisitFeedbackDto, PendingFeedbackDto } from './dto/create-feedback.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('feedback')
@Controller('api/v1/feedback')
@ApiBearerAuth()
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: '방문 피드백 제출' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '피드백 저장 성공' })
  async createFeedback(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVisitFeedbackDto,
  ) {
    const feedback = await this.feedbackService.createFeedback(userId, dto);
    return {
      success: true,
      message: '소중한 피드백 감사합니다! 🙏',
      feedbackId: feedback.id,
    };
  }

  @Get('pending')
  @ApiOperation({ summary: '피드백 요청 대기 목록 (5분 이상 지난 검색)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PendingFeedbackDto] })
  async getPendingFeedbacks(
    @CurrentUser('sub') userId: string,
  ): Promise<PendingFeedbackDto[]> {
    return this.feedbackService.getPendingFeedbacks(userId);
  }

  @Get('place/:placeId/summary')
  @ApiOperation({ summary: '장소별 피드백 요약' })
  @ApiResponse({ status: HttpStatus.OK })
  async getPlaceFeedbackSummary(@Param('placeId') placeId: string) {
    return this.feedbackService.getPlaceFeedbackSummary(placeId);
  }
}



