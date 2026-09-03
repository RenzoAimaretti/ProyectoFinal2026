import 'package:flutter/material.dart';
import '../../core/theme/app_colors.dart';
import '../components/buttons/primary_button.dart';
import '../components/buttons/secondary_button.dart';
import '../components/cards/kpi_card.dart';
import '../components/cards/insumo_card.dart';
import '../components/cards/cheque_card.dart';
import '../components/cards/parte_diario_item.dart';
import '../components/badges/status_badge.dart';
import '../components/inputs/custom_text_field.dart';
import '../components/inputs/custom_dropdown.dart';
import '../components/inputs/input_items_editor.dart';
import '../components/selectors/multi_firma_selector.dart';
import '../components/selectors/cascade_selector.dart';
import '../components/photos/photo_picker_grid.dart';
import '../components/steppers/wizard_stepper.dart';
import '../components/empty_state.dart';
import 'bottom_nav_shell.dart';
import 'parte_diario_wizard_prototype.dart';

/// Pantalla de catálogo de componentes del Design System Agropecuario.
///
/// Vista de scroll con secciones que muestran todos los átomos y
/// moléculas reutilizables. Sirve como referencia visual y como
/// pantalla de inicio temporal para desarrollo.
class ComponentsPreviewScreen extends StatelessWidget {
  const ComponentsPreviewScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Agrolify Design System')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 100),
        children: const [
          // ── Botones ──────────────────────────────────────────────────
          _SectionHeader(title: 'Botones'),
          _ButtonsSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── KPI Cards ────────────────────────────────────────────────
          _SectionHeader(title: 'Tarjetas de KPIs'),
          _KpiCardsSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Badges / Estados ─────────────────────────────────────────
          _SectionHeader(title: 'Badges de Estado'),
          _BadgesSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Inputs y Dropdowns ───────────────────────────────────────
          _SectionHeader(title: 'Inputs y Formularios'),
          _InputsSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Insumo Card ──────────────────────────────────────────────
          _SectionHeader(title: 'Recepción de Insumos'),
          _InsumoCardsSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Cheque Card ──────────────────────────────────────────────
          _SectionHeader(title: 'Control de Cheques'),
          _ChequeCardsSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Parte Diario ─────────────────────────────────────────────
          _SectionHeader(title: 'Partes Diarios de Operarios'),
          _ParteDiarioSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Multi Firma Selector ─────────────────────────────────────
          _SectionHeader(title: 'Selector de Firmas / Razón Social'),
          _MultiFirmaSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Wizard Stepper ───────────────────────────────────────────
          _SectionHeader(title: 'Stepper de Pasos (Wizard)'),
          _WizardStepperSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Cascade Selector ─────────────────────────────────────────
          _SectionHeader(title: 'Selector en Cascada'),
          _CascadeSelectorSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Photo Picker Grid ────────────────────────────────────────
          _SectionHeader(title: 'Galería de Fotos'),
          _PhotoPickerSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Input Items Editor ───────────────────────────────────────
          _SectionHeader(title: 'Editor de Insumos'),
          _InputItemsEditorSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Empty State ──────────────────────────────────────────────
          _SectionHeader(title: 'Estados Vacíos'),
          _EmptyStateSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Bottom Nav Shell ─────────────────────────────────────────
          _SectionHeader(title: 'Shell de Navegación'),
          _BottomNavShellSection(),
          SizedBox(height: 16),
          Divider(),
          SizedBox(height: 8),

          // ── Prototipos de Pantalla ───────────────────────────────────
          _SectionHeader(title: 'Prototipos de Pantalla'),
          _ScreenPrototypesSection(),
          SizedBox(height: 32),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},

        label: const Icon(Icons.add),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Secciones internas (privadas)
// ═══════════════════════════════════════════════════════════════════════════

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Text(
        title,
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.w700,
          color: AppColors.primary,
        ),
      ),
    );
  }
}

// ── Botones ────────────────────────────────────────────────────────────────

