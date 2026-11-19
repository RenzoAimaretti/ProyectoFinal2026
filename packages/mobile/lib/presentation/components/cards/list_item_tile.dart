import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';

/// Ítem de lista con fondo de superficie, borde redondeado y padding estándar.
///
/// Pinta sobre su propio [Material] recortado. Un [ListTile] con `tileColor`
/// pinta en el `Material` ancestro (el del Scaffold), y el scroll no lo
/// recorta: al desplazar la lista, los fondos quedan dibujados encima de lo que
/// está por arriba (tarjetas, botones).
class ListItemTile extends StatelessWidget {
  const ListItemTile({
    super.key,
    this.leading,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  final Widget? leading;
  final Widget title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.outlineVariant),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        leading: leading,
        title: title,
        subtitle: subtitle,
        trailing: trailing,
        onTap: onTap,
      ),
    );
  }
}
