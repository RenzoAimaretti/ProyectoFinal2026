import 'package:drift/drift.dart' show Value;

import '../../domain/models/reception.dart' as domain;
import '../services/app_database.dart';
import 'enum_converters.dart';

/// Fila drift `Reception` → modelo de dominio `Reception`.
extension ReceptionRowMapper on Reception {
  domain.Reception toDomain() => domain.Reception(
        id: id,
        clientId: clientId,
        date: date,
        status: receptionStatusFromText(status),
        rejectionReason: rejectionReason,
        validatedBy: validatedBy,
        validatedAt: validatedAt,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}

/// Modelo de dominio `Reception` → companion drift para insertar.
extension ReceptionDomainMapper on domain.Reception {
  ReceptionsCompanion fromDomain({String? id}) {
    final resolvedId = id ?? this.id;
    return ReceptionsCompanion.insert(
      id: Value.absentIfNull(resolvedId),
      clientId: clientId,
      date: date,
      status: receptionStatusToText(status),
      rejectionReason: Value.absentIfNull(rejectionReason),
      validatedBy: Value.absentIfNull(validatedBy),
      validatedAt: Value.absentIfNull(validatedAt),
      createdAt: Value.absentIfNull(createdAt),
      updatedAt: Value.absentIfNull(updatedAt),
    );
  }
}

/// Fila drift `ReceptionItem` → modelo de dominio `ReceptionItem`.
extension ReceptionItemRowMapper on ReceptionItem {
  domain.ReceptionItem toDomain() => domain.ReceptionItem(
        inputId: inputId,
        quantity: quantity,
        unit: unit,
      );
}

/// Modelo de dominio `ReceptionItem` → companion drift para insertar.
extension ReceptionItemDomainMapper on domain.ReceptionItem {
  ReceptionItemsCompanion fromDomain(String receptionId) =>
      ReceptionItemsCompanion.insert(
        receptionId: receptionId,
        inputId: inputId,
        quantity: quantity,
        unit: unit,
      );
}
