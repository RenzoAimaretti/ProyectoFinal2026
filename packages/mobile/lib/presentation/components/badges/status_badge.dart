import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Estados disponibles para el badge.
enum StatusType {
  approved('Aprobado', AppColors.approved, AppColors.approvedBg, Icons.check_circle),
  pending('Pendiente', AppColors.pending, AppColors.pendingBg, Icons.schedule),
  offline('Offline', AppColors.offline, AppColors.offlineBg, Icons.cloud_off),
  online('Online', AppColors.online, AppColors.onlineBg, Icons.cloud_done);

  const StatusType(this.label, this.color, this.backgroundColor, this.icon);

  final String label;
  final Color color;
  final Color backgroundColor;
  final IconData icon;
}

/// Badge / Etiqueta de estado del Design System Agropecuario.
///
/// Muestra un pill con color de fondo atenuado, ícono y texto.
/// Se puede usar con `StatusType` o personalizar manualmente.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    this.label,
    this.color,
    this.backgroundColor,
    this.icon,
    this.statusType,
  });

  /// Construye un badge a partir de un [StatusType].
  factory StatusBadge.fromType(StatusType type) {
    return StatusBadge(
      statusType: type,
      label: type.label,
      color: type.color,
      backgroundColor: type.backgroundColor,
      icon: type.icon,
    );
  }

  final String? label;
  final Color? color;
  final Color? backgroundColor;
  final IconData? icon;
  final StatusType? statusType;

  Color get _color => statusType?.color ?? color ?? AppColors.onSurface;
  Color get _bg =>
      statusType?.backgroundColor ?? backgroundColor ?? AppColors.surfaceContainer;
  String get _label => statusType?.label ?? label ?? '';
  IconData? get _icon => statusType?.icon ?? icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _color.withValues(alpha: 0.3), width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_icon != null) ...[
            Icon(_icon, size: 14, color: _color),
            const SizedBox(width: 4),
          ],
          Text(
            _label,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _color,
            ),
          ),
        ],
      ),
    );
  }
}
