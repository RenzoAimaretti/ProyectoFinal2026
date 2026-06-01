import 'dart:async';

import 'package:flutter/material.dart';

import 'animal_detail_screen.dart';
import 'ganaderia_api.dart';

enum GanaderiaSection { resumen, trazabilidad, vacunas, movimientos, altasBajas, peso, reproduccion, personal }

class DashboardGanaderiaScreen extends StatefulWidget {
  const DashboardGanaderiaScreen({super.key});

  @override
  State<DashboardGanaderiaScreen> createState() => _DashboardGanaderiaScreenState();
}

class _DashboardGanaderiaScreenState extends State<DashboardGanaderiaScreen> {
  final GanaderiaApi _api = GanaderiaApi();
  late Future<GanaderiaSnapshot> _future;
  Timer? _timer;
  GanaderiaSection _section = GanaderiaSection.resumen;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _future = _api.fetchSnapshot();
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _reload());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _api.close();
    super.dispose();
  }

  void _reload() {
    if (!mounted) return;
    setState(() {
      _future = _api.fetchSnapshot();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFF7F3EA), Color(0xFFE8EFE7)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: RefreshIndicator(
            onRefresh: () async => _reload(),
            child: FutureBuilder<GanaderiaSnapshot>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                if (snapshot.hasError) {
                  return ListView(
                    children: [
                      const SizedBox(height: 120),
                      _ErrorState(
                        message: snapshot.error.toString(),
                        onRetry: _reload,
                      ),
                    ],
                  );
                }

                final data = snapshot.requireData;

                return ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1320),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Header(onRefresh: _reload, operators: data.totalOperators),
                            const SizedBox(height: 20),
                            _SectionTabs(
                              section: _section,
                              onChanged: (value) => setState(() => _section = value),
                            ),
                            const SizedBox(height: 20),
                            _SummaryGrid(data: data),
                            _contentForSection(data),
                          ],
                        ),
                      ),
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

  Widget _contentForSection(GanaderiaSnapshot data) {
    switch (_section) {
      case GanaderiaSection.resumen:
        return Column(
          children: [
            LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 1100;
                final charts = [
                  _ChartCard(title: 'Ganado por estado', child: _VerticalBarChart(entries: data.livestockByStatus.entries.toList())),
                  _ChartCard(title: 'Eventos por tipo', child: _VerticalBarChart(entries: data.eventsByType.entries.toList())),
                  _ChartCard(title: 'Movimientos por lote', child: _VerticalBarChart(entries: data.movementsByLot.entries.toList())),
                ];

                return wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: charts[0]),
                          const SizedBox(width: 16),
                          Expanded(child: charts[1]),
                          const SizedBox(width: 16),
                          Expanded(child: charts[2]),
                        ],
                      )
                    : Column(
                        children: [
                          charts[0],
                          const SizedBox(height: 16),
                          charts[1],
                          const SizedBox(height: 16),
                          charts[2],
                        ],
                      );
              },
            ),
            const SizedBox(height: 20),
            _SectionCard(
              title: 'Animales recientes',
              child: _AnimalList(
                animals: data.animalCards.take(8).toList(),
                onTapAnimal: _openAnimal,
                snapshot: data,
              ),
            ),
            const SizedBox(height: 20),
            _SectionCard(
              title: 'Ultimos eventos',
              child: _TimelineList(
                title: 'Historial reciente',
                items: data.recentEvents.map((item) => _TimelineEntry(
                  title: item.type,
                  subtitle: '${item.observations ?? item.vaccine ?? 'Sin observaciones'} · ${_formatDateTime(item.eventDate)}',
                )).toList(),
              ),
            ),
          ],
        );
      case GanaderiaSection.trazabilidad:
        final filtered = data.animalCards.where((card) {
          final query = _search.trim().toLowerCase();
          if (query.isEmpty) return true;
          return card.animal.tagNumber.toLowerCase().contains(query) ||
              card.animal.species.toLowerCase().contains(query) ||
              card.lotName.toLowerCase().contains(query);
        }).toList();

        return Column(
          children: [
            _SectionCard(
              title: 'Trazabilidad RFID',
              child: Column(
                children: [
                  TextField(
                    decoration: const InputDecoration(
                      labelText: 'Buscar por etiqueta, especie o lote',
                      border: OutlineInputBorder(),
                    ),
                    onChanged: (value) => setState(() => _search = value),
                  ),
                  const SizedBox(height: 16),
                  _AnimalList(animals: filtered, onTapAnimal: _openAnimal, snapshot: data),
                ],
              ),
            ),
          ],
        );
      case GanaderiaSection.vacunas:
        return Column(
          children: [
            _SectionCard(
              title: 'Vacunas e historial clínico',
              child: _TimelineList(
                title: 'Vacunaciones',
                items: data.vaccineEvents.map((item) => _TimelineEntry(
                  title: item.vaccine ?? item.type,
                  subtitle: '${item.observations ?? 'Sin observaciones'} · ${_formatDateTime(item.eventDate)}',
                )).toList(),
              ),
            ),
          ],
        );
      case GanaderiaSection.movimientos:
        return Column(
          children: [
            _SectionCard(
              title: 'Movimientos y traslados',
              child: Column(
                children: [
                  _ChartCard(title: 'Movimientos por lote', child: _VerticalBarChart(entries: data.movementsByLot.entries.toList())),
                  const SizedBox(height: 16),
                  _TimelineList(
                    title: 'Movimientos recientes',
                    items: data.recentMovements.map((item) => _TimelineEntry(
                      title: data.lotNameOf(item.lotId),
                      subtitle: '${item.observations ?? 'Sin observaciones'} · ${_formatDateTime(item.movementDate)}',
                    )).toList(),
                  ),
                ],
              ),
            ),
          ],
        );
      case GanaderiaSection.altasBajas:
        return Column(
          children: [
            LayoutBuilder(
              builder: (context, constraints) {
                final wide = constraints.maxWidth >= 1000;
                final sections = [
                  _ChartCard(title: 'Estados del lote', child: _VerticalBarChart(entries: data.livestockByStatus.entries.toList())),
                  _SectionCard(
                    title: 'Activos',
                    child: _AnimalList(animals: data.animalCards.where((item) => item.animal.status == 'ACTIVO').toList(), onTapAnimal: _openAnimal, snapshot: data),
                  ),
                  _SectionCard(
                    title: 'Bajas / incidencias',
                    child: _AnimalList(animals: data.animalCards.where((item) => item.animal.status != 'ACTIVO').toList(), onTapAnimal: _openAnimal, snapshot: data),
                  ),
                ];

                return wide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(child: sections[0]),
                          const SizedBox(width: 16),
                          Expanded(child: sections[1]),
                          const SizedBox(width: 16),
                          Expanded(child: sections[2]),
                        ],
                      )
                    : Column(
                        children: [
                          sections[0],
                          const SizedBox(height: 16),
                          sections[1],
                          const SizedBox(height: 16),
                          sections[2],
                        ],
                      );
              },
            ),
          ],
        );
      case GanaderiaSection.peso:
        return Column(
          children: [
            _ChartCard(title: 'Ganancia de peso diaria', child: _LineChart(records: data.recentWeights)),
            const SizedBox(height: 16),
            _SectionCard(
              title: 'Ultimos pesajes',
              child: _TimelineList(
                title: 'Pesajes recientes',
                items: data.recentWeights.map((item) => _TimelineEntry(
                  title: '${item.weight.toStringAsFixed(1)} kg',
                  subtitle: '${data.lotNameOf(item.livestockId)} · ${_formatDateTime(item.measuredAt)}',
                )).toList(),
              ),
            ),
          ],
        );
      case GanaderiaSection.reproduccion:
        return Column(
          children: [
            _SectionCard(
              title: 'Ciclos reproductivos',
              child: _TimelineList(
                title: 'Eventos reproductivos',
                items: data.reproductiveEvents.map((item) => _TimelineEntry(
                  title: item.type,
                  subtitle: '${item.observations ?? 'Sin observaciones'} · ${_formatDateTime(item.eventDate)}',
                )).toList(),
              ),
            ),
          ],
        );
      case GanaderiaSection.personal:
        return Column(
          children: [
            _SectionCard(
              title: 'Personal a cargo',
              child: _PersonList(users: data.users),
            ),
          ],
        );
    }
  }

  Future<void> _openAnimal(AnimalCardData card, GanaderiaSnapshot snapshot) async {
    if (!mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => AnimalDetailScreen(api: _api, livestockId: card.animal.id)),
    );
    _reload();
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.onRefresh, required this.operators});

  final VoidCallback onRefresh;
  final int operators;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFF24473D),
        borderRadius: BorderRadius.circular(28),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 900;

          final content = Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Dashboard ganaderia',
                style: Theme.of(context).textTheme.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 8),
              Text(
                'Datos vivos de RFID, vacunas, movimientos, pesajes, ciclos reproductivos y personal.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: 0.84)),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _HeaderChip(label: 'En vivo', value: '30s refresh'),
                  _HeaderChip(label: 'Operadores', value: operators.toString()),
                ],
              ),
            ],
          );

          final actions = Wrap(
            spacing: 12,
            runSpacing: 12,
            alignment: WrapAlignment.end,
            children: [
              FilledButton.icon(onPressed: onRefresh, icon: const Icon(Icons.refresh), label: const Text('Actualizar')),
            ],
          );

          if (wide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: content),
                const SizedBox(width: 24),
                actions,
              ],
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              content,
              const SizedBox(height: 16),
              actions,
            ],
          );
        },
      ),
    );
  }
}

