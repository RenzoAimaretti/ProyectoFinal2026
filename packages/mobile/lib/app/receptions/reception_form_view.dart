import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/reception.dart';
import '../../presentation/components/buttons/primary_button.dart';
import '../../presentation/components/inputs/custom_dropdown.dart';
import '../../presentation/components/inputs/input_items_editor.dart';
import '../../presentation/components/photos/photo_picker_grid.dart';
import 'reception_form_view_model.dart';

/// Formulario de alta de recepción de insumos (CUU06).
///
/// Cliente (catálogo real de drift) + ítems de insumo (insumo + cantidad +
/// unidad, reales) + galería de fotos (captura real, persistencia al guardar).
/// Sin número de remito (R014). Al guardar valida `cliente` y `cantidad > 0`
/// (espejo de la regla del `CreateReceptionUseCase`), delega la persistencia
/// al ViewModel y vuelve a la lista.
class ReceptionFormView extends StatefulWidget {
  const ReceptionFormView({super.key, required this.viewModel});

  final ReceptionFormViewModel viewModel;

  @override
  State<ReceptionFormView> createState() => _ReceptionFormViewState();
}

class _ReceptionFormViewState extends State<ReceptionFormView> {
  String? _clientId;
  List<InputItemValue> _items = const [];

  @override
  void initState() {
    super.initState();
    // Arranca limpio: descarta fotos/flag de un intento previo cancelado.
    widget.viewModel.reset();
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _save() async {
    if (_clientId == null) {
      _showMessage('Seleccioná el cliente que entrega los insumos');
      return;
    }

    final items = <ReceptionItem>[];
    for (final item in _items) {
      if (item.inputId.isEmpty) continue;
      // Espejo de la validación de dominio: cada ítem con cantidad > 0.
      if (item.quantity <= 0) {
        _showMessage('Las cantidades de los insumos deben ser mayores a 0');
        return;
      }
      items.add(
        ReceptionItem(
          inputId: item.inputId,
          quantity: item.quantity,
          unit: item.unit,
        ),
      );
    }

    try {
      await widget.viewModel.create(
        clientId: _clientId!,
        date: DateTime.now(),
        items: items,
      );
      if (mounted) Navigator.pop(context);
    } catch (e) {
      final message = e.toString().replaceAll('Exception: ', '');
      _showMessage(message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        return Scaffold(
          backgroundColor: AppColors.surface,
          appBar: AppBar(title: const Text('Recepción de Insumos')),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Cliente',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Seleccioná el cliente que entrega los insumos.',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.onSurfaceVariant,
                  ),
                ),
                const SizedBox(height: 16),
                _clientDropdown(),
                const SizedBox(height: 24),
                const Text(
                  'Insumos recibidos',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 12),
                _inputsEditor(),
                const SizedBox(height: 24),
                PhotoPickerGrid(
                  photoPickerService: widget.viewModel.photoPickerService,
                  initialPaths: widget.viewModel.pickedPhotoPaths,
                  onPathsChanged: widget.viewModel.setPickedPhotos,
                ),
                const SizedBox(height: 32),
                PrimaryButton(
                  label: 'Guardar recepción',
                  icon: Icons.check,
                  isFullWidth: true,
                  isLoading: widget.viewModel.isSaving,
                  onPressed: _save,
                ),
              ],
            ),
          ),
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
          onChanged: (v) => setState(() => _clientId = v),
        );
      },
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
}
