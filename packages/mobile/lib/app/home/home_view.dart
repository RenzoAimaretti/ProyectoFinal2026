import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../domain/models/auth_user.dart';
import '../../presentation/components/badges/status_badge.dart';
import '../../presentation/components/buttons/secondary_button.dart';
import '../../presentation/components/cards/kpi_card.dart';

/// Pantalla principal (dummy) post-login de la plataforma Agrolify.
class HomeView extends StatelessWidget {
  const HomeView({
    super.key,
    required this.user,
    required this.onLogout,
  });

  final AuthUser user;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Row(
          children: [
            Icon(Icons.agriculture_rounded, color: AppColors.primary),
            SizedBox(width: 8),
            Text(
              'Agrolify',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ],
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.danger),
            tooltip: 'Cerrar sesión',
            onPressed: onLogout,
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Tarjeta de Usuario Autenticado ──────────────────────────
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                color: AppColors.surfaceContainer,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Sesión Autenticada',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: AppColors.onSurfaceVariant,
                            ),
                          ),
                          StatusBadge.fromType(StatusType.approved),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 26,
                            backgroundColor: AppColors.primary,
                            child: Text(
                              user.email.isNotEmpty
                                  ? user.email[0].toUpperCase()
                                  : 'U',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 20,
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user.email,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.onSurface,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 2,
                                      ),
                                      decoration: BoxDecoration(
                                        color: AppColors.primaryContainer,
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        user.role,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.onPrimaryContainer,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'Firma: ${user.firmaId}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: AppColors.onSurfaceVariant,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // ── Título Sección Dashboard ──────────────────────────────
              const Text(
                'Resumen de Operaciones',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.onSurface,
                ),
              ),
              const SizedBox(height: 14),

              // ── KPIs Grid ─────────────────────────────────────────────
              const Row(
                children: [
                  Expanded(
                    child: KpiCard(
                      title: 'Lotes en Siembra',
                      value: '14',
                      unit: 'Lotes Activos',
                      icon: Icons.landscape_rounded,
                      iconColor: AppColors.primary,
                      trend: '+2 este mes',
                      trendIsPositive: true,
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: KpiCard(
                      title: 'Cabezas Bovinas',
                      value: '1,250',
                      unit: 'Animales Trazados',
                      icon: Icons.pets_rounded,
                      iconColor: AppColors.secondary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const KpiCard(
                title: 'Maquinaria Operativa',
                value: '8 Equipos',
                unit: 'Tractores y Cosechadoras',
                icon: Icons.precision_manufacturing_rounded,
                iconColor: AppColors.online,
                trend: '100% disponible',
                trendIsPositive: true,
              ),
              const SizedBox(height: 32),

              // ── Botón de Salir ────────────────────────────────────────
              SecondaryButton(
                label: 'Cerrar sesión',
                icon: Icons.logout_rounded,
                isFullWidth: true,
                onPressed: onLogout,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