class _HeaderChip extends StatelessWidget {
  const _HeaderChip({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.white.withValues(alpha: 0.14)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.white70, fontSize: 12)),
          Text(value, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _SectionTabs extends StatelessWidget {
  const _SectionTabs({required this.section, required this.onChanged});

  final GanaderiaSection section;
  final ValueChanged<GanaderiaSection> onChanged;

  @override
  Widget build(BuildContext context) {
    final tabs = <GanaderiaSection, String>{
      GanaderiaSection.resumen: 'Resumen',
      GanaderiaSection.trazabilidad: 'Trazabilidad',
      GanaderiaSection.vacunas: 'Vacunas',
      GanaderiaSection.movimientos: 'Movimientos',
      GanaderiaSection.altasBajas: 'Altas/Bajas',
      GanaderiaSection.peso: 'Peso',
      GanaderiaSection.reproduccion: 'Reproduccion',
      GanaderiaSection.personal: 'Personal',
    };

    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: tabs.entries
          .map(
            (entry) => ChoiceChip(
              label: Text(entry.value),
              selected: section == entry.key,
              onSelected: (_) => onChanged(entry.key),
            ),
          )
          .toList(),
    );
  }
}

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.data});

  final GanaderiaSnapshot data;

  @override
  Widget build(BuildContext context) {
    final cards = [
      _SummaryCard(title: 'Ganado total', value: data.totalLivestock.toString(), subtitle: 'Registros en la base de datos', icon: Icons.pets, color: const Color(0xFF2F5D50)),
      _SummaryCard(title: 'Activos', value: data.activeLivestock.toString(), subtitle: 'En estado ACTIVO', icon: Icons.verified_outlined, color: const Color(0xFF4D6A6D)),
      _SummaryCard(title: 'Vacunaciones', value: data.totalVaccinations.toString(), subtitle: 'Eventos VACUNACION', icon: Icons.vaccines_outlined, color: const Color(0xFFC47F2C)),
      _SummaryCard(title: 'Pesajes', value: data.weights.length.toString(), subtitle: 'Registros de peso', icon: Icons.monitor_weight_outlined, color: const Color(0xFF8C4A3D)),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth >= 1100 ? 4 : constraints.maxWidth >= 700 ? 2 : 1;
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: cards.length,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 14,
            mainAxisSpacing: 14,
            mainAxisExtent: 136,
          ),
          itemBuilder: (_, index) => cards[index],
        );
      },
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.title, required this.value, required this.subtitle, required this.icon, required this.color});

  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                child: Icon(icon, color: color),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(color: color.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(999)),
                child: Text('DB', style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w800)),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(color: Color(0xFF66746D), fontSize: 13)),
              const SizedBox(height: 6),
              Text(value, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
              const SizedBox(height: 4),
              Text(subtitle, style: const TextStyle(color: Color(0xFF66746D))),
            ],
          ),
        ],
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _VerticalBarChart extends StatelessWidget {
  const _VerticalBarChart({required this.entries});

  final List<MapEntry<String, int>> entries;

  @override
  Widget build(BuildContext context) {
    if (entries.isEmpty) {
      return const _EmptyBox(text: 'Sin datos para graficar');
    }

    final maxValue = entries.map((item) => item.value).reduce((a, b) => a > b ? a : b).toDouble();

    return SizedBox(
      height: 220,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: entries.map((entry) {
          final heightFactor = entry.value / maxValue;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6),
              child: Column(
                children: [
                  Expanded(
                    child: Align(
                      alignment: Alignment.bottomCenter,
                      child: FractionallySizedBox(
                        heightFactor: heightFactor == 0 ? 0.08 : heightFactor,
                        child: Container(
                          decoration: BoxDecoration(
                            color: _statusColor(entry.key),
                            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(entry.key, textAlign: TextAlign.center, style: const TextStyle(fontSize: 11)),
                  Text(entry.value.toString(), style: const TextStyle(fontWeight: FontWeight.w800)),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _LineChart extends StatelessWidget {
  const _LineChart({required this.records});

  final List<WeightRecord> records;

  @override
  Widget build(BuildContext context) {
    if (records.isEmpty) {
      return const _EmptyBox(text: 'Sin pesos registrados para graficar');
    }

    final maxWeight = records.map((item) => item.weight).reduce((a, b) => a > b ? a : b);
    final minWeight = records.map((item) => item.weight).reduce((a, b) => a < b ? a : b);
    final span = (maxWeight - minWeight).abs() < 0.001 ? 1 : maxWeight - minWeight;

    return SizedBox(
      height: 240,
      child: LayoutBuilder(
        builder: (context, constraints) {
          final width = constraints.maxWidth;
          final height = constraints.maxHeight - 20;
          final step = records.length == 1 ? width : width / (records.length - 1);
          final points = <Offset>[];

          for (var index = 0; index < records.length; index++) {
            final x = step * index;
            final normalized = (records[index].weight - minWeight) / span;
            final y = height - (normalized * (height - 30));
            points.add(Offset(x, y));
          }

          return CustomPaint(painter: _LinePainter(points: points, min: minWeight, max: maxWeight));
        },
      ),
    );
  }
}

class _LinePainter extends CustomPainter {
  _LinePainter({required this.points, required this.min, required this.max});

  final List<Offset> points;
  final double min;
  final double max;

  @override
  void paint(Canvas canvas, Size size) {
    final background = Paint()..color = const Color(0xFFF3F1EA);
    canvas.drawRRect(RRect.fromRectAndRadius(Offset.zero & size, const Radius.circular(18)), background);

    final axisPaint = Paint()
      ..color = const Color(0xFFD8D2C5)
      ..strokeWidth = 1;
    canvas.drawLine(Offset(20, size.height - 32), Offset(size.width - 10, size.height - 32), axisPaint);
    canvas.drawLine(const Offset(20, 10), Offset(20, size.height - 32), axisPaint);

    if (points.isEmpty) return;

    final shifted = points.map((point) => Offset(point.dx + 20, point.dy)).toList();
    final linePaint = Paint()
      ..color = const Color(0xFF2F5D50)
      ..strokeWidth = 3
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;
    final dotPaint = Paint()..color = const Color(0xFFC47F2C);

    final path = Path()..moveTo(shifted.first.dx, shifted.first.dy);
    for (final point in shifted.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    canvas.drawPath(path, linePaint);

    for (final point in shifted) {
      canvas.drawCircle(point, 4, dotPaint);
    }

    final textPainter = TextPainter(textDirection: TextDirection.ltr);
    textPainter.text = TextSpan(text: '${max.toStringAsFixed(0)} kg', style: const TextStyle(color: Color(0xFF66746D), fontSize: 11));
    textPainter.layout();
    textPainter.paint(canvas, const Offset(26, 4));
    textPainter.text = TextSpan(text: '${min.toStringAsFixed(0)} kg', style: const TextStyle(color: Color(0xFF66746D), fontSize: 11));
    textPainter.layout();
    textPainter.paint(canvas, Offset(26, size.height - 24));
  }

  @override
  bool shouldRepaint(covariant _LinePainter oldDelegate) => oldDelegate.points != points || oldDelegate.min != min || oldDelegate.max != max;
}

class _AnimalList extends StatelessWidget {
  const _AnimalList({required this.animals, required this.onTapAnimal, required this.snapshot});

  final List<AnimalCardData> animals;
  final Future<void> Function(AnimalCardData, GanaderiaSnapshot) onTapAnimal;
  final GanaderiaSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    if (animals.isEmpty) {
      return const _EmptyBox(text: 'No hay animales para mostrar');
    }

    return Column(
      children: animals
          .map(
            (card) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: InkWell(
                onTap: () => onTapAnimal(card, snapshot),
                borderRadius: BorderRadius.circular(18),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: const Color(0xFFF8F6F0), borderRadius: BorderRadius.circular(18)),
                  child: Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(color: const Color(0xFF2F5D50).withValues(alpha: 0.12), borderRadius: BorderRadius.circular(14)),
                        child: const Icon(Icons.pets, color: Color(0xFF2F5D50)),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(card.animal.tagNumber, style: const TextStyle(fontWeight: FontWeight.w800)),
                            const SizedBox(height: 2),
                            Text('${card.animal.species} · ${card.lotName} · ${card.animal.status}', style: const TextStyle(color: Color(0xFF66746D))),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(card.lastWeight == null ? 'Sin peso' : '${card.lastWeight!.toStringAsFixed(1)} kg', style: const TextStyle(fontWeight: FontWeight.w800)),
                          Text(card.lastEventLabel, style: const TextStyle(color: Color(0xFF66746D), fontSize: 12)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _TimelineList extends StatelessWidget {
  const _TimelineList({required this.title, required this.items});

  final String title;
  final List<_TimelineEntry> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return const _EmptyBox(text: 'Sin datos');
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: items
          .map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(color: const Color(0xFFF8F6F0), borderRadius: BorderRadius.circular(18)),
                child: Row(
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
                          Text(item.title, style: const TextStyle(fontWeight: FontWeight.w800)),
                          const SizedBox(height: 4),
                          Text(item.subtitle, style: const TextStyle(color: Color(0xFF66746D))),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}

class _TimelineEntry {
  const _TimelineEntry({required this.title, required this.subtitle});

  final String title;
  final String subtitle;
}

class _PersonList extends StatelessWidget {
  const _PersonList({required this.users});

  final List<UserRecord> users;

  @override
  Widget build(BuildContext context) {
    if (users.isEmpty) {
      return const _EmptyBox(text: 'No hay personal cargado');
    }

    return Column(
      children: users
          .map(
            (user) => Container(
              margin: const EdgeInsets.only(bottom: 12),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: const Color(0xFFF8F6F0), borderRadius: BorderRadius.circular(18)),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: const Color(0xFF2F5D50).withValues(alpha: 0.12),
                    child: Text(user.username.isEmpty ? '?' : user.username[0].toUpperCase(), style: const TextStyle(color: Color(0xFF2F5D50))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(user.username, style: const TextStyle(fontWeight: FontWeight.w800)),
                        const SizedBox(height: 2),
                        Text(user.role, style: const TextStyle(color: Color(0xFF66746D))),
                      ],
                    ),
                  ),
                  Text(user.active ? 'Activo' : 'Inactivo', style: const TextStyle(fontWeight: FontWeight.w700)),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
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
            const SizedBox(height: 16),
            ElevatedButton(onPressed: onRetry, child: const Text('Reintentar')),
          ],
        ),
      ),
    );
  }
}

class _EmptyBox extends StatelessWidget {
  const _EmptyBox({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: const Color(0xFFF8F6F0), borderRadius: BorderRadius.circular(18)),
      child: Text(text, style: const TextStyle(color: Color(0xFF66746D))),
    );
  }
}

Color _statusColor(String label) {
  switch (label) {
    case 'ACTIVO':
      return const Color(0xFF2F5D50);
    case 'ENFERMO':
      return const Color(0xFF8C4A3D);
    case 'VENDIDO':
      return const Color(0xFF4D6A6D);
    case 'MUERTO':
      return const Color(0xFFC47F2C);
    case 'VACUNACION':
      return const Color(0xFF2F5D50);
    case 'PARTO':
      return const Color(0xFFC47F2C);
    case 'INSEMINACION':
      return const Color(0xFF4D6A6D);
    case 'CASTRACION':
      return const Color(0xFF8C4A3D);
    default:
      return const Color(0xFF6B7D74);
  }
}

String _formatDateTime(DateTime date) {
  final day = date.day.toString().padLeft(2, '0');
  final month = date.month.toString().padLeft(2, '0');
  final year = date.year;
  final hour = date.hour.toString().padLeft(2, '0');
  final minute = date.minute.toString().padLeft(2, '0');
  return '$day/$month/$year $hour:$minute';
}