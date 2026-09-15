import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/daily_report.dart';
import '../../presentation/components/buttons/primary_button.dart';
import '../../presentation/components/buttons/secondary_button.dart';
import '../../presentation/components/inputs/custom_dropdown.dart';
import '../../presentation/components/inputs/custom_text_field.dart';
import '../../presentation/components/inputs/input_items_editor.dart';
import '../../presentation/components/photos/photo_picker_grid.dart';
import '../../presentation/components/steppers/wizard_stepper.dart';
import 'daily_report_form_view_model.dart';

/// Busca un elemento de catálogo por `id` (todos los modelos de catálogo
/// exponen `id`/`name`). Helper local, sin dependencia extra.
T? _findById<T>(Iterable<T> items, String? id) {
  if (id == null) return null;
  for (final item in items) {
    if ((item as dynamic).id == id) return item;
  }
  return null;
}

/// Formulario de alta de parte diario (CUU05) como wizard de 3 pasos.
///
/// Paso 1: firma + cascada Cliente → Campo → Lote → Labor (catálogos reales de
/// drift). Al elegir lote se comprueba R009 (receta previa) y se bloquea el
/// avance si no la tiene.
/// Paso 2: hectáreas + horas + ítems de consumo (insumos reales).
/// Paso 3: fotos (captura real, persistencia al guardar) + resumen.
class DailyReportFormView extends StatefulWidget {
  const DailyReportFormView({
    super.key,
    required this.viewModel,
    required this.operatorId,
    this.initialCompanyId,
  });

  final DailyReportFormViewModel viewModel;

  /// `userId` del operario de la sesión activa.
  final String operatorId;

  /// Firma preseleccionada desde la sesión (puede ser null).
  final String? initialCompanyId;

  @override
  State<DailyReportFormView> createState() => _DailyReportFormViewState();
}

class _DailyReportFormViewState extends State<DailyReportFormView> {
  static const List<String> _stepLabels = [
    'Selección',
    'Datos e insumos',
    'Fotos y resumen',
  ];

  int _currentStep = 0;

  // ── Paso 1: selecciones en cascada ──────────────────────────────────────
  String? _companyId;
  String? _companyLabel;
  String? _clientId;
  String? _farmId;
  String? _lotId;
  String? _lotLabel;
  String? _laborId;
  String? _laborLabel;

  /// R009: true si el lote elegido tiene receta; null = sin comprobar aún.
  bool? _hasRecipe;

  // ── Paso 2 ──────────────────────────────────────────────────────────────
  String _hectareas = '';
  String _horas = '';
  List<InputItemValue> _items = const [];

  @override
  void initState() {
    super.initState();
    _companyId = widget.initialCompanyId;
    // Arranca limpio: descarta fotos/flag de un intento previo cancelado.
    widget.viewModel.reset();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  bool get _isLastStep => _currentStep == _stepLabels.length - 1;

  bool get _step1Complete =>
      _companyId != null &&
      _lotId != null &&
      _laborId != null &&
      _hasRecipe == true;

  void _next() {
    if (!_isLastStep) {
      setState(() => _currentStep++);
      return;
    }
    _save();
  }

  void _back() {
    if (_currentStep > 0) setState(() => _currentStep--);
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _selectLote(String? lotId, List<Lot> lots) async {
    setState(() {
      _lotId = lotId;
      _lotLabel = lotId == null ? null : _findById<Lot>(lots, lotId)?.name;
      _laborId = null;
      _laborLabel = null;
      _hasRecipe = null;
    });

    if (lotId != null) {
      final has = await widget.viewModel.lotHasRecipe(lotId);
      if (mounted) {
        setState(() => _hasRecipe = has);
      }
    }
  }

  Future<void> _save() async {
    final hectares =
        double.tryParse(_hectareas.replaceAll(',', '.').trim());
    final hours = double.tryParse(_horas.replaceAll(',', '.').trim());

    if (hectares == null || hectares <= 0 || hours == null || hours <= 0) {
      _showMessage('Hectáreas y horas deben ser mayores a 0');
      return;
    }
    if (_companyId == null || _lotId == null || _laborId == null) {
      _showMessage('Completá la selección del paso 1');
      return;
    }

    final items = <DailyReportItem>[];
    for (final item in _items) {
      if (item.inputId.isEmpty) continue;
      if (item.quantity <= 0) {
        _showMessage(
          'Las cantidades de los insumos deben ser mayores a 0',
        );
        return;
      }
      items.add(
        DailyReportItem(
          inputId: item.inputId,
          quantity: item.quantity,
          unit: item.unit,
        ),
      );
    }

    try {
      await widget.viewModel.create(
        operatorId: widget.operatorId,
        companyId: _companyId!,
        lotId: _lotId!,
        laborTypeId: _laborId!,
        date: DateTime.now(),
        hectares: hectares,
        hours: hours,
        items: items,
      );
      if (mounted) Navigator.pop(context);
    } catch (e) {
      final message = e.toString().replaceAll('Exception: ', '');
      _showMessage(message);
    }
  }

  // ── Build ───────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        final canContinue = _currentStep == 0 ? _step1Complete : true;

        return Scaffold(
          appBar: AppBar(title: const Text('Parte Diario')),
          body: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                child: WizardStepper(
                  currentStep: _currentStep,
                  steps: _stepLabels,
                ),
              ),
              const SizedBox(height: 16),
              Expanded(
                child: IndexedStack(
                  index: _currentStep,
                  children: [
                    _buildStep1(),
                    _buildStep2(),
                    _buildStep3(),
                  ],
                ),
              ),
            ],
          ),
          bottomNavigationBar: SafeArea(
            minimum: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Row(
              children: [
                if (_currentStep > 0) ...[
                  Expanded(
                    child: SecondaryButton(
                      label: 'Atrás',
                      icon: Icons.arrow_back,
                      isFullWidth: true,
                      onPressed: _back,
                    ),
                  ),
                  const SizedBox(width: 12),
                ],
                Expanded(
                  child: PrimaryButton(
                    label: _isLastStep ? 'Guardar' : 'Siguiente',
                    icon: _isLastStep ? Icons.check : Icons.arrow_forward,
                    isFullWidth: true,
                    isLoading: widget.viewModel.isSaving,
                    onPressed: canContinue ? _next : null,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ── Paso 1 ──────────────────────────────────────────────────────────────

  Widget _sectionTitle(String title, String subtitle) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: AppColors.onSurface,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          subtitle,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.onSurfaceVariant,
          ),
        ),
      ],
    );
  }

