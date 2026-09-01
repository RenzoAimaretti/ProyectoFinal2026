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

/// R018–R021: campos requeridos según el tipo de actividad de maquinaria.
class InvalidMachineActivityException extends DomainException {
  const InvalidMachineActivityException(super.message);
}
