/**
 * TMDB API Type Definitions
 * @see https://developer.themoviedb.org/docs
 */

/**
 * 영화 기본 정보
 */
interface Movie {
  /** 성인 콘텐츠 여부 */
  adult: boolean;
  /** 백드롭 이미지 경로 */
  backdrop_path: string | null;
  /** 장르 ID 목록 */
  genre_ids: number[];
  /** 영화 ID */
  id: number;
  /** 원본 언어 */
  original_language: string;
  /** 원본 제목 */
  original_title: string;
  /** 영화 개요 */
  overview: string;
  /** 인기도 점수 */
  popularity: number;
  /** 포스터 이미지 경로 */
  poster_path: string | null;
  /** 개봉일 (YYYY-MM-DD) */
  release_date: string;
  /** 제목 */
  title: string;
  /** 비디오 여부 */
  video: boolean;
  /** 평균 평점 */
  vote_average: number;
  /** 투표 수 */
  vote_count: number;
}

/**
 * TMDB API 엔드포인트별 타입 정의
 */
type Paths = {
  "/movie/popular": {
    GET: {
      parameters: {
        query: {
          /** 언어 코드 (ISO-639-1) (기본값: "en-US") */
          language?: string;
          /** 페이지 번호 (기본값: 1) */
          page?: number;
          /** 지역 코드 (ISO-3166-1) */
          region?: string;
        };
        path?: never;
        header?: never;
        body?: never;
      };
      responses: {
        200: {
          /** 현재 페이지 */
          page: number;
          /** 결과 목록 */
          results: Movie[];
          /** 전체 페이지 수 */
          total_pages: number;
          /** 전체 결과 수 */
          total_results: number;
        };
      };
    };
  };
};