  Widget _buildStep1() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(
            'Ubicación y labor',
            'Seleccioná firma, cliente, campo, lote y labor para el parte.',
          ),
          const SizedBox(height: 20),
          _companyDropdown(),
          const SizedBox(height: 16),
          _clientDropdown(),
          const SizedBox(height: 16),
          _farmDropdown(),
          const SizedBox(height: 16),
          _lotDropdown(),
          const SizedBox(height: 16),
          _laborDropdown(),
          if (_hasRecipe == false) ...[
            const SizedBox(height: 16),
            _recipeWarning(),
          ],
        ],
      ),
    );
  }

  Widget _companyDropdown() {
    return StreamBuilder<List<Company>>(
      stream: widget.viewModel.companies,
      builder: (context, snapshot) {
        final companies = snapshot.data ?? const <Company>[];
        // Si la firma de sesión no está en el catálogo, cae a "sin seleccionar".
        final value = companies.any((c) => c.id == _companyId)
            ? _companyId
            : null;
        return CustomDropdown<String>(
          label: 'Firma / Razón social',
          hint: 'Seleccionar firma...',
          items: companies
              .map(
                (c) => DropdownMenuItem<String>(
                  value: c.id,
                  child: Text(c.name),
                ),
              )
              .toList(),
          value: value,
          onChanged: (v) {
            setState(() {
              _companyId = v;
              _companyLabel = _findById<Company>(companies, v)?.name;
            });
          },
        );
      },
    );
  }

  Widget _clientDropdown() {
    return StreamBuilder<List<Client>>(
      stream: widget.viewModel.clients,
      builder: (context, snapshot) {
        final clients = snapshot.data ?? const <Client>[];
        return CustomDropdown<String>(
          label: 'Cliente',
          hint: 'Seleccionar cliente...',
          items: clients
              .map(
                (c) => DropdownMenuItem<String>(
                  value: c.id,
                  child: Text(c.name),
                ),
              )
              .toList(),
          value: _clientId,
          onChanged: (v) {
            setState(() {
              _clientId = v;
              _farmId = null;
              _lotId = null;
              _lotLabel = null;
              _laborId = null;
              _laborLabel = null;
              _hasRecipe = null;
            });
          },
        );
      },
    );
  }

  Widget _farmDropdown() {
    if (_clientId == null) {
      return const CustomDropdown<String>(
        label: 'Campo',
        hint: 'Seleccionar campo...',
        items: [],
        enabled: false,
      );
    }
    return StreamBuilder<List<Farm>>(
      stream: widget.viewModel.farmsByClient(_clientId!),
      builder: (context, snapshot) {
        final farms = snapshot.data ?? const <Farm>[];
        return CustomDropdown<String>(
          label: 'Campo',
          hint: 'Seleccionar campo...',
          items: farms
              .map(
                (f) => DropdownMenuItem<String>(
                  value: f.id,
                  child: Text(f.name),
                ),
              )
              .toList(),
          value: _farmId,
          onChanged: (v) {
            setState(() {
              _farmId = v;
              _lotId = null;
              _lotLabel = null;
              _laborId = null;
              _laborLabel = null;
              _hasRecipe = null;
            });
          },
        );
      },
    );
  }

  Widget _lotDropdown() {
    if (_farmId == null) {
      return const CustomDropdown<String>(
        label: 'Lote',
        hint: 'Seleccionar lote...',
        items: [],
        enabled: false,
      );
    }
    return StreamBuilder<List<Lot>>(
      stream: widget.viewModel.lotsByFarm(_farmId!),
      builder: (context, snapshot) {
        final lots = snapshot.data ?? const <Lot>[];
        return CustomDropdown<String>(
          label: 'Lote',
          hint: 'Seleccionar lote...',
          items: lots
              .map(
                (l) => DropdownMenuItem<String>(
                  value: l.id,
                  child: Text(l.name),
                ),
              )
              .toList(),
          value: _lotId,
          onChanged: (v) => _selectLote(v, lots),
        );
      },
    );
  }

  Widget _laborDropdown() {
    final enabled = _lotId != null;
    return StreamBuilder<List<LaborType>>(
      stream: widget.viewModel.laborTypes,
      builder: (context, snapshot) {
        final labores = snapshot.data ?? const <LaborType>[];
        return CustomDropdown<String>(
          label: 'Labor',
          hint: 'Seleccionar labor...',
          items: labores
              .map(
                (l) => DropdownMenuItem<String>(
                  value: l.id,
                  child: Text(l.name),
                ),
              )
              .toList(),
          value: _laborId,
          enabled: enabled,
          onChanged: (v) {
            setState(() {
              _laborId = v;
              _laborLabel = _findById<LaborType>(labores, v)?.name;
            });
          },
        );
      },
    );
  }

  Widget _recipeWarning() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.warningBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.4)),
      ),
      child: const Row(
        children: [
          Icon(Icons.warning_amber_rounded, color: AppColors.warning),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Este lote no tiene una receta agronómica asociada. '
              'No se puede cargar el parte sin receta (R009).',
              style: TextStyle(
                fontSize: 13,
                color: AppColors.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Paso 2 ──────────────────────────────────────────────────────────────

  Widget _buildStep2() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Jornada',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: CustomTextField(
                  label: 'Hectáreas',
                  hint: '0.0',
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  onChanged: (v) => setState(() => _hectareas = v),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: CustomTextField(
                  label: 'Horas',
                  hint: '0',
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  onChanged: (v) => setState(() => _horas = v),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Text(
            'Insumos consumidos',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          _inputsEditor(),
        ],
      ),
    );
  }

  Widget _inputsEditor() {
    return StreamBuilder<List<Input>>(
      stream: widget.viewModel.inputs,
      builder: (context, snapshot) {
        final inputs = snapshot.data ?? const <Input>[];
        final options = inputs
            .map(
              (i) => InputOption(id: i.id, label: i.name, unit: i.unit),
            )
            .toList();
        return InputItemsEditor(
          inputs: options,
          onItemsChanged: (items) => setState(() => _items = items),
        );
      },
    );
  }

  // ── Paso 3 ──────────────────────────────────────────────────────────────

  Widget _buildStep3() {
    final itemCount = _items.where((i) => i.inputId.isNotEmpty).length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          PhotoPickerGrid(
            photoPickerService: widget.viewModel.photoPickerService,
            initialPaths: widget.viewModel.pickedPhotoPaths,
            onPathsChanged: widget.viewModel.setPickedPhotos,
          ),
          const SizedBox(height: 24),
          const Text(
            'Resumen',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: AppColors.onSurface,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.outlineVariant),
            ),
            child: Column(
              children: [
                _SummaryRow(label: 'Firma', value: _companyLabel ?? '—'),
                const Divider(height: 20),
                _SummaryRow(label: 'Lote', value: _lotLabel ?? '—'),
                const Divider(height: 20),
                _SummaryRow(label: 'Labor', value: _laborLabel ?? '—'),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Hectáreas',
                  value: _hectareas.isEmpty ? '—' : '$_hectareas ha',
                ),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Horas',
                  value: _horas.isEmpty ? '—' : '$_horas hs',
                ),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Ítems de consumo',
                  value: '$itemCount',
                ),
                const Divider(height: 20),
                _SummaryRow(
                  label: 'Fotos',
                  value: '${widget.viewModel.pickedPhotoPaths.length}',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Fila label/valor de la tarjeta resumen.
class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 13,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.onSurface,
          ),
        ),
      ],
    );
  }
}
