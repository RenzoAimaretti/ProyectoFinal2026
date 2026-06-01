import 'package:flutter/material.dart';

import 'ganaderia_api.dart';

class AnimalDetailScreen extends StatefulWidget {
  const AnimalDetailScreen({super.key, required this.api, required this.livestockId});

  final GanaderiaApi api;
  final String livestockId;





  @override
  State<AnimalDetailScreen> createState() => _AnimalDetailScreenState();
}

class _AnimalDetailScreenState extends State<AnimalDetailScreen> {
  late Future<AnimalDetailData> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.api.fetchAnimalDetail(widget.livestockId);
  }

  void _reload() {
    if (!mounted) return;
    setState(() {
      _future = widget.api.fetchAnimalDetail(widget.livestockId);
    });
  }

  Future<void> _openWeightForm(AnimalDetailData data) async {
    final result = await showDialog<_WeightFormResult>(
      context: context,
      builder: (context) => _WeightFormDialog(operators: data.operatorNames),
    );

    if (result == null) return;

    await widget.api.createWeightRecord(
      livestockId: widget.livestockId,
      operatorId: result.operatorId,
      weight: result.weight,
      measuredAt: result.measuredAt,
    );

    _showSnack('Peso registrado.');
    _reload();
  }

  Future<void> _openVaccineForm(AnimalDetailData data) async {
    final result = await showDialog<_VaccineFormResult>(
      context: context,
      builder: (context) => _VaccineFormDialog(operators: data.operatorNames),
    );

    if (result == null) return;

    await widget.api.createLivestockEvent(
      livestockId: widget.livestockId,
      operatorId: result.operatorId,
      eventType: 'VACUNACION',
      eventDate: result.eventDate,
      observations: result.observations,
      vaccine: result.vaccine,
      dose: result.dose,
    );

    _showSnack('Vacuna registrada.');
    _reload();
  }

  Future<void> _openMovementForm(AnimalDetailData data) async {
    final dashboard = await widget.api.fetchDashboard();
    final availableLots = dashboard.lots.where((lot) => lot.id != data.animal.lotId).toList();

    if (availableLots.isEmpty) {
      _showSnack('No hay lotes disponibles para mover el animal.');
      return;
    }

    final result = await showDialog<_MovementFormResult>(
      context: context,
      builder: (context) => _MovementFormDialog(lots: availableLots),
    );

    if (result == null) return;

    await widget.api.createLivestockMovement(
      livestockId: widget.livestockId,
      lotId: result.lotId,
      movementDate: result.movementDate,
      observations: result.observations,
    );

    _showSnack('Movimiento registrado.');
    _reload();
  }

  Future<void> _setStatus(String status, {required String title}) async {
    await widget.api.updateLivestockStatus(
      livestockId: widget.livestockId,
      status: status,
    );

    _showSnack(title);
    _reload();
  }

  Future<void> _showStatusDialog(AnimalDetailData data, {required String presetStatus}) async {
    final result = await showDialog<_StatusFormResult>(
      context: context,
      builder: (context) => _StatusFormDialog(initialStatus: presetStatus),
    );

    if (result == null) return;

    await widget.api.updateLivestockStatus(
      livestockId: widget.livestockId,
      status: result.status,
    );

    _showSnack('Estado actualizado.');
    _reload();
  }

  void _showSnack(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Datos del animal')),
      body: FutureBuilder<AnimalDetailData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return _ErrorState(
              message: snapshot.error.toString(),
              onRetry: _reload,
            );
          }

          final data = snapshot.requireData;
          final latestWeight = data.weights.isNotEmpty ? data.weights.first : null;
          final latestEvent = data.events.isNotEmpty ? data.events.first : null;

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 1200),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _AnimalHero(data: data),
                    const SizedBox(height: 20),
                    Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _ActionButton(
                          icon: Icons.playlist_add_check,
                          label: 'Registrar peso',
                          onPressed: () => _openWeightForm(data),
                        ),
                        _ActionButton(
                          icon: Icons.vaccines_outlined,
                          label: 'Registrar vacuna',
                          onPressed: () => _openVaccineForm(data),
                        ),
                        _ActionButton(
                          icon: Icons.swap_horiz,
                          label: 'Mover de potrero',
                          onPressed: () => _openMovementForm(data),
                        ),
                        _ActionButton(
                          icon: Icons.remove_circle_outline,
                          label: 'Dar de baja',
                          onPressed: () => _showStatusDialog(data, presetStatus: 'VENDIDO'),
                        ),
                        _ActionButton(
                          icon: Icons.add_circle_outline,
                          label: 'Dar de alta',
                          onPressed: () => _setStatus('ACTIVO', title: 'Animal dado de alta.'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    if (latestWeight != null || latestEvent != null)
                      Row(
                        children: [
                          if (latestWeight != null)
                            Expanded(
                              child: _InfoCard(
                                title: 'Ultimo peso',
                                value: '${latestWeight.weight.toStringAsFixed(1)} kg',
                                subtitle: _formatDate(latestWeight.measuredAt),
                              ),
                            ),
                          if (latestWeight != null && latestEvent != null) const SizedBox(width: 16),
                          if (latestEvent != null)
                            Expanded(
                              child: _InfoCard(
                                title: 'Ultimo evento',
                                value: latestEvent.type,
                                subtitle: _formatDate(latestEvent.eventDate),
                              ),
                            ),
                        ],
                      ),
                    const SizedBox(height: 20),
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final wide = constraints.maxWidth >= 900;

                        final firstColumn = Column(
                          children: [
                            _TimelineCard(
                              title: 'Peso',
                              items: data.weights.map((item) => _TimelineItem(title: '${item.weight.toStringAsFixed(1)} kg', subtitle: _formatDate(item.measuredAt))).toList(),
                            ),
                            const SizedBox(height: 16),
                            _TimelineCard(
                              title: 'Vacunas y eventos',
                              items: data.events.map((item) => _TimelineItem(title: item.type, subtitle: _formatEventSubtitle(item, data.operatorNames))).toList(),
                            ),
                          ],
                        );

                        final secondColumn = Column(
                          children: [
                            _TimelineCard(
                              title: 'Movimientos',
                              items: data.movements
                                  .map((item) => _TimelineItem(title: item.lotId, subtitle: _formatDate(item.movementDate)))
                                  .toList(),
                            ),
                            const SizedBox(height: 16),
                            _TimelineCard(
                              title: 'Datos de trazabilidad',
                              items: [
                                _TimelineItem(title: 'Lote', subtitle: data.lotName),
                                _TimelineItem(title: 'Campo', subtitle: data.farmName),
                                _TimelineItem(title: 'RFID', subtitle: data.animal.tagNumber),
                                _TimelineItem(title: 'Estado', subtitle: data.animal.status),
                              ],
                            ),
                          ],
                        );

                        return wide
                            ? Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: firstColumn),
                                  const SizedBox(width: 16),
                                  Expanded(child: secondColumn),
                                ],
                              )
                            : Column(
                                children: [
                                  firstColumn,
                                  const SizedBox(height: 16),
                                  secondColumn,
                                ],
                              );
                      },
                    ),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

