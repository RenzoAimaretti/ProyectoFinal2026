import 'package:flutter/material.dart';
import '../inputs/custom_dropdown.dart';

/// Opción genérica de un nivel del selector en cascada.
class CascadeOption {
  const CascadeOption({required this.id, required this.label});

  final String id;
  final String label;
}

// ── Datos dummy (reemplazables por catálogos reales de drift) ──────────
const List<CascadeOption> _clientesDummy = [
  CascadeOption(id: 'cli-1', label: 'Eliggi'),
  CascadeOption(id: 'cli-2', label: 'Agro Norte'),
];

const Map<String, List<CascadeOption>> _camposDummy = {
  'cli-1': [
    CascadeOption(id: 'cam-1', label: 'Campo La Paz'),
    CascadeOption(id: 'cam-2', label: 'Campo El Ceibo'),
  ],
  'cli-2': [
    CascadeOption(id: 'cam-3', label: 'Campo Norte'),
  ],
};

const Map<String, List<CascadeOption>> _lotesDummy = {
  'cam-1': [
    CascadeOption(id: 'lot-1', label: 'Lote 1'),
    CascadeOption(id: 'lot-2', label: 'Lote 2'),
  ],
  'cam-2': [
    CascadeOption(id: 'lot-3', label: 'Lote A'),
  ],
  'cam-3': [
    CascadeOption(id: 'lot-4', label: 'Lote N1'),
    CascadeOption(id: 'lot-5', label: 'Lote N2'),
  ],
};

const List<CascadeOption> _laboresDummy = [
  CascadeOption(id: 'lab-1', label: 'Siembra'),
  CascadeOption(id: 'lab-2', label: 'Fumigación'),
  CascadeOption(id: 'lab-3', label: 'Cosecha'),
];

/// Selector en cascada Cliente → Campo → Lote → Labor.
///
/// Cuatro [CustomDropdown] dependientes: cada nivel se habilita recién
/// cuando el anterior tiene selección y se resetea aguas abajo al
/// cambiar un nivel superior. Los datos se inyectan para reusarlo con
/// catálogos reales (drift) en los formularios CUU05/06.
class CascadeSelector extends StatefulWidget {
  const CascadeSelector({
    super.key,
    this.clientes = _clientesDummy,
    this.camposPorCliente = _camposDummy,
    this.lotesPorCampo = _lotesDummy,
    this.labores = _laboresDummy,
    this.onClienteChanged,
    this.onCampoChanged,
    this.onLoteChanged,
    this.onLaborChanged,
  });

  final List<CascadeOption> clientes;
  final Map<String, List<CascadeOption>> camposPorCliente;
  final Map<String, List<CascadeOption>> lotesPorCampo;
  final List<CascadeOption> labores;

  final ValueChanged<String?>? onClienteChanged;
  final ValueChanged<String?>? onCampoChanged;
  final ValueChanged<String?>? onLoteChanged;
  final ValueChanged<String?>? onLaborChanged;

  @override
  State<CascadeSelector> createState() => _CascadeSelectorState();
}

class _CascadeSelectorState extends State<CascadeSelector> {
  String? _clienteId;
  String? _campoId;
  String? _loteId;
  String? _laborId;

  List<DropdownMenuItem<String>> _items(List<CascadeOption> options) {
    return options
        .map(
          (o) => DropdownMenuItem<String>(value: o.id, child: Text(o.label)),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final campos =
        widget.camposPorCliente[_clienteId] ?? const <CascadeOption>[];
    final lotes =
        widget.lotesPorCampo[_campoId] ?? const <CascadeOption>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        CustomDropdown<String>(
          label: 'Cliente',
          hint: 'Seleccionar cliente...',
          items: _items(widget.clientes),
          value: _clienteId,
          onChanged: (value) {
            setState(() {
              _clienteId = value;
              _campoId = null;
              _loteId = null;
              _laborId = null;
            });
            widget.onClienteChanged?.call(value);
          },
        ),
        const SizedBox(height: 16),
        CustomDropdown<String>(
          label: 'Campo',
          hint: 'Seleccionar campo...',
          items: _items(campos),
          value: _campoId,
          enabled: _clienteId != null,
          onChanged: (value) {
            setState(() {
              _campoId = value;
              _loteId = null;
              _laborId = null;
            });
            widget.onCampoChanged?.call(value);
          },
        ),
        const SizedBox(height: 16),
        CustomDropdown<String>(
          label: 'Lote',
          hint: 'Seleccionar lote...',
          items: _items(lotes),
          value: _loteId,
          enabled: _campoId != null,
          onChanged: (value) {
            setState(() {
              _loteId = value;
              _laborId = null;
            });
            widget.onLoteChanged?.call(value);
          },
        ),
        const SizedBox(height: 16),
        CustomDropdown<String>(
          label: 'Labor',
          hint: 'Seleccionar labor...',
          items: _items(widget.labores),
          value: _laborId,
          enabled: _loteId != null,
          onChanged: (value) {
            setState(() {
              _laborId = value;
            });
            widget.onLaborChanged?.call(value);
          },
        ),
      ],
    );
  }
}
