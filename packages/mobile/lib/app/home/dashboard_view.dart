import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/session.dart';
import '../../domain/models/stock.dart';
import '../../presentation/components/badges/sync_pending_badge.dart';
import '../../presentation/components/cards/kpi_card.dart';
import '../../presentation/components/selectors/multi_firma_selector.dart';
import '../machinery/machine_activities_view.dart';
import '../machinery/machine_activities_view_model.dart';
import '../machinery/machine_activity_form_view.dart';
import '../machinery/machine_activity_form_view_model.dart';
import '../receptions/reception_form_view.dart';
import '../receptions/reception_form_view_model.dart';
import '../receptions/receptions_view.dart';
import '../receptions/receptions_view_model.dart';
import '../reports/daily_report_form_view.dart';
import '../reports/daily_report_form_view_model.dart';
import '../reports/daily_reports_view.dart';
import '../reports/daily_reports_view_model.dart';

/// Dashboard principal post-login: navegación inferior a los 3 módulos
/// (Partes, Recepciones, Maquinaria). Los tres módulos están cableados a su
/// lista y formulario reales (CUU05/06/08).
///
/// Incluye un selector global de firma (post-login) que lista las razones
/// sociales REALES del catálogo (`CompanyReader.watchAll()`). La firma activa
/// es `Session.companyId`; al cambiarla se persiste y se refrescan las listas.
class DashboardView extends StatefulWidget {
  const DashboardView({
    super.key,
    required this.session,
    required this.companies,
    required this.stock,
    required this.onFirmChanged,
    required this.pendingSyncCount,
    required this.onLogout,
    required this.dailyReportsViewModel,
    required this.dailyReportFormViewModel,
    required this.receptionsViewModel,
    required this.receptionFormViewModel,
    required this.machineActivitiesViewModel,
    required this.machineActivityFormViewModel,
  });

  final Session session;

  /// Razones sociales reales (catálogo de firmas) para el selector global.
  final Stream<List<Company>> companies;

  /// Stock global (KPI del dashboard), independiente del cliente/firma.
  final Stream<List<Stock>> stock;

  /// Callback al seleccionar otra firma (persiste `Session.companyId` y
  /// refresca las listas).
  final ValueChanged<String> onFirmChanged;

  /// Cantidad de operaciones pendientes de sincronización (`SyncQueue`).
  final Stream<int> pendingSyncCount;

  final VoidCallback onLogout;

  final DailyReportsViewModel dailyReportsViewModel;
  final DailyReportFormViewModel dailyReportFormViewModel;
  final ReceptionsViewModel receptionsViewModel;
  final ReceptionFormViewModel receptionFormViewModel;
  final MachineActivitiesViewModel machineActivitiesViewModel;
  final MachineActivityFormViewModel machineActivityFormViewModel;

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  int _selectedIndex = 0;

  void _showComingSoon() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        const SnackBar(content: Text('Próximamente')),
      );
  }

  void _onFabPressed() {
    if (_selectedIndex == 0) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => DailyReportFormView(
            viewModel: widget.dailyReportFormViewModel,
            operatorId: widget.session.userId,
            initialCompanyId: widget.session.companyId,
          ),
        ),
      );
      return;
    }
    if (_selectedIndex == 1) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ReceptionFormView(
            viewModel: widget.receptionFormViewModel,
          ),
        ),
      );
      return;
    }
    if (_selectedIndex == 2) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => MachineActivityFormView(
            viewModel: widget.machineActivityFormViewModel,
          ),
        ),
      );
      return;
    }
    _showComingSoon();
  }

  /// Selector global de firma (post-login). Lista las razones sociales reales
  /// del catálogo y refleja la firma activa de la sesión.
  Widget _buildFirmSelector() {
    return StreamBuilder<List<Company>>(
      stream: widget.companies,
      builder: (context, snapshot) {
        final companies = snapshot.data ?? const <Company>[];
        if (companies.isEmpty) {
          return const SizedBox.shrink();
        }
        final razones = <FirmaRazonSocial>[
          for (var i = 0; i < companies.length; i++)
            _firmaFromCompany(companies[i], i),
        ];
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 4),
          child: MultiFirmaSelector(
            razonesSociales: razones,
            selectedId: widget.session.companyId,
            onSelected: (firma) => widget.onFirmChanged(firma.id),
          ),
        );
      },
    );
  }

  /// KPI de stock global (CUU06): cantidad de insumos distintos con stock,
  /// derivada de `WatchStockUseCase.watchAll()` inyectado desde el composition
  /// root. Reutiliza [KpiCard] del design system.
  Widget _buildStockKpi() {
    return StreamBuilder<List<Stock>>(
      stream: widget.stock,
      builder: (context, snapshot) {
        final stocks = snapshot.data ?? const <Stock>[];
        final distinctInputs = stocks.map((s) => s.inputId).toSet().length;
        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
          child: KpiCard(
            title: 'Insumos con stock',
            value: '$distinctInputs',
            unit: 'insumos',
            icon: Icons.inventory_2_outlined,
            iconColor: AppColors.secondary,
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.surface,
      appBar: AppBar(
        title: const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.agriculture_rounded, color: AppColors.onPrimary),
            SizedBox(width: 8),
            Text('Agrolify', style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        actions: [
          SyncPendingBadge(pendingCount: widget.pendingSyncCount),
          const SizedBox(width: 4),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Cerrar sesión',
            onPressed: widget.onLogout,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Column(
        children: [
          _buildFirmSelector(),
          _buildStockKpi(),
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                DailyReportsView(viewModel: widget.dailyReportsViewModel),
                ReceptionsView(
                  viewModel: widget.receptionsViewModel,
                  operatorId: widget.session.userId,
                ),
                MachineActivitiesView(
                  viewModel: widget.machineActivitiesViewModel,
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _onFabPressed,
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) {
          setState(() => _selectedIndex = index);
        },
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.assignment_outlined),
            selectedIcon: Icon(Icons.assignment),
            label: 'Partes',
          ),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            selectedIcon: Icon(Icons.inventory_2),
            label: 'Recepciones',
          ),
          NavigationDestination(
            icon: Icon(Icons.agriculture_outlined),
            selectedIcon: Icon(Icons.agriculture),
            label: 'Maquinaria',
          ),
        ],
      ),
    );
  }
}

/// Paleta de colores de avatar para el selector global de firmas (ciclada por
/// índice para dar identidad visual sin hardcodear por firma).
const List<Color> _firmColors = [
  Color(0xFF2E6F40),
  Color(0xFF795548),
  Color(0xFF0288D1),
  Color(0xFF6A1B9A),
  Color(0xFFB26500),
];

/// Convierte una [Company] de dominio en una opción del selector global,
/// derivando iniciales y un color estable a partir del nombre/índice.
FirmaRazonSocial _firmaFromCompany(Company company, int index) {
  return FirmaRazonSocial(
    id: company.id,
    name: company.name,
    initials: _initials(company.name),
    color: _firmColors[index % _firmColors.length],
  );
}

/// Iniciales (máx 2 chars) a partir del nombre: primera letra de las dos
/// primeras palabras; si es una sola palabra, sus dos primeras letras.
String _initials(String name) {
  final words = name
      .trim()
      .split(RegExp(r'\s+'))
      .where((w) => w.isNotEmpty)
      .toList();
  if (words.isEmpty) return '?';
  final first = words.first[0];
  if (words.length == 1) {
    final second = words.first.length > 1 ? words.first[1] : '';
    return (first + second).toUpperCase();
  }
  return (first + words[1][0]).toUpperCase();
}