class _AnimalHero extends StatelessWidget {
  const _AnimalHero({required this.data});

  final AnimalDetailData data;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF24473D),
        borderRadius: BorderRadius.circular(28),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Etiqueta RFID ${data.animal.tagNumber}',
            style: const TextStyle(color: Colors.white70, fontSize: 13),
          ),
          const SizedBox(height: 8),
          Text(
            '${data.animal.species} · ${data.animal.sex} · ${data.animal.status}',
            style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 10),
          Text(
            'Lote: ${data.lotName}',
            style: const TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 4),
          Text(
            'Campo: ${data.farmName}',
            style: const TextStyle(color: Colors.white70),
          ),
          if (data.animal.breed != null) ...[
            const SizedBox(height: 4),
            Text('Raza: ${data.animal.breed}', style: const TextStyle(color: Colors.white70)),
          ],
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.icon, required this.label, required this.onPressed});

  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(onPressed: onPressed, icon: Icon(icon), label: Text(label));
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.value, required this.subtitle});

  final String title;
  final String value;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Color(0xFF66746D))),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(subtitle, style: const TextStyle(color: Color(0xFF66746D))),
        ],
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  const _TimelineCard({required this.title, required this.items});

  final String title;
  final List<_TimelineItem> items;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          if (items.isEmpty)
            const Text('Sin datos')
          else
            ...items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: _TimelineRow(item: item),
              ),
            ),
        ],
      ),
    );
  }
}

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({required this.item});

  final _TimelineItem item;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 10,
          height: 10,
          margin: const EdgeInsets.only(top: 5),
          decoration: const BoxDecoration(color: Color(0xFF2F5D50), shape: BoxShape.circle),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(item.subtitle, style: const TextStyle(color: Color(0xFF66746D))),
            ],
          ),
        ),
      ],
    );
  }
}

