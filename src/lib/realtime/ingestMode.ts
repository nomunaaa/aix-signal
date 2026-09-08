export const BATCH_UPLOAD_INGEST_MODE = 'batch_upload';

export function isBatchUploadRealtimeRow(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false;
  return (row as { ingest_mode?: unknown }).ingest_mode === BATCH_UPLOAD_INGEST_MODE;
}
