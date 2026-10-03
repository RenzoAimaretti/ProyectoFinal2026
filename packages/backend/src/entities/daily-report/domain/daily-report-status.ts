export type DailyReportStatus =
  | 'PENDIENTE_APROBACION'
  | 'APROBADO'
  | 'RECHAZADO';

/**
 * A daily report is always created as pending approval. The approver role is
 * the only one allowed to move it forward, so creation never decides the
 * outcome.
 */
export const DAILY_REPORT_INITIAL_STATUS: DailyReportStatus =
  'PENDIENTE_APROBACION';

export const DAILY_REPORT_APPROVED_STATUS: DailyReportStatus = 'APROBADO';

export const DAILY_REPORT_REJECTED_STATUS: DailyReportStatus = 'RECHAZADO';
