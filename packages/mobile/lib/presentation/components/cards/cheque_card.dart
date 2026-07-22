import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';
import '../badges/status_badge.dart';

/// Tipo de estado para un cheque.
enum ChequeStatus {
  emitido('Emitido', StatusType.pending),
  cobrado('Cobrado', StatusType.approved),
  rebotado('Rebotado', StatusType.offline);

  const ChequeStatus(this.label, this.badgeType);

  final String label;
  final StatusType badgeType;
}

/// Tipo de cheque.
enum ChequeType {
  fisico('Físico', Icons.receipt_long),
  electronico('Electrónico', Icons.credit_card);

  const ChequeType(this.label, this.icon);

  final String label;
  final IconData icon;
}

/// Tarjeta de control de cheques del Design System Agropecuario.
///
/// Muestra número de cheque, banco, monto, tipo (físico/electrónico)
/// y estado (emitido/cobrado/rebotado). Diseñada para la bandeja
/// de control financiero.
class ChequeCard extends StatelessWidget {
  const ChequeCard({
    super.key,
    required this.chequeNumber,
    required this.bankName,
    required this.amount,
    required this.status,
    this.chequeType = ChequeType.fisico,
    this.issueDate,
    this.dueDate,
    this.onTap,
  });

  final String chequeNumber;
  final String bankName;
  final String amount;
  final ChequeStatus status;
  final ChequeType chequeType;
  final String? issueDate;
  final String? dueDate;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Fila superior: Tipo + Badge ──────────────────────────
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.secondaryContainer,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      chequeType.icon,
                      size: 16,
                      color: AppColors.secondary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    chequeType.label,
                    style: const TextStyle(
                      fontSize: 12,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                  const Spacer(),
                  StatusBadge.fromType(status.badgeType),
                ],
              ),
              const SizedBox(height: 12),

              // ── Número de cheque ─────────────────────────────────────
              Text(
                'N.° $chequeNumber',
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 4),

              // ── Banco ────────────────────────────────────────────────
              Row(
                children: [
                  const Icon(
                    Icons.account_balance_outlined,
                    size: 14,
                    color: AppColors.onSurfaceVariant,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    bankName,
                    style: const TextStyle(
                      fontSize: 13,
                      color: AppColors.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // ── Monto + Fechas ───────────────────────────────────────
              Row(
                children: [
                  Text(
                    amount,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  const Spacer(),
                  if (dueDate != null)
                    Row(
                      children: [
                        const Icon(
                          Icons.event_outlined,
                          size: 12,
                          color: AppColors.outline,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          dueDate!,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.outline,
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
