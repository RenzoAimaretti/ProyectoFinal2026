import 'models/enums.dart';

/// Errores de dominio (application errors).
///
/// El dominio no conoce HTTP ni widgets; lanza estas excepciones y la capa de
/// presentación las traduce a mensajes de UI (ver `hexagonal-conventions.md`).
class DomainException implements Exception {
  const DomainException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// R009: el lote no tiene receta agronómica, por lo que no se puede cargar el
/// parte diario. El mensaje es para el operario: nombra el lote y nunca muestra
/// su id; [lotId] queda para quien necesite identificarlo.
class LotWithoutRecipeException extends DomainException {
  LotWithoutRecipeException(this.lotId, {String? lotName})
      : super(lotName != null && lotName.trim().isNotEmpty
            ? '${lotName.trim()} no tiene una receta agronómica asociada'
            : 'El lote de la tarea no tiene una receta agronómica asociada');

  final String lotId;
}

/// Parte diario sin insumos consumidos. El backend exige al menos uno: sin esta
/// validación local el parte se guardaría, el envío fallaría con 4xx y quedaría
/// FAILED sin llegar nunca.
class DailyReportWithoutItemsException extends DomainException {
  const DailyReportWithoutItemsException()
      : super('El parte debe tener al menos un insumo consumido');
}

/// La tarea referenciada al cargar un parte diario no existe.
class TaskNotFoundException extends DomainException {
  TaskNotFoundException(String taskId)
      : super('La tarea $taskId no existe');
}

/// R018–R021: campos requeridos según el tipo de actividad de maquinaria.
class InvalidMachineActivityException extends DomainException {
  const InvalidMachineActivityException(super.message);
}

/// R021: el uso de maquinaria debe estar ligado a una tarea válida con al
/// menos una medición positiva.
class InvalidMachineUsageException extends DomainException {
  const InvalidMachineUsageException(super.message);
}

/// R008: no se pueden adjuntar más de 5 fotos por entidad.
class MaxPhotosExceededException extends DomainException {
  MaxPhotosExceededException(PhotoEntityType entityType, String entityId)
      : super(
          'Máximo de 5 fotos alcanzado para ${entityType.name} ($entityId)',
        );
}

/// Hectáreas y horas deben ser mayores a cero (jornada obligatoria).
class InvalidWorkDataException extends DomainException {
  const InvalidWorkDataException(super.message);
}

/// La cantidad de un ítem de consumo/recepción debe ser mayor a cero.
class InvalidItemQuantityException extends DomainException {
  const InvalidItemQuantityException(super.message);
}

// ─── Sincronización (Sprint 2) ────────────────────────────────────────────────

/// Error de sync retriable (5xx/red): el engine reintenta con backoff.
class SyncRetriableException extends DomainException {
  const SyncRetriableException(super.message);
}

/// Error de sync permanente (4xx): poison message, la fila queda `FAILED` sin
/// reintentar y sin bloquear la cola.
class SyncPermanentException extends DomainException {
  const SyncPermanentException(super.message);
}

/// HTTP 401: la maneja el handler (refresh-on-401 con un retry), no el engine.
class SyncUnauthorizedException extends DomainException {
  const SyncUnauthorizedException(super.message);
}

/// Logout con registros del outbox sin enviar: si se cierra la sesión se
/// descartan (nunca se envían con el token de otro usuario). La UI pide
/// confirmación explícita antes de reintentar con `discardPending: true`.
class PendingSyncOnLogoutException extends DomainException {
  PendingSyncOnLogoutException(this.pendingCount)
      : super('Hay $pendingCount registros sin sincronizar');

  final int pendingCount;
}
