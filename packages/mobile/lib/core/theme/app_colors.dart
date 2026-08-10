import 'package:flutter/material.dart';

/// Paleta de colores del Design System Agropecuario.
///
/// Tons de verde bosque, tierra, grises cálidos y alertas
/// (naranja/rojo) para la plataforma de trazabilidad agropecuaria.
abstract final class AppColors {
  // ── Verde Agro (Primary) ──────────────────────────────────────────────
  static const Color primary = Color(0xFF2E6F40);
  static const Color primaryLight = Color(0xFF4E9A60);
  static const Color primaryDark = Color(0xFF1B4D2A);
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color primaryContainer = Color(0xFFB7F0C5);
  static const Color onPrimaryContainer = Color(0xFF002109);

  // ── Tierra (Secondary) ────────────────────────────────────────────────
  static const Color secondary = Color(0xFF795548);
  static const Color secondaryLight = Color(0xFFA1887F);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color secondaryContainer = Color(0xFFEFEBE9);
  static const Color onSecondaryContainer = Color(0xFF3E2723);

  // ── Superficies / Grises Cálidos ──────────────────────────────────────
  static const Color surface = Color(0xFFFBFDF7);
  static const Color surfaceContainer = Color(0xFFF1F5ED);
  static const Color surfaceContainerHigh = Color(0xFFE6EAE2);
  static const Color onSurface = Color(0xFF1C1B1F);
  static const Color onSurfaceVariant = Color(0xFF49454F);
  static const Color outline = Color(0xFF79747E);
  static const Color outlineVariant = Color(0xFFCAC4D0);

  // ── Estados / Badges ──────────────────────────────────────────────────
  /// Aprobado / Éxito
  static const Color approved = Color(0xFF2E7D32);
  static const Color approvedBg = Color(0xFFE8F5E9);

  /// Pendiente / Advertencia
  static const Color pending = Color(0xFFED6C02);
  static const Color pendingBg = Color(0xFFFFF3E0);

  /// Offline / Error / Alerta
  static const Color offline = Color(0xFFD32F2F);
  static const Color offlineBg = Color(0xFFFFEBEE);

  /// Online / Info
  static const Color online = Color(0xFF0288D1);
  static const Color onlineBg = Color(0xFFE1F5FE);

  // ── Alertas Extra ─────────────────────────────────────────────────────
  static const Color warning = Color(0xFFF9A825);
  static const Color warningBg = Color(0xFFFFFDE7);
  static const Color danger = Color(0xFFC62828);
  static const Color dangerBg = Color(0xFFFFF5F5);
}
