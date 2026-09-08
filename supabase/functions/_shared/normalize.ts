/**
 * 데이터 정규화 유틸리티
 */

/**
 * 추세 값을 표준화 (-100, 0, 100)
 */
export function normalizeTrendDirection(rawDirection: number): -100 | 0 | 100 {
  if (rawDirection > 0) return 100;
  if (rawDirection < 0) return -100;
  return 0;
}

/**
 * 변동성 강도를 표준화 (-200, 0, 200)
 */
export function normalizeVolatilityStrength(rawStrength: number): -200 | 0 | 200 {
  if (rawStrength > 0) return 200;
  if (rawStrength < 0) return -200;
  return 0;
}

/**
 * 멱등 키 생성
 */
export function generateUniqueKey(
  symbol: string,
  barinterval: string,
  timestamp: number,
  indicatorName: string
): string {
  // 간단한 해시 생성 (실제로는 crypto.subtle.digest 사용)
  const payload = `${symbol}|${barinterval}|${timestamp}|${indicatorName}`;
  
  // Deno crypto 사용
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hash = new Uint8Array(32);
  let hashValue = 0;
  
  for (let i = 0; i < data.length; i++) {
    hashValue = ((hashValue << 5) - hashValue) + data[i];
    hashValue = hashValue & hashValue;
  }
  
  // 32바이트 해시로 변환
  for (let i = 0; i < 32; i++) {
    hash[i] = (hashValue >> (i * 8)) & 0xff;
  }
  
  // Hex 문자열로 변환
  return Array.from(hash)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