class _ButtonsSection extends StatelessWidget {
  const _ButtonsSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Primario con icono
        const _Label('Primario con ícono'),
        const SizedBox(height: 8),
        PrimaryButton(
          label: 'Guardar cosecha',
          icon: Icons.save,
          onPressed: () {},
        ),
        const SizedBox(height: 16),

        // Primario full-width
        const _Label('Primario full-width'),
        const SizedBox(height: 8),
        PrimaryButton(
          label: 'Registrar riego',
          icon: Icons.water_drop,
          isFullWidth: true,
          onPressed: () {},
        ),
        const SizedBox(height: 16),

        // Primario loading
        const _Label('Primario loading'),
        const SizedBox(height: 8),
        const PrimaryButton(label: 'Guardando...', isLoading: true),
        const SizedBox(height: 16),

        // Primario deshabilitado
        const _Label('Primario deshabilitado'),
        const SizedBox(height: 8),
        const PrimaryButton(label: 'Sin permisos', onPressed: null),
        const SizedBox(height: 20),

        // Secundario con ícono
        const _Label('Secundario con ícono'),
        const SizedBox(height: 8),
        SecondaryButton(label: 'Cancelar', icon: Icons.close, onPressed: () {}),
        const SizedBox(height: 16),

        // Secundario full-width
        const _Label('Secundario full-width'),
        const SizedBox(height: 8),
        SecondaryButton(
          label: 'Exportar reporte',
          icon: Icons.download,
          isFullWidth: true,
          onPressed: () {},
        ),
      ],
    );
  }
}

// ── KPI Cards ──────────────────────────────────────────────────────────────

class _KpiCardsSection extends StatelessWidget {
  const _KpiCardsSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: KpiCard(
                title: 'Hectáreas trabajadas',
                value: '1.250',
                unit: 'hectáreas',
                icon: Icons.landscape,
                iconColor: AppColors.primary,
                trend: '+12%',
                trendIsPositive: true,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: KpiCard(
                title: 'Litros producidos',
                value: '8.400',
                unit: 'litros',
                icon: Icons.water_drop,
                iconColor: AppColors.online,
                trend: '+5%',
                trendIsPositive: true,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: KpiCard(
                title: 'Rendimiento promedio',
                value: '6.720',
                unit: 'kg/ha',
                icon: Icons.analytics,
                iconColor: AppColors.secondary,
                trend: '-3%',
                trendIsPositive: false,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: KpiCard(
                title: 'Tareas pendientes',
                value: '14',
                unit: 'tareas',
                icon: Icons.task_alt,
                iconColor: AppColors.pending,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Badges ─────────────────────────────────────────────────────────────────

class _BadgesSection extends StatelessWidget {
  const _BadgesSection();

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        StatusBadge.fromType(StatusType.approved),
        StatusBadge.fromType(StatusType.pending),
        StatusBadge.fromType(StatusType.offline),
        StatusBadge.fromType(StatusType.online),
      ],
    );
  }
}

// ── Inputs y Dropdowns ─────────────────────────────────────────────────────

class _InputsSection extends StatelessWidget {
  const _InputsSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        CustomTextField(
          label: 'Nombre del predio',
          hint: 'Ej: Estancia El Sauce',
          prefixIcon: Icons.agriculture,
        ),
        const SizedBox(height: 16),
        const CustomTextField(
          label: 'Buscar tarea',
          hint: 'Buscar por nombre o ID...',
          prefixIcon: Icons.search,
        ),
        const SizedBox(height: 16),
        CustomTextField(
          label: 'Observaciones',
          hint: 'Detalles de la actividad realizada...',
          maxLines: 3,
          prefixIcon: Icons.notes,
        ),
        const SizedBox(height: 16),
        const CustomTextField(
          label: 'Campo deshabilitado',
          hint: 'No editable',
          enabled: false,
        ),
        const SizedBox(height: 16),
        CustomTextField(
          label: 'Contraseña',
          hint: 'Ingrese su contraseña',
          obscureText: true,
          prefixIcon: Icons.lock,
          suffixIcon: Icons.visibility_off,
        ),
        const SizedBox(height: 20),

        // ── Dropdowns ───────────────────────────────────────────────────
        const _Label('Dropdown estándar'),
        const SizedBox(height: 8),
        CustomDropdown<String>(
          label: 'Tipo de cultivo',
          hint: 'Seleccionar cultivo...',
          prefixIcon: Icons.eco,
          items: const [
            DropdownMenuItem(value: 'soja', child: Text('Soja')),
            DropdownMenuItem(value: 'maiz', child: Text('Maíz')),
            DropdownMenuItem(value: 'trigo', child: Text('Trigo')),
            DropdownMenuItem(value: 'girasol', child: Text('Girasol')),
          ],
          onChanged: (_) {},
        ),
        const SizedBox(height: 16),
        const CustomDropdown<String>(
          label: 'Dropdown deshabilitado',
          hint: 'Sin opciones',
          enabled: false,
          items: [],
        ),
      ],
    );
  }
}

