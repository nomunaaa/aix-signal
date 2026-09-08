/**
 * Upstash Redis REST API Client
 * Week 1: 기본 캐싱 구현
 */

export class RedisClient {
  private url: string;
  private token: string;

  constructor() {
    this.url = Deno.env.get('UPSTASH_REDIS_REST_URL')!;
    this.token = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!;

    if (!this.url || !this.token) {
      throw new Error('❌ UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }
  }

  /**
   * GET: 캐시에서 데이터 조회
   */
  async get(key: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.url}/get/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      
      if (!response.ok) {
        console.warn(`⚠️ Redis GET failed: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('❌ Redis GET error:', error);
      return null;
    }
  }

  /**
   * SET: 캐시에 데이터 저장 (TTL 포함)
   */
  async set(key: string, value: string, exSeconds: number): Promise<void> {
    try {
      const response = await fetch(`${this.url}/set/${key}/${encodeURIComponent(value)}/EX/${exSeconds}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (!response.ok) {
        console.warn(`⚠️ Redis SET failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Redis SET error:', error);
    }
  }

  /**
   * DEL: 캐시 키 삭제 (무효화)
   */
  async del(key: string): Promise<void> {
    try {
      const response = await fetch(`${this.url}/del/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (!response.ok) {
        console.warn(`⚠️ Redis DEL failed: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Redis DEL error:', error);
    }
  }

  /**
   * TTL: 남은 TTL 확인 (초 단위)
   */
  async ttl(key: string): Promise<number> {
    try {
      const response = await fetch(`${this.url}/ttl/${key}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      if (!response.ok) {
        return -2; // key not found
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('❌ Redis TTL error:', error);
      return -2;
    }
  }
}
