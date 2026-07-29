import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../../presentation/components/buttons/primary_button.dart';
import '../../presentation/components/inputs/custom_text_field.dart';
import '../../presentation/components/selectors/multi_firma_selector.dart';
import 'login_view_model.dart';

/// Vista de inicio de sesión de la aplicación móvil Agropecuario.
class LoginView extends StatelessWidget {
  const LoginView({
    super.key,
    required this.viewModel,
    this.onLoginSuccess,
  });

  final LoginViewModel viewModel;
  final VoidCallback? onLoginSuccess;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ListenableBuilder(
              listenable: viewModel,
              builder: (context, _) {
                return Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // ── Header Brand Logo ──────────────────────────────
                    Center(
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Icon(
                          Icons.agriculture_rounded,
                          size: 40,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'Agrolify',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.onSurface,
                        letterSpacing: -0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Plataforma de Gestión Agrícola y Ganadera',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: AppColors.onSurfaceVariant,
                      ),
                    ),
                    const SizedBox(height: 36),

                    // ── Error Banner ────────────────────────────────────
                    if (viewModel.errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.dangerBg,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.danger.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline,
                              color: AppColors.danger,
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                viewModel.errorMessage!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: AppColors.danger,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // ── Selector de Firma / Razón Social ───────────────
                    MultiFirmaSelector.predefined(
                      selectedId: viewModel.selectedFirmaId,
                      onSelected: (firma) {
                        viewModel.setSelectedFirmaId(firma.id);
                      },
                      enabled: !viewModel.isLoading,
                    ),
                    const SizedBox(height: 20),

                    // ── Campo de Email ──────────────────────────────────
                    CustomTextField(
                      label: 'Correo electrónico',
                      hint: 'ejemplo@empresa.com',
                      keyboardType: TextInputType.emailAddress,
                      prefixIcon: Icons.email_outlined,
                      errorText: viewModel.emailError,
                      enabled: !viewModel.isLoading,
                      onChanged: viewModel.setEmail,
                    ),
                    const SizedBox(height: 16),

                    // ── Campo de Contraseña ─────────────────────────────
                    CustomTextField(
                      label: 'Contraseña',
                      hint: '••••••••',
                      obscureText: viewModel.obscurePassword,
                      prefixIcon: Icons.lock_outline,
                      suffixIcon: viewModel.obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                      errorText: viewModel.passwordError,
                      enabled: !viewModel.isLoading,
                      onChanged: viewModel.setPassword,
                      onTap: null,
                    ),
                    const SizedBox(height: 28),

                    // ── Botón de Login ──────────────────────────────────
                    PrimaryButton(
                      label: 'Iniciar sesión',
                      isLoading: viewModel.isLoading,
                      isFullWidth: true,
                      onPressed: () async {
                        final success = await viewModel.login();
                        if (success && context.mounted) {
                          onLoginSuccess?.call();
                        }
                      },
                    ),
                  ],
                );
              },
            ),
          ),
        ),
      ),
    );
  }
}