// ── Insumo Cards ───────────────────────────────────────────────────────────

class _InsumoCardsSection extends StatelessWidget {
  const _InsumoCardsSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        InsumoCard(
          clientName: 'Estancia El Sauce',
          productName: 'Fertilizante NPK 20-20-20',
          quantity: '12 bolsas x 50kg',
          status: InsumoStatus.completo,
          date: '15/07/2026',
          onTap: () {},
        ),
        const SizedBox(height: 10),
        InsumoCard(
          clientName: 'Agroganadera del Sur S.A.',
          productName: 'Herbicida glifosato 48%',
          quantity: '20 litros',
          status: InsumoStatus.sobrante,
          date: '18/07/2026',
        ),
        const SizedBox(height: 10),
        InsumoCard(
          clientName: 'Campo Norte Productos Agropecuarios',
          productName: 'Semilla de soja RR2 Intacta',
          quantity: '5 sacos x 40kg',
          status: InsumoStatus.faltante,
        ),
      ],
    );
  }
}

// ── Cheque Cards ───────────────────────────────────────────────────────────

class _ChequeCardsSection extends StatelessWidget {
  const _ChequeCardsSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ChequeCard(
          chequeNumber: '00045871',
          bankName: 'Banco Galicia',
          amount: '\$ 2.450.000',
          status: ChequeStatus.emitido,
          chequeType: ChequeType.fisico,
          issueDate: '01/07/2026',
          dueDate: '01/08/2026',
          onTap: () {},
        ),
        const SizedBox(height: 10),
        ChequeCard(
          chequeNumber: '00045903',
          bankName: 'Banco Macro',
          amount: '\$ 875.500',
          status: ChequeStatus.cobrado,
          chequeType: ChequeType.electronico,
          dueDate: '15/07/2026',
        ),
        const SizedBox(height: 10),
        ChequeCard(
          chequeNumber: '00046012',
          bankName: 'Banco Santander',
          amount: '\$ 1.200.000',
          status: ChequeStatus.rebotado,
          chequeType: ChequeType.fisico,
          issueDate: '10/06/2026',
          dueDate: '10/07/2026',
        ),
      ],
    );
  }
}

// ── Parte Diario ───────────────────────────────────────────────────────────

class _ParteDiarioSection extends StatelessWidget {
  const _ParteDiarioSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        ParteDiarioItem(
          lote: 'Lote 14 - Sector Norte',
          clientName: 'Estancia El Sauce',
          hectareas: '320',
          hasPhoto: true,
          date: '20/07/2026',
          onApprove: () {},
          onReject: () {},
        ),
        const SizedBox(height: 10),
        ParteDiarioItem(
          lote: 'Lote 07 - Sector Este',
          clientName: 'Agroganadera del Sur',
          hectareas: '185',
          hasPhoto: false,
          date: '20/07/2026',
          onApprove: () {},
          onReject: () {},
        ),
        const SizedBox(height: 10),
        ParteDiarioItem(
          lote: 'Lote 03 - Sector Oeste',
          clientName: 'Campo Norte S.A.',
          hectareas: '410',
          hasPhoto: true,
          date: '19/07/2026',
          isApproved: true,
        ),
        const SizedBox(height: 10),
        ParteDiarioItem(
          lote: 'Lote 22 - Sector Sur',
          clientName: 'Productora Rural',
          hectareas: '95',
          hasPhoto: true,
          date: '19/07/2026',
          isApproved: false,
        ),
      ],
    );
  }
}

