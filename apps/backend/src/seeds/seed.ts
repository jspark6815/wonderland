import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { seedPlaces } from './places.seed';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const dataSource = app.get(DataSource);
    
    console.log('🌱 시드 데이터 추가 시작...');
    
    // 스키마 동기화 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      console.log('📊 데이터베이스 스키마 동기화 중...');
      await dataSource.synchronize();
      console.log('✅ 스키마 동기화 완료');
    }
    
    // Places 시드 데이터
    await seedPlaces(dataSource);
    
    console.log('✅ 모든 시드 데이터가 성공적으로 추가되었습니다!');
  } catch (error) {
    console.error('❌ 시드 데이터 추가 실패:', error);
    throw error;
  } finally {
    await app.close();
  }
}

// 스크립트 실행
seed().catch(error => {
  console.error('시드 스크립트 실행 실패:', error);
  process.exit(1);
});
