import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

/// Indicador de pasos (stepper) del Design System Agropecuario.
///
/// Círculos numerados unidos por una línea: los pasos completados
/// muestran un check verde, el paso actual se rellena de verde agro
/// con número blanco y los futuros quedan en contorno gris. Debajo
/// de cada círculo se muestra su etiqueta.
class WizardStepper extends StatelessWidget {
  const WizardStepper({
    super.key,
    required this.currentStep,
    required this.steps,
    this.circleSize = 32,
  });

  /// Índice del paso actual (base 0). `steps.length` = todos completos.
  final int currentStep;

  /// Etiquetas de los pasos, en orden.
  final List<String> steps;

  /// Diámetro de cada círculo.
  final double circleSize;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: List.generate(steps.length, (i) {
        final isCompleted = i < currentStep;
        final isCurrent = i == currentStep;

        return Expanded(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Círculo con segmentos de línea a los costados.
              SizedBox(
                height: circleSize,
                child: Row(
                  children: [
                    Expanded(
                      child: i == 0
                          ? const SizedBox()
                          : _StepLine(active: isCompleted || isCurrent),
                    ),
                    _StepCircle(
                      size: circleSize,
                      index: i,
                      isCompleted: isCompleted,
                      isCurrent: isCurrent,
                    ),
                    Expanded(
                      child: i == steps.length - 1
                          ? const SizedBox()
                          : _StepLine(active: isCompleted),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              // Etiqueta del paso.
              Text(
                steps[i],
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isCurrent ? FontWeight.w700 : FontWeight.w500,
                  color: isCompleted || isCurrent
                      ? AppColors.onSurface
                      : AppColors.onSurfaceVariant,
                ),
              ),
            ],
          ),
        );
      }),
    );
  }
}

/// Círculo de un paso del stepper.
class _StepCircle extends StatelessWidget {
  const _StepCircle({
    required this.size,
    required this.index,
    required this.isCompleted,
    required this.isCurrent,
  });

  final double size;
  final int index;
  final bool isCompleted;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    // Completado: fondo claro + check verde.
    if (isCompleted) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: AppColors.primaryContainer,
          shape: BoxShape.circle,
          border: Border.all(color: AppColors.primary, width: 1.5),
        ),
        child: Icon(
          Icons.check,
          size: size * 0.5,
          color: AppColors.primary,
        ),
      );
    }

    // Actual: círculo relleno verde con número blanco.
    if (isCurrent) {
      return Container(
        width: size,
        height: size,
        decoration: const BoxDecoration(
          color: AppColors.primary,
          shape: BoxShape.circle,
        ),
        alignment: Alignment.center,
        child: Text(
          '${index + 1}',
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: AppColors.onPrimary,
          ),
        ),
      );
    }

    // Futuro: contorno gris con número gris.
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.outlineVariant, width: 1.5),
      ),
      alignment: Alignment.center,
      child: Text(
        '${index + 1}',
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: AppColors.onSurfaceVariant,
        ),
      ),
    );
  }
}

/// Segmento de línea que conecta dos círculos.
class _StepLine extends StatelessWidget {
  const _StepLine({required this.active});

  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 2,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      color: active ? AppColors.primary : AppColors.outlineVariant,
    );
  }
}
