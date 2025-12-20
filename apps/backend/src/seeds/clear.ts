import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Place } from '../entities/place.entity';

async function clear() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const dataSource = app.get(DataSource);
    const placeRepository = dataSource.getRepository(Place);
    
    console.log('🧹 장소 데이터 삭제 시작...');
    
    // 외래 키 제약조건 때문에 TRUNCATE CASCADE 실행
    await dataSource.query('TRUNCATE TABLE "places" CASCADE');
    // search_history는 places와 직접 FK가 없을 수 있지만, 깔끔하게 정리하려면 같이 지우는 게 좋음
    // await dataSource.query('TRUNCATE TABLE "search_history" CASCADE'); // 필요 시 주석 해제

    console.log('✅ 모든 장소 데이터(및 연관 데이터)가 삭제되었습니다.');
  } catch (error) {
    console.error('❌ 데이터 삭제 실패:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// 스크립트 실행
clear().catch(error => {
  console.error('삭제 스크립트 실행 실패:', error);
  process.exit(1);
});

