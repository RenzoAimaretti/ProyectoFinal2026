import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/daily_report.dart';
import '../../domain/models/task.dart';
import '../../presentation/components/buttons/primary_button.dart';
import '../../presentation/components/buttons/secondary_button.dart';
import '../../presentation/components/inputs/custom_text_field.dart';
import '../../presentation/components/inputs/date_field.dart';
import '../../presentation/components/inputs/input_items_editor.dart';
import '../../presentation/components/photos/photo_picker_grid.dart';
import '../../presentation/components/steppers/wizard_stepper.dart';
import 'daily_report_form_view_model.dart';

/// Formulario de alta de parte diario (CUU05) como wizard de 3 pasos.
///
/// El parte nace de una [Task] (R007): la firma (`companyId`) y el operario
/// llegan por parámetro (selector global + sesión), y el lote/labor se heredan
/// de la tarea (solo lectura en el encabezado). Ya no hay dropdown de firma ni
/// cascada Cliente → Campo → Lote → Labor.
///
/// Pasos: (1) Jornada (fecha + hectáreas + horas), (2) Insumos, (3) Fotos +
/// resumen. La fecha bloquea valores futuros (C1).
class DailyReportFormView extends StatefulWidget {
  const DailyReportFormView({
    super.key,
    required this.viewModel,
    required this.task,
    required this.companyId,
    required this.operatorId,
  });

  final DailyReportFormViewModel viewModel;

  /// Tarea sobre la que se carga el parte (hereda lote/labor).
  final Task task;

  /// Firma heredada del selector global (post-login).
  final String companyId;

  /// `userId` del operario de la sesión activa.
  final String operatorId;

  @override
  State<DailyReportFormView> createState() => _DailyReportFormViewState();
}

class _DailyReportFormViewState extends State<DailyReportFormView> {
  static const List<String> _stepLabels = [
    'Jornada',
    'Insumos',
    'Fotos y resumen',
  ];

  int _currentStep = 0;

  // ── Paso 1: jornada ────────────────────────────────────────────────────
  late final TextEditingController _dateController;
  String _dateText = '';
  String? _dateError;
  String _hectareas = '';
  String _horas = '';

  // ── Paso 2 ──────────────────────────────────────────────────────────────
  List<InputItemValue> _items = const [];
  late Stream<List<({Input input, bool compatible})>> _inputChoices;

  // ── Encabezado (nombres resueltos de la tarea) ──────────────────────────
  String? _lotLabel;
  String? _laborLabel;

  @override
  void initState() {
    super.initState();
    // Fecha por defecto = hoy (C1: no se permiten fechas futuras).
    final today = _formatDate(DateTime.now());
    _dateController = TextEditingController(text: today);
    _dateText = today;
    // Arranca limpio: descarta fotos/flag de un intento previo cancelado.
    widget.viewModel.reset();
    _inputChoices = widget.viewModel.watchInputChoices(widget.task.laborTypeId);
    _loadTaskLabels();
  }

