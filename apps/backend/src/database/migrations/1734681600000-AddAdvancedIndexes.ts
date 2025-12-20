import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 고급 인덱스 마이그레이션
 * 
 * 1. Full-text Search (tsvector + GIN 인덱스)
 * 2. PostGIS 공간 인덱스 (GiST)
 * 3. 복합 인덱스 최적화
 * 4. 부분 인덱스 (자주 사용되는 조건)
 */
export class AddAdvancedIndexes1734681600000 implements MigrationInterface {
  name = 'AddAdvancedIndexes1734681600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============ 1. Full-text Search 설정 ============
    
    // searchVector 컬럼 추가 (없으면)
    await queryRunner.query(`
      ALTER TABLE "places" 
      ADD COLUMN IF NOT EXISTS "searchVector" tsvector
    `);

    // GIN 인덱스 생성 (Full-text Search용)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_places_search_vector" 
      ON "places" USING GIN ("searchVector")
    `);

    // tsvector 자동 업데이트 함수 생성
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION places_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW."searchVector" := 
          setweight(to_tsvector('simple', COALESCE(NEW.name, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'C') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.features, ' '), '')), 'D') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.atmosphere, ' '), '')), 'D') ||
          setweight(to_tsvector('simple', COALESCE(NEW.address, '')), 'D');
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    // 트리거 생성 (INSERT/UPDATE 시 자동 업데이트)
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS places_search_vector_trigger ON "places";
      CREATE TRIGGER places_search_vector_trigger
      BEFORE INSERT OR UPDATE ON "places"
      FOR EACH ROW EXECUTE FUNCTION places_search_vector_update();
    `);

    // 기존 데이터의 searchVector 업데이트
    await queryRunner.query(`
      UPDATE "places" SET 
        "searchVector" = 
          setweight(to_tsvector('simple', COALESCE(name, '')), 'A') ||
          setweight(to_tsvector('simple', COALESCE(description, '')), 'B') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(tags, ' '), '')), 'C') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(keywords, ' '), '')), 'C') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(features, ' '), '')), 'D') ||
          setweight(to_tsvector('simple', COALESCE(array_to_string(atmosphere, ' '), '')), 'D') ||
          setweight(to_tsvector('simple', COALESCE(address, '')), 'D')
      WHERE "searchVector" IS NULL;
    `);

    // ============ 2. PostGIS 공간 인덱스 (GiST) ============
    
    // PostGIS 확장 확인/설치
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis;`);

    // GiST 공간 인덱스 생성
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_places_location_gist" 
      ON "places" USING GIST (location)
    `);

    // ============ 3. 복합 인덱스 최적화 ============
    
    // 카테고리 + 평점 복합 인덱스 (카테고리별 인기순 조회)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_places_category_rating" 
      ON "places" (category, rating DESC NULLS LAST)
    `);

    // 카테고리 + 위치 복합 인덱스 (카테고리별 위치 검색)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_places_category_location" 
      ON "places" USING GIST (category, location)
    `);

    // ============ 4. 부분 인덱스 (자주 사용되는 조건) ============
    
    // 삭제되지 않은 장소만 인덱싱 (Soft Delete 최적화)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_places_active" 
      ON "places" (id) 
      WHERE "deletedAt" IS NULL
    `);

    // 평점 4.0 이상인 장소 (고평점 필터 최적화)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_places_high_rating" 
      ON "places" (rating DESC) 
      WHERE rating >= 4.0 AND "deletedAt" IS NULL
    `);

    // 외부 API 데이터 (NAVER 소스) 인덱싱
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_places_naver_external" 
      ON "places" ("externalId") 
      WHERE source = 'NAVER'
    `);

    // ============ 5. 검색 기록 최적화 인덱스 ============
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_search_history_user_recent" 
      ON "search_history" ("userId", "createdAt" DESC)
    `);

    // ============ 6. 피드백 통계 최적화 인덱스 ============
    
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_visit_feedback_place_stats" 
      ON "visit_feedbacks" ("placeId", "overallRating")
      WHERE "overallRating" IS NOT NULL
    `);

    // ============ 7. 감사 로그 테이블 생성 ============
    
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "action" varchar NOT NULL,
        "entityType" varchar NOT NULL,
        "entityId" varchar NOT NULL,
        "userId" varchar,
        "oldData" jsonb,
        "newData" jsonb,
        "changedFields" text[],
        "ipAddress" varchar,
        "userAgent" varchar,
        "metadata" jsonb,
        "createdAt" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity" 
      ON "audit_logs" ("entityType", "entityId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" 
      ON "audit_logs" ("userId", "createdAt" DESC)
    `);

    // ============ 8. 사용자 선호도 테이블 생성 ============
    
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "prefCafe" decimal(3,2) DEFAULT 0.5,
        "prefRestaurant" decimal(3,2) DEFAULT 0.5,
        "prefAccommodation" decimal(3,2) DEFAULT 0.5,
        "prefShopping" decimal(3,2) DEFAULT 0.5,
        "prefCulture" decimal(3,2) DEFAULT 0.5,
        "prefEntertainment" decimal(3,2) DEFAULT 0.5,
        "prefQuiet" decimal(3,2) DEFAULT 0.5,
        "prefLively" decimal(3,2) DEFAULT 0.5,
        "prefRomantic" decimal(3,2) DEFAULT 0.5,
        "prefModern" decimal(3,2) DEFAULT 0.5,
        "prefTraditional" decimal(3,2) DEFAULT 0.5,
        "prefPriceMin" integer,
        "prefPriceMax" integer,
        "prefValueForMoney" decimal(3,2) DEFAULT 0.5,
        "prefMinRating" decimal(2,1) DEFAULT 4.0,
        "prefRatingImportance" decimal(3,2) DEFAULT 0.7,
        "frequentAreas" jsonb,
        "prefSearchRadius" integer DEFAULT 2000,
        "timePreference" jsonb,
        "dayPreference" jsonb,
        "needParking" decimal(3,2) DEFAULT 0.3,
        "prefSolo" decimal(3,2) DEFAULT 0.5,
        "prefGroup" decimal(3,2) DEFAULT 0.5,
        "prefPetFriendly" decimal(3,2) DEFAULT 0.2,
        "learnedKeywords" jsonb,
        "totalSearches" integer DEFAULT 0,
        "totalFeedbacks" integer DEFAULT 0,
        "lastLearnedAt" timestamp,
        "algorithmVersion" integer DEFAULT 1,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_user_preferences_user" 
      ON "user_preferences" ("userId")
    `);

    console.log('✅ Advanced indexes migration completed successfully');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 인덱스 삭제
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_places_search_vector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_places_location_gist"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_places_category_rating"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_places_category_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_places_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_places_high_rating"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_places_naver_external"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_search_history_user_recent"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_visit_feedback_place_stats"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_logs_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_user_preferences_user"`);

    // 트리거 삭제
    await queryRunner.query(`DROP TRIGGER IF EXISTS places_search_vector_trigger ON "places"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS places_search_vector_update()`);

    // 컬럼 삭제
    await queryRunner.query(`ALTER TABLE "places" DROP COLUMN IF EXISTS "searchVector"`);

    // 테이블 삭제
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_preferences"`);

    console.log('✅ Advanced indexes migration rolled back');
  }
}

