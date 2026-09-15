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
/// parte diario.
class LotWithoutRecipeException extends DomainException {
  LotWithoutRecipeException(String lotId)
      : super('El lote $lotId no tiene una receta agronómica asociada');
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