  @override
  void didUpdateWidget(covariant DailyReportFormView oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.task.laborTypeId != widget.task.laborTypeId ||
        oldWidget.viewModel != widget.viewModel) {
      _inputChoices = widget.viewModel.watchInputChoices(widget.task.laborTypeId);
    }
  }

  @override
  void dispose() {
    _dateController.dispose();
    super.dispose();
  }

  /// Resuelve los nombres de lote/labor de la tarea para el encabezado.
  Future<void> _loadTaskLabels() async {
    final lot = await widget.viewModel.lotName(widget.task.lotId);
    final labor = await widget.viewModel.laborName(widget.task.laborTypeId);
    if (mounted) {
      setState(() {
        _lotLabel = lot;
        _laborLabel = labor;
      });
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  bool get _isLastStep => _currentStep == _stepLabels.length - 1;

  /// Paso 1 completo: fecha válida y no futura.
  bool get _step1Complete {
    final date = _parseDate(_dateText);
    return date != null && !_isFutureDate(date);
  }

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

  Future<void> _save() async {
    final date = _parseDate(_dateText);
    if (date == null) {
      _showMessage(fechaInvalidaMensaje);
      return;
    }
    if (_isFutureDate(date)) {
      _showMessage('No se permiten fechas futuras');
      return;
    }

    final hectares = double.tryParse(_hectareas.replaceAll(',', '.').trim());
    final hours = double.tryParse(_horas.replaceAll(',', '.').trim());
    if (hectares == null || hectares <= 0 || hours == null || hours <= 0) {
      _showMessage('Hectáreas y horas deben ser mayores a 0');
      return;
    }

    final taskId = widget.task.id;
    if (taskId == null) {
      _showMessage('La tarea no tiene identificador');
      return;
    }

    final items = <DailyReportItem>[];
    for (final item in _items) {
      if (item.inputId.isEmpty) continue;
      if (item.quantity <= 0) {
        _showMessage('Las cantidades de los insumos deben ser mayores a 0');
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
        companyId: widget.companyId,
        taskId: taskId,
        date: date,
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
              _buildTaskHeader(),
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

  /// Encabezado resumen de la tarea (lote + labor heredados, solo lectura).
  Widget _buildTaskHeader() {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(20, 8, 20, 0),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Tarea',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w600,
              color: AppColors.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _HeaderField(label: 'Lote', value: _lotLabel ?? '…'),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _HeaderField(label: 'Labor', value: _laborLabel ?? '…'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Paso 1: jornada ─────────────────────────────────────────────────────

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
            'Jornada',
            'Completá la fecha, las hectáreas y las horas trabajadas.',
          ),
          const SizedBox(height: 20),
          DateField(
            label: 'Fecha',
            controller: _dateController,
            errorText: _dateError,
            onChanged: (v) {
              setState(() {
                _dateText = v;
                _dateError = _validateDate(v);
              });
            },
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
        ],
      ),
    );
  }

  // ── Paso 2: insumos ─────────────────────────────────────────────────────

  Widget _buildStep2() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _sectionTitle(
            'Insumos consumidos',
            'Agregá los insumos y cantidades aplicadas en la jornada.',
          ),
          const SizedBox(height: 16),
          _inputsEditor(),
        ],
      ),
    );
  }

  Widget _inputsEditor() {
    return StreamBuilder<List<({Input input, bool compatible})>>(
      stream: _inputChoices,
      builder: (context, snapshot) {
        final inputs = snapshot.data ?? const <({Input input, bool compatible})>[];
        final options = inputs
            .map(
              (choice) => InputOption(
                id: choice.input.id,
                label: choice.input.name,
                unit: choice.input.unit,
                compatible: choice.compatible,
              ),
            )
            .toList();
        return InputItemsEditor(
          inputs: options,
          onItemsChanged: (items) => setState(() => _items = items),
        );
      },
    );
  }

  // ── Paso 3: fotos + resumen ─────────────────────────────────────────────

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
                _SummaryRow(label: 'Lote', value: _lotLabel ?? '—'),
                const Divider(height: 20),
                _SummaryRow(label: 'Labor', value: _laborLabel ?? '—'),
                const Divider(height: 20),
                _SummaryRow(label: 'Fecha', value: _dateText),
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

/// Formatea una fecha como `DD/MM/AAAA`.
String _formatDate(DateTime d) {
  final dd = d.day.toString().padLeft(2, '0');
  final mm = d.month.toString().padLeft(2, '0');
  return '$dd/$mm/${d.year}';
}

/// Parsea `DD/MM/AAAA` a [DateTime] (null si el formato es inválido).
DateTime? _parseDate(String text) {
  final match = RegExp(r'^(\d{2})/(\d{2})/(\d{4})$').firstMatch(text.trim());
  if (match == null) return null;
  final day = int.parse(match.group(1)!);
  final month = int.parse(match.group(2)!);
  final year = int.parse(match.group(3)!);
  return DateTime(year, month, day);
}

/// true si [date] es posterior al día de hoy (C1: bloquea fechas futuras).
bool _isFutureDate(DateTime date) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  return date.isAfter(today);
}

/// Valida el texto de fecha: formato válido + no futura.
String? _validateDate(String text) {
  if (!isValidDate(text)) return fechaInvalidaMensaje;
  final date = _parseDate(text);
  if (date != null && _isFutureDate(date)) {
    return 'No se permiten fechas futuras';
  }
  return null;
}

/// Campo label/valor del encabezado de tarea (solo lectura).
class _HeaderField extends StatelessWidget {
  const _HeaderField({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 2),
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