class _TimelineItem {
  const _TimelineItem({required this.title, required this.subtitle});

  final String title;
  final String subtitle;
}

class _WeightFormDialog extends StatefulWidget {
  const _WeightFormDialog({required this.operators});

  final Map<String, String> operators;

  @override
  State<_WeightFormDialog> createState() => _WeightFormDialogState();
}

class _WeightFormDialogState extends State<_WeightFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _weightController = TextEditingController();
  final _measuredAtController = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 16));
  String? _operatorId;

  @override
  void initState() {
    super.initState();
    _operatorId = widget.operators.isNotEmpty ? widget.operators.keys.first : null;
  }

  @override
  void dispose() {
    _weightController.dispose();
    _measuredAtController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entries = widget.operators.entries.toList();

    return AlertDialog(
      title: const Text('Registrar peso'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _weightController,
              decoration: const InputDecoration(labelText: 'Peso (kg)'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (value) => value == null || double.tryParse(value) == null ? 'Ingresa un peso valido' : null,
            ),
            TextFormField(
              controller: _measuredAtController,
              decoration: const InputDecoration(labelText: 'Fecha y hora (ISO)'),
              validator: (value) => value == null || DateTime.tryParse(value) == null ? 'Ingresa una fecha valida' : null,
            ),
            DropdownButtonFormField<String>(
              value: _operatorId,
              decoration: const InputDecoration(labelText: 'Operador'),
              items: entries.map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value))).toList(),
              onChanged: (value) => setState(() => _operatorId = value),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate() || _operatorId == null) return;
            Navigator.pop(
              context,
              _WeightFormResult(
                weight: double.parse(_weightController.text),
                measuredAt: DateTime.parse(_measuredAtController.text),
                operatorId: _operatorId!,
              ),
            );
          },
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

class _WeightFormResult {
  _WeightFormResult({required this.weight, required this.measuredAt, required this.operatorId});

  final double weight;
  final DateTime measuredAt;
  final String operatorId;
}

class _VaccineFormDialog extends StatefulWidget {
  const _VaccineFormDialog({required this.operators});

  final Map<String, String> operators;

  @override
  State<_VaccineFormDialog> createState() => _VaccineFormDialogState();
}

class _VaccineFormDialogState extends State<_VaccineFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _vaccineController = TextEditingController();
  final _doseController = TextEditingController();
  final _observationsController = TextEditingController();
  final _eventDateController = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 16));
  String? _operatorId;

  @override
  void initState() {
    super.initState();
    _operatorId = widget.operators.isNotEmpty ? widget.operators.keys.first : null;
  }

  @override
  void dispose() {
    _vaccineController.dispose();
    _doseController.dispose();
    _observationsController.dispose();
    _eventDateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final entries = widget.operators.entries.toList();

    return AlertDialog(
      title: const Text('Registrar vacuna'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _vaccineController,
              decoration: const InputDecoration(labelText: 'Vacuna'),
              validator: (value) => value == null || value.trim().isEmpty ? 'Ingresa la vacuna' : null,
            ),
            TextFormField(
              controller: _doseController,
              decoration: const InputDecoration(labelText: 'Dosis'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (value) => value == null || double.tryParse(value) == null ? 'Ingresa una dosis valida' : null,
            ),
            TextFormField(
              controller: _eventDateController,
              decoration: const InputDecoration(labelText: 'Fecha y hora (ISO)'),
              validator: (value) => value == null || DateTime.tryParse(value) == null ? 'Ingresa una fecha valida' : null,
            ),
            TextFormField(
              controller: _observationsController,
              decoration: const InputDecoration(labelText: 'Observaciones'),
              maxLines: 2,
            ),
            DropdownButtonFormField<String>(
              value: _operatorId,
              decoration: const InputDecoration(labelText: 'Operador'),
              items: entries.map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value))).toList(),
              onChanged: (value) => setState(() => _operatorId = value),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate() || _operatorId == null) return;
            Navigator.pop(
              context,
              _VaccineFormResult(
                vaccine: _vaccineController.text.trim(),
                dose: double.parse(_doseController.text),
                eventDate: DateTime.parse(_eventDateController.text),
                observations: _observationsController.text.trim(),
                operatorId: _operatorId!,
              ),
            );
          },
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