// ── Multi Firma Selector ───────────────────────────────────────────────────

class _MultiFirmaSection extends StatelessWidget {
  const _MultiFirmaSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        MultiFirmaSelector.predefined(selectedId: 'eliggi', onSelected: (_) {}),
        const SizedBox(height: 20),
        const _Label('Sin selección'),
        const SizedBox(height: 8),
        MultiFirmaSelector.predefined(onSelected: (_) {}),
        const SizedBox(height: 20),
        const _Label('Deshabilitado'),
        const SizedBox(height: 8),
        MultiFirmaSelector.predefined(
          selectedId: 'eliggi_tufoni',
          enabled: false,
        ),
      ],
    );
  }
}

// ── Helper de label reutilizable ───────────────────────────────────────────

class _Label extends StatelessWidget {
  const _Label(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
    );
  }
}

// ── Wizard Stepper ─────────────────────────────────────────────────────────

class _WizardStepperSection extends StatelessWidget {
  const _WizardStepperSection();

  @override
  Widget build(BuildContext context) {
    const steps = ['Selección', 'Datos e insumos', 'Fotos y resumen'];
    return Column(
      children: [
        const _Label('Paso 1 de 3'),
        const SizedBox(height: 8),
        const WizardStepper(currentStep: 0, steps: steps),
        const SizedBox(height: 24),
        const _Label('Paso 2 de 3'),
        const SizedBox(height: 8),
        const WizardStepper(currentStep: 1, steps: steps),
        const SizedBox(height: 24),
        const _Label('Completado'),
        const SizedBox(height: 8),
        const WizardStepper(currentStep: 3, steps: steps),
      ],
    );
  }
}

// ── Cascade Selector ───────────────────────────────────────────────────────

class _CascadeSelectorSection extends StatelessWidget {
  const _CascadeSelectorSection();

  @override
  Widget build(BuildContext context) {
    return const CascadeSelector();
  }
}

// ── Photo Picker Grid ──────────────────────────────────────────────────────

class _PhotoPickerSection extends StatelessWidget {
  const _PhotoPickerSection();

  @override
  Widget build(BuildContext context) {
    return const PhotoPickerGrid();
  }
}

// ── Input Items Editor ─────────────────────────────────────────────────────

class _InputItemsEditorSection extends StatelessWidget {
  const _InputItemsEditorSection();

  @override
  Widget build(BuildContext context) {
    return const InputItemsEditor();
  }
}

// ── Empty State ────────────────────────────────────────────────────────────

class _EmptyStateSection extends StatelessWidget {
  const _EmptyStateSection();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const EmptyState(
          icon: Icons.inventory_2_outlined,
          title: 'Sin recepciones',
          subtitle: 'No hay recepciones pendientes de validación.',
        ),
        const SizedBox(height: 16),
        EmptyState(
          icon: Icons.assignment_outlined,
          title: 'Sin partes diarios',
          subtitle: 'Todavía no cargaste partes en este lote.',
          actionLabel: 'Nuevo parte',
          onAction: () {},
        ),
      ],
    );
  }
}

// ── Bottom Nav Shell ───────────────────────────────────────────────────────

class _BottomNavShellSection extends StatelessWidget {
  const _BottomNavShellSection();

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        height: 420,
        child: const BottomNavShell(),
      ),
    );
  }
}

// ── Prototipos de Pantalla ─────────────────────────────────────────────────

class _ScreenPrototypesSection extends StatelessWidget {
  const _ScreenPrototypesSection();

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: AppColors.surfaceContainer,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: AppColors.outlineVariant),
      ),
      child: ListTile(
        leading: const Icon(Icons.assignment_add, color: AppColors.primary),
        title: const Text('Parte Diario (CUU05)'),
        subtitle: const Text('Wizard de 3 pasos: selección, datos e insumos, fotos y resumen.'),
        trailing: const Icon(Icons.chevron_right, color: AppColors.outline),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => const ParteDiarioWizardPrototype(),
            ),
          );
        },
      ),
    );
  }
}
