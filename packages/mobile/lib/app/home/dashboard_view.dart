import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../domain/models/catalogs.dart';
import '../../domain/models/session.dart';
import '../../domain/models/task.dart';
import '../../presentation/components/badges/sync_pending_badge.dart';
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
import '../tasks/tasks_view.dart';
import '../tasks/tasks_view_model.dart';

/// Dashboard principal post-login: navegación inferior a los 4 módulos
/// (Tareas, Partes, Recepciones, Maquinaria). Los cuatro módulos están
/// cableados a sus listas y formularios reales (CUU05/06/08).
///
/// Incluye un selector global de firma (post-login) que lista las razones
/// sociales REALES del catálogo (`CompanyReader.watchAll()`). La firma activa
/// es `Session.companyId`; al cambiarla se persiste y se refrescan las listas.
///
/// El parte diario nace de una Tarea (R007): la pestaña "Tareas" (y su FAB)
/// abre el selector de tarea y, al elegir una, el formulario del parte hereda
/// la firma del selector global.
class DashboardView extends StatefulWidget {
  const DashboardView({
    super.key,
    required this.session,
    required this.companies,
    required this.onFirmChanged,
    required this.pendingSyncCount,
    required this.onLogout,
    required this.tasksViewModel,
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

  /// Callback al seleccionar otra firma (persiste `Session.companyId` y
  /// refresca las listas).
  final ValueChanged<String> onFirmChanged;

  /// Cantidad de operaciones pendientes de sincronización (`SyncQueue`).
  final Stream<int> pendingSyncCount;

  final VoidCallback onLogout;

  final TasksViewModel tasksViewModel;
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

  /// Flujo de carga del parte (R007): el parte nace de una tarea. Abre el
  /// selector de TODAS las tareas y, al elegir una, el formulario del parte.
  void _openPartFlow() {
    showTaskPickerSheet(
      context: context,
      viewModel: widget.tasksViewModel,
      onSelected: _openPartForm,
    );
  }

  /// Abre el formulario del parte sobre [task], heredando la firma global.
  void _openPartForm(Task task) {
    final companyId = widget.session.companyId;
    if (companyId == null) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Seleccioná una firma para cargar el parte'),
          ),
        );
      return;
    }
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => DailyReportFormView(
          viewModel: widget.dailyReportFormViewModel,
          task: task,
          companyId: companyId,
          operatorId: widget.session.userId,
        ),
      ),
    );
  }

  void _onFabPressed() {
    if (_selectedIndex == 0) {
      // Tareas: flujo de carga del parte (selección de tarea).
      _openPartFlow();
      return;
    }
    if (_selectedIndex == 1) {
      // Partes: el parte también nace de una tarea.
      _openPartFlow();
      return;
    }
    if (_selectedIndex == 2) {
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => ReceptionFormView(
            viewModel: widget.receptionFormViewModel,
          ),
        ),
      );
      return;
    }
    if (_selectedIndex == 3) {
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
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                TasksView(
                  viewModel: widget.tasksViewModel,
                  operatorId: widget.session.userId,
                  onLoadTask: _openPartForm,
                ),
                DailyReportsView(viewModel: widget.dailyReportsViewModel),
                ReceptionsView(viewModel: widget.receptionsViewModel),
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
            label: 'Tareas',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
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