class _VaccineFormResult {
  _VaccineFormResult({required this.vaccine, required this.dose, required this.eventDate, required this.observations, required this.operatorId});

  final String vaccine;
  final double dose;
  final DateTime eventDate;
  final String observations;
  final String operatorId;
}

class _MovementFormDialog extends StatefulWidget {
  const _MovementFormDialog({required this.lots});

  final List<LotInfo> lots;

  @override
  State<_MovementFormDialog> createState() => _MovementFormDialogState();
}

class _MovementFormDialogState extends State<_MovementFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _observationsController = TextEditingController();
  final _movementDateController = TextEditingController(text: DateTime.now().toIso8601String().substring(0, 16));
  String? _lotId;

  @override
  void initState() {
    super.initState();
    _lotId = widget.lots.isNotEmpty ? widget.lots.first.id : null;
  }

  @override
  void dispose() {
    _observationsController.dispose();
    _movementDateController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Mover de potrero'),
      content: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              value: _lotId,
              decoration: const InputDecoration(labelText: 'Nuevo lote'),
              items: widget.lots.map((lot) => DropdownMenuItem(value: lot.id, child: Text(lot.name))).toList(),
              validator: (value) => value == null ? 'Elegí un lote' : null,
              onChanged: (value) => setState(() => _lotId = value),
            ),
            TextFormField(
              controller: _movementDateController,
              decoration: const InputDecoration(labelText: 'Fecha y hora (ISO)'),
              validator: (value) => value == null || DateTime.tryParse(value) == null ? 'Ingresa una fecha valida' : null,
            ),
            TextFormField(
              controller: _observationsController,
              decoration: const InputDecoration(labelText: 'Observaciones'),
              maxLines: 2,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () {
            if (!_formKey.currentState!.validate() || _lotId == null) return;
            Navigator.pop(
              context,
              _MovementFormResult(
                lotId: _lotId!,
                movementDate: DateTime.parse(_movementDateController.text),
                observations: _observationsController.text.trim(),
              ),
            );
          },
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

class _MovementFormResult {
  _MovementFormResult({required this.lotId, required this.movementDate, required this.observations});

  final String lotId;
  final DateTime movementDate;
  final String observations;
}

class _StatusFormDialog extends StatefulWidget {
  const _StatusFormDialog({required this.initialStatus});

  final String initialStatus;

  @override
  State<_StatusFormDialog> createState() => _StatusFormDialogState();
}

class _StatusFormDialogState extends State<_StatusFormDialog> {
  late String _status;

  @override
  void initState() {
    super.initState();
    _status = widget.initialStatus;
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Cambiar estado'),
      content: DropdownButtonFormField<String>(
        value: _status,
        items: const [
          DropdownMenuItem(value: 'ACTIVO', child: Text('ACTIVO')),
          DropdownMenuItem(value: 'ENFERMO', child: Text('ENFERMO')),
          DropdownMenuItem(value: 'VENDIDO', child: Text('VENDIDO')),
          DropdownMenuItem(value: 'MUERTO', child: Text('MUERTO')),
        ],
        onChanged: (value) => setState(() => _status = value ?? _status),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
        FilledButton(
          onPressed: () => Navigator.pop(context, _StatusFormResult(status: _status)),
          child: const Text('Guardar'),
        ),
      ],
    );
  }
}

class _StatusFormResult {
  _StatusFormResult({required this.status});

  final String status;
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            ElevatedButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}

String _formatDate(DateTime date) {
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final year = date.year;
  return '$day/$month/$year';
}

String _formatEventSubtitle(LivestockEventData event, Map<String, String> operatorNames) {
  final buffer = StringBuffer(_formatDate(event.eventDate));

  if (event.vaccine != null && event.vaccine!.isNotEmpty) {
    buffer.write(' · Vacuna: ${event.vaccine}');
  }

  if (event.dose != null) {
    buffer.write(' · Dosis: ${event.dose}');
  }

  if (event.observations != null && event.observations!.isNotEmpty) {
    buffer.write(' · ${event.observations}');
  }

  if (event.operatorId != null) {
    buffer.write(' · ${operatorNames[event.operatorId!] ?? event.operatorId!}');
  }

  return buffer.toString();
}