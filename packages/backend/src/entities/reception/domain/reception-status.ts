export type ReceptionStatus = 'PENDIENTE_VALIDACION' | 'VALIDADA' | 'RECHAZADA';

/**
 * A reception always enters the system pending validation. Only the
 * administrator/contractor validates it, and only from the web application, so
 * creation never decides the outcome (CUU06, section 7.5).
 */
export const RECEPTION_INITIAL_STATUS: ReceptionStatus = 'PENDIENTE_VALIDACION';

export const RECEPTION_VALIDATED_STATUS: ReceptionStatus = 'VALIDADA';

export const RECEPTION_REJECTED_STATUS: ReceptionStatus = 'RECHAZADA';
